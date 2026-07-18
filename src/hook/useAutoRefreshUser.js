import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { AuthService } from "services/authService";
import { updateUser } from "redux/slice/authSlice";

export default function useAutoRefreshUser() {
  const dispatch = useDispatch();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { data: user } = await AuthService.getMe();
        dispatch(updateUser(user));
      } catch (error) {
        console.error("Auto refresh getMe failed:", error);
      }
    }, 10 * 60 * 1000); // 10 phút

    return () => clearInterval(interval);
  }, []);
}
