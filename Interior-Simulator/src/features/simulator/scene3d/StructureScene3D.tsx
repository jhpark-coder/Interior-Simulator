import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  OrbitControls,
} from "@react-three/drei";
import { Vector3, type PerspectiveCamera } from "three";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { FurnitureMesh } from "./FurnitureMesh";
import { StructureMesh } from "./StructureMesh";
import { getStructureBounds } from "./structure3dMath";
import {
  canWalkBetween,
  findWalkLookTarget,
  findWalkStartPosition,
  isWalkPositionValid,
} from "./walkCollision";

function StructureCameraRig({
  position,
  target,
  near,
  far,
  fov,
  resetKey,
}: {
  position: [number, number, number];
  target: [number, number, number];
  near: number;
  far: number;
  fov: number;
  resetKey: string;
}) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  useEffect(() => {
    camera.position.set(...position);
    camera.near = near;
    camera.far = far;
    camera.fov = fov;
    camera.lookAt(...target);
    camera.updateProjectionMatrix();
  }, [camera, far, fov, near, position, resetKey, target]);
  return null;
}

function WalkControls() {
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const canvas = useThree((state) => state.gl.domElement);
  const structure = useSimulatorStore((state) => state.structure);
  const viewpoints = useSimulatorStore((state) => state.savedViewpoints);
  const activeViewpointId = useSimulatorStore(
    (state) => state.activeViewpointId
  );
  const keys = useRef(new Set<string>());
  const dragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const yaw = useRef(0);
  const pitch = useRef(0);
  const direction = useMemo(() => new Vector3(), []);
  const side = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.code);
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const viewpoint = viewpoints.find((item) => item.id === activeViewpointId);
    if (!viewpoint) return;
    camera.position.set(
      viewpoint.position.x,
      viewpoint.position.y,
      viewpoint.position.z
    );
    camera.lookAt(
      viewpoint.target.x,
      viewpoint.target.y,
      viewpoint.target.z
    );
  }, [activeViewpointId, camera, viewpoints]);

  useEffect(() => {
    const lookToward = (x: number, y: number, z: number) => {
      const length = Math.hypot(x, y, z) || 1;
      yaw.current = Math.atan2(-x, -z);
      pitch.current = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, Math.asin(y / length))
      );
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      camera.updateMatrixWorld();
    };

    const current = { x: camera.position.x, y: camera.position.z };
    if (isWalkPositionValid(current, structure)) {
      camera.position.y = 1600;
      camera.getWorldDirection(direction);
      if (direction.lengthSq() < 0.0001) direction.set(0, 0, -1);
      lookToward(direction.x, direction.y, direction.z);
      return;
    }
    const start = findWalkStartPosition(structure);
    if (start) {
      camera.position.set(start.x, 1600, start.y);
      const lookTarget = findWalkLookTarget(start, structure);
      lookToward(lookTarget.x - start.x, -220, lookTarget.y - start.y);
    }
  }, [camera, direction, structure]);

  useEffect(() => {
    const previousCursor = canvas.style.cursor;
    canvas.style.cursor = "grab";
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging.current = true;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current) return;
      const dx = event.clientX - lastPointer.current.x;
      const dy = event.clientY - lastPointer.current.y;
      lastPointer.current = { x: event.clientX, y: event.clientY };
      yaw.current -= dx * 0.003;
      pitch.current = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, pitch.current - dy * 0.003)
      );
      camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");
      camera.updateMatrixWorld();
      event.preventDefault();
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      canvas.style.cursor = "grab";
      canvas.releasePointerCapture?.(event.pointerId);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      canvas.style.cursor = previousCursor;
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [camera, canvas]);

  useFrame((_, delta) => {
    const forward =
      keys.current.has("KeyW") || keys.current.has("ArrowUp")
        ? 1
        : keys.current.has("KeyS") || keys.current.has("ArrowDown")
          ? -1
          : 0;
    const strafe =
      keys.current.has("KeyD") || keys.current.has("ArrowRight")
        ? 1
        : keys.current.has("KeyA") || keys.current.has("ArrowLeft")
          ? -1
          : 0;
    if (forward === 0 && strafe === 0) return;

    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();
    side.crossVectors(direction, camera.up).normalize();
    const distance = Math.min(delta, 0.05) * 1400;
    const dx = (direction.x * forward + side.x * strafe) * distance;
    const dz = (direction.z * forward + side.z * strafe) * distance;
    const from = { x: camera.position.x, y: camera.position.z };
    const combined = { x: from.x + dx, y: from.y + dz };
    if (canWalkBetween(from, combined, structure)) {
      camera.position.x = combined.x;
      camera.position.z = combined.y;
    } else {
      const alongX = { x: from.x + dx, y: from.y };
      const alongZ = { x: from.x, y: from.y + dz };
      if (canWalkBetween(from, alongX, structure)) {
        camera.position.x = alongX.x;
      }
      if (canWalkBetween(from, alongZ, structure)) {
        camera.position.z = alongZ.y;
      }
    }
    camera.position.y = 1600;
  });

  return null;
}

