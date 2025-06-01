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
// import buttonStyle from "../../../styles/buttonStyle"; // インラインスタイルからCSSクラスに移行するため不要になります
import './RubiksCube.css'; // 新しいCSSファイルをインポート

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
    resetCube(); // キューブの状態をリセット
    resetStopwatch(); // ストップウォッチをリセット
    setGameStarted(true); // ゲーム開始状態に設定
    await loadAndSetRandomFaceKanji(); // ランダムな漢字を設定
    await randomRotate(); // キューブをシャッフル
    startStopwatch(); // ストップウォッチを開始
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
      className="rubiks-cube-container" // コンテナにクラスを適用
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

      {/* ゲームクリア表示パネル */}
      {isCleared && (
        <div className="game-clear-panel game-overlay-card">
          <div className="clear-message">クリア！</div>
          <div className="clear-time">{formatTime(time)}</div>
          <button onClick={handleRetry} className="game-button game-button-primary">
            もう一度プレイ
          </button>
        </div>
      )}

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
                name="difficulty" // 同じname属性でグループ化
                value={1}
                checked={difficulty === 1}
                onChange={() => setDifficulty(1)}
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
                onChange={() => setDifficulty(2)}
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
                onChange={() => setDifficulty(3)}
                className="difficulty-radio"
              />
              Level 3 (文字のみ)
            </label>
          </div>
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
