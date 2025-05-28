import React, { useRef, useEffect } from "react";
import * as THREE from "three";

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

export default AxesArrows;