import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { RoomMesh } from "./RoomMesh";
import { FurnitureMesh } from "./FurnitureMesh";
import { DoorMesh } from "./DoorMesh";
import { WindowMesh } from "./WindowMesh";

export function Scene3D() {
  const room = useSimulatorStore((state) => state.room);
  const furniture = useSimulatorStore((state) => state.furniture);
  const doors = useSimulatorStore((state) => state.doors);
  const windows = useSimulatorStore((state) => state.windows);

  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1a1a" }}>
      <Canvas shadows>
        {/* Camera */}
        <PerspectiveCamera
          makeDefault
          position={[room.width * 1.5, room.ceilingHeight * 1.5, room.height * 1.5]}
          fov={50}
        />

        {/* Lights */}
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[room.width / 2, room.ceilingHeight * 2, room.height / 2]}
          intensity={0.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* Room */}
        <RoomMesh room={room} />

        {/* Doors */}
        {doors.map((door) => (
          <DoorMesh key={door.id} door={door} room={room} />
        ))}

        {/* Windows */}
        {windows.map((window) => (
          <WindowMesh key={window.id} window={window} room={room} />
        ))}

        {/* Furniture */}
        {furniture.map((item) => (
          <FurnitureMesh key={item.id} item={item} />
        ))}

        {/* Controls */}
        <OrbitControls
          makeDefault
          target={[room.width / 2, room.ceilingHeight / 2, room.height / 2]}
          maxPolarAngle={Math.PI / 2}
          minDistance={500}
          maxDistance={room.width * 3}
        />

        {/* Grid helper */}
        <gridHelper
          args={[Math.max(room.width, room.height) * 2, 20, "#444", "#222"]}
          position={[room.width / 2, 0, room.height / 2]}
        />
      </Canvas>
    </div>
  );
}
