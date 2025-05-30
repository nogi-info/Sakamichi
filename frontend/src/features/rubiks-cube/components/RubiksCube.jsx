import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Papa from "papaparse"; // papaparseを直接インポート

// コンポーネント
import Cubelet from "../utils/Cubelet";
import RotatingGroup from "../utils/RotatingGroup";
import AxesArrows from "../utils/AxesArrows";
import DebugPanel from "./DebugPanel";

// カスタムフック
import { useCubeState } from "../hooks/useCubeState";
import { useDragRotation } from "../hooks/useDragRotation";
import { useCameraControls } from "../hooks/useCameraControls";
import { useStopwatch } from "../hooks/useStopwatch";

// スタイル
import buttonStyle from "../../../styles/buttonStyle";

// CSVファイルへのパス
const CSV_FILE_PATH = "/Sakamichi/data/sakamichi_combined.csv"; // CSVファイルのパスを適宜修正してください

function RubiksCube({ initialFaceKanji = "乃木櫻日向坂" }) {
  // faceKanjiをstateで管理し、初期値はinitialFaceKanjiとする
  const [faceKanji, setFaceKanji] = useState(initialFaceKanji); 
  // 難易度を管理するstateを追加し、初期値をLevel 2 (2) に設定
  // Level 1: 文字なし色あり, Level 2: 文字あり色あり, Level 3: 文字あり色なし
  const [difficulty, setDifficulty] = useState(2); 

  // CSVデータの読み込みとfaceKanjiの設定ロジックを関数として定義
  const loadAndSetRandomFaceKanji = async () => {
    try {
      const response = await fetch(CSV_FILE_PATH);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      // PapaParseを使用してCSVをパース
      Papa.parse(csvText, {
        header: true, // ヘッダー行をオブジェクトのキーとして使用
        skipEmptyLines: true,
        complete: (results) => {
          const dataRows = results.data;

          if (dataRows.length === 0) {
            console.warn("CSVファイルにデータ行がありません。");
            setFaceKanji(initialFaceKanji); // データがない場合は初期値を使用
            return;
          }

          // ランダムに1行を選択
          const randomIndex = Math.floor(Math.random() * dataRows.length);
          const selectedRow = dataRows[randomIndex];
          
          // グループ名と名前を連結
          // CSVのヘッダーが 'グループ名' と '名前' であることを想定
          const groupName = selectedRow['グループ名'] ? selectedRow['グループ名'].trim() : '';
          const name = selectedRow['名前'] ? selectedRow['名前'].trim() : '';

          const combinedString = name + groupName;
          const newFaceKanji = combinedString.substring(0, 6); // 左から6文字

          setFaceKanji(newFaceKanji || initialFaceKanji); // 文字列が空の場合に備えて初期値をフォールバック
          console.log(`設定されたfaceKanji: ${newFaceKanji}`);
        },
        error: (err) => {
          console.error("PapaParseエラー:", err);
          setFaceKanji(initialFaceKanji); // エラー時は初期値を使用
        }
      });

    } catch (error) {
      console.error("CSVファイルの読み込みまたはパース中にエラーが発生しました:", error);
      setFaceKanji(initialFaceKanji); // エラー時は初期値を使用
    }
  };

  // デバッグ状態
  const [showDebug, setShowDebug] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

  // ストップウォッチ
  const { time, startStopwatch, stopStopwatch, resetStopwatch } = useStopwatch();

  // キューブ状態管理
  // faceKanjiとdifficultyをuseCubeStateに渡す
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
    resetCube, // resetCube関数を取得
    rotateCubeFace,
    rotateEntireCube,
    randomRotate,
    judgeCleared,
    gameStarted,
    setGameStarted,
  } = useCubeState(faceKanji, difficulty, stopStopwatch); // difficultyを引数として追加

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
    showZoomControls,
    toggleZoomControls,
    setDisableOrbitRotation,
  } = useCameraControls();

  // ドラッグ回転
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

  // ゲームスタートハンドラ
  const handleGameStart = async () => {
    resetCube(); // ゲームスタート時にキューブの状態をリセットし、クリア表示を非表示にする (追加)
    resetStopwatch();
    setGameStarted(true); // ゲーム開始状態をtrueに
    await loadAndSetRandomFaceKanji(); // CSVからfaceKanjiをロード
    await randomRotate(); // ランダム回転を実行
    startStopwatch(); // ストップウォッチを開始
  };

  return (
    <div
      style={{ width: '100%', height: '800px', background: '#f0f0f0' }}
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      {/* ズームコントロール */}
      {showZoomControls && (
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
          textAlign: "center",
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
        top: 150,
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
          <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            タイム: {time.toFixed(2)}秒
          </div>
        )}

        <button onClick={handleGameStart} style={buttonStyle} disabled={gameStarted && !isCleared}>
          {gameStarted && !isCleared ? "ゲーム中" : "ゲームスタート"}
        </button>

        {/* 難易度選択 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "10px" }}>
          <label>
            <input
              type="radio"
              value={1}
              checked={difficulty === 1}
              onChange={() => setDifficulty(1)}
              disabled={gameStarted && !isCleared}
            />
            Level 1 (色のみ)
          </label>
          <label>
            <input
              type="radio"
              value={2}
              checked={difficulty === 2}
              onChange={() => setDifficulty(2)}
              disabled={gameStarted && !isCleared}
            />
            Level 2 (文字+色)
          </label>
          <label>
            <input
              type="radio"
              value={3}
              checked={difficulty === 3}
              onChange={() => setDifficulty(3)}
              disabled={gameStarted && !isCleared}
            />
            Level 3 (文字のみ)
          </label>
        </div>

        {/* <button
          style={{
            ...buttonStyle,
            background: lockPolar ? "#1976d2" : "#aaa",
            color: "#fff"
          }}
          onClick={togglePolarLock}
        >
          {lockPolar ? "回転軸固定" : "回転自由"}
        </button> */}

        {/* ズームコントロール表示切り替えボタン */}
        {/* <button
          style={buttonStyle}
          onClick={toggleZoomControls}
        >
          {showZoomControls ? "ズーム非表示" : "ズーム表示"}
        </button> */}

        {/* <button
          style={buttonStyle}
          onClick={() => rotateEntireCube("z", true)}
        >
          Z軸全体90度回転
        </button> */}
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
