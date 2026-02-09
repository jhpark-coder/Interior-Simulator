import { useRef } from "react";
import { Mesh } from "three";
import type { FurnitureItem } from "../types";

type FurnitureMeshProps = {
  item: FurnitureItem;
};

const furnitureColors: Record<string, string> = {
  bed: "#8B4513",
  desk: "#D2691E",
  chair: "#CD853F",
  closet: "#A0522D",
  sofa: "#BC8F8F",
  table: "#DEB887",
};

export function FurnitureMesh({ item }: FurnitureMeshProps) {
  const meshRef = useRef<Mesh>(null);
  const color = furnitureColors[item.type] || "#808080";

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
