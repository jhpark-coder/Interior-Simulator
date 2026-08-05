import { useMemo } from "react";
import type { Room, Door, Window } from "../types";
import {
  getRoomBaseboardSegments,
  getRoomWallSegments,
} from "./scene3dMath";

type RoomMeshProps = {
  room: Room;
  doors: Door[];
  windows: Window[];
};

export function RoomMesh({ room, doors, windows }: RoomMeshProps) {
  const { width, height, ceilingHeight, wallColor, floorColor } = room;
  const resolvedWallColor =
    !wallColor || wallColor === "#b0b0b0" ? "#e6ddd2" : wallColor;
  const resolvedFloorColor =
    !floorColor || floorColor === "#c4a882" ? "#c9a783" : floorColor;

  const wallSegments = useMemo(
    () => getRoomWallSegments(room, doors, windows),
    [room, doors, windows]
  );
  const baseboardSegments = useMemo(
    () => getRoomBaseboardSegments(room, doors, windows),
    [room, doors, windows]
  );

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[width / 2, -9, height / 2]}
        receiveShadow
      >
        <boxGeometry args={[width, 18, height]} />
        <meshStandardMaterial
          color={resolvedFloorColor}
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>

      {/* Wall segments */}
      {wallSegments.map((seg) => (
        <mesh
          key={seg.key}
          position={seg.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={seg.size} />
          <meshStandardMaterial
            color={resolvedWallColor}
            roughness={0.92}
            metalness={0.01}
          />
        </mesh>
      ))}

      {/* Baseboards */}
      {baseboardSegments.map((seg) => (
        <mesh key={seg.key} position={seg.position} receiveShadow>
          <boxGeometry args={seg.size} />
          <meshStandardMaterial
            color="#efe6db"
            roughness={0.78}
            metalness={0.02}
          />
        </mesh>
      ))}

      {/* Ceiling (semi-transparent) */}
      <mesh
        position={[width / 2, ceilingHeight, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          color="#f8f5ef"
          transparent
          opacity={0.06}
          roughness={0.98}
        />
      </mesh>
    </group>
  );
}
