import React from "react";

const Layout = ({ children }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      maxWidth: "700px",
      margin: "0 auto",
      padding: "40px 24px",
      textAlign: "center",
    }}
  >
    {children}
  </div>
);

export default Layout;