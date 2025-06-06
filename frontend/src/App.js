import React, { useState, useEffect } from "react"; // useState と useEffect をインポート
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom"; // React Routerのコンポーネントをインポート
import Home from "./features/home/components/Home"; // ホームページのコンポーネントをインポート
import MemberListByYear from "./features/member-list/components/MemberListByYear"; // 生年月日順ソートページのコンポーネントをインポート
import MemberTransition from "./features/member-transition/components/MemberTransition"; // メンバー構成の遷移ページのコンポーネントをインポート
import RubiksCube from "./features/rubiks-cube/components/RubiksCube"; // ルービックキューブページのコンポーネントをインポート
import './App.css'; // アプリケーション全体のスタイルシートをインポート

// Firebaseの初期化関数とインスタンスをインポート
import { initializeFirebaseAndAuth } from './firebaseConfig';

// ナビゲーションバーコンポーネント
const NavBar = () => {
  const location = useLocation(); // 現在のURLロケーションを取得
  const [isOpen, setIsOpen] = useState(false); // モバイルメニューの開閉状態を管理

  // ナビゲーションアイテムの定義
  const navItems = [
    { to: "/", label: "ホーム" },
    { to: "/members", label: "生年月日順ソート" },
    { to: "/transition", label: "メンバー構成の遷移" },
    { to: "/cube", label: "Cube" },
  ];

  // メニュー開閉トグル関数
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // BrowserRouter の basename と一致させる
  const basename = "/Sakamichi"; 
  
  // URL パスから basename を取り除き、アプリ内の相対パスを取得
  // 例: /Sakamichi/members -> /members
  const appPathname = location.pathname.startsWith(basename)
    ? location.pathname.substring(basename.length)
    : location.pathname;
  
  // ルートパスの場合、正規化して "/" とする
  // 例: "" -> "/", "/Sakamichi" -> "/"
  const normalizedAppPathname = appPathname === "" || appPathname === "/" ? "/" : appPathname;

  // 現在のパスに対応するナビゲーションアイテムを見つける
  const currentPageItem = navItems.find(item => item.to === normalizedAppPathname);
  
  // 見つからなければデフォルトタイトルを設定
  const currentPageTitle = currentPageItem ? currentPageItem.label : "乃木坂情報"; 

  return (
    <nav className="nav-bar-hamburger">
      {/* 画面幅が小さいときに表示される現在のページタイトル */}
      {/* モバイルで現在のページをユーザーに伝えるための要素 */}
      <span className="current-page-title-mobile" role="heading" aria-level="1">{currentPageTitle}</span>

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
              // 現在のパスがアクティブなリンクであることを示すクラスを適用
              className={`nav-item-hamburger ${item.to === normalizedAppPathname ? "active" : ""}`}
              onClick={() => setIsOpen(false)} // メニュー項目クリックでメニューを閉じる
            >
              {item.label}
              <span className="nav-item-underline-hamburger" /> {/* アクティブなリンクの下線 */}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

// アプリケーションのメインコンポーネント
function App() {
  // Firebaseの初期化と認証が完了したかどうかの状態
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  // 認証されたユーザーIDを保持（デバッグや将来的な機能拡張用）
  const [currentUserId, setCurrentUserId] = useState(null);

  // Firebaseの初期化と認証をコンポーネントマウント時に一度だけ実行
  useEffect(() => {
    async function initFirebase() {
      try {
        const { userId } = await initializeFirebaseAndAuth();
        setCurrentUserId(userId); // 認証されたユーザーIDをstateにセット
        setFirebaseAuthReady(true); // Firebase認証が完了したことをマーク
      } catch (error) {
        console.error("Firebase: Initialization failed in App.js:", error);
        // エラーが発生した場合も、アプリケーションを続行できるようにする
        // ただし、Firebaseに依存する機能は正しく動作しない可能性があります。
        setFirebaseAuthReady(false); 
      }
    }
    initFirebase();
  }, []); // 空の依存配列により、コンポーネントマウント時に一度だけ実行

  // Firebase認証がまだ完了していない場合はローディング表示
  if (!firebaseAuthReady) {
    return (
      <div className="loading-container">
        <div className="spinner"></div> {/* スピナー要素 */}
        <p>読み込み中...</p>
      </div>
    );
  }

  // Firebase認証が完了したら、ルーターとアプリケーションコンテンツをレンダリング
  return (
    // BrowserRouterを使用してルーティングを管理
    // basename="/Sakamichi" で、GitHub Pages のサブディレクトリパスをベースとして設定
    <BrowserRouter basename="/Sakamichi">
      <header className="app-header-custom"> {/* カスタムヘッダークラス */}
        <NavBar /> {/* ナビゲーションバーコンポーネントを配置 */}
      </header>
      {/* Routesでルーティングルールを定義 */}
      <Routes>
        <Route path="/" element={<Home />} /> {/* ルートパスのコンポーネント */}
        <Route path="/members" element={<MemberListByYear />} /> {/* /membersパスのコンポーネント */}
        <Route path="/transition" element={<MemberTransition />} /> {/* /transitionパスのコンポーネント */}
        <Route path="/cube" element={<RubiksCube />} /> {/* /cubeパスのコンポーネント */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
