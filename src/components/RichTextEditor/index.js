import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Divider from "@mui/material/Divider";
import Icon from "@mui/material/Icon";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tooltip from "@mui/material/Tooltip";
import SoftBox from "components/SoftBox";
import SoftButton from "components/SoftButton";
import SoftTypography from "components/SoftTypography";

const tools = [
  ["undo", "Hoàn tác", "undo"],
  ["redo", "Làm lại", "redo"],
  ["format_bold", "Chữ đậm", "bold"],
  ["format_italic", "Chữ nghiêng", "italic"],
  ["format_underlined", "Gạch chân", "underline"],
  ["strikethrough_s", "Gạch ngang", "strikeThrough"],
  ["format_list_bulleted", "Danh sách dấu chấm", "insertUnorderedList"],
  ["format_list_numbered", "Danh sách đánh số", "insertOrderedList"],
  ["format_align_left", "Căn trái", "justifyLeft"],
  ["format_align_center", "Căn giữa", "justifyCenter"],
  ["format_align_right", "Căn phải", "justifyRight"],
];

const RichTextEditor = forwardRef(function RichTextEditor(
  { value, onChange, minHeight = 480 },
  ref
) {
  const editorRef = useRef(null);
  const sourceRef = useRef(null);
  const selectionRef = useRef(null);
  const [sourceMode, setSourceMode] = useState(false);

  const emit = useCallback(() => {
    onChange(editorRef.current?.innerHTML || "");
  }, [onChange]);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      selectionRef.current = selection.getRangeAt(0).cloneRange();
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    editor?.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (selectionRef.current) {
      selection.addRange(selectionRef.current);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.addRange(range);
  }, []);

  const execute = useCallback(
    (command, commandValue = null) => {
      if (sourceMode) return;
      restoreSelection();
      document.execCommand(command, false, commandValue);
      emit();
      rememberSelection();
    },
    [emit, rememberSelection, restoreSelection, sourceMode]
  );

  const insertImage = useCallback(
    (url, alt = "") => {
      if (!url || sourceMode) return;
      restoreSelection();
      const safeAlt = String(alt).replace(/["<>]/g, "");
      document.execCommand(
        "insertHTML",
        false,
        `<figure><img src="${url}" alt="${safeAlt}" /><figcaption></figcaption></figure><p><br></p>`
      );
      emit();
      rememberSelection();
    },
    [emit, rememberSelection, restoreSelection, sourceMode]
  );

  useImperativeHandle(ref, () => ({ insertImage }), [insertImage]);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || sourceMode || editor.contains(document.activeElement)) return;
    if (editor.innerHTML !== (value || "")) editor.innerHTML = value || "";
  }, [sourceMode, value]);

  useLayoutEffect(() => {
    const textarea = sourceRef.current;
    if (!sourceMode || !textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
  }, [minHeight, sourceMode, value]);

  const addLink = () => {
    const url = window.prompt("Nhập đường dẫn liên kết (https://...)");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      window.alert("Liên kết phải bắt đầu bằng http:// hoặc https://");
      return;
    }
    execute("createLink", url);
  };

  const toggleSource = () => {
    if (sourceMode) {
      setSourceMode(false);
      return;
    }
    emit();
    setSourceMode(true);
  };

  return (
    <SoftBox
      sx={{ border: "1px solid #d8dee8", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}
    >
      <SoftBox
        display="flex"
        alignItems="center"
        gap={0.5}
        flexWrap="wrap"
        p={1}
        bgcolor="#f7f9fc"
        sx={{ borderBottom: "1px solid #d8dee8", position: "sticky", top: 0, zIndex: 2 }}
        onMouseDown={(event) => {
          if (event.target.closest("button")) event.preventDefault();
        }}
      >
        <Select
          size="small"
          value="p"
          disabled={sourceMode}
          onChange={(event) => execute("formatBlock", event.target.value)}
          sx={{ height: 34, minWidth: 130, fontSize: 13 }}
        >
          <MenuItem value="p">Đoạn văn</MenuItem>
          <MenuItem value="h2">Tiêu đề lớn</MenuItem>
          <MenuItem value="h3">Tiêu đề nhỏ</MenuItem>
          <MenuItem value="blockquote">Trích dẫn</MenuItem>
        </Select>
        {tools.map(([icon, label, command]) => (
          <Tooltip title={label} key={command}>
            <SoftButton
              aria-label={label}
              variant="text"
              color="dark"
              disabled={sourceMode}
              onClick={() => execute(command)}
              sx={{ minWidth: 34, width: 34, height: 34, p: 0 }}
            >
              <Icon fontSize="small">{icon}</Icon>
            </SoftButton>
          </Tooltip>
        ))}
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Tooltip title="Thêm liên kết">
          <SoftButton
            variant="text"
            color="dark"
            disabled={sourceMode}
            onClick={addLink}
            sx={{ minWidth: 34, width: 34, height: 34, p: 0 }}
          >
            <Icon fontSize="small">link</Icon>
          </SoftButton>
        </Tooltip>
        <Tooltip title="Bỏ liên kết">
          <SoftButton
            variant="text"
            color="dark"
            disabled={sourceMode}
            onClick={() => execute("unlink")}
            sx={{ minWidth: 34, width: 34, height: 34, p: 0 }}
          >
            <Icon fontSize="small">link_off</Icon>
          </SoftButton>
        </Tooltip>
        <Tooltip title="Xóa định dạng">
          <SoftButton
            variant="text"
            color="dark"
            disabled={sourceMode}
            onClick={() => execute("removeFormat")}
            sx={{ minWidth: 34, width: 34, height: 34, p: 0 }}
          >
            <Icon fontSize="small">format_clear</Icon>
          </SoftButton>
        </Tooltip>
        <SoftBox flex={1} />
        <SoftButton
          size="small"
          variant={sourceMode ? "gradient" : "outlined"}
          color="secondary"
          onClick={toggleSource}
        >
          <Icon>code</Icon>&nbsp;{sourceMode ? "Soạn thảo" : "HTML"}
        </SoftButton>
      </SoftBox>

      {sourceMode ? (
        <SoftBox
          ref={sourceRef}
          component="textarea"
          rows={3}
          value={value || ""}
          onChange={(event) => {
            onChange(event.target.value);
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.max(
              event.currentTarget.scrollHeight,
              minHeight
            )}px`;
          }}
          spellCheck={false}
          sx={{
            width: "100%",
            minHeight,
            p: 2,
            border: 0,
            outline: 0,
            resize: "none",
            overflow: "hidden",
            fontFamily: "monospace",
            fontSize: 14,
            lineHeight: 1.6,
            boxSizing: "border-box",
          }}
        />
      ) : (
        <SoftBox
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Nội dung chi tiết"
          onInput={emit}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          sx={{
            minHeight,
            p: { xs: 2, md: 3 },
            outline: 0,
            fontSize: 16,
            lineHeight: 1.75,
            "&:empty:before": { content: '"Bắt đầu nhập nội dung chi tiết..."', color: "#9aa4b2" },
            "& h2": { fontSize: 28, mt: 2, mb: 1 },
            "& h3": { fontSize: 22, mt: 1.5, mb: 1 },
            "& blockquote": { borderLeft: "4px solid #1976d2", pl: 2, ml: 0, color: "#536273" },
            "& img": {
              display: "block",
              maxWidth: "100%",
              height: "auto",
              mx: "auto",
              borderRadius: 2,
            },
            "& figure": { m: "24px 0", textAlign: "center" },
            "& figcaption": { color: "#7a8594", fontSize: 13, mt: 0.5 },
            "& a": { color: "#1976d2", textDecoration: "underline" },
          }}
        />
      )}
      <SoftBox px={1.5} py={0.75} bgcolor="#f7f9fc" sx={{ borderTop: "1px solid #e7ebf0" }}>
        <SoftTypography variant="caption" color="text">
          Chọn đoạn văn bản rồi dùng thanh công cụ. Ảnh được chèn đúng tại vị trí con trỏ.
        </SoftTypography>
      </SoftBox>
    </SoftBox>
  );
});

export default RichTextEditor;
