import { useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { AuthService } from "services/authService";
import { updateUser } from "redux/slice/authSlice";

export default function useAutoRefreshUser() {
  const dispatch = useDispatch();
  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem("access_token")) return;
    try {
      const { data: user } = await AuthService.getMe();
      dispatch(updateUser(user));
    } catch (error) {
      console.error("Auto refresh getMe failed:", error);
    }
  }, [dispatch]);

  useEffect(() => {
    refreshUser();
    const interval = setInterval(refreshUser, 10 * 60 * 1000);
    const refreshOnFocus = () => refreshUser();
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshUser]);
}