export function StructureScene3D({
  memoryMode = false,
  showScenarioMaterials = false,
}: {
  memoryMode?: boolean;
  showScenarioMaterials?: boolean;
}) {
  const structure = useSimulatorStore((state) => state.structure);
  const furniture = useSimulatorStore((state) => state.furniture);
  const navigationMode = useSimulatorStore((state) => state.navigationMode);
  const activeMaterials = useSimulatorStore((state) => state.activeMaterials);
  const viewpoints = useSimulatorStore((state) => state.savedViewpoints);
  const activeViewpointId = useSimulatorStore(
    (state) => state.activeViewpointId
  );
  const activeViewpoint = viewpoints.find(
    (viewpoint) => viewpoint.id === activeViewpointId
  );
  const bounds = useMemo(() => getStructureBounds(structure), [structure]);
  const maxDimension = Math.max(bounds.width, bounds.height, 4000);
  const target = useMemo<[number, number, number]>(
    () => [bounds.centerX, structure.ceilingHeight * 0.38, bounds.centerY],
    [bounds.centerX, bounds.centerY, structure.ceilingHeight]
  );
  const position = useMemo<[number, number, number]>(
    () =>
      activeViewpoint
        ? [
            activeViewpoint.position.x,
            activeViewpoint.position.y,
            activeViewpoint.position.z,
          ]
        : [
            bounds.centerX + maxDimension * 1.45,
            Math.max(structure.ceilingHeight * 1.9, maxDimension * 1.05),
            bounds.centerY + maxDimension * 1.55,
          ],
    [
      activeViewpoint,
      bounds.centerX,
      bounds.centerY,
      maxDimension,
      structure.ceilingHeight,
    ]
  );
  const cameraTarget = useMemo<[number, number, number]>(
    () =>
      activeViewpoint
        ? [
            activeViewpoint.target.x,
            activeViewpoint.target.y,
            activeViewpoint.target.z,
          ]
        : target,
    [activeViewpoint, target]
  );
  const far = maxDimension * 8;

  return (
    <div style={{ width: "100%", height: "100%", minHeight: 560 }}>
      <Canvas
        camera={{ position, fov: memoryMode ? 65 : 42, near: 10, far }}
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true }}
      >
        <StructureCameraRig
          position={position}
          target={cameraTarget}
          near={10}
          far={far}
          fov={memoryMode ? 65 : 42}
          resetKey={`${memoryMode ? "memory" : "scene"}:${navigationMode}`}
        />
        <color attach="background" args={["#f1ece4"]} />
        <fog attach="fog" args={["#f1ece4", maxDimension * 1.5, far * 0.7]} />
        <Environment preset="apartment" />
        <ambientLight intensity={0.38} color="#fff4ea" />
        <hemisphereLight args={["#fff7ef", "#baa793", 0.52]} />
        <directionalLight
          position={[
            bounds.centerX + maxDimension,
            maxDimension * 1.7,
            bounds.centerY + maxDimension * 0.6,
          ]}
          intensity={1.05}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-maxDimension}
          shadow-camera-right={maxDimension}
          shadow-camera-top={maxDimension}
          shadow-camera-bottom={-maxDimension}
          shadow-camera-near={100}
          shadow-camera-far={maxDimension * 4}
        />
        <StructureMesh
          structure={structure}
          materials={showScenarioMaterials ? activeMaterials : []}
        />
        {furniture.map((item) => (
          <FurnitureMesh key={item.id} item={item} />
        ))}
        <ContactShadows
          position={[bounds.centerX, 2, bounds.centerY]}
          opacity={0.18}
          scale={maxDimension * 1.8}
          blur={1.8}
          far={structure.ceilingHeight * 1.5}
          resolution={1024}
          color="#756459"
        />
        {memoryMode && navigationMode === "walk" ? (
          <WalkControls />
        ) : (
          <OrbitControls
            makeDefault
            target={cameraTarget}
            maxPolarAngle={Math.PI / 2.03}
            minPolarAngle={0.3}
            minDistance={800}
            maxDistance={maxDimension * 5}
            enableDamping
            dampingFactor={0.08}
          />
        )}
      </Canvas>
    </div>
  );
}
