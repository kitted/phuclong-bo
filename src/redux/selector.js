import { createSelector } from "@reduxjs/toolkit";

export const authSelector = (state) => state.auth;

export const getAuth = createSelector(authSelector, (auth) => {
  return auth;
});
