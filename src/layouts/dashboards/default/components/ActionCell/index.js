/* eslint-disable react/prop-types */
// @mui material components
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import Icon from "@mui/material/Icon";
import Tooltip from "@mui/material/Tooltip";

// Soft UI Dashboard PRO React components
import SoftBox from "components/SoftBox";
import SoftTypography from "components/SoftTypography";
import React from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

function ActionCell({ item, setDataTable }) {
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <SoftBox display="flex" alignItems="center">
      <Link to={`/quan-ly-xe/xe/${item?._id}`}>
        <SoftTypography variant="body1" color="success" sx={{ cursor: "pointer", lineHeight: 0 }}>
          <Tooltip title="Xem chi tiết" placement="top">
            <Icon>visibility</Icon>
          </Tooltip>
        </SoftTypography>
      </Link>
      {/* <SoftBox mx={2}>
        <Link to={`/quan-ly-xe/xe/${item?._id}/edit`}>
          <SoftTypography variant="body1" color="info" sx={{ cursor: "pointer", lineHeight: 0 }}>
            <Tooltip title="Cập nhật" placement="top">
              <Icon>edit</Icon>
            </Tooltip>
          </SoftTypography>
        </Link>
      </SoftBox> */}
      {/* <SoftTypography
        onClick={handleClickOpen}
        variant="body1"
        color="error"
        sx={{ cursor: "pointer", lineHeight: 0 }}
      >
        <Tooltip title="Xóa" placement="left">
          <Icon>delete</Icon>
        </Tooltip>
      </SoftTypography> */}
      {/* <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Xóa xe &quot;{item?.name}&quot; ?</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Bạn có chắc chắn muốn xóa?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Hủy</Button>
          <Button onClick={handleDelete} autoFocus>
            Đồng ý
          </Button>
        </DialogActions>
      </Dialog> */}
    </SoftBox>
  );
}

export default ActionCell;
