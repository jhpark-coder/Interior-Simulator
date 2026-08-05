import { useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls } from "@react-three/drei";
import { PerspectiveCamera } from "three";
import { useSimulatorStore } from "../store/useSimulatorStore";
import type { Room } from "../types";
import { RoomMesh } from "./RoomMesh";
import { FurnitureMesh } from "./FurnitureMesh";
import { DoorMesh } from "./DoorMesh";
import { WindowMesh } from "./WindowMesh";
import { getSceneCameraConfig } from "./scene3dMath";

function SceneCameraRig({
  room,
  target,
}: {
  room: Room;
  target: [number, number, number];
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const config = useMemo(() => getSceneCameraConfig(room), [room]);

  useEffect(() => {
    camera.position.set(...config.position);
    camera.near = config.near;
    camera.far = config.far;
    camera.fov = config.fov;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, config, target]);

  return null;
}

export function Scene3D() {
  const room = useSimulatorStore((state) => state.room);
  const furniture = useSimulatorStore((state) => state.furniture);
  const doors = useSimulatorStore((state) => state.doors);
  const windows = useSimulatorStore((state) => state.windows);
  const cameraConfig = useMemo(() => getSceneCameraConfig(room), [room]);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{
          position: cameraConfig.position,
          fov: cameraConfig.fov,
          near: cameraConfig.near,
          far: cameraConfig.far,
        }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true }}
      >
        <SceneCameraRig room={room} target={cameraConfig.target} />
        <color attach="background" args={["#f1ece4"]} />
        <fog
          attach="fog"
          args={[
            "#f1ece4",
            Math.max(room.width, room.height) * 0.6,
            Math.max(room.width, room.height) * 2.4,
          ]}
        />
        <Environment preset="apartment" />

        {/* Lights */}
        <ambientLight intensity={0.35} color="#fff4ea" />
        <hemisphereLight
          args={["#fff7ef", "#baa793", 0.5]}
        />
        <directionalLight
          position={cameraConfig.keyLightPosition}
          intensity={1.1}
          color="#fff2dc"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-bias={-0.00008}
          shadow-normalBias={0.08}
          shadow-camera-left={-Math.max(room.width, room.height)}
          shadow-camera-right={Math.max(room.width, room.height)}
          shadow-camera-top={Math.max(room.width, room.height)}
          shadow-camera-bottom={-Math.max(room.width, room.height)}
          shadow-camera-near={100}
          shadow-camera-far={room.ceilingHeight * 4}
        />
        <pointLight
          position={cameraConfig.fillLightPosition}
          intensity={0.3}
          color="#fffdf8"
        />
        <pointLight
          position={[room.width / 2, room.ceilingHeight * 0.9, room.height / 2]}
          intensity={0.2}
          color="#f3efe6"
        />

        {/* Room (floor, walls with openings, ceiling) */}
        <RoomMesh room={room} doors={doors} windows={windows} />

        <ContactShadows
          position={[room.width / 2, 2, room.height / 2]}
          opacity={0.2}
          scale={cameraConfig.contactShadowScale}
          blur={1.75}
          far={room.ceilingHeight * 1.4}
          resolution={1024}
          color="#7a6658"
        />

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
          target={cameraConfig.target}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={0.45}
          minDistance={cameraConfig.minDistance}
          maxDistance={cameraConfig.maxDistance}
          enableDamping
          dampingFactor={0.08}
        />
      </Canvas>
    </div>
  );
}
