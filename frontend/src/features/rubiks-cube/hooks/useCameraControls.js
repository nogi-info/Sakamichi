import * as THREE from 'three';
import { useState, useCallback, useRef } from "react";

// カメラの制約定数
const CAMERA_DISTANCE_MIN = 3;
const CAMERA_DISTANCE_MAX = 20;

/**
 * カメラの制御を管理するカスタムフック
 */
export function useCameraControls() {
  const [cameraDistance, setCameraDistance] = useState(5);
  const [lockPolar, setLockPolar] = useState(false);
  const [lockedPolar, setLockedPolar] = useState(null);
  const [lockedAzimuth, setLockedAzimuth] = useState(null);
  const [showZoomControls, setShowZoomControls] = useState(false); // ズームコントロールの表示状態

  const orbitRef = useRef();

  /**
   * スライダーでカメラ距離を直接制御
   */
  const handleSlider = useCallback((e) => {
    const v = Number(e.target.value);
    setCameraDistance(v);
    
    // Three.jsのカメラ位置を直接更新
    const { camera } = window.__threeFiberRoot?.getState?.() || {};
    if (camera) {
      const len = Math.sqrt(
        camera.position.x ** 2 + 
        camera.position.y ** 2 + 
        camera.position.z ** 2
      );
      camera.position.multiplyScalar(v / len);
      camera.updateProjectionMatrix();
    }
  }, []);

  /**
   * カメラ距離をボタンで調整
   */
  const adjustCameraDistance = useCallback((delta) => {
    const newDistance = Math.max(
      CAMERA_DISTANCE_MIN, 
      Math.min(CAMERA_DISTANCE_MAX, cameraDistance + delta)
    );
    handleSlider({ target: { value: newDistance } });
  }, [cameraDistance, handleSlider]);

  /**
   * 視点固定の切り替え
   */
  const togglePolarLock = useCallback(() => {
    setLockPolar(prev => {
      const next = !prev;
      if (!next) {
        // 固定解除
        setLockedPolar(null);
        setLockedAzimuth(null);
      } else if (orbitRef.current) {
        // 現在の角度で固定
        setLockedPolar(orbitRef.current.getPolarAngle());
        setLockedAzimuth(orbitRef.current.getAzimuthalAngle());
      }
      return next;
    });
  }, []);

  /**
   * ズームコントロールの表示/非表示を切り替える
   */
  const toggleZoomControls = useCallback(() => {
    setShowZoomControls(prev => !prev);
  }, []);

  /**
   * OrbitControls の変更時の処理
   */
  const handleOrbitChange = useCallback((e) => {
    setCameraDistance(e.target.object.position.length());
  }, []);

  /**
   * カメラの設定オブジェクトを取得
   */
  const getCameraConfig = useCallback(() => ({
    position: [cameraDistance, cameraDistance, cameraDistance],
    fov: 50
  }), [cameraDistance]);

  /**
   * OrbitControls の設定オブジェクトを取得
   */
  const getOrbitControlsConfig = useCallback(() => ({
    ref: orbitRef,
    enablePan: false,
    enableZoom: showZoomControls, // showZoomControlsの状態に基づいてズームを有効/無効にする
    mouseButtons:{
      LEFT: null,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    },
    minDistance: CAMERA_DISTANCE_MIN,
    maxDistance: CAMERA_DISTANCE_MAX,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    minPolarAngle: lockPolar && lockedPolar !== null ? lockedPolar : 0,
    maxPolarAngle: lockPolar && lockedPolar !== null ? lockedPolar : Math.PI,
    onChange: handleOrbitChange
  }), [lockPolar, lockedPolar, handleOrbitChange, showZoomControls]); // showZoomControlsを依存配列に追加

  return {
    // 状態
    cameraDistance,
    lockPolar,
    lockedPolar,
    lockedAzimuth,
    orbitRef,
    showZoomControls, // showZoomControlsを返す
    
    // アクション
    handleSlider,
    adjustCameraDistance,
    togglePolarLock,
    toggleZoomControls, // toggleZoomControlsを返す
    handleOrbitChange,
    
    // 設定
    getCameraConfig,
    getOrbitControlsConfig,
    
    // 定数
    CAMERA_DISTANCE_MIN,
    CAMERA_DISTANCE_MAX,
  };
}
