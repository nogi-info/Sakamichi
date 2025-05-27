import * as THREE from "three";

/**
 * ルービックキューブの各面が元の状態に戻ったかを判定する関数
 * @param {Array} cubelets - 現在のcubelets配列
 * @returns {boolean} - 全ての面が元の状態に戻っていればtrue
 */
export function isCubeSolved(cubelets) {
  // 6面をチェック（外から見える面のみ）
  const faces = [
    { axis: 'x', value: -1 }, // left face
    { axis: 'x', value: 1 },  // right face
    { axis: 'y', value: -1 }, // bottom face
    { axis: 'y', value: 1 },  // top face
    { axis: 'z', value: -1 }, // back face
    { axis: 'z', value: 1 }   // front face
  ];

  for (const face of faces) {
    if (!isFaceSolved(cubelets, face.axis, face.value)) {
      return false;
    }
  }
  
  return true;
}

/**
 * 指定した面が元の状態に戻ったかを判定する関数
 * @param {Array} cubelets - 現在のcubelets配列
 * @param {string} axis - 'x', 'y', 'z'のいずれか
 * @param {number} value - -1または1
 * @returns {boolean} - その面が元の状態に戻っていればtrue
 */
function isFaceSolved(cubelets, axis, value) {
  // 1. 指定した面のcubeletを抽出
  const faceCubelets = cubelets.filter(cubelet => {
    return cubelet.position[getAxisIndex(axis)] === value;
  });

  // 面のcubeletが9個でない場合はエラー
  if (faceCubelets.length !== 9) {
    console.error(`面の要素数が9個ではありません: ${faceCubelets.length}`);
    return false;
  }

  // 2. 回転前の初期位置を算出
  const initialPositions = faceCubelets.map(cubelet => {
    return calculateInitialPosition(cubelet);
  });

  // 3. 初期位置が正しく配置されているかチェック
  if (!areInitialPositionsCorrect(initialPositions)) {
    return false;
  }

  // 4. 向きが全て同じかチェック
  if (!areOrientationsCorrect(faceCubelets)) {
    return false;
  }

  return true;
}

/**
 * 軸文字列を配列インデックスに変換
 * @param {string} axis - 'x', 'y', 'z'
 * @returns {number} - 0, 1, 2
 */
function getAxisIndex(axis) {
  switch (axis) {
    case 'x': return 0;
    case 'y': return 1;
    case 'z': return 2;
    default: throw new Error(`Invalid axis: ${axis}`);
  }
}

/**
 * cubeletの回転前の初期位置を計算する
 * @param {Object} cubelet - cubelet
 * @returns {Array} - [x, y, z]の初期位置
 */
function calculateInitialPosition(cubelet) {
  const currentPosition = new THREE.Vector3(...cubelet.position);
  const rotation = new THREE.Euler(...cubelet.rotation, "XYZ");
  
  // 回転の逆行列を作成
  const inverseRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation).invert();
  
  // 現在位置に逆回転を適用して初期位置を求める
  const initialPosition = currentPosition.clone().applyMatrix4(inverseRotationMatrix);
  
  return [
    Math.round(initialPosition.x),
    Math.round(initialPosition.y), 
    Math.round(initialPosition.z)
  ];
}

/**
 * 初期位置が正しく配置されているかチェック
 * @param {Array} initialPositions - 初期位置の配列
 * @returns {boolean}
 */
function areInitialPositionsCorrect(initialPositions) {
  // 各軸について、9個のcubeletで値が全て同じである軸が1つあるかチェック
  for (let axisIndex = 0; axisIndex < 3; axisIndex++) {
    const values = initialPositions.map(pos => pos[axisIndex]);
    const uniqueValues = [...new Set(values)];
    
    // 全て同じ値の場合
    if (uniqueValues.length === 1) {
      return true;
    }
  }
  
  return false;
}

/**
 * 面のcubeletの向きが全て同じかチェック
 * @param {Array} faceCubelets - 面のcubelets
 * @returns {boolean}
 */
function areOrientationsCorrect(faceCubelets) {
  const referenceVectors = calculateOrientationVectors(faceCubelets[0]);
  
  for (let i = 1; i < faceCubelets.length; i++) {
    const currentVectors = calculateOrientationVectors(faceCubelets[i]);
    
    // 3つのベクトルがそれぞれ一致するかチェック
    for (let j = 0; j < 3; j++) {
      if (!vectorsEqual(referenceVectors[j], currentVectors[j])) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * cubeletの向きベクトルを計算する
 * @param {Object} cubelet - cubelet
 * @returns {Array} - 3つのベクトル
 */
function calculateOrientationVectors(cubelet) {
  const rotation = new THREE.Euler(...cubelet.rotation, "XYZ");
  
  // 回転の逆行列を作成
  const inverseRotationMatrix = new THREE.Matrix4().makeRotationFromEuler(rotation).invert();
  
  // 基準ベクトル（cubeletの中心から各軸方向への単位ベクトル）
  const baseVectors = [
    new THREE.Vector3(1, 0, 0), // x軸方向
    new THREE.Vector3(0, 1, 0), // y軸方向
    new THREE.Vector3(0, 0, 1)  // z軸方向
  ];
  
  const results = [];
  
  for (const baseVector of baseVectors) {
    // 単位ベクトルに逆回転行列を適用
    const rotatedVector = baseVector.clone().applyMatrix4(inverseRotationMatrix);
    results.push(rotatedVector);
  }
  
  return results;
}

/**
 * 2つのベクトルが等しいかチェック（誤差を考慮）
 * @param {THREE.Vector3} v1 - ベクトル1
 * @param {THREE.Vector3} v2 - ベクトル2
 * @param {number} tolerance - 許容誤差
 * @returns {boolean}
 */
function vectorsEqual(v1, v2, tolerance = 1e-6) {
  return Math.abs(v1.x - v2.x) < tolerance &&
         Math.abs(v1.y - v2.y) < tolerance &&
         Math.abs(v1.z - v2.z) < tolerance;
}