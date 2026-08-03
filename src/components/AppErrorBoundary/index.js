import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Application render error", error, info);
  }

  retry = () => {
    window.location.reload();
  };

  resetSession = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("reset_token");
    localStorage.removeItem("persist:root");
    window.location.replace("/");
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f0f2f5",
          fontFamily: "Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            padding: 24,
            borderRadius: 16,
            background: "#fff",
            boxShadow: "0 4px 18px rgba(0,0,0,.1)",
          }}
        >
          <h2 style={{ margin: "0 0 8px" }}>Giao diện tạm gặp lỗi</h2>
          <p style={{ color: "#65676b", lineHeight: 1.5 }}>
            Hãy thử tải lại trang. Tài khoản và dữ liệu đang nhập sẽ không bị xóa.
          </p>
          <pre
            style={{
              padding: 12,
              maxHeight: 120,
              overflow: "auto",
              borderRadius: 8,
              background: "#f7f7f7",
              color: "#c62828",
              whiteSpace: "pre-wrap",
              fontSize: 11,
            }}
          >
            {this.state.error?.message}
          </pre>
          <button
            type="button"
            onClick={this.retry}
            style={{
              width: "100%",
              marginTop: 12,
              padding: "12px 16px",
              border: 0,
              borderRadius: 10,
              background: "#1877f2",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Tải lại trang
          </button>
          <button
            type="button"
            onClick={this.resetSession}
            style={{
              width: "100%",
              marginTop: 8,
              padding: "10px 16px",
              border: "1px solid #d8dde3",
              borderRadius: 10,
              background: "#fff",
              color: "#65676b",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Đăng xuất và đặt lại phiên
          </button>
        </div>
      </div>
    );
  }
}
