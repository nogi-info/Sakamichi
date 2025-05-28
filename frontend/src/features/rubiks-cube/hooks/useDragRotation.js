import { useRef, useCallback } from "react";
import * as THREE from "three";
import { rotateFace } from "../utils/cubeUtils";

/**
 * ドラッグによる回転操作を管理するカスタムフック
 * @param {Array} cubelets - 現在のキューブレット配列
 * @param {Function} setCubelets - キューブレット配列の更新関数
 * @param {boolean} isRotating - 回転中フラグ
 * @param {Function} setIsRotating - 回転中フラグの更新関数
 * @param {Function} setRotatingCubelets - 回転中キューブレットの更新関数
 * @param {Function} setRotationAxis - 回転軸の更新関数
 * @param {Function} setRotationAngle - 回転角度の更新関数
 * @param {Function} setRotationLayer - 回転レイヤーの更新関数
 * @param {Function} setDebugInfo - デバッグ情報の更新関数
 */
export function useDragRotation(
  cubelets,
  setCubelets,
  isRotating,
  setIsRotating,
  setRotatingCubelets,
  setRotationAxis,
  setRotationAngle,
  setRotationLayer,
  setDebugInfo
) {
  // ドラッグ関連のref
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragPlaneRef = useRef(null);
  const dragCubeletRef = useRef(null);
  const dragStart3DRef = useRef(null);

  /**
   * 回転方向をatan2の差分で判定
   */
  const calculateRotationDirection = useCallback((start, end, axis) => {
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
    
    let deltaTheta = theta1 - theta0;
    if (deltaTheta > Math.PI) deltaTheta -= 2 * Math.PI;
    if (deltaTheta < -Math.PI) deltaTheta += 2 * Math.PI;
    
    return deltaTheta < 0; // clockwise
  }, []);

  /**
   * 回転軸を判定する
   */
  const determineRotationAxis = useCallback((start, end, plane) => {
    let axis = null;
    let layer = null;

    if (start[0] !== end[0]) {
      if (plane === "xy") {
        axis = "y";
        layer = start[1];
      } else if (plane === "zx") {
        axis = "z";
        layer = start[2];
      }
    } else if (start[1] !== end[1]) {
      if (plane === "xy") {
        axis = "x";
        layer = start[0];
      } else if (plane === "yz") {
        axis = "z";
        layer = start[2];
      }
    } else if (start[2] !== end[2]) {
      if (plane === "yz") {
        axis = "y";
        layer = start[1];
      } else if (plane === "zx") {
        axis = "x";
        layer = start[0];
      }
    }

    return { axis, layer };
  }, []);

  /**
   * ドラッグ平面を判定する
   */
  const determineDragPlane = useCallback((face, cubeletRotation) => {
    // 回転後の法線を計算
    const localNormal = face.normal.clone();
    const euler = new THREE.Euler(...cubeletRotation, "XYZ");
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

    return { plane, worldNormal };
  }, []);

  /**
   * キューブレットクリック処理
   */
  const handleCubeletClick = useCallback((event) => {
    if (isRotating) return;
    event.stopPropagation();

    const cubelet = cubelets.find(c =>
      c.position[0] === event.object.position.x &&
      c.position[1] === event.object.position.y &&
      c.position[2] === event.object.position.z
    );
    
    if (!cubelet || event.nativeEvent.button !== 0) return;

    // ドラッグ開始情報を記録
    dragStartRef.current = { 
      x: event.nativeEvent.clientX, 
      y: event.nativeEvent.clientY 
    };
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

    // ドラッグ平面を決定
    const { plane, worldNormal } = determineDragPlane(event.face, cubelet.rotation);
    dragPlaneRef.current = plane;

    // 回転状態をリセット
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
  }, [cubelets, isRotating, determineDragPlane, setRotationAxis, setRotationAngle, setRotatingCubelets, setRotationLayer, setDebugInfo]);

  /**
   * ポインター移動処理
   */
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

      // 回転軸と層を決定
      const { axis, layer } = determineRotationAxis(start, end, dragPlaneRef.current);

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

      // 回転方向を計算
      const clockwise = calculateRotationDirection(start, end, axis);

      // 回転状態を設定
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
  }, [cubelets, isRotating, determineRotationAxis, calculateRotationDirection, setRotationAxis, setRotationLayer, setRotationAngle, setRotatingCubelets, setIsRotating, setDebugInfo]);

  /**
   * ポインター離し処理
   */
  const handlePointerUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    if (dragStartRef.current._rotated) {
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

    // 状態をリセット
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
  }, [setCubelets, setIsRotating, setRotatingCubelets, setRotationAngle, setRotationAxis, setRotationLayer, setDebugInfo]);

  return {
    handleCubeletClick,
    handlePointerMove,
    handlePointerUp,
  };
}