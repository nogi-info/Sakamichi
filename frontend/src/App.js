import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { SakamichiMasterDataProvider, useSakamichiMasterDataContext } from "./features/common/SakamichiMasterDataContext";
import Home from "./features/home/components/Home";
import MemberListByYear from "./features/member-list/components/MemberListByYear";
import MemberTransition from "./features/member-transition/components/MemberTransition";
import TVInfo from "./features/tv-info/components/TVInfo";
import './App.css';
import { getMemberDisplayGroupName } from "./features/common/utils/memberUtils";

const RubiksCube = lazy(() => import("./features/rubiks-cube/components/RubiksCube"));

// ナビゲーションバーコンポーネント
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

// デバッグ用：マスターデータをコンソールに表示するだけのコンポーネント
function MasterDataDebugger() {
  const { data, loading, error } = useSakamichiMasterDataContext();

  useEffect(() => {
    if (data) {
      console.log("Sakamichi Master Data:", data);
      const testTargetName = "遠藤さくら";
      const targetMember = data.members.find(member => member.名前 === testTargetName);
      if (targetMember) {
        // ユーティリティ関数 getMemberDisplayGroupName を使用するように修正
        console.log(testTargetName + " : " + getMemberDisplayGroupName(targetMember, data.groupMap, new Date()));
      } else {
        // メンバーが見つからなかった場合のログ
        console.log(`メンバー「${testTargetName}」は見つかりませんでした。`);
      }    }
    if (error) {
      console.error("Sakamichi Master Data Load Error:", error);
    }
  }, [data, error]);

  return null; // 画面には何も表示しない
}

// アプリケーションのメインコンポーネント
function App() {
  // モーダルが開いているかどうかを管理する新しいstate
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <SakamichiMasterDataProvider>
      {process.env.REACT_APP_DEBUG === 'true' && <MasterDataDebugger />} {/* デバッグモードのときのみマスターデータを表示 */}
      {/* BrowserRouterを使用してルーティングを管理 */}
      {/* basename="/Sakamichi" で、GitHub Pages のサブディレクトリパスをベースとして設定 */}
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
    </SakamichiMasterDataProvider>
  );
}

export default App;
