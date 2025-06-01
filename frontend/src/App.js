import React, { useState } from "react"; // useStateをインポート
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import MemberListByYear from "./features/member-list/components/MemberListByYear";
import MemberTransition from "./features/member-transition/components/MemberTransition";
import RubiksCube from "./features/rubiks-cube/components/RubiksCube";
import './App.css'; // スタイルシートをインポート

// ナビゲーション用コンポーネント
const NavBar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false); // メニューの開閉状態を管理

  const navItems = [
    { to: "/", label: "ホーム" },
    { to: "/members", label: "生年月日順ソート" },
    { to: "/transition", label: "メンバー構成の遷移" },
    { to: "/cube", label: "Cube" },
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="nav-bar-hamburger"> {/* 提案1と区別するためクラス名変更 */}
      {/* ハンバーガーアイコン（モバイル版のみ表示） */}
      <div className="hamburger-icon" onClick={toggleMenu}>
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
        <div className={`bar ${isOpen ? 'open' : ''}`}></div>
      </div>

      {/* ナビゲーションリンク（デスクトップ版では常に表示、モバイル版では開閉） */}
      <ul className={`nav-links ${isOpen ? 'open' : ''}`}>
        {navItems.map((item) => (
          <li key={item.to}>
            <Link
              to={item.to}
              className={`nav-item-hamburger ${location.pathname === item.to ? "active" : ""}`} // 提案1と区別するためクラス名変更
              onClick={() => setIsOpen(false)} // メニュー項目クリックでメニューを閉じる
            >
              {item.label}
              <span className="nav-item-underline-hamburger" /> {/* 提案1と区別するためクラス名変更 */}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

function App() {
  return (
    <BrowserRouter>
      <header className="app-header-custom"> {/* 提案1と同じヘッダークラス */}
        <NavBar />
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/members" element={<MemberListByYear />} />
        <Route path="/transition" element={<MemberTransition />} />
        <Route path="/cube" element={<RubiksCube />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;