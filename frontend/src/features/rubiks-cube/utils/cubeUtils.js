import * as THREE from "three";

// 6面の面名
export const FACE_NAMES = ["front", "back", "right", "left", "top", "bottom"];

// 1面を3x3に分割したテクスチャ配列を生成
// difficultyを引数に追加
export function createFaceTextures(kanji, faceName, difficulty, size = 192) {
  const FACE_COLORS = {
    front: "#ffffff",
    back: "#ffff00",
    right: "#ff0000",
    left: "#ff8c00",
    top: "#0000ff",
    bottom: "#00ff00"
  };

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  // 背景色の設定
  // Level 1, Level 2: 通常の6色
  if (difficulty === 1 || difficulty === 2) { 
    ctx.fillStyle = FACE_COLORS[faceName] || "#fff";
    ctx.fillRect(0, 0, size, size);
  } else if (difficulty === 3) { // Level 3: 全て白
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }

  // 文字の描画
  // Level 2, Level 3: 文字あり
  if (difficulty === 2 || difficulty === 3) { 
    ctx.font = `${size * 0.9}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#222"; // 文字の色
    ctx.fillText(kanji, size / 2, size / 2);
  }

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
        x * cell, y * cell, cell, cell,
        0, 0, cell, cell
      );
      const texture = new THREE.Texture(cellCanvas);
      texture.needsUpdate = true;
      textures.push(texture);
    }
  }
  return textures;
}

export function getFaceTextureIndices(x, y, z) {
  return {
    right:  x === 1 ? (1 - y) * 3 + (1 - z) : null,
    left:   x === -1 ? (1 - y) * 3 + (z + 1) : null,
    top:    y === 1 ? (z + 1) * 3 + (x + 1) : null,
    bottom: y === -1 ? (1 - z) * 3 + (x + 1) : null,
    front:  z === 1 ? (1 - y) * 3 + (x + 1) : null,
    back:   z === -1 ? (1 - y) * 3 + (1 - x) : null,
  };
}

export function createInitialCubelets() {
  const cubelets = [];
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      for (let z = -1; z <= 1; z++) {
        cubelets.push({
          id: `${x}_${y}_${z}`,
          position: [x, y, z],
          rotation: [0, 0, 0],
          faceTextureIndices: getFaceTextureIndices(x, y, z),
        });
      }
    }
  }
  return cubelets;
}

export function rotateFace(cubelets, axis, layer, clockwise = true) {
  const angle = clockwise ? -Math.PI / 2 : Math.PI / 2;
  return cubelets.map(cubelet => {
    const [x, y, z] = cubelet.position;
    let shouldRotate = false;
    if (axis === 'x' && x === layer) shouldRotate = true;
    if (axis === 'y' && y === layer) shouldRotate = true;
    if (axis === 'z' && z === layer) shouldRotate = true;
    if (!shouldRotate) return cubelet;

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

export function rotateAllLayers(cubelets, axis, clockwise = true) {
  let result = cubelets;
  [-1, 0, 1].forEach(layer => {
    result = rotateFace(result, axis, layer, clockwise);
  });
  return result;
}
