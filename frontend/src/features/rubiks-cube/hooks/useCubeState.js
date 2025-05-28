import { useState, useCallback, useMemo } from "react";
import { 
  createInitialCubelets, 
  rotateFace, 
  rotateAllLayers,
  createFaceTextures,
  FACE_NAMES 
} from "../utils/cubeUtils";
import { isCubeSolved } from "../utils/cubeCheckUtils";

/**
 * ルービックキューブの基本状態を管理するカスタムフック
 * @param {string} faceKanji - 各面に表示する漢字文字列
 */
export function useCubeState(faceKanji = "乃木櫻日向坂") {
  // キューブレットの状態
  const [cubelets, setCubelets] = useState(createInitialCubelets());
  const [initialCubelets, setInitialCubelets] = useState(() => createInitialCubelets());
  
  // 回転アニメーション状態
  const [isRotating, setIsRotating] = useState(false);
  const [rotatingCubelets, setRotatingCubelets] = useState([]);
  const [rotationAxis, setRotationAxis] = useState(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [rotationLayer, setRotationLayer] = useState(null);
  
  // ゲーム状態
  const [isCleared, setIsCleared] = useState(false);

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

  /**
   * キューブを初期状態にリセット
   */
  const resetCube = useCallback(() => {
    setCubelets(createInitialCubelets());
    setIsCleared(false);
    setIsRotating(false);
    setRotatingCubelets([]);
    setRotationAngle(0);
    setRotationAxis(null);
    setRotationLayer(null);
  }, []);

  /**
   * 指定された面・層を回転
   */
  const rotateCubeFace = useCallback((axis, layer, clockwise) => {
    setCubelets(prev => rotateFace(prev, axis, layer, clockwise));
    setIsRotating(false);
    setRotatingCubelets([]);
    setRotationAngle(0);
    setRotationAxis(null);
    setRotationLayer(null);
  }, []);

  /**
   * 全体を指定軸で回転
   */
  const rotateEntireCube = useCallback((axis, clockwise) => {
    setCubelets(prev => rotateAllLayers(prev, axis, clockwise));
  }, []);

  /**
   * ランダム回転処理
   */
  const randomRotate = useCallback(async (count = 12, delay = 200) => {
    // 現在の状態を初期状態として保存
    setInitialCubelets(cubelets);
    setInitialFaceTextures(faceTextures);
    
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
      setRotationLayer(null);
      
      // 少し待つ（アニメーションがあればここで待つ）
      // eslint-disable-next-line no-await-in-loop
      await new Promise(res => setTimeout(res, delay));
    }
  }, [cubelets, faceTextures]);

  /**
   * クリア判定を実行
   */
  const judgeCleared = useCallback(async () => {
    const allMatch = isCubeSolved(cubelets);
    setIsCleared(allMatch);
    return allMatch;
  }, [cubelets]);

  /**
   * 静的なキューブレット（回転中でないもの）を取得
   */
  const staticCubelets = useMemo(() => {
    return cubelets.filter(cubelet =>
      !rotatingCubelets.some(rc => rc.id === cubelet.id)
    );
  }, [cubelets, rotatingCubelets]);

  return {
    // 状態
    cubelets,
    setCubelets,
    initialCubelets,
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
    setIsCleared,
    faceTextures,
    initialFaceTextures,
    staticCubelets,
    
    // アクション
    resetCube,
    rotateCubeFace,
    rotateEntireCube,
    randomRotate,
    judgeCleared,
  };
}