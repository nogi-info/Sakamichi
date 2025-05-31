import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Papa from "papaparse";

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
const CSV_FILE_PATH = "/Sakamichi/data/sakamichi_combined.csv";
const GROUP_CSV_FILE_PATH = "/Sakamichi/data/sakamichi_group.csv";

// 時間表示のヘルパー関数
const formatTime = (seconds) => {
  if (seconds < 60) {
    // 小数点以下を表示しないように変更
    return `${Math.floor(seconds)}秒`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60); // 小数点以下を表示しないように変更
    // 残り秒数を2桁表示（整数部）
    const formattedRemainingSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
    return `${minutes}分${formattedRemainingSeconds}秒`;
  }
};

function RubiksCube({ initialFaceKanji = "乃木櫻日向坂" }) {
  const [faceKanji, setFaceKanji] = useState(initialFaceKanji); 
  const [difficulty, setDifficulty] = useState(2); // 初期値をLevel 2に設定
  const [groupData, setGroupData] = useState([]); // グループCSVデータを保持するstate

  // グループCSVデータを読み込むuseEffect
  useEffect(() => {
    const loadGroupData = async () => {
      try {
        const response = await fetch(GROUP_CSV_FILE_PATH);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setGroupData(results.data);
          },
          error: (err) => {
            console.error("PapaParse error loading group data:", err);
          }
        });
      } catch (error) {
        console.error("Error loading group data:", error);
      }
    };
    loadGroupData();
  }, []); // コンポーネントマウント時に一度だけ実行

  const loadAndSetRandomFaceKanji = async () => {
    try {
      const response = await fetch(CSV_FILE_PATH);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const dataRows = results.data;

          if (dataRows.length === 0) {
            console.warn("CSVファイルにデータ行がありません。");
            setFaceKanji(initialFaceKanji);
            return;
          }

          const randomIndex = Math.floor(Math.random() * dataRows.length);
          const selectedRow = dataRows[randomIndex];
          
          let groupName = selectedRow['グループ名'] ? selectedRow['グループ名'].trim() : '';
          const name = selectedRow['名前'] ? selectedRow['名前'].trim() : '';

          // sakamichi_group.csvからグループ情報を検索し、置換判定
          const today = new Date(); // 現在の日付
          const gradDateStr = selectedRow['卒業・辞退・契約終了日'] ? selectedRow['卒業・辞退・契約終了日'].trim() : '-';
          const gradDate = gradDateStr === '-' ? today : new Date(gradDateStr); // ハイフンの場合はそのまま、日付形式に変換
          const matchingGroup = groupData.find(group => group['グループ名'] === groupName);

          if (matchingGroup) {
            // 現在の日付が期間内にあるか判定
            if (gradDate >= new Date(matchingGroup['開始日']) && gradDate <= new Date(matchingGroup['終了日'])) {
              groupName = matchingGroup['旧グループ名']; // 旧グループ名に置換
            }
          }

          const combinedString = name + groupName; // 置換後のグループ名を使用
          const newFaceKanji = combinedString.substring(0, 6);

          setFaceKanji(newFaceKanji || initialFaceKanji);
        },
        error: (err) => {
          console.error("PapaParseエラー:", err);
          setFaceKanji(initialFaceKanji);
        }
      });

    } catch (error) {
      console.error("CSVファイルの読み込みまたはパース中にエラーが発生しました:", error);
      setFaceKanji(initialFaceKanji);
    }
  };

  const [showDebug, setShowDebug] = useState(false);
  const [showAxes, setShowAxes] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});

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
    await loadAndSetRandomFaceKanji();
    await randomRotate();
    startStopwatch();
  };

  const handleRetry = () => {
    // ここでfaceKanjiを初期値に戻す
    setFaceKanji(initialFaceKanji); 
    resetCube(); // キューブの状態をリセット
    resetStopwatch(); // ストップウォッチをリセット
    setGameStarted(false); // ゲーム開始状態をfalseに戻す
    setDifficulty(2); // 難易度を初期値に戻す（任意）
    // クリア表示はresetCubeでisClearedがfalseになるため自動的に消える
  };

  return (
    <div
      style={{ width: '100%', height: '800px', background: '#f0f0f0', position: 'relative' }}
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      {/* ズームコントロール (コメントアウト) */}
      {/*
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
      */}

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
          top: "20px", // ゲーム開始ボタンと同じ位置に
          left: "50%",
          transform: "translateX(-50%)", // 中央揃え
          background: "rgba(255,255,255,0.95)",
          color: "#1976d2",
          fontWeight: "bold",
          textAlign: "center",
          padding: "32px 48px",
          borderRadius: "16px",
          zIndex: 3000,
          boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px" // 間隔を狭める
        }}>
          <div style={{ fontSize: "2rem", whiteSpace: "nowrap" }}>クリア！</div> {/* 改行防止 */}
          <div style={{ fontSize: "1.5rem", whiteSpace: "nowrap" }}>{formatTime(time)}</div> {/* フォーマット適用 */}
          <button onClick={handleRetry} style={buttonStyle}>
            もう一度プレイ
          </button>
        </div>
      )}

      {/* ゲーム開始用ボタン、難易度選択パネル */}
      {/* ゲーム開始前 (gameStartedがfalse) のみ表示 */}
      {!gameStarted && (
        <div style={{
          position: "absolute",
          top: "20px", // 上部に配置
          left: "50%",
          transform: "translateX(-50%)", // 中央揃え
          zIndex: 2200, // 他のパネルより手前に
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "15px"
        }}>
          {/* ゲーム開始ボタン */}
          <button onClick={handleGameStart} style={buttonStyle}>
            ゲームスタート
          </button>

          {/* 難易度選択 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="radio"
                value={1}
                checked={difficulty === 1}
                onChange={() => setDifficulty(1)}
              />
              Level 1 (色のみ)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="radio"
                value={2}
                checked={difficulty === 2}
                onChange={() => setDifficulty(2)}
              />
              Level 2 (文字+色)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <input
                type="radio"
                value={3}
                checked={difficulty === 3}
                onChange={() => setDifficulty(3)}
              />
              Level 3 (文字のみ)
            </label>
          </div>
        </div>
      )}

      {/* ゲーム実行中 (gameStartedがtrueかつisClearedがfalse) のみストップウォッチを表示 */}
      {gameStarted && !isCleared && (
        <div style={{
          position: "absolute",
          top: "20px", // 上部に配置
          left: "50%",
          transform: "translateX(-50%)", // 中央揃え
          zIndex: 2200,
          background: "#fff",
          padding: "12px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px"
        }}>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
            タイム: {formatTime(time)} {/* フォーマット適用 */}
          </div>
        </div>
      )}

      {/* 左上に配置していたコントロールパネルは全てコメントアウト */}
      {/*
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
      */}

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
