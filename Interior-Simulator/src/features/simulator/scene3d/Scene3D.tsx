import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
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
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{
          position: [
            room.width * 1.5,
            room.ceilingHeight * 1.5,
            room.height * 1.5,
          ],
          fov: 50,
          near: 0.1,
          far: 20000,
        }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#2a2a2a"]} />

        {/* Lights */}
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[
            room.width / 2,
            room.ceilingHeight * 2,
            room.height / 2,
          ]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight
          position={[room.width / 2, room.ceilingHeight, room.height / 2]}
          intensity={0.5}
        />

        {/* Room (floor, walls with openings, ceiling) */}
        <RoomMesh room={room} doors={doors} windows={windows} />

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
          target={[
            room.width / 2,
            room.ceilingHeight / 2,
            room.height / 2,
          ]}
          maxPolarAngle={Math.PI / 2}
          minDistance={500}
          maxDistance={room.width * 3}
          enableDamping
        />

      </Canvas>
    </div>
  );
}
