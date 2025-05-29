import React, { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

// コンポーネント
import Cubelet from "../utils/Cubelet";
import RotatingGroup from "../utils/RotatingGroup";
import AxesArrows from "../utils/AxesArrows";
import DebugPanel from "./DebugPanel";

// カスタムフック
import { useCubeState } from "../hooks/useCubeState";
import { useDragRotation } from "../hooks/useDragRotation";
import { useCameraControls } from "../hooks/useCameraControls";
import { useStopwatch } from "../hooks/useStopwatch"; // Stopwatchフックをインポート

// スタイル
import buttonStyle from "../../../styles/buttonStyle";

function RubiksCube({ faceKanji = "乃木櫻日向坂" }) {
  // デバッグ状態
  const [showDebug, setShowDebug] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // ストップウォッチ
  const { time, startStopwatch, stopStopwatch, resetStopwatch } = useStopwatch();

  // キューブ状態管理
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
    gameStarted, // gameStartedの状態を追加
    setGameStarted, // setGameStartedのセッターを追加
  } = useCubeState(faceKanji, stopStopwatch); // stopStopwatchをuseCubeStateに渡す

  // カメラ制御
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
    showZoomControls, // showZoomControlsをインポート
    toggleZoomControls, // toggleZoomControlsをインポート
    setDisableOrbitRotation, // setDisableOrbitRotationをインポート
  } = useCameraControls();

  // ドラッグ回転（judgeCleared関数を渡す）
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
    judgeCleared, // judgeClearedはuseCubeStateでstopStopwatchを呼ぶようになる
    setDisableOrbitRotation // setDisableOrbitRotationをuseDragRotationに渡す
  );

  // ゲームスタートハンドラ
  const handleGameStart = async () => {
    resetStopwatch(); // ストップウォッチをリセット
    await randomRotate(); // ランダム回転を実行
    setGameStarted(true); // ゲーム開始状態をtrueに
    startStopwatch(); // ストップウォッチを開始
  };

  return (
    <div
      style={{ width: '100%', height: '800px', background: '#f0f0f0' }}
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      {/* ズームコントロール */}
      {showZoomControls && ( // showZoomControlsがtrueの場合のみ表示
        <div style={{
          position: "absolute",
          top: 150,
          left: 10,
          zIndex: 2100,
          background: "#fff",
          padding: "12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(153, 125, 125, 0.08)",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}>
          <button 
            onClick={() => adjustCameraDistance(0.5)} 
            style={buttonStyle}
          >
            －
          </button>
          <input
            type="range"
            min={CAMERA_DISTANCE_MIN}
            max={CAMERA_DISTANCE_MAX}
            step={0.1}
            value={CAMERA_DISTANCE_MAX - cameraDistance + CAMERA_DISTANCE_MIN}
            onChange={e => {
              e.target.value = CAMERA_DISTANCE_MAX - e.target.value + CAMERA_DISTANCE_MIN;
              handleSlider(e);
            }}
            style={{ width: 120 }}
          />
          <button 
            onClick={() => adjustCameraDistance(-0.5)} 
            style={buttonStyle}
          >
            ＋
          </button>
        </div>
      )}

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

      {/* クリア表示 */}
      {isCleared && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "rgba(255,255,255,0.95)",
          color: "#1976d2",
          fontSize: "2rem",
          fontWeight: "bold",
          padding: "32px 48px",
          borderRadius: "16px",
          zIndex: 3000,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)"
        }}>
          クリア！<br />
          タイム: {time.toFixed(2)}秒
        </div>
      )}

      {/* コントロールパネル */}
      <div style={{
        position: "absolute",
        top: 250,
        left: 10,
        zIndex: 2100,
        background: "#fff",
        padding: "12px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px"
      }}>
        {/* ストップウォッチ表示 */}
        {gameStarted && !isCleared && (
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#333" }}>
            タイム: {time.toFixed(2)}秒
          </div>
        )}

        <button onClick={handleGameStart} style={buttonStyle} disabled={gameStarted && !isCleared}>
          {gameStarted && !isCleared ? "ゲーム中" : "ゲームスタート"}
        </button>

        <button
          style={{
            ...buttonStyle,
            background: lockPolar ? "#1976d2" : "#aaa",
            color: "#fff"
          }}
          onClick={togglePolarLock}
        >
          {lockPolar ? "回転軸固定" : "回転自由"}
        </button>

        {/* ズームコントロール表示切り替えボタン */}
        <button
          style={buttonStyle}
          onClick={toggleZoomControls}
        >
          {showZoomControls ? "ズーム非表示" : "ズーム表示"}
        </button>

        <button
          style={buttonStyle}
          onClick={() => rotateEntireCube("z", true)}
        >
          Z軸全体90度回転
        </button>
      </div>

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
