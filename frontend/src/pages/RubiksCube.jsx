import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Cubelet from "../components/Cubelet";
import RotatingGroup from "../components/RotatingGroup";
import AxesArrows from "../components/AxesArrows";
import buttonStyle from "../styles/buttonStyle";
import {
  createInitialCubelets,
  rotateFace,
  rotateAllLayers,
  createFaceTextures,
  FACE_NAMES
} from "../utils/cubeUtils";
import { isCubeSolved } from "../utils/cubeCheckUtils";

const CAMERA_DISTANCE_MIN = 3;
const CAMERA_DISTANCE_MAX = 20;

function RubiksCube({ faceKanji = "乃木櫻日向坂" }) {
  const [cubelets, setCubelets] = useState(createInitialCubelets());
  const [initialCubelets, setInitialCubelets] = useState(() => createInitialCubelets());
  const [isCleared, setIsCleared] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingCubelets, setRotatingCubelets] = useState([]);
  const [rotationAxis, setRotationAxis] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rotationLayer, setRotationLayer] = useState(null);
  const [cameraDistance, setCameraDistance] = useState(5);
  const [lockPolar, setLockPolar] = useState(false);
  const [lockedPolar, setLockedPolar] = useState(null);
  const [lockedAzimuth, setLockedAzimuth] = useState(null);

  // 6面分のテクスチャ配列を生成（useMemoでキャッシュ）
  const faceTextures = useMemo(() => {
    const kanjiArr = faceKanji.slice(0, 6).split("");
    const textures = {};
    FACE_NAMES.forEach((face, i) => {
      textures[face] = createFaceTextures(kanjiArr[i], face);
    });
    return textures;
  }, [faceKanji]);

  // 初期状態のfaceTexturesもstateで保持
  const [initialFaceTextures, setInitialFaceTextures] = useState(() => {
    const kanjiArr = faceKanji.slice(0, 6).split("");
    const textures = {};
    FACE_NAMES.forEach((face, i) => {
      textures[face] = createFaceTextures(kanjiArr[i], face);
    });
    return textures;
  });

  const orbitRef = useRef();

  // カメラ距離をシークバーで直接反映
  const handleSlider = useCallback(e => {
    const v = Number(e.target.value);
    setCameraDistance(v);
    const { camera } = window.__threeFiberRoot?.getState?.() || {};
    if (camera) {
      const len = Math.sqrt(camera.position.x ** 2 + camera.position.y ** 2 + camera.position.z ** 2);
      camera.position.multiplyScalar(v / len);
      camera.updateProjectionMatrix();
    }
  }, []);

  // ドラッグ関連
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef(null);
  const dragCubeletRef = useRef(null);
  const dragStart3DRef = useRef(null);

  // 各面の9枚の画像canvasを取得
  function getFaceCanvases(faceTextures, face) {
    // faceTextures[face]は3x3=9個のTHREE.Texture
    // それぞれのimageプロパティがcanvas
    return faceTextures[face].map(tex => tex.image);
  }

  // 2つのcanvasのピクセルデータを比較（完全一致ならtrue）
  function isCanvasImageEqual(canvasA, canvasB) {
    if (!canvasA || !canvasB) return false;
    if (canvasA.width !== canvasB.width || canvasA.height !== canvasB.height) return false;
    const ctxA = canvasA.getContext("2d");
    const ctxB = canvasB.getContext("2d");
    const dataA = ctxA.getImageData(0, 0, canvasA.width, canvasA.height).data;
    const dataB = ctxB.getImageData(0, 0, canvasB.width, canvasB.height).data;
    for (let i = 0; i < dataA.length; i++) {
      if (dataA[i] !== dataB[i]) return false;
    }
    return true;
  }

  // 各面の9枚のcanvas画像が初期状態と一致しているか
  function isFaceImagesSolved(faceTexturesNow, faceTexturesInit) {
    for (const face of FACE_NAMES) {
      const nowCanvases = getFaceCanvases(faceTexturesNow, face);
      const initCanvases = getFaceCanvases(faceTexturesInit, face);
      for (let i = 0; i < 9; i++) {
        if (!isCanvasImageEqual(nowCanvases[i], initCanvases[i])) return false;
      }
    }
    return true;
  }

  // 判定ボタン押下時のみ画像判定を実行
  const handleJudge = async () => {
    // 各面をレンダリングしてcanvasを取得
    let allMatch = isCubeSolved(cubelets);

    setIsCleared(allMatch);
    setDebugInfo(info => ({
      allMatch: allMatch,
    }));
  };

  // 1. 小ブロックと面の記憶（回転対象はまだ決めない）
  const handleCubeletClick = useCallback((event) => {
    if (isRotating) return;
    event.stopPropagation();

    const cubelet = cubelets.find(c =>
      c.position[0] === event.object.position.x &&
      c.position[1] === event.object.position.y &&
      c.position[2] === event.object.position.z
    );
    if (!cubelet) return;

    if (event.nativeEvent.button === 0) {
      dragStartRef.current = { x: event.nativeEvent.clientX, y: event.nativeEvent.clientY };
      dragStart3DRef.current = event.point?.clone?.() ?? null;
      isDraggingRef.current = true;
      dragCubeletRef.current = cubelet;
      const gridPos = [
        Math.round(event.point.x),
        Math.round(event.point.y),
        Math.round(event.point.z)
      ];
      dragStartRef.current._cubeletGrid = gridPos;
      dragStartRef.current._cubeletId = cubelet.id;
      dragStartRef.current._rotated = undefined;

      // --- 回転後の法線を計算 ---
      const localNormal = event.face.normal.clone();
      const euler = new THREE.Euler(...cubelet.rotation, "XYZ");
      const worldNormal = localNormal.applyEuler(euler);

      const absNormal = {
        x: Math.abs(worldNormal.x),
        y: Math.abs(worldNormal.y),
        z: Math.abs(worldNormal.z)
      };
      let plane;
      if (absNormal.x > absNormal.y && absNormal.x > absNormal.z) {
        plane = "yz";
      } else if (absNormal.y > absNormal.z) {
        plane = "zx";
      } else {
        plane = "xy";
      }
      dragPlaneRef.current = plane;

      setRotationAxis(null);
      setRotationAngle(0);
      setRotatingCubelets([]);
      setRotationLayer(null);

      setDebugInfo({
        event: "PointerDown",
        cubelet: cubelet.position,
        plane,
        object: event.object.position ? event.object.position.toArray() : null,
        cursor: event.point ? event.point.toArray() : null,
        point: event.object.position ? event.object.position.toArray() : null,
        normal: worldNormal ? worldNormal.toArray() : null,
      });
    }
  }, [cubelets, isRotating]);

  // 2. 移動量から回転軸を判定し、回転対象ブロックを決定
  const handlePointerMove = useCallback((event) => {
    if (!isDraggingRef.current || isRotating) return;
    if (dragStartRef.current._rotated) return;
    if (!dragStart3DRef.current || typeof dragStart3DRef.current.clone !== "function") return;
    if (!event.point || typeof event.point.clone !== "function") return;

    const hitCubelet = cubelets.find(c =>
      Math.abs(event.point.x - c.position[0]) < 0.5 &&
      Math.abs(event.point.y - c.position[1]) < 0.5 &&
      Math.abs(event.point.z - c.position[2]) < 0.5
    );

    if (
      hitCubelet &&
      dragStartRef.current._cubeletId &&
      hitCubelet.id !== dragStartRef.current._cubeletId &&
      !dragStartRef.current._rotated
    ) {
      const start = dragCubeletRef.current.position;
      const end = hitCubelet.position;

      let axis = null;
      let layer = null;

      if (start[0] !== end[0]) {
        if (dragPlaneRef.current === "xy") {
          axis = "y";
          layer = start[1];
        } else if (dragPlaneRef.current === "zx") {
          axis = "z";
          layer = start[2];
        }
      } else if (start[1] !== end[1]) {
        if (dragPlaneRef.current === "xy") {
          axis = "x";
          layer = start[0];
        } else if (dragPlaneRef.current === "yz") {
          axis = "z";
          layer = start[2];
        }
      } else if (start[2] !== end[2]) {
        if (dragPlaneRef.current === "yz") {
          axis = "y";
          layer = start[1];
        } else if (dragPlaneRef.current === "zx") {
          axis = "x";
          layer = start[0];
        }
      }

      if (!axis) {
        setDebugInfo(info => ({
          event: "AutoRotate-IGNORED",
          reason: "forbidden axis or invalid move",
          from: start,
          to: end,
          plane: dragPlaneRef.current ? dragPlaneRef.current : "null",
        }));
        return;
      }

      // --- 回転方向をatan2の差分で判定 ---
      let clockwise = false;
      let deltaTheta = 0;
      let theta0 = 0, theta1 = 0;

      if (axis === "x") {
        theta0 = Math.atan2(start[2], start[1]);
        theta1 = Math.atan2(end[2], end[1]);
      } else if (axis === "y") {
        theta0 = Math.atan2(start[0], start[2]);
        theta1 = Math.atan2(end[0], end[2]);
      } else if (axis === "z") {
        theta0 = Math.atan2(start[1], start[0]);
        theta1 = Math.atan2(end[1], end[0]);
      }
      deltaTheta = theta1 - theta0;
      if (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
      if (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;
      clockwise = deltaTheta < 0;

      setRotationAxis(axis);
      setRotationLayer(layer);
      setRotationAngle(clockwise ? -Math.PI / 4 : Math.PI / 4);
      setRotatingCubelets(cubelets.filter(c => {
        if (axis === "x") return c.position[0] === layer;
        if (axis === "y") return c.position[1] === layer;
        if (axis === "z") return c.position[2] === layer;
        return false;
      }));
      setIsRotating(true);

      setDebugInfo(info => ({
        ...info,
        event: "Rotate45",
        from: start,
        to: end,
        axis,
        layer,
        plane: dragPlaneRef.current,
        clockwise,
      }));

      dragStartRef.current._rotated = { axis, layer, clockwise };
      return;
    }

    setDebugInfo(info => ({
      ...info,
      event: "PointerMove",
      hitCubelet: hitCubelet ? hitCubelet.position : null,
      isDragging: isDraggingRef.current,
    }));
  }, [cubelets, isRotating]);

  // 4. ドラッグ終了時に回転確定
  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    if (
      dragStartRef.current._rotated
    ) {
      const { axis, layer, clockwise } = dragStartRef.current._rotated;

      setDebugInfo(info => ({
        ...info,
        event: "Rotate90",
        axis,
        layer,
        clockwise,
      }));

      setCubelets(prev => rotateFace(prev, axis, layer, clockwise));
    }

    setIsRotating(false);
    setRotatingCubelets([]);
    setRotationAngle(0);
    setRotationAxis(null);
    setRotationLayer(null);
    isDraggingRef.current = false;
    dragStart3DRef.current = null;
    dragCubeletRef.current = null;
    dragPlaneRef.current = null;
    dragStartRef.current._rotated = undefined;
    dragStartRef.current._cubeletId = undefined;
  }, []);

  // 静的なキューブレット（回転中でないもの）
  const staticCubelets = cubelets.filter(cubelet =>
    !rotatingCubelets.some(rc => rc.id === cubelet.id)
  );

  // デバッグ用回転ボタンの処理
  const debugRotate = (axis, layer, clockwise) => {
    setCubelets(prev => rotateFace(prev, axis, layer, clockwise));
    setIsRotating(false);
    setRotatingCubelets([]);
    setRotationAngle(0);
    setRotationAxis(null);
  };

  // ランダム回転処理
  const randomRotate = useCallback(async (count = 12, delay = 200) => {
    setInitialCubelets(cubelets);
    setInitialFaceTextures(faceTextures); // ← ここで初期faceTexturesも更新
    const axes = ['x', 'y', 'z'];
    const layers = [-1, 0, 1];
    for (let i = 0; i < count; i++) {
      const axis = axes[Math.floor(Math.random() * axes.length)];
      const layer = layers[Math.floor(Math.random() * layers.length)];
      const clockwise = Math.random() < 0.5;
      setCubelets(prev => rotateFace(prev, axis, layer, clockwise));
      setIsRotating(false);
      setRotatingCubelets([]);
      setRotationAngle(0);
      setRotationAxis(null);
      // 少し待つ（アニメーションがあればここで待つ）
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, delay));
    }
  }, [cubelets, faceTextures]);

  return (
    <div
      style={{ width: '100%', height: '800px', background: '#f0f0f0' }}
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      {/* ズームUI */}
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
        <button onClick={() => handleSlider({ target: { value: Math.min(CAMERA_DISTANCE_MAX, cameraDistance + 0.5) } })} style={buttonStyle}>－</button>
        <input
          type="range"
          min={CAMERA_DISTANCE_MIN}
          max={CAMERA_DISTANCE_MAX}
          step={0.1}
          value={CAMERA_DISTANCE_MAX - cameraDistance + CAMERA_DISTANCE_MIN}
          onChange={e => {
              e.target.value = CAMERA_DISTANCE_MAX - e.target.value + CAMERA_DISTANCE_MIN; // 反転
              handleSlider(e);
          }}
          style={{ width: 120 }}
        />
        <button onClick={() => handleSlider({ target: { value: Math.max(2, cameraDistance - 0.5) } })} style={buttonStyle}>＋</button>
      </div>

      <Canvas
        camera={{ position: [cameraDistance, cameraDistance, cameraDistance], fov: 50 }}
        onCreated={({ camera }) => {
          window.__threeFiberRoot = { getState: () => ({ camera }) };
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        {showDebug && <AxesArrows />}

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

        {isRotating && rotatingCubelets.length > 0 && (
          <RotatingGroup
            cubelets={rotatingCubelets}
            rotationAxis={rotationAxis}
            rotationAngle={rotationAngle}
            faceTextures={faceTextures}
          />
        )}

        <OrbitControls
          ref={orbitRef}
          enablePan={false}
          enableZoom={true}
          mouseButtons={{
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
          }}
          minDistance={CAMERA_DISTANCE_MIN}
          maxDistance={CAMERA_DISTANCE_MAX}
          minAzimuthAngle={-Infinity}
          maxAzimuthAngle={Infinity}
          minPolarAngle={lockPolar && lockedPolar !== null ? lockedPolar : 0}
          maxPolarAngle={lockPolar && lockedPolar !== null ? lockedPolar : Math.PI}
          onChange={e => {
            setCameraDistance(e.target.object.position.length());
          }}
        />
      </Canvas>

      {/* クリア表示UI */}
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
          クリア！
        </div>
      )}

      {/* デバッグ用回転ボタン */}
      {showDebug && (
        <div style={{ marginTop: '20px', color: '#333' }}>
          <h3>デバッグ用回転ボタン</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
            <div>
              <h4>X軸回転 (YZ平面)</h4>
              <button onClick={() => debugRotate('x', -1, true)} style={buttonStyle}>左面 時計回り</button>
              <button onClick={() => debugRotate('x', -1, false)} style={buttonStyle}>左面 反時計回り</button>
              <button onClick={() => debugRotate('x', 0, true)} style={buttonStyle}>中央X 時計回り</button>
              <button onClick={() => debugRotate('x', 0, false)} style={buttonStyle}>中央X 反時計回り</button>
              <button onClick={() => debugRotate('x', 1, true)} style={buttonStyle}>右面 時計回り</button>
              <button onClick={() => debugRotate('x', 1, false)} style={buttonStyle}>右面 反時計回り</button>
            </div>
            <div>
              <h4>Y軸回転 (XZ平面)</h4>
              <button onClick={() => debugRotate('y', -1, true)} style={buttonStyle}>下面 時計回り</button>
              <button onClick={() => debugRotate('y', -1, false)} style={buttonStyle}>下面 反時計回り</button>
              <button onClick={() => debugRotate('y', 0, true)} style={buttonStyle}>中央Y 時計回り</button>
              <button onClick={() => debugRotate('y', 0, false)} style={buttonStyle}>中央Y 反時計回り</button>
              <button onClick={() => debugRotate('y', 1, true)} style={buttonStyle}>上面 時計回り</button>
              <button onClick={() => debugRotate('y', 1, false)} style={buttonStyle}>上面 反時計回り</button>
            </div>
            <div>
              <h4>Z軸回転 (XY平面)</h4>
              <button onClick={() => debugRotate('z', -1, true)} style={buttonStyle}>奥面 時計回り</button>
              <button onClick={() => debugRotate('z', -1, false)} style={buttonStyle}>奥面 反時計回り</button>
              <button onClick={() => debugRotate('z', 0, true)} style={buttonStyle}>中央Z 時計回り</button>
              <button onClick={() => debugRotate('z', 0, false)} style={buttonStyle}>中央Z 反時計回り</button>
              <button onClick={() => debugRotate('z', 1, true)} style={buttonStyle}>手前面 時計回り</button>
              <button onClick={() => debugRotate('z', 1, false)} style={buttonStyle}>手前面 反時計回り</button>
            </div>
          </div>
          <button
            onClick={() => setCubelets(createInitialCubelets())}
            style={{ ...buttonStyle, backgroundColor: '#ff6b6b', marginTop: '20px' }}
          >
            リセット
          </button>
        </div>
      )}

      {/* デバッグ情報 */}
      {showDebug && (
        <div style={{
          position: "absolute",
          top: 10,
          right: 10,
          background: "rgba(0,0,0,0.7)",
          color: "#fff",
          padding: "12px",
          borderRadius: "8px",
          fontSize: "13px",
          zIndex: 1000,
          maxWidth: "320px",
          wordBreak: "break-all"
        }}>
          <b>デバッグ情報</b>
          <pre style={{ margin: 0, fontSize: "12px" }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}

      {/* デバッグ表示切替ボタン */}
      <button
        style={{
          visibility: "collapse", // デバッグ用機能のため非表示
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2000,
          padding: "8px 16px",
          border: "none",
          borderRadius: "6px",
          background: showDebug ? "#4caf50" : "#aaa",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer"
        }}
        onClick={() => setShowDebug(v => !v)}
      >
        {showDebug ? "デバッグ非表示" : "デバッグ表示"}
      </button>

      {/* ランダム回転ボタン＋視点固定トグルボタン（縦並び） */}
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
        <button onClick={() => randomRotate()} style={buttonStyle}>
          ランダム回転
        </button>

        {/* 判定ボタン 未完成のためコメントアウト */}
        <button onClick={handleJudge} style={buttonStyle}>
            クリア判定
        </button>

        <button
          style={{
            ...buttonStyle,
            background: lockPolar ? "#1976d2" : "#aaa",
            color: "#fff"
          }}
          onClick={() => {
            setLockPolar(v => {
              const next = !v;
              if (!next) {
                setLockedPolar(null);
                setLockedAzimuth(null);
              } else if (orbitRef.current) {
                setLockedPolar(orbitRef.current.getPolarAngle());
                setLockedAzimuth(orbitRef.current.getAzimuthalAngle());
              }
              return next;
            });
          }}
        >
          {lockPolar ? "回転軸固定" : "回転自由"}
        </button>
        <button
          style={buttonStyle}
          onClick={() => setCubelets(prev => rotateAllLayers(prev, "x", true))}
        >
          X軸全体90度回転
        </button>
        <button
          style={buttonStyle}
          onClick={() => setCubelets(prev => rotateAllLayers(prev, "y", true))}
        >
          Y軸全体90度回転
        </button>
        <button
          style={buttonStyle}
          onClick={() => setCubelets(prev => rotateAllLayers(prev, "z", true))}
        >
          Z軸全体90度回転
        </button>

        <button
            onClick={() => setCubelets(createInitialCubelets())}
            style={{ ...buttonStyle, backgroundColor: '#ff6b6b', marginTop: '20px' }}
        >
            リセット
        </button>

      </div>
    </div>
  );
}

export default RubiksCube;