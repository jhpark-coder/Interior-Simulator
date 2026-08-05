import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { Window, Room } from "../types";
import {
  getWindowPlacement,
  getWindowSlideTargets,
  interpolateAnimatedValue,
} from "./scene3dMath";

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
  const { wallThickness } = room;
  const [openSide, setOpenSide] = useState<"left" | "right" | null>(null);
  const leftOffsetRef = useRef(0);
  const rightOffsetRef = useRef(0);
  const leftRef = useRef<Group>(null);
  const rightRef = useRef<Group>(null);
  const rootRef = useRef<Group>(null);

  const { position, rotation } = getWindowPlacement(win, room);

  const frameDepth = wallThickness - 4;

  const W = win.width;
  const H = win.height;
  const barT = 30;
  const innerW = W - 2 * barT;
  const innerH = H - 2 * barT;
  const panelW = innerW / 2;
  const divT = 16;

  const { leftTarget, rightTarget } = getWindowSlideTargets(openSide, panelW);

  useFrame(() => {
    if (leftRef.current) {
      leftOffsetRef.current = interpolateAnimatedValue(
        leftOffsetRef.current,
        leftTarget,
        0.1,
        0.5
      );
      leftRef.current.position.x = leftOffsetRef.current;
    }
    if (rightRef.current) {
      rightOffsetRef.current = interpolateAnimatedValue(
        rightOffsetRef.current,
        rightTarget,
        0.1,
        0.5
      );
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
