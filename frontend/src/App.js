import React, { useState, useEffect, Suspense, lazy } from "react"; // Suspense と lazy をインポート
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom"; // React Routerのコンポーネントをインポート
import Home from "./features/home/components/Home"; // ホームページのコンポーネントをインポート
import MemberListByYear from "./features/member-list/components/MemberListByYear"; // 生年月日順ソートページのコンポーネントをインポート
import MemberTransition from "./features/member-transition/components/MemberTransition"; // メンバー構成の遷移ページのコンポーネントをインポート
import TVInfo from "./features/tv-info/components/TVInfo"; // TV出演情報ページのコンポーネントをインポート
import './App.css'; // アプリケーション全体のスタイルシートをインポート

// Firebaseの初期化関数とインスタンスのインポートはここから削除し、
// RubiksCubeコンポーネント内で遅延ロードするように変更します。
// import { initializeFirebaseAndAuth } from './firebaseConfig'; // この行は削除

// RubiksCubeコンポーネントを遅延ロード (lazy loading) するように設定
// このコンポーネントがレンダリングされるときに初めて、関連するコードが読み込まれます。
const RubiksCube = lazy(() => import("./features/rubiks-cube/components/RubiksCube"));

// ナビゲーションバーコンポーネント
// isModalOpen プロップスはヘッダー全体で制御するため、NavBarからは削除します
const NavBar = () => {
  const location = useLocation(); // 現在のURLロケーションを取得
  const [isOpen, setIsOpen] = useState(false); // モバイルメニューの開閉状態を管理

  // ナビゲーションアイテムの定義
  const navItems = [
    { to: "/", label: "ホーム" },
    { to: "/members", label: "生年月日順ソート" },
    { to: "/transition", label: "メンバー構成の遷移" },
    { to: "/tv-info", label: "TV出演情報" },
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
    // isModalOpen に基づくクラスはヘッダー全体で制御されるため、ここからは削除
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
  // モーダルが開いているかどうかを管理する新しいstate
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Firebaseの初期化と認証に関連するstateはここから削除します。
  // const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  // const [currentUserId, setCurrentUserId] = useState(null);

  // useEffect(() => {
  //   async function initFirebase() {
  //     try {
  //       const { userId } = await initializeFirebaseAndAuth();
  //       setCurrentUserId(userId);
  //       setFirebaseAuthReady(true);
  //     } catch (error) {
  //       console.error("Firebase: Initialization failed in App.js:", error);
  //       setFirebaseAuthReady(false);
  //     }
  //   }
  //   initFirebase();
  // }, []);

  // Firebase認証のローディング表示はここから削除し、
  // RubiksCubeコンポーネントのSuspense fallbackで表示するようにします。
  // if (!firebaseAuthReady) {
  //   return (
  //     <div className="loading-container">
  //       <div className="spinner"></div>
  //       <p>読み込み中...</p>
  //     </div>
  //   );
  // }

  // Firebase認証が完了したら、ルーターとアプリケーションコンテンツをレンダリング
  // RubiksCubeがロードされるまで表示されるフォールバックUIをSuspenseで定義
  return (
    // BrowserRouterを使用してルーティングを管理
    // basename="/Sakamichi" で、GitHub Pages のサブディレクトリパスをベースとして設定
    <BrowserRouter basename="/Sakamichi">
      {/* ヘッダー全体にisModalOpenの状態を元にしたクラスを適用 */}
      <header className={`app-header-custom ${isModalOpen ? 'hide-header' : ''}`}> {/* カスタムヘッダークラス */}
        {/* NavBarにはisModalOpenの状態を渡す必要がなくなったため削除 */}
        <NavBar /> {/* ナビゲーションバーコンポーネントを配置 */}
      </header>
      {/* Routesでルーティングルールを定義 */}
      <Routes>
        <Route path="/" element={<Home />} /> {/* ルートパスのコンポーネント */}
        <Route path="/members" element={<MemberListByYear />} /> {/* /membersパスのコンポーネント */}
        {/* MemberTransitionにsetIsModalOpen関数を渡す */}
        <Route path="/transition" element={<MemberTransition setModalOpen={setIsModalOpen} />} /> {/* /transitionパスのコンポーネント */}
        <Route path="/tv-info" element={<TVInfo />} /> {/* TV出演情報ページのコンポーネント */}
        {/* RubiksCubeコンポーネントを遅延ロード */}
        {/* RubiksCubeがロードされるまで表示されるローディングUIをSuspenseで定義 */}
        <Route
          path="/cube"
          element={
            // RubiksCubeがロードされるまで表示されるローディングUI
            <Suspense fallback={
              <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
              </div>
            }>
              <RubiksCube />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
