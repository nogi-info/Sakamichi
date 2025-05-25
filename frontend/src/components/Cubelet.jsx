import React from "react";
import * as THREE from "three";

function Cubelet({ position, rotation, faceTextureIndices, faceTextures, onClick, onPointerMove }) {
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

export default Cubelet;