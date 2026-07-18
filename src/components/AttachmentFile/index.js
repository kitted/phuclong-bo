/* eslint-disable react/prop-types */
import SoftTypography from "components/SoftTypography";
import { Box, Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { truncateText } from "utils";
import DeleteIcon from "@mui/icons-material/Delete";

function FileAttachment(props) {
  const { id, containsEdit, containsConfirm, containsCreate, file, setFile, showAll } = props;
  //attachment
  const [isFiles, setIsFiles] = useState([]);
  const [isFileRemove, setIsFileRemove] = useState([]);

  const handleChangeFiles = (event) => {
    const files = event.target.files;
    const newFiles = [...(file || [])];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExists = newFiles.some((existingFile) => existingFile.name === file.name);
      if (!fileExists) {
        newFiles.push(file);
      }
    }
    setIsFiles(newFiles);
    setFile(newFiles);
  };

  const handleDeleteFile = (index) => {
    if (isFiles) {
      const newFiles = [...isFiles];
      const deletedFile = newFiles.splice(index, 1)[0];
      setIsFileRemove((prev) => {
        return [...prev, deletedFile];
      });
      setIsFiles(newFiles);
      setFile(newFiles);
    }
  };

  function isImageLink(link) {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"];
    const lowerCaseLink = link.toLowerCase();
    return imageExtensions.some((ext) => lowerCaseLink.endsWith(ext));
  }

  const downloadFile = async (links) => {
    for (const link of links) {
      const anchor = document.createElement("a");
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      if (isImageLink(link)) {
        anchor.href = link;
        anchor.target = "_blank";
      } else {
        anchor.href = link;
        anchor.download = link.substring(link.lastIndexOf("/") + 1);
      }
      anchor.click();
      document.body.removeChild(anchor);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  useEffect(() => {
    if (id && containsEdit) {
      setIsFiles(file);
    }
  }, [file]);


  return (
    <Grid>
      <SoftTypography component="label" variant="caption" fontWeight="bold" mb={0.2} mt={2.2}>
        {!containsEdit && file?.length === 0 ? "" : "File đính kèm"}
      </SoftTypography>
      {showAll &&
        file.length > 0 &&
        file?.map((file, index) => (
          <div style={{ display: "flex", gap: "5px" }} key={index}>
            {/* <span style={{ color: "black", whiteSpace: "nowrap" }}>{truncateText(file, 35)}</span> */}
            <a
              target="_blank"
              rel="noreferrer"
              href={file.name ? "#" : file}
              style={{ color: "black", whiteSpace: "nowrap", fontSize: "12px" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "blue")}
              onMouseOut={(e) => (e.currentTarget.style.color = "black")}
            >
              {truncateText(file, 95)}
            </a>
          </div>
        ))}
      {id && !containsEdit && !containsConfirm ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            fontSize: "12px",
          }}
        >
          {file?.length > 0 && (
            <button
              type="button"
              style={{
                cursor: "pointer",
                background: "none",
                border: "none",
                display: "flex",
                justifyItems: "flex-start",
              }}
              onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
              onClick={() => downloadFile(file)}
            >
              Tải tất cả
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            fontSize: "12px",
          }}
        >
          {isFiles?.length > 0 &&
            isFiles?.map((file, index) => (
              <div style={{ display: "flex", gap: "5px" }} key={index}>
                {!containsEdit ? (
                  <span style={{ color: "black", whiteSpace: "nowrap" }}>
                    {file.name ? file.name : truncateText(file, 35)}
                  </span>
                ) : (
                  <a
                    href={file.name ? "#" : file}
                    style={{ color: "black", whiteSpace: "nowrap" }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "blue")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "black")}
                  >
                    {file.name ? file.name : truncateText(file, 35)}
                  </a>
                )}
                <span
                  style={{ cursor: "pointer" }}
                  onMouseOver={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseOut={(e) => (e.currentTarget.style.textDecoration = "none")}
                  onClick={() => handleDeleteFile(index)}
                >
                  <DeleteIcon color="error" />
                </span>
              </div>
            ))}
        </div>
      )}

      {!containsEdit && containsConfirm && (
        <div style={{ padding: "15px 0" }}>
          <input
            type="file"
            multiple
            id={`file`}
            style={{ display: "none" }}
            onChange={handleChangeFiles}
          />
          <label
            htmlFor={`file`}
            style={{
              fontSize: "12px",
              padding: "8px",
              border: "1px solid #d2d6da",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Upload File
          </label>
        </div>
      )}
      {containsCreate && (
        <div style={{ padding: "15px 0" }}>
          <input
            type="file"
            multiple
            id={`file`}
            style={{ display: "none" }}
            onChange={handleChangeFiles}
          />
          <label
            htmlFor={`file`}
            style={{
              fontSize: "12px",
              padding: "14px",
              border: "1px solid #d2d6da",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Upload File
          </label>
        </div>
      )}
      {containsEdit && id && (
        <div style={{ padding: "15px 0" }}>
          <input
            type="file"
            multiple
            id={`file`}
            style={{ display: "none" }}
            onChange={handleChangeFiles}
          />
          <label
            htmlFor={`file`}
            style={{
              fontSize: "12px",
              padding: "14px",
              border: "1px solid #d2d6da",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Upload File
          </label>
        </div>
      )}
    </Grid>
  );
}

export default FileAttachment;
