import type { Room } from "../types";

type RoomMeshProps = {
  room: Room;
};

export function RoomMesh({ room }: RoomMeshProps) {
  const { width, height, wallThickness, ceilingHeight } = room;

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[width / 2, 0, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* North wall (back, y=0) */}
      <mesh
        position={[width / 2, ceilingHeight / 2, -wallThickness / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, ceilingHeight, wallThickness]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>

      {/* South wall (front, y=height) */}
      <mesh
        position={[width / 2, ceilingHeight / 2, height + wallThickness / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, ceilingHeight, wallThickness]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>

      {/* West wall (left, x=0) */}
      <mesh
        position={[-wallThickness / 2, ceilingHeight / 2, height / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, ceilingHeight, height]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>

      {/* East wall (right, x=width) */}
      <mesh
        position={[width + wallThickness / 2, ceilingHeight / 2, height / 2]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[wallThickness, ceilingHeight, height]} />
        <meshStandardMaterial color="#b0b0b0" />
      </mesh>

      {/* Ceiling (optional, semi-transparent) */}
      <mesh
        position={[width / 2, ceilingHeight, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#f5f5f5" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
