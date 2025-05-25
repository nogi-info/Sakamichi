import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// 6面の面名
const FACE_NAMES = ["front", "back", "right", "left", "top", "bottom"];

// 6面の既定の漢字
const DEFAULT_FACE_KANJI = "乃木櫻日向坂";

// 1面を3x3に分割したテクスチャ配列を生成
function createFaceTextures(kanji, faceName, size = 192) {
  // ルービックキューブ標準色
  const FACE_COLORS = {
    front: "#ffffff",   // 白 (Z+)
    back: "#ffff00",    // 黄 (Z-)
    right: "#ff0000",   // 赤 (X+)
    left: "#ff8c00",    // オレンジ (X-)
    top: "#0000ff",     // 青 (Y+)
    bottom: "#00ff00"   // 緑 (Y-)
  };

  // 1面の全体canvasを生成し、中央に漢字を描画
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = FACE_COLORS[faceName] || "#fff";
  ctx.fillRect(0, 0, size, size);
  ctx.font = `${size * 0.9}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#222";
  ctx.fillText(kanji, size / 2, size / 2);

  // 3x3に分割してテクスチャ配列を作成
  const cell = size / 3;
  const textures = [];
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const cellCanvas = document.createElement("canvas");
      cellCanvas.width = cell;
      cellCanvas.height = cell;
      const cellCtx = cellCanvas.getContext("2d");
      cellCtx.drawImage(
        canvas,
        x * cell, y * cell, cell, cell, // src
        0, 0, cell, cell                // dst
      );
      const texture = new THREE.Texture(cellCanvas);
      texture.needsUpdate = true;
      textures.push(texture);
    }
  }
  return textures; // [0,1,2,3,4,5,6,7,8]
}

// 6面の色定義
const FACE_COLORS = {
  front: "#ffffff",   // 白 (Z+)
  back: "#ffff00",    // 黄 (Z-)
  right: "#ff0000",   // 赤 (X+)
  left: "#ff8c00",    // オレンジ (X-)
  top: "#0000ff",     // 青 (Y+)
  bottom: "#00ff00"   // 緑 (Y-)
};

// 各面のテクスチャインデックス計算
function getFaceTextureIndices(x, y, z) {
  return {
    right:  x === 1 ? (1 - y) * 3 + (1 - z) : null,
    left:   x === -1 ? (1 - y) * 3 + (z + 1) : null,
    top:    y === 1 ? (z + 1) * 3 + (x + 1) : null,
    bottom: y === -1 ? (1 - z) * 3 + (x + 1) : null,
    front:  z === 1 ? (1 - y) * 3 + (x + 1) : null,
    back:   z === -1 ? (1 - y) * 3 + (1 - x) : null,
  };
}

// 初期キューブレット配列を作成
function createInitialCubelets() {
  const cubelets = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubelets.push({
          id: `${x}_${y}_${z}`,
          position: [x, y, z],
          rotation: [0, 0, 0], // ← 各キューブレットのローカル回転
          faceTextureIndices: getFaceTextureIndices(x, y, z),
        });
      }
    }
  }
  return cubelets;
}

// 個別のキューブレットコンポーネント
function Cubelet({ position, rotation, faceTextureIndices, faceTextures, onClick, onPointerMove }) {
  // 各面のテクスチャを取得
  const materials = [
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.right !== null ? faceTextures.right[faceTextureIndices.right] : null, color: faceTextureIndices.right !== null ? "#fff" : "#333" }),
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.left !== null ? faceTextures.left[faceTextureIndices.left] : null, color: faceTextureIndices.left !== null ? "#fff" : "#333" }),
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.top !== null ? faceTextures.top[faceTextureIndices.top] : null, color: faceTextureIndices.top !== null ? "#fff" : "#333" }),
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.bottom !== null ? faceTextures.bottom[faceTextureIndices.bottom] : null, color: faceTextureIndices.bottom !== null ? "#fff" : "#333" }),
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.front !== null ? faceTextures.front[faceTextureIndices.front] : null, color: faceTextureIndices.front !== null ? "#fff" : "#333" }),
    new THREE.MeshStandardMaterial({ map: faceTextureIndices.back !== null ? faceTextures.back[faceTextureIndices.back] : null, color: faceTextureIndices.back !== null ? "#fff" : "#333" }),
  ];
  return (
    <mesh
      position={position}
      rotation={rotation}
      onPointerDown={onClick}
      onPointerMove={e => {
        e.stopPropagation();
        onPointerMove && onPointerMove(e);
      }}
      material={materials}
    >
      <boxGeometry args={[0.95, 0.95, 0.95]} />
    </mesh>
  );
}

// 回転グループコンポーネント
function RotatingGroup({ cubelets, rotationAxis, rotationAngle, faceTextures }) {
  const groupRef = useRef();
  const rotation = rotationAxis === 'x' ? [rotationAngle, 0, 0] :
                   rotationAxis === 'y' ? [0, rotationAngle, 0] :
                   [0, 0, rotationAngle];

  return (
    <group ref={groupRef} rotation={rotation}>
      {cubelets.map(cubelet => (
        <Cubelet
          key={cubelet.id}
          position={cubelet.position}
          rotation={cubelet.rotation}
          faceTextureIndices={cubelet.faceTextureIndices}
          faceTextures={faceTextures}
        />
      ))}
    </group>
  );
}

// 面を回転させる関数（positionとrotationのみを更新）
function rotateFace(cubelets, axis, layer, clockwise = true) {
  const angle = clockwise ? -Math.PI / 2 : Math.PI / 2;
  return cubelets.map(cubelet => {
    const [x, y, z] = cubelet.position;
    let shouldRotate = false;
    if (axis === 'x' && x === layer) shouldRotate = true;
    if (axis === 'y' && y === layer) shouldRotate = true;
    if (axis === 'z' && z === layer) shouldRotate = true;
    if (!shouldRotate) return cubelet;

    // 位置の回転（従来通り）
    let newPosition = [...cubelet.position];
    if (axis === 'x') {
      const newY = Math.round(Math.cos(angle) * y - Math.sin(angle) * z);
      const newZ = Math.round(Math.sin(angle) * y + Math.cos(angle) * z);
      newPosition = [x, newY, newZ];
    } else if (axis === 'y') {
      const newX = Math.round(Math.cos(angle) * x + Math.sin(angle) * z);
      const newZ = Math.round(-Math.sin(angle) * x + Math.cos(angle) * z);
      newPosition = [newX, y, newZ];
    } else if (axis === 'z') {
      const newX = Math.round(Math.cos(angle) * x - Math.sin(angle) * y);
      const newY = Math.round(Math.sin(angle) * x + Math.cos(angle) * y);
      newPosition = [newX, newY, z];
    }

    // 回転の合成（クォータニオンで合成）
    const prevQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(...cubelet.rotation, "XYZ")
    );
    let deltaQ;
    if (axis === 'x') {
      deltaQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
    } else if (axis === 'y') {
      deltaQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    } else if (axis === 'z') {
      deltaQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
    }
    // 新しい回転 = deltaQ * prevQ
    const newQ = deltaQ.multiply(prevQ);
    const newEuler = new THREE.Euler().setFromQuaternion(newQ, "XYZ");
    const newRotation = [newEuler.x, newEuler.y, newEuler.z];

    return {
      ...cubelet,
      id: `${newPosition[0]}_${newPosition[1]}_${newPosition[2]}`,
      position: newPosition,
      rotation: newRotation,
    };
  });
}

const DRAG_THRESHOLD = 10; // ピクセル、必要に応じて調整

// メインのルービックキューブコンポーネント
function RubiksCube({ faceKanji = DEFAULT_FACE_KANJI }) {
  const [cubelets, setCubelets] = useState(createInitialCubelets());
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingCubelets, setRotatingCubelets] = useState([]);
  const [rotationAxis, setRotationAxis] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rotationLayer, setRotationLayer] = useState(null);

  // ドラッグ開始時の情報
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef(null); // "xy", "yz", "zx"
  const dragCubeletRef = useRef(null);
  const dragStart3DRef = useRef(null); // 3D座標のドラッグ開始点を記憶

  // デバッグ情報を表示するためのstate
  const [debugInfo, setDebugInfo] = useState({});

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

    // 右クリックのみ
    if (event.nativeEvent.button === 2) {
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
      // event.face.normalはローカル座標系
      const localNormal = event.face.normal.clone();
      // キューブレットのrotationを反映
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
        normal: worldNormal ? worldNormal.toArray() : null, // ← 修正
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

      // --- 回転方向をatan2の差分で判定（共通化） ---
      let clockwise = false;
      let deltaTheta = 0;
      let theta0 = 0, theta1 = 0;

      if (axis === "x") {
        // YZ平面
        theta0 = Math.atan2(start[2], start[1]);
        theta1 = Math.atan2(end[2], end[1]);
      } else if (axis === "y") {
        // ZX平面
        theta0 = Math.atan2(start[0], start[2]);
        theta1 = Math.atan2(end[0], end[2]);
      } else if (axis === "z") {
        // XY平面
        theta0 = Math.atan2(start[1], start[0]);
        theta1 = Math.atan2(end[1], end[0]);
      }
      deltaTheta = theta1 - theta0;
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

  // 6面分のテクスチャ配列を生成（useMemoでキャッシュ）
  const faceTextures = useMemo(() => {
    const kanjiArr = faceKanji.slice(0, 6).split("");
    const textures = {};
    FACE_NAMES.forEach((face, i) => {
      textures[face] = createFaceTextures(kanjiArr[i], face);
    });
    return textures;
  }, [faceKanji]);

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

  return (
    <div
      style={{ width: '100%', height: '600px', background: '#f0f0f0' }}
      onContextMenu={e => e.preventDefault()}
      onPointerUp={handlePointerUp}
    >
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />

        <AxesArrows />

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

        <OrbitControls enablePan={false} />
      </Canvas>

      <div style={{ padding: '20px', color: '#333' }}>
        <h2>ルービックキューブ</h2>
        <p>右クリック + ドラッグで面を回転できます</p>
        <p>短い距離のドラッグでも回転します（30度以上で確定）</p>
        <p>マウスホイールでズーム、左クリック + ドラッグで視点を回転</p>

        <div style={{ marginTop: '20px' }}>
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
      </div>

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
    </div>
  );
}

const buttonStyle = {
  padding: "8px 16px",
  margin: "4px",
  border: "none",
  borderRadius: "6px",
  background: "#eee",
  color: "#333",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  transition: "background 0.2s",
};

// XYZ軸を表示するコンポーネント
function AxesArrows() {
  const groupRef = useRef();

  useEffect(() => {
    const group = groupRef.current;
    while (group && group.children.length > 0) {
      group.remove(group.children[0]);
    }
    const xArrow = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 0),
      5,
      0xff4444,
      1,
      0.5
    );
    const yArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      5,
      0x00ff00,
      1,
      0.5
    );
    const zArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0),
      5,
      0x3366ff,
      1,
      0.5
    );
    group && group.add(xArrow, yArrow, zArrow);
  }, []);

  return <group ref={groupRef} />;
}

export default RubiksCube;