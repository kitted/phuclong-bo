import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

import { SoftUIControllerProvider } from "context";
import { persistStore } from "redux-persist";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import store from "./redux/store";
import AppErrorBoundary from "components/AppErrorBoundary";

const bootFallback = (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Roboto, sans-serif", color: "#65676b" }}>
    Đang khởi động ứng dụng...
  </div>
);

const root = ReactDOM.createRoot(document.getElementById("root"));
let persistor = persistStore(store);

root.render(
  <AppErrorBoundary>
    <BrowserRouter>
      <SoftUIControllerProvider>
        <Provider store={store}>
          <PersistGate loading={bootFallback} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </SoftUIControllerProvider>
    </BrowserRouter>
  </AppErrorBoundary>
);
