import { useRef } from "react";
import { Mesh } from "three";
import type { FurnitureItem } from "../types";
import { DEFAULT_FURNITURE_COLOR } from "../constants";

type FurnitureMeshProps = {
  item: FurnitureItem;
};

export function FurnitureMesh({ item }: FurnitureMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const color = item.color ?? DEFAULT_FURNITURE_COLOR;

  // Convert 2D rotation (degrees) to 3D rotation (radians around Y axis)
  const rotationY = -(item.rotation * Math.PI) / 180;

  return (
    <mesh
      ref={meshRef}
      position={[
        item.x + item.width / 2,
        item.height / 2,
        item.y + item.depth / 2,
      ]}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[item.width, item.height, item.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
