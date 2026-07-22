import { useState } from "react";
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "redux/slice/authSlice";

export default function StaffAccountMenu() {
  const [anchor, setAnchor] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const close = () => setAnchor(null);
  const changePassword = () => {
    close();
    navigate("/user/change-password");
  };
  const signOut = () => {
    close();
    dispatch(logout());
    navigate("/", { replace: true });
  };
  return (
    <>
      <IconButton onClick={(event) => setAnchor(event.currentTarget)} sx={{ bgcolor: "#f0f2f5" }} aria-label="Mở menu tài khoản">
        <Icon>account_circle</Icon>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} PaperProps={{ sx: { minWidth: 210, mt: 1, borderRadius: 2 } }}>
        <MenuItem onClick={changePassword}><ListItemIcon><Icon fontSize="small">lock_reset</Icon></ListItemIcon><ListItemText>Đổi mật khẩu</ListItemText></MenuItem>
        <MenuItem onClick={signOut} sx={{ color: "#c62828" }}><ListItemIcon><Icon fontSize="small" sx={{ color: "#c62828" }}>logout</Icon></ListItemIcon><ListItemText>Đăng xuất</ListItemText></MenuItem>
      </Menu>
    </>
  );
}
