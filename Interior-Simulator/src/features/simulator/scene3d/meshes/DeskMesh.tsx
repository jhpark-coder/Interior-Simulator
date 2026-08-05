import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { FurnitureItem } from "../../types";
import { useSimulatorStore } from "../../store/useSimulatorStore";

const MM_PER_INCH = 25.4;
const DIAG_16_9 = Math.sqrt(16 * 16 + 9 * 9);

function getMonitorDims(inches: number): { w: number; h: number } {
  return {
    w: (inches * MM_PER_INCH * 16) / DIAG_16_9,
    h: (inches * MM_PER_INCH * 9) / DIAG_16_9,
  };
}

export function DeskMesh({
  width,
  depth,
  height,
  color,
}: {
  width: number;
  depth: number;
  height: number;
  color: string;
}) {
  const topT = Math.max(23, height * 0.032);
  const topY = height - topT / 2;

  const legW = Math.max(55, width * 0.04);
  const legD = legW;

  const footLength = depth * 0.95;
  const footH = Math.max(18, height * 0.025);
  const footW = legW * 1.2;
  const padW = footW + 10;
  const padH = 5;
  const padD = 28;

  const columnH = height - topT - footH;
  const columnY = footH + columnH / 2;

  const legInset = width * 0.1;
  const legX1 = -width / 2 + legInset + legW / 2;
  const legX2 = width / 2 - legInset - legW / 2;

  const bracketLength = depth * 0.74;
  const bracketH = Math.max(28, height * 0.04);
  const bracketW = legW * 0.9;
  const bracketY = height - topT - bracketH / 2;

  const panelW = Math.min(120, width * 0.1);
  const panelH = 22;
  const panelD = 32;

  const metalColor = "#d0d0d0";
  const darkColor = "#333333";

  return (
    <>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {[legX1, legX2].map((lx, i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, footH / 2, 0]} receiveShadow>
            <boxGeometry args={[footW, footH, footLength]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>

          {([-1, 1] as const).map((side) => (
            <mesh key={`pad-${side}`} position={[lx, padH / 2, side * (footLength / 2 - padD / 2)]}>
              <boxGeometry args={[padW, padH, padD]} />
              <meshStandardMaterial color={darkColor} />
            </mesh>
          ))}

          <mesh position={[lx, columnY, 0]}>
            <boxGeometry args={[legW, columnH, legD]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>

          <mesh position={[lx, bracketY, 0]}>
            <boxGeometry args={[bracketW, bracketH, bracketLength]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}

      <mesh position={[width / 4, height - topT - panelH / 2, depth / 2 - panelD / 2 - 10]}>
        <boxGeometry args={[panelW, panelH, panelD]} />
        <meshStandardMaterial color={darkColor} />
      </mesh>
    </>
  );
}

export function MonitorStandMesh({ item, color }: { item: FurnitureItem; color: string }) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#888888";
  const screenColor = "#1a1a1a";
  const bezelColor = "#222222";

  const baseH = height * 0.12;
  const neckW = width * 0.08;
  const neckT = depth * 0.06;
  const neckH = height * 0.2;
  const neckBottomY = baseH;

  const hasInches = item.monitorInches != null && item.monitorInches > 0;
  const monitorDims = hasInches ? getMonitorDims(item.monitorInches!) : null;
  const monitorW = monitorDims ? monitorDims.w : width * 0.92;
  const monitorH = monitorDims ? monitorDims.h : height * 0.6;
  const monitorT = 18;
  const monitorBottomY = neckBottomY + neckH * 0.3;
  const monitorCenterY = monitorBottomY + monitorH / 2;
  const bezelH = height * 0.04;
  const tiltAngle = -0.087;
  const monitorZ = -depth * 0.1;

  const pivotRef = useRef(0);
  const pivotGroupRef = useRef<Group>(null);
  const pivotTarget = item.pivoted ? Math.PI / 2 : 0;

  useFrame(() => {
    if (!pivotGroupRef.current) return;
    const diff = pivotTarget - pivotRef.current;
    if (Math.abs(diff) < 0.001) return;
    pivotRef.current += diff * 0.1;
    pivotGroupRef.current.rotation.z = pivotRef.current;
  });

  const togglePivot = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      updateFurniture(item.id, { pivoted: !item.pivoted });
      commitHistory();
    },
    [item.id, item.pivoted, updateFurniture, commitHistory]
  );

  return (
    <>
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseH, depth]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>

      <mesh position={[0, neckBottomY + neckH / 2, monitorZ]} castShadow>
        <boxGeometry args={[neckW, neckH, neckT]} />
        <meshStandardMaterial color={metalColor} metalness={0.4} roughness={0.4} />
      </mesh>

      <group position={[0, monitorCenterY, monitorZ]} rotation={[tiltAngle, 0, 0]}>
        <group ref={pivotGroupRef}>
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>
          <mesh position={[0, bezelH / 2, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>
          <mesh position={[0, -monitorH / 2 + bezelH / 2, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.3, bezelH, 1]} />
            <meshStandardMaterial color={bezelColor} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function MonitorArmPoleMesh({ item, color: _color }: { item: FurnitureItem; color: string }) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#666666";
  const darkColor = "#333333";
  const screenColor = "#1a1a1a";

  const clampW = width * 0.6;
  const clampD = depth * 0.15;
  const clampH = height * 0.06;
  const backOffset = -depth / 2 + clampD / 2;

  const poleR = width * 0.12;
  const poleH = height * 0.55;
  const poleBottomY = clampH;

  const armW = depth * 0.35;
  const armLen = armW * 0.5;
  const armH = poleR * 1.2;
  const armD = poleR * 1.2;
  const armY = poleBottomY + poleH * 0.85;

  const jointR = poleR * 0.8;
  const jointH = armD * 0.6;

  const vesaW = 8;
  const vesaH = height * 0.12;
  const vesaD = depth * 0.15;

  const hasInches = item.monitorInches != null && item.monitorInches > 0;
  const monDims = hasInches ? getMonitorDims(item.monitorInches!) : null;
  const monitorW = monDims ? monDims.w : depth * 0.85;
  const monitorH = monDims ? monDims.h : height * 0.45;
  const monitorT = 16;
  const monitorZ = armW / 2 + vesaW + monitorT / 2;
  const tiltAngle = -0.087;

  const pivotRef = useRef(0);
  const pivotGroupRef = useRef<Group>(null);
  const pivotTarget = item.pivoted ? Math.PI / 2 : 0;

  useFrame(() => {
    if (!pivotGroupRef.current) return;
    const diff = pivotTarget - pivotRef.current;
    if (Math.abs(diff) < 0.001) return;
    pivotRef.current += diff * 0.1;
    pivotGroupRef.current.rotation.z = pivotRef.current;
  });

  const togglePivot = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      updateFurniture(item.id, { pivoted: !item.pivoted });
      commitHistory();
    },
    [item.id, item.pivoted, updateFurniture, commitHistory]
  );

  return (
    <group position={[0, 0, backOffset]}>
      <mesh position={[0, clampH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[clampW, clampH, clampD]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, poleBottomY + poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, poleH, 16]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, armY, armLen / 2]} castShadow>
        <boxGeometry args={[armD, armH, armLen]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, armY, armW / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[jointR, jointR, jointH, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, armY, armW / 2 + vesaW / 2]}>
        <boxGeometry args={[vesaD, vesaH, vesaW]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <group position={[0, armY, monitorZ]} rotation={[tiltAngle, 0, 0]}>
        <group ref={pivotGroupRef}>
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>
          <mesh position={[0, monitorH * 0.02, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>
          <mesh position={[0, -monitorH / 2 + monitorH * 0.03, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.25, monitorH * 0.04, 1]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function MonitorArmClampMesh({ item, color: _color }: { item: FurnitureItem; color: string }) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#666666";
  const darkColor = "#333333";
  const screenColor = "#1a1a1a";

  const clampW = width * 0.7;
  const clampD = depth * 0.12;
  const clampH = height * 0.06;
  const backOffset = -depth / 2 + clampD / 2;

  const lowerArmLen = height * 0.4;
  const armThick = width * 0.25;
  const jointR = armThick * 0.6;
  const upperArmLen = depth * 0.4;

  const hasInches = item.monitorInches != null && item.monitorInches > 0;
  const monDims = hasInches ? getMonitorDims(item.monitorInches!) : null;
  const monitorW = monDims ? monDims.w : depth * 0.85;
  const monitorH = monDims ? monDims.h : height * 0.5;
  const monitorT = 16;
  const vesaW = 8;
  const vesaH = height * 0.12;
  const vesaD = depth * 0.12;

  const lowerArmAngle = 0.35;
  const lowerArmTopY = clampH + lowerArmLen * Math.cos(lowerArmAngle);
  const lowerArmTopZ = lowerArmLen * Math.sin(lowerArmAngle);
  const upperArmY = lowerArmTopY;
  const upperArmEndZ = lowerArmTopZ + upperArmLen;
  const tiltAngle = -0.087;

  const pivotRef = useRef(0);
  const pivotGroupRef = useRef<Group>(null);
  const pivotTarget = item.pivoted ? Math.PI / 2 : 0;

  useFrame(() => {
    if (!pivotGroupRef.current) return;
    const diff = pivotTarget - pivotRef.current;
    if (Math.abs(diff) < 0.001) return;
    pivotRef.current += diff * 0.1;
    pivotGroupRef.current.rotation.z = pivotRef.current;
  });

  const togglePivot = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      updateFurniture(item.id, { pivoted: !item.pivoted });
      commitHistory();
    },
    [item.id, item.pivoted, updateFurniture, commitHistory]
  );

  return (
    <group position={[0, 0, backOffset]}>
      <mesh position={[0, clampH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[clampW, clampH, clampD]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh
        position={[0, clampH + lowerArmTopY / 2 - clampH / 2, lowerArmTopZ / 2]}
        rotation={[lowerArmAngle, 0, 0]}
        castShadow
      >
        <boxGeometry args={[armThick, lowerArmLen, armThick]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, upperArmY, lowerArmTopZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[jointR, jointR, armThick * 0.8, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, upperArmY, lowerArmTopZ + upperArmLen / 2]} castShadow>
        <boxGeometry args={[armThick, armThick, upperArmLen]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[0, upperArmY, upperArmEndZ + vesaW / 2]}>
        <boxGeometry args={[vesaD, vesaH, vesaW]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>
      <group position={[0, upperArmY, upperArmEndZ + vesaW + monitorT / 2]} rotation={[tiltAngle, 0, 0]}>
        <group ref={pivotGroupRef}>
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>
          <mesh position={[0, monitorH * 0.02, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>
          <mesh position={[0, -monitorH / 2 + monitorH * 0.03, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.25, monitorH * 0.04, 1]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
