import React from "react";

const Home = () => (
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
    <h1 style={{ color: "#812990", marginBottom: "16px" }}>坂道グループ情報サイト</h1>
    <p style={{ fontSize: "1.1rem", color: "#444" }}>
      坂道グループのメンバー情報をまとめました。<br />
      上部メニューから各機能ページへ移動できます。
    </p>
  </div>
);

export default Home;