import React, { useState, useEffect, useRef, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { initializeFirebaseAndAuth, db as globalDb, auth as globalAuth, appId as globalAppId } from '../../../firebaseConfig';
import Cubelet from "../utils/Cubelet";
import RotatingGroup from "../utils/RotatingGroup";
import AxesArrows from "../utils/AxesArrows";
import DebugPanel from "./DebugPanel";
import LeaderboardAndScoreSave from "./LeaderboardAndScoreSave";
import { useCubeState } from "../hooks/useCubeState";
import { useDragRotation } from "../hooks/useDragRotation";
import { useCameraControls } from "../hooks/useCameraControls";
import { useStopwatch } from "../hooks/useStopwatch";
import './RubiksCube.css';
import { useSakamichiMasterDataContext } from "../../common/SakamichiMasterDataContext";

// 時間表示のヘルパー関数
const formatTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  let formattedSecondsString = remainingSeconds.toFixed(2);
  const parts = formattedSecondsString.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '00';
  if (minutes === 0) {
    return `${integerPart}秒${decimalPart}`;
  } else {
    const paddedIntegerPart = integerPart.padStart(2, '0');
    return `${minutes}分${paddedIntegerPart}秒${decimalPart}`;
  }
};

function RubiksCube({ initialFaceKanji = "乃木櫻日向坂" }) {
  // マスターデータをContextから取得
  const { data, loading, error } = useSakamichiMasterDataContext();

  const [faceKanji, setFaceKanji] = useState(initialFaceKanji); 
  const [difficulty, setDifficulty] = useState(2);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Firebase関連のstate
  const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
  const [dbInstance, setDbInstance] = useState(null);
  const [authInstance, setAuthInstance] = useState(null);
  const [appIdInstance, setAppIdInstance] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // デバッグ・UI関連
  const [showDebug, setShowDebug] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // マスターデータからグループ情報・リンク情報を取得
  const groupData = useMemo(() => (data && data.groupMap)
    ? Object.entries(data.groupMap).flatMap(([group, arr]) =>
        arr.map(period => ({
          グループ名: group,
          旧グループ名: period.旧グループ名,
          開始日: period.開始日,
          終了日: period.終了日
        }))
      )
    : [], [data]);
  const links = useMemo(() => (data && data.members) ? data.members : [], [data]);

  // Firebase初期化
  useEffect(() => {
    async function initFirebaseForCube() {
      try {
        const { db, auth, userId } = await initializeFirebaseAndAuth();
        setDbInstance(db);
        setAuthInstance(auth);
        setAppIdInstance(globalAppId);
        setCurrentUserId(userId);
        setFirebaseAuthReady(true);
        console.log("Firebase initialized successfully for RubiksCube.");
      } catch (error) {
        console.error("Firebase: Initialization failed in RubiksCube.jsx:", error);
        setFirebaseAuthReady(false);
      }
    }
    initFirebaseForCube();
  }, []);

  // メンバーからランダムにfaceKanjiを生成
  const loadAndSetRandomFaceKanji = async () => {
    if (!links.length) {
      setFaceKanji(initialFaceKanji);
      setSelectedMember(null);
      return;
    }
    const dataRows = links;
    const randomIndex = Math.floor(Math.random() * dataRows.length);
    const selectedRow = dataRows[randomIndex];

    let groupName = selectedRow['グループ名'] ? selectedRow['グループ名'].trim() : '';
    const name = selectedRow['名前'] ? selectedRow['名前'].trim() : '';

    // グループ名置換判定
    const today = new Date();
    const gradDateStr = selectedRow['卒業・辞退・契約終了日'] ? selectedRow['卒業・辞退・契約終了日'].trim() : '-';
    const gradDate = gradDateStr === '-' ? today : new Date(gradDateStr);
    const matchingGroup = groupData.find(group =>
      group['グループ名'] === groupName &&
      gradDate >= new Date(group['開始日']) &&
      gradDate <= new Date(group['終了日'])
    );
    if (matchingGroup) {
      groupName = matchingGroup['旧グループ名'];
    }

    const combinedString = name + groupName;
    const newFaceKanji = combinedString.substring(0, 6);

    setFaceKanji(newFaceKanji || initialFaceKanji);
    setSelectedMember(selectedRow);
  };

  const { time, startStopwatch, stopStopwatch, resetStopwatch } = useStopwatch();

  const {
    cubelets,
    setCubelets,
    isRotating,
    setIsRotating,
    rotatingCubelets,
    setRotatingCubelets,
    rotationAxis,
    setRotationAxis,
    rotationAngle,
    setRotationAngle,
    rotationLayer,
    setRotationLayer,
    isCleared,
    faceTextures,
    staticCubelets,
    resetCube,
    rotateCubeFace,
    rotateEntireCube,
    randomRotate,
    judgeCleared,
    gameStarted,
    setGameStarted,
  } = useCubeState(faceKanji, difficulty, stopStopwatch);

  const {
    cameraDistance,
    lockPolar,
    handleSlider,
    adjustCameraDistance,
    togglePolarLock,
    getCameraConfig,
    getOrbitControlsConfig,
    CAMERA_DISTANCE_MIN,
    CAMERA_DISTANCE_MAX,
    showZoomControls,
    toggleZoomControls,
    setDisableOrbitRotation,
  } = useCameraControls();

  const { handleCubeletClick, handlePointerMove, handlePointerUp } = useDragRotation(
    cubelets,
    setCubelets,
    isRotating,
    setIsRotating,
    setRotatingCubelets,
    setRotationAxis,
    setRotationAngle,
    setRotationLayer,
    setDebugInfo,
    judgeCleared,
    setDisableOrbitRotation
  );

  const handleGameStart = async () => {
    resetCube();
    resetStopwatch();
    setGameStarted(true);

    if (difficulty !== 1) {
      await loadAndSetRandomFaceKanji();
    } else {
      setFaceKanji(initialFaceKanji);
      setSelectedMember(null);
    }

    await randomRotate();
    startStopwatch();
    setShowLeaderboard(false);
  };

  const handleRetry = () => {
    setFaceKanji(initialFaceKanji);
    resetCube();
    resetStopwatch();
    setGameStarted(false);
    setSelectedMember(null);
    setShowLeaderboard(false);
  };

  // データロード中やエラー時の表示
  if (loading || !firebaseAuthReady) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>データの読み込みに失敗しました</p>
      </div>
    );
  }

  return (
    <div
      className="rubiks-cube-container"
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      {/* 3Dシーン */}
      <Canvas
        camera={getCameraConfig()}
        onCreated={({ camera }) => {
          window.__threeFiberRoot = { getState: () => ({ camera }) };
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        {showAxes && <AxesArrows />}

        {/* 静的キューブレット */}
        {staticCubelets.map(cubelet => (
          <Cubelet
            key={cubelet.id}
            position={cubelet.position}
            rotation={cubelet.rotation}
            faceTextureIndices={cubelet.faceTextureIndices}
            faceTextures={faceTextures}
            onClick={handleCubeletClick}
            onPointerMove={handlePointerMove}
          />
        ))}

        {/* 回転中キューブレット */}
        {isRotating && rotatingCubelets.length > 0 && (
          <RotatingGroup
            cubelets={rotatingCubelets}
            rotationAxis={rotationAxis}
            rotationAngle={rotationAngle}
            faceTextures={faceTextures}
          />
        )}

        <OrbitControls {...getOrbitControlsConfig()} />
      </Canvas>

      {/* LeaderboardAndScoreSaveコンポーネントをレンダリング (ゲームクリア時) */}
      <LeaderboardAndScoreSave 
        mode="gameClear"
        isCleared={isCleared}
        time={time}
        difficulty={difficulty}
        selectedMember={selectedMember}
        groupData={groupData}
        links={links}
        onRetry={handleRetry}
        db={dbInstance}
        auth={authInstance}
        appId={appIdInstance}
      />

      {/* ゲーム開始用ボタン、難易度選択パネル */}
      {/* ゲーム開始前 (gameStartedがfalse) のみ表示 */}
      {!gameStarted && (
        <div className="game-start-panel game-overlay-card">
          {/* ゲーム開始ボタン */}
          <button onClick={handleGameStart} className="game-button game-button-primary">
            ゲームスタート
          </button>

          {/* 難易度選択 */}
          <div className="difficulty-selection">
            <label className="difficulty-option">
              <input
                type="radio"
                name="difficulty"
                value={1}
                checked={difficulty === 1}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="difficulty-radio"
              />
              Level 1 (色のみ)
            </label>
            <label className="difficulty-option">
              <input
                type="radio"
                name="difficulty"
                value={2}
                checked={difficulty === 2}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="difficulty-radio"
              />
              Level 2 (文字+色)
            </label>
            <label className="difficulty-option">
              <input
                type="radio"
                name="difficulty"
                value={3}
                checked={difficulty === 3}
                onChange={(e) => setDifficulty(parseInt(e.target.value))}
                className="difficulty-radio"
              />
              Level 3 (文字のみ)
            </label>
          </div>

          {/* ベストタイム表示/非表示トグルボタン */}
          <button 
            onClick={() => setShowLeaderboard(!showLeaderboard)} 
            className="game-button game-button-secondary leaderboard-toggle-button"
          >
            {showLeaderboard ? 'ベストタイムを非表示' : 'ベストタイムを表示'}
          </button>

          {/* ベストタイム表の表示 (LeaderboardAndScoreSaveをdisplayOnlyモードで呼び出す) */}
          {showLeaderboard && (
            <LeaderboardAndScoreSave
              mode="displayOnly"
              difficulty={difficulty}
              db={dbInstance}
              auth={authInstance}
              appId={appIdInstance}
            />
          )}

        </div>
      )}

      {/* ゲーム実行中 (gameStartedがtrueかつisClearedがfalse) のみストップウォッチを表示 */}
      {gameStarted && !isCleared && (
        <div className="game-time-display game-overlay-card">
          <div className="time-label">タイム: </div>
          <div className="current-time">{formatTime(time)}</div>
        </div>
      )}

      {/* デバッグパネル */}
      <DebugPanel
        debugInfo={debugInfo}
        onRotate={rotateCubeFace}
        onReset={resetCube}
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes(!showAxes)}
      />
    </div>
  );
}

export default RubiksCube;
