import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: {} },
  reducers: {
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    logout: (state, action) => {
      state.user = {};
      localStorage.removeItem("access_token");
      localStorage.removeItem("reset_token");
    },
  },
  extraReducers: () => {},
});

export const { updateUser, logout } = authSlice.actions;

export default authSlice;
