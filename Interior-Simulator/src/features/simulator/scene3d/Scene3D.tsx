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
    <div style={{ width: "100%", height: "100%", background: "lime" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [5, 5, 5], fov: 50 }}
        gl={{
          antialias: true,
          alpha: false,
        }}
      >
        {/* 배경색 */}
        <color attach="background" args={["#87CEEB"]} />

        {/* Lights */}
        <ambientLight intensity={1} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* Test Cube - 원점에 배치 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="red" />
        </mesh>

        {/* 바닥 */}
        <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial color="green" />
        </mesh>

        {/* Controls */}
        <OrbitControls />

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
