import React, { useRef } from "react";
import Cubelet from "./Cubelet";

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

export default RotatingGroup;