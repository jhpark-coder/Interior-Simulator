import type { Window, Room } from "../types";

type WindowMeshProps = {
  window: Window;
  room: Room;
};

export function WindowMesh({ window, room }: WindowMeshProps) {
  const { width, height, wallThickness } = room;

  // Position window at wall center (matching wall segment positions)
  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];

  const windowY = window.sillHeight + window.height / 2;
  const cx = window.offset + window.width / 2;

  switch (window.wall) {
    case "north":
      position = [cx, windowY, -wallThickness / 2];
      rotation = [0, 0, 0];
      break;
    case "south":
      position = [cx, windowY, height + wallThickness / 2];
      rotation = [0, Math.PI, 0];
      break;
    case "east":
      position = [width + wallThickness / 2, windowY, cx];
      rotation = [0, Math.PI / 2, 0];
      break;
    case "west":
      position = [-wallThickness / 2, windowY, cx];
      rotation = [0, -Math.PI / 2, 0];
      break;
  }

  // Slightly thinner than wall to avoid z-fighting with wall segments
  const frameDepth = wallThickness - 4;

  return (
    <group position={position} rotation={rotation}>
      {/* Window frame (outer) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[window.width, window.height, frameDepth]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>

      {/* Glass pane */}
      <mesh>
        <boxGeometry args={[window.width * 0.9, window.height * 0.9, 20]} />
        <meshStandardMaterial
          color="#87CEEB"
          transparent
          opacity={0.3}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>

      {/* Window divider (vertical) */}
      <mesh position={[0, 0, frameDepth / 4]}>
        <boxGeometry args={[20, window.height * 0.95, 30]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>

      {/* Window divider (horizontal) */}
      <mesh position={[0, 0, frameDepth / 4]}>
        <boxGeometry args={[window.width * 0.95, 20, 30]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>
    </group>
  );
}
