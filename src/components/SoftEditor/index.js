// react-quill components
import ReactQuill from "react-quill";

// react-quill styles
import "react-quill/dist/quill.snow.css";

// Custom styles for the SoftEditor
import SoftEditorRoot from "components/SoftEditor/SoftEditorRoot";

function SoftEditor(props) {
  return (
    <SoftEditorRoot>
      <ReactQuill theme="snow" {...props} />
    </SoftEditorRoot>
  );
}

export default SoftEditor;
