import type { Window, Room } from "../types";

type WindowMeshProps = {
  window: Window;
  room: Room;
};

export function WindowMesh({ window, room }: WindowMeshProps) {
  const { width, height, wallThickness } = room;

  // Calculate window position based on wall
  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];

  const windowY = window.sillHeight + window.height / 2;

  switch (window.wall) {
    case "north":
      position = [window.offset + window.width / 2, windowY, 0];
      rotation = [0, 0, 0];
      break;
    case "south":
      position = [window.offset + window.width / 2, windowY, height];
      rotation = [0, Math.PI, 0];
      break;
    case "east":
      position = [width, windowY, window.offset + window.width / 2];
      rotation = [0, Math.PI / 2, 0];
      break;
    case "west":
      position = [0, windowY, window.offset + window.width / 2];
      rotation = [0, -Math.PI / 2, 0];
      break;
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Window frame (outer) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[window.width, window.height, wallThickness]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>

      {/* Glass pane */}
      <mesh position={[0, 0, 0]}>
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
      <mesh position={[0, 0, wallThickness / 4]}>
        <boxGeometry args={[20, window.height * 0.95, 30]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>

      {/* Window divider (horizontal) */}
      <mesh position={[0, 0, wallThickness / 4]}>
        <boxGeometry args={[window.width * 0.95, 20, 30]} />
        <meshStandardMaterial color="#4682B4" />
      </mesh>
    </group>
  );
}
