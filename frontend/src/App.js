import React from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import MemberListByYear from "./pages/MemberListByYear";
import MemberTransition from "./pages/MemberTransition";
import Cube from "./pages/Cube";

// ナビゲーション用コンポーネント
const NavBar = () => {
  const location = useLocation();
  const navItems = [
    { to: "/", label: "ホーム" },
    { to: "/members", label: "生年月日順ソート" },
    { to: "/transition", label: "メンバー構成の遷移" },
    { to: "/cube", label: "Cube" }, // 追加
  ];

  return (
    <nav style={{
      display: "flex",
      gap: "32px",
      justifyContent: "center",
      alignItems: "center",
      background: "#fff",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      padding: "12px 0",
      margin: "0 auto",
      maxWidth: "700px"
    }}>
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          style={{
            position: "relative",
            fontWeight: location.pathname === item.to ? "bold" : "normal",
            fontSize: "1.15rem",
            color: location.pathname === item.to ? "#812990" : "#333",
            textDecoration: "none",
            padding: "6px 12px",
            transition: "color 0.2s",
          }}
        >
          {item.label}
          <span
            style={{
              display: "block",
              height: "3px",
              borderRadius: "2px",
              background: location.pathname === item.to ? "#812990" : "transparent",
              width: "100%",
              position: "absolute",
              left: 0,
              bottom: 0,
              transition: "background 0.2s"
            }}
          />
        </Link>
      ))}
    </nav>
  );
};

function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: "24px 0", background: "#f7f6fa", marginBottom: "32px" }}>
        <NavBar />
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/members" element={<MemberListByYear />} />
        <Route path="/transition" element={<MemberTransition />} />
        <Route path="/cube" element={<Cube />} /> {/* 追加 */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;