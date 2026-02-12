import { useRef, useState, useCallback, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3, ShaderMaterial } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Window, Room } from "../types";

const skyVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vec3 top    = vec3(0.25, 0.47, 0.85);
    vec3 mid    = vec3(0.55, 0.75, 0.95);
    vec3 horizon = vec3(0.82, 0.90, 0.98);
    float t = vUv.y;
    vec3 color = t > 0.4
      ? mix(mid, top, (t - 0.4) / 0.6)
      : mix(horizon, mid, t / 0.4);
    gl_FragColor = vec4(color, 1.0);
  }
`;

type WindowMeshProps = {
  window: Window;
  room: Room;
};

export function WindowMesh({ window: win, room }: WindowMeshProps) {
  const { width, height, wallThickness } = room;
  const [openSide, setOpenSide] = useState<"left" | "right" | null>(null);
  const leftOffsetRef = useRef(0);
  const rightOffsetRef = useRef(0);
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);
  const rootRef = useRef<Group>(null);

  let position: [number, number, number] = [0, 0, 0];
  let rotation: [number, number, number] = [0, 0, 0];

  const windowY = win.sillHeight + win.height / 2;
  const cx = win.offset + win.width / 2;

  switch (win.wall) {
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

  const frameDepth = wallThickness - 4;

  const W = win.width;
  const H = win.height;
  const barT = 30;
  const innerW = W - 2 * barT;
  const innerH = H - 2 * barT;
  const panelW = innerW / 2;
  const divT = 16;

  const leftTarget = openSide === "left" ? panelW : 0;
  const rightTarget = openSide === "right" ? -panelW : 0;

  useFrame(() => {
    if (leftRef.current) {
      const diff = leftTarget - leftOffsetRef.current;
      if (Math.abs(diff) < 0.5) {
        leftOffsetRef.current = leftTarget;
      } else {
        leftOffsetRef.current += diff * 0.1;
      }
      leftRef.current.position.x = leftOffsetRef.current;
    }
    if (rightRef.current) {
      const diff = rightTarget - rightOffsetRef.current;
      if (Math.abs(diff) < 0.5) {
        rightOffsetRef.current = rightTarget;
      } else {
        rightOffsetRef.current += diff * 0.1;
      }
      rightRef.current.position.x = rightOffsetRef.current;
    }
  });

  // Single click handler — determine left/right by local x coordinate
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!rootRef.current) return;
      const localPoint = rootRef.current.worldToLocal(
        new Vector3(e.point.x, e.point.y, e.point.z),
      );
      if (localPoint.x < 0) {
        setOpenSide((prev) => (prev === "left" ? null : "left"));
      } else {
        setOpenSide((prev) => (prev === "right" ? null : "right"));
      }
    },
    [],
  );

  const leftZ = -8;
  const rightZ = 8;
  const frameColor = "#4682B4";

  return (
    <group ref={rootRef} position={position} rotation={rotation}>
      {/* Single invisible hit area covering the entire window */}
      <mesh onClick={handleClick}>
        <boxGeometry args={[W, H, frameDepth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Sky gradient backdrop visible through window */}
      <mesh position={[0, 0, -frameDepth / 2 - 5]}>
        <planeGeometry args={[innerW, innerH]} />
        <shaderMaterial
          vertexShader={skyVertexShader}
          fragmentShader={skyFragmentShader}
        />
      </mesh>

      {/* ===== Outer Frame (fixed) ===== */}
      <mesh castShadow receiveShadow position={[0, H / 2 - barT / 2, 0]}>
        <boxGeometry args={[W, barT, frameDepth]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -(H / 2 - barT / 2), 0]}>
        <boxGeometry args={[W, barT, frameDepth]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[-(W / 2 - barT / 2), 0, 0]}>
        <boxGeometry args={[barT, H - 2 * barT, frameDepth]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>
      <mesh castShadow receiveShadow position={[W / 2 - barT / 2, 0, 0]}>
        <boxGeometry args={[barT, H - 2 * barT, frameDepth]} />
        <meshStandardMaterial color={frameColor} />
      </mesh>

      {/* ===== Left Panel (slides right when clicked) ===== */}
      <group ref={leftRef}>
        <mesh position={[-innerW / 4, 0, leftZ]}>
          <boxGeometry args={[panelW, innerH, 10]} />
          <meshStandardMaterial
            color="#87CEEB"
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[-innerW / 4, 0, leftZ]}>
          <boxGeometry args={[divT, innerH, divT]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      </group>

      {/* ===== Right Panel (slides left when clicked) ===== */}
      <group ref={rightRef}>
        <mesh position={[innerW / 4, 0, rightZ]}>
          <boxGeometry args={[panelW, innerH, 10]} />
          <meshStandardMaterial
            color="#87CEEB"
            transparent
            opacity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh position={[innerW / 4, 0, rightZ]}>
          <boxGeometry args={[divT, innerH, divT]} />
          <meshStandardMaterial color={frameColor} />
        </mesh>
      </group>
    </group>
  );
}
