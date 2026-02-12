import { useRef, useState, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { FurnitureItem } from "../types";
import { DEFAULT_FURNITURE_COLOR } from "../constants";
import { useSimulatorStore } from "../store/useSimulatorStore";

type FurnitureMeshProps = {
  item: FurnitureItem;
};

function BedMesh({
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
  const gap = 2; // 2mm gap between layers to prevent z-fighting

  const frameH = height * 0.6;
  const mattressH = height * 0.35;
  const mattressBottom = frameH + gap;
  const mattressTop = mattressBottom + mattressH;

  // Headboard: sits above frame, flush at back
  const headboardAboveFrame = height * 0.7;
  const headboardT = Math.max(depth * 0.03, 30);

  // Mattress sits between headboard front face and foot end, with gaps
  const mattressBackZ = -depth / 2 + headboardT + gap;
  const mattressFrontZ = depth / 2 - gap;
  const mattressD = mattressFrontZ - mattressBackZ;
  const mattressCenterZ = (mattressBackZ + mattressFrontZ) / 2;

  const pillowW = width >= 1200 ? width * 0.35 : width * 0.7;
  const pillowD = depth * 0.12;
  const pillowH = height * 0.12;
  const pillowZ = mattressBackZ + gap + pillowD / 2;

  const blanketD = mattressD * 0.55;
  const blanketH = height * 0.06;
  const blanketZ = mattressFrontZ - blanketD / 2 - gap;

  return (
    <>
      {/* Frame */}
      <mesh position={[0, frameH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, frameH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Headboard (above frame only) */}
      <mesh
        position={[
          0,
          frameH + headboardAboveFrame / 2,
          -depth / 2 + headboardT / 2,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, headboardAboveFrame, headboardT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Mattress */}
      <mesh
        position={[0, mattressBottom + mattressH / 2, mattressCenterZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width * 0.96, mattressH, mattressD]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>

      {/* Pillows */}
      {width >= 1200 ? (
        <>
          <mesh
            position={[
              -width * 0.22,
              mattressTop + gap + pillowH / 2,
              pillowZ,
            ]}
            castShadow
          >
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh
            position={[
              width * 0.22,
              mattressTop + gap + pillowH / 2,
              pillowZ,
            ]}
            castShadow
          >
            <boxGeometry args={[pillowW, pillowH, pillowD]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
        </>
      ) : (
        <mesh
          position={[0, mattressTop + gap + pillowH / 2, pillowZ]}
          castShadow
        >
          <boxGeometry args={[pillowW, pillowH, pillowD]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      )}

      {/* Blanket */}
      <mesh
        position={[0, mattressTop + gap + blanketH / 2, blanketZ]}
        castShadow
      >
        <boxGeometry args={[width * 0.92, blanketH, blanketD]} />
        <meshStandardMaterial color="#4a6fa5" />
      </mesh>
    </>
  );
}

function BookshelfMesh({
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
  const panelT = 29; // panel thickness
  const backT = 3; // back panel thickness
  const footH = 15; // foot height
  const footInset = 20; // foot inset from edge
  const footSize = 30;

  const bodyH = height - footH;
  const bodyY = footH; // body starts above feet

  const cols = 2;
  const rows = 4;
  const innerW = width - panelT * 2;
  const innerH = bodyH - panelT * 2;
  const dividerW = panelT;
  const cellW = (innerW - dividerW * (cols - 1)) / cols;
  const shelfCount = rows - 1; // 3 shelves between 4 rows

  // Shelf Y positions (evenly spaced within inner area)
  const cellH = (innerH - panelT * shelfCount) / rows;

  return (
    <>
      {/* Left side panel */}
      <mesh
        position={[-width / 2 + panelT / 2, bodyY + bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Right side panel */}
      <mesh
        position={[width / 2 - panelT / 2, bodyY + bodyH / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelT, bodyH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Top panel */}
      <mesh
        position={[0, bodyY + bodyH - panelT / 2, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Bottom panel */}
      <mesh position={[0, bodyY + panelT / 2, 0]} receiveShadow>
        <boxGeometry args={[width, panelT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Center vertical divider */}
      <mesh position={[0, bodyY + panelT + innerH / 2, 0]}>
        <boxGeometry args={[dividerW, innerH, depth - backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 3 horizontal shelves (span full inner width) */}
      {Array.from({ length: shelfCount }, (_, i) => {
        const shelfY = bodyY + panelT + (cellH + panelT) * (i + 1) - panelT / 2;
        return (
          <mesh key={`shelf-${i}`} position={[0, shelfY, 0]}>
            <boxGeometry args={[innerW, panelT, depth - backT]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}

      {/* Back panel */}
      <mesh position={[0, bodyY + bodyH / 2, -depth / 2 + backT / 2]}>
        <boxGeometry args={[width - panelT * 2, bodyH - panelT * 2, backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 4 feet */}
      {[
        [-width / 2 + footInset + footSize / 2, -depth / 2 + footInset + footSize / 2],
        [width / 2 - footInset - footSize / 2, -depth / 2 + footInset + footSize / 2],
        [-width / 2 + footInset + footSize / 2, depth / 2 - footInset - footSize / 2],
        [width / 2 - footInset - footSize / 2, depth / 2 - footInset - footSize / 2],
      ].map(([x, z], i) => (
        <mesh key={`foot-${i}`} position={[x, footH / 2, z]}>
          <boxGeometry args={[footSize, footH, footSize]} />
          <meshStandardMaterial color="#333333" />
        </mesh>
      ))}
    </>
  );
}

function DeskMesh({
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
  // Tabletop
  const topT = Math.max(23, height * 0.032);
  const topY = height - topT / 2;

  // Leg dimensions
  const legW = Math.max(55, width * 0.04);
  const legD = legW;

  // Foot (horizontal bar on floor, runs along Z / depth)
  const footLength = depth * 0.95;
  const footH = Math.max(18, height * 0.025);
  const footW = legW * 1.2;
  const padW = footW + 10;
  const padH = 5;
  const padD = 28;

  // Vertical column
  const columnH = height - topT - footH;
  const columnY = footH + columnH / 2;

  // Leg X positions (inset from edges)
  const legInset = width * 0.1;
  const legX1 = -width / 2 + legInset + legW / 2;
  const legX2 = width / 2 - legInset - legW / 2;

  // Upper bracket (horizontal arm under tabletop, runs along Z)
  const bracketLength = depth * 0.74;
  const bracketH = Math.max(28, height * 0.04);
  const bracketW = legW * 0.9;
  const bracketY = height - topT - bracketH / 2;

  // Control panel (front-right, under tabletop)
  const panelW = Math.min(120, width * 0.1);
  const panelH = 22;
  const panelD = 32;

  const metalColor = "#d0d0d0";
  const darkColor = "#333333";

  return (
    <>
      {/* Tabletop */}
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Two T-leg assemblies */}
      {[legX1, legX2].map((lx, i) => (
        <group key={`leg-${i}`}>
          {/* Foot (floor bar) */}
          <mesh position={[lx, footH / 2, 0]} receiveShadow>
            <boxGeometry args={[footW, footH, footLength]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>

          {/* Rubber pads at foot ends */}
          {([-1, 1] as const).map((side) => (
            <mesh
              key={`pad-${side}`}
              position={[lx, padH / 2, side * (footLength / 2 - padD / 2)]}
            >
              <boxGeometry args={[padW, padH, padD]} />
              <meshStandardMaterial color={darkColor} />
            </mesh>
          ))}

          {/* Vertical column */}
          <mesh position={[lx, columnY, 0]}>
            <boxGeometry args={[legW, columnH, legD]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>

          {/* Upper bracket (under tabletop) */}
          <mesh position={[lx, bracketY, 0]}>
            <boxGeometry args={[bracketW, bracketH, bracketLength]} />
            <meshStandardMaterial color={metalColor} metalness={0.3} roughness={0.5} />
          </mesh>
        </group>
      ))}

      {/* Control panel (front-right underside) */}
      <mesh
        position={[
          width / 4,
          height - topT - panelH / 2,
          depth / 2 - panelD / 2 - 10,
        ]}
      >
        <boxGeometry args={[panelW, panelH, panelD]} />
        <meshStandardMaterial color={darkColor} />
      </mesh>
    </>
  );
}

function DisplayCabinetMesh({
  item,
  color,
}: {
  item: FurnitureItem;
  color: string;
}) {
  const room = useSimulatorStore((s) => s.room);
  const furniture = useSimulatorStore((s) => s.furniture);

  const { width, depth, height } = item;
  const itemRotation = -(item.rotation * Math.PI) / 180;
  const itemCenterX = item.x + width / 2;
  const itemCenterZ = item.y + depth / 2;

  const [doorOpen, setDoorOpen] = useState(false);
  const doorGroupRef = useRef<Group>(null);
  const doorAngleRef = useRef(0);

  const frameSize = 15;
  const baseH = 30;
  const topH = 20;
  const shelfThick = 8;
  const panelThick = 6;

  const innerH = height - baseH - topH;
  const innerCenterY = baseH + innerH / 2;
  const shelfSpacing = innerH / 4;

  const panelW = width - frameSize * 2 - 4;
  const panelH = innerH - 4;
  const maxOpenAngle = (100 * Math.PI) / 180;
  const handleR = 8;

  const corners: [number, number][] = [
    [-width / 2 + frameSize / 2, -depth / 2 + frameSize / 2],
    [width / 2 - frameSize / 2, -depth / 2 + frameSize / 2],
    [-width / 2 + frameSize / 2, depth / 2 - frameSize / 2],
    [width / 2 - frameSize / 2, depth / 2 - frameSize / 2],
  ];

  useFrame(() => {
    if (!doorGroupRef.current) return;
    const target = doorOpen ? -maxOpenAngle : 0;
    const diff = target - doorAngleRef.current;
    if (Math.abs(diff) < 0.001) return;

    let nextAngle = doorAngleRef.current + diff * 0.1;
    const isOpening =
      Math.abs(nextAngle) > Math.abs(doorAngleRef.current) + 0.0001;

    if (isOpening) {
      const cosItem = Math.cos(itemRotation);
      const sinItem = Math.sin(itemRotation);

      if (
        checkClosetDoorCollision(
          nextAngle,
          -panelW / 2,
          depth / 2 - frameSize / 2,
          panelW,
          1,
          panelThick / 2,
          itemCenterX,
          itemCenterZ,
          cosItem,
          sinItem,
          room.width,
          room.height,
          furniture,
          item.id,
        )
      ) {
        let lo = doorAngleRef.current;
        let hi = nextAngle;
        for (let i = 0; i < 5; i++) {
          const mid = (lo + hi) / 2;
          if (
            checkClosetDoorCollision(
              mid,
              -panelW / 2,
              depth / 2 - frameSize / 2,
              panelW,
              1,
              panelThick / 2,
              itemCenterX,
              itemCenterZ,
              cosItem,
              sinItem,
              room.width,
              room.height,
              furniture,
              item.id,
            )
          ) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        nextAngle = lo;
        if (Math.abs(nextAngle - doorAngleRef.current) < 0.001) return;
      }
    }

    doorAngleRef.current = nextAngle;
    doorGroupRef.current.rotation.y = doorAngleRef.current;
  });

  const toggleDoor = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setDoorOpen((p) => !p);
  }, []);

  return (
    <>
      {/* Base plate */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, baseH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Top plate */}
      <mesh position={[0, height - topH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* 4 vertical corner posts */}
      {corners.map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, height / 2, z]} castShadow>
          <boxGeometry args={[frameSize, height, frameSize]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {/* 3 glass shelves */}
      {[1, 2, 3].map((i) => (
        <mesh
          key={`shelf-${i}`}
          position={[0, baseH + shelfSpacing * i, 0]}
        >
          <boxGeometry
            args={[
              width - frameSize * 2 - 4,
              shelfThick,
              depth - frameSize * 2 - 4,
            ]}
          />
          <meshPhysicalMaterial
            color="#d4eaf5"
            metalness={0.1}
            roughness={0.15}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      ))}

      {/* Glass panels — back, left, right (fixed) */}
      {/* Back */}
      <mesh position={[0, innerCenterY, -depth / 2 + frameSize / 2]}>
        <boxGeometry args={[panelW, panelH, panelThick]} />
        <meshPhysicalMaterial
          color="#cce8f4"
          transmission={0.85}
          roughness={0.05}
          thickness={panelThick}
        />
      </mesh>
      {/* Left */}
      <mesh position={[-width / 2 + frameSize / 2, innerCenterY, 0]}>
        <boxGeometry
          args={[panelThick, panelH, depth - frameSize * 2 - 4]}
        />
        <meshPhysicalMaterial
          color="#cce8f4"
          transmission={0.85}
          roughness={0.05}
          thickness={panelThick}
        />
      </mesh>
      {/* Right */}
      <mesh position={[width / 2 - frameSize / 2, innerCenterY, 0]}>
        <boxGeometry
          args={[panelThick, panelH, depth - frameSize * 2 - 4]}
        />
        <meshPhysicalMaterial
          color="#cce8f4"
          transmission={0.85}
          roughness={0.05}
          thickness={panelThick}
        />
      </mesh>

      {/* Front glass — DOOR (hinge on left) */}
      <group
        position={[
          -panelW / 2,
          innerCenterY,
          depth / 2 - frameSize / 2,
        ]}
      >
        <group ref={doorGroupRef}>
          {/* Invisible hit area */}
          <mesh position={[panelW / 2, 0, 0]} onClick={toggleDoor}>
            <boxGeometry
              args={[panelW, panelH, panelThick + handleR * 4]}
            />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {/* Glass panel */}
          <mesh position={[panelW / 2, 0, 0]}>
            <boxGeometry args={[panelW, panelH, panelThick]} />
            <meshPhysicalMaterial
              color="#cce8f4"
              transmission={0.85}
              roughness={0.05}
              thickness={panelThick}
            />
          </mesh>
          {/* Handle (vertical bar near right edge) */}
          <mesh
            position={[panelW - 25, 0, panelThick / 2 + handleR]}
            castShadow
          >
            <cylinderGeometry args={[handleR, handleR, 80, 8]} />
            <meshPhongMaterial
              color="#aaaaaa"
              specular="#ffffff"
              shininess={120}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

function ChairMesh({
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
  const gap = 2;

  // Key proportions (based on IKEA GRUPPSPEL gaming chair)
  const seatSurfaceY = height * 0.36;
  const seatW = width * 0.77;
  const seatD = depth * 0.75;
  const seatT = Math.max(height * 0.05, 30);
  const seatOffsetZ = depth * 0.05; // seat slightly forward

  // 5-star base
  const casterR = Math.min(25, width * 0.04);
  const starR = width * 0.42;
  const armT = Math.max(15, width * 0.025);
  const armW = Math.max(20, width * 0.03);
  const hubR = Math.max(35, width * 0.06);
  const baseY = casterR + armT / 2;

  // Gas lift
  const cylinderR = Math.max(20, width * 0.035);
  const cylinderBottom = baseY + armT / 2 + gap;
  const cylinderTop = seatSurfaceY - 15;
  const cylinderH = Math.max(cylinderTop - cylinderBottom, 10);

  // Backrest
  const backrestH = height * 0.40;
  const backrestW = seatW * 0.88;
  const backrestT = Math.max(seatT * 0.6, 25);
  const backrestBottomY = seatSurfaceY + seatT;
  const backrestCenterZ = -seatD / 2 + seatOffsetZ + backrestT / 2;
  const tiltAngle = 0.12; // ~7 degrees backward tilt

  // Headrest
  const headrestH = height * 0.065;
  const headrestW = backrestW * 0.52;
  const headrestT = backrestT * 1.3;
  const headrestGap = height * 0.02;
  const headrestLocalY = backrestH + headrestGap + headrestH / 2;

  // Armrests
  const armrestPadW = Math.max(width * 0.08, 40);
  const armrestPadD = depth * 0.32;
  const armrestPadT = 15;
  const armrestSupportW = Math.max(width * 0.04, 20);
  const armrestSupportH = height * 0.11;
  const armrestY = seatSurfaceY + armrestSupportH;
  const armrestX = seatW / 2 + armrestSupportW / 2 + gap;

  // Accent
  const accentColor = "#cc2222";
  const stripeW = Math.max(width * 0.08, 40);
  const darkColor = "#333333";

  return (
    <>
      {/* ===== 5-Star Base ===== */}
      <mesh position={[0, baseY, 0]}>
        <cylinderGeometry args={[hubR, hubR, armT, 16]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>

      {Array.from({ length: 5 }, (_, i) => {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const tipX = Math.cos(angle) * starR;
        const tipZ = Math.sin(angle) * starR;
        return (
          <group key={`base-${i}`}>
            {/* Arm */}
            <mesh
              position={[tipX / 2, baseY, tipZ / 2]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[starR, armT, armW]} />
              <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
            </mesh>
            {/* Caster wheel */}
            <mesh
              position={[tipX, casterR, tipZ]}
              rotation={[0, angle, Math.PI / 2]}
            >
              <cylinderGeometry args={[casterR, casterR, casterR * 0.8, 10]} />
              <meshStandardMaterial color={darkColor} />
            </mesh>
          </group>
        );
      })}

      {/* Gas lift cylinder */}
      <mesh position={[0, cylinderBottom + cylinderH / 2, 0]}>
        <cylinderGeometry args={[cylinderR, cylinderR, cylinderH, 10]} />
        <meshStandardMaterial color={darkColor} metalness={0.6} roughness={0.3} />
      </mesh>

      {/* ===== Seat ===== */}
      <mesh
        position={[0, seatSurfaceY + seatT / 2, seatOffsetZ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[seatW, seatT, seatD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Red accent stripe on seat */}
      <mesh position={[0, seatSurfaceY + seatT / 2 + gap, seatOffsetZ]}>
        <boxGeometry args={[stripeW, seatT + gap, seatD * 0.75]} />
        <meshStandardMaterial color={accentColor} />
      </mesh>

      {/* ===== Backrest (tilted backward) ===== */}
      <group
        position={[0, backrestBottomY, backrestCenterZ]}
        rotation={[tiltAngle, 0, 0]}
      >
        <mesh position={[0, backrestH / 2, 0]} castShadow>
          <boxGeometry args={[backrestW, backrestH, backrestT]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Red stripe on backrest */}
        <mesh position={[0, backrestH / 2, gap]}>
          <boxGeometry args={[stripeW, backrestH * 0.85, backrestT + gap]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>

        {/* ===== Headrest ===== */}
        <mesh position={[0, headrestLocalY, 0]} castShadow>
          <boxGeometry args={[headrestW, headrestH, headrestT]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* ===== Armrests ===== */}
      {([-1, 1] as const).map((side) => (
        <group key={`arm-${side}`}>
          {/* Vertical support */}
          <mesh
            position={[
              side * armrestX,
              seatSurfaceY + armrestSupportH / 2,
              0,
            ]}
          >
            <boxGeometry args={[armrestSupportW, armrestSupportH, armrestSupportW]} />
            <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
          </mesh>
          {/* Armrest pad (T-shape top) */}
          <mesh
            position={[
              side * armrestX,
              armrestY,
              seatOffsetZ,
            ]}
            castShadow
          >
            <boxGeometry args={[armrestPadW, armrestPadT, armrestPadD]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function checkClosetDoorCollision(
  angle: number,
  hingeLocalX: number,
  hingeLocalZ: number,
  doorWidth: number,
  hingeDir: number,
  doorHalfT: number,
  centerX: number,
  centerZ: number,
  cosItem: number,
  sinItem: number,
  roomWidth: number,
  roomDepth: number,
  furniture: FurnitureItem[],
  selfId: string,
): boolean {
  const wallMargin = 5;
  const furnitureMargin = 15;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const zLines = [-doorHalfT, 0, doorHalfT];

  for (const dz of zLines) {
    for (let s = 1; s <= 10; s++) {
      const r = (doorWidth * s) / 10;
      const rx = hingeDir * r * cosA + dz * sinA;
      const rz = -(hingeDir * r) * sinA + dz * cosA;
      const lx = hingeLocalX + rx;
      const lz = hingeLocalZ + rz;
      const wx = centerX + lx * cosItem + lz * sinItem;
      const wz = centerZ - lx * sinItem + lz * cosItem;

      if (
        wx < wallMargin ||
        wx > roomWidth - wallMargin ||
        wz < wallMargin ||
        wz > roomDepth - wallMargin
      ) {
        return true;
      }

      for (const f of furniture) {
        if (f.id === selfId) continue;
        const dx = wx - (f.x + f.width / 2);
        const dz2 = wz - (f.y + f.depth / 2);
        const fRot = (f.rotation * Math.PI) / 180;
        const cosR = Math.cos(fRot);
        const sinR = Math.sin(fRot);
        const flx = dx * cosR + dz2 * sinR;
        const flz = -dx * sinR + dz2 * cosR;
        if (
          Math.abs(flx) <= f.width / 2 + furnitureMargin &&
          Math.abs(flz) <= f.depth / 2 + furnitureMargin
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function checkClosetDrawerCollision(
  slideOffset: number,
  frontLocalZ: number,
  drawerWidth: number,
  centerX: number,
  centerZ: number,
  cosItem: number,
  sinItem: number,
  roomWidth: number,
  roomDepth: number,
  furniture: FurnitureItem[],
  selfId: string,
): boolean {
  const wallMargin = 5;
  const furnitureMargin = 15;
  const lz = frontLocalZ + slideOffset;

  for (let s = 0; s <= 10; s++) {
    const lx = (s / 10 - 0.5) * drawerWidth;
    const wx = centerX + lx * cosItem + lz * sinItem;
    const wz = centerZ - lx * sinItem + lz * cosItem;

    if (
      wx < wallMargin ||
      wx > roomWidth - wallMargin ||
      wz < wallMargin ||
      wz > roomDepth - wallMargin
    ) {
      return true;
    }

    for (const f of furniture) {
      if (f.id === selfId) continue;
      const dx = wx - (f.x + f.width / 2);
      const dz2 = wz - (f.y + f.depth / 2);
      const fRot = (f.rotation * Math.PI) / 180;
      const cosR = Math.cos(fRot);
      const sinR = Math.sin(fRot);
      const flx = dx * cosR + dz2 * sinR;
      const flz = -dx * sinR + dz2 * cosR;
      if (
        Math.abs(flx) <= f.width / 2 + furnitureMargin &&
        Math.abs(flz) <= f.depth / 2 + furnitureMargin
      ) {
        return true;
      }
    }
  }
  return false;
}

function ClosetMesh({
  item,
  color,
}: {
  item: FurnitureItem;
  color: string;
}) {
  const room = useSimulatorStore((s) => s.room);
  const furniture = useSimulatorStore((s) => s.furniture);

  const { width, depth, height } = item;
  const itemRotation = -(item.rotation * Math.PI) / 180;
  const itemCenterX = item.x + width / 2;
  const itemCenterZ = item.y + depth / 2;

  const [leftDoorOpen, setLeftDoorOpen] = useState(false);
  const [rightDoorOpen, setRightDoorOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const leftDoorGroupRef = useRef<Group>(null);
  const rightDoorGroupRef = useRef<Group>(null);
  const drawerGroupRef = useRef<Group>(null);

  const leftAngleRef = useRef(0);
  const rightAngleRef = useRef(0);
  const drawerOffsetRef = useRef(0);

  const sideT = 18;
  const backT = 8;
  const topT = 20;
  const bottomT = 18;
  const doorT = 20;
  const dividerT = 15;

  const legH = Math.max(height * 0.04, 60);
  const legDiam = Math.min(40, width * 0.05);
  const legInset = 20;

  const drawerH = height * 0.12;
  const innerW = width - sideT * 2;
  const doorW = innerW / 2;

  // Y layout: legs → bottom → drawer → divider → doors → top
  const drawerBottom = legH + bottomT;
  const dividerBottom = drawerBottom + drawerH;
  const doorBottom = dividerBottom + dividerT;
  const doorSectionH = height - topT - doorBottom;

  const maxOpenAngle = (110 * Math.PI) / 180;
  const maxDrawerSlide = depth * 0.65;
  const knobR = 16;

  // Panel detail on doors
  const panelMargin = doorW * 0.12;
  const panelGapV = doorSectionH * 0.04;
  const panelDetailW = doorW - panelMargin * 2;
  const upperPanelH = (doorSectionH - panelMargin * 2 - panelGapV) * 0.55;
  const lowerPanelH = (doorSectionH - panelMargin * 2 - panelGapV) * 0.45;
  const raisedT = 3;

  useFrame(() => {
    const cosItem = Math.cos(itemRotation);
    const sinItem = Math.sin(itemRotation);

    // Left door with collision
    if (leftDoorGroupRef.current) {
      const target = leftDoorOpen ? -maxOpenAngle : 0;
      const diff = target - leftAngleRef.current;
      if (Math.abs(diff) > 0.001) {
        let nextAngle = leftAngleRef.current + diff * 0.1;
        const isOpening =
          Math.abs(nextAngle) > Math.abs(leftAngleRef.current) + 0.0001;

        if (
          isOpening &&
          checkClosetDoorCollision(
            nextAngle,
            -innerW / 2,
            depth / 2,
            doorW,
            1,
            doorT / 2,
            itemCenterX,
            itemCenterZ,
            cosItem,
            sinItem,
            room.width,
            room.height,
            furniture,
            item.id,
          )
        ) {
          let lo = leftAngleRef.current;
          let hi = nextAngle;
          for (let i = 0; i < 5; i++) {
            const mid = (lo + hi) / 2;
            if (
              checkClosetDoorCollision(
                mid,
                -innerW / 2,
                depth / 2,
                doorW,
                1,
                doorT / 2,
                itemCenterX,
                itemCenterZ,
                cosItem,
                sinItem,
                room.width,
                room.height,
                furniture,
                item.id,
              )
            ) {
              hi = mid;
            } else {
              lo = mid;
            }
          }
          nextAngle = lo;
          if (Math.abs(nextAngle - leftAngleRef.current) < 0.001) {
            leftDoorGroupRef.current.rotation.y = leftAngleRef.current;
          } else {
            leftAngleRef.current = nextAngle;
            leftDoorGroupRef.current.rotation.y = leftAngleRef.current;
          }
        } else {
          leftAngleRef.current = nextAngle;
          leftDoorGroupRef.current.rotation.y = leftAngleRef.current;
        }
      }
    }

    // Right door with collision
    if (rightDoorGroupRef.current) {
      const target = rightDoorOpen ? maxOpenAngle : 0;
      const diff = target - rightAngleRef.current;
      if (Math.abs(diff) > 0.001) {
        let nextAngle = rightAngleRef.current + diff * 0.1;
        const isOpening =
          Math.abs(nextAngle) > Math.abs(rightAngleRef.current) + 0.0001;

        if (
          isOpening &&
          checkClosetDoorCollision(
            nextAngle,
            innerW / 2,
            depth / 2,
            doorW,
            -1,
            doorT / 2,
            itemCenterX,
            itemCenterZ,
            cosItem,
            sinItem,
            room.width,
            room.height,
            furniture,
            item.id,
          )
        ) {
          let lo = rightAngleRef.current;
          let hi = nextAngle;
          for (let i = 0; i < 5; i++) {
            const mid = (lo + hi) / 2;
            if (
              checkClosetDoorCollision(
                mid,
                innerW / 2,
                depth / 2,
                doorW,
                -1,
                doorT / 2,
                itemCenterX,
                itemCenterZ,
                cosItem,
                sinItem,
                room.width,
                room.height,
                furniture,
                item.id,
              )
            ) {
              hi = mid;
            } else {
              lo = mid;
            }
          }
          nextAngle = lo;
          if (Math.abs(nextAngle - rightAngleRef.current) < 0.001) {
            rightDoorGroupRef.current.rotation.y = rightAngleRef.current;
          } else {
            rightAngleRef.current = nextAngle;
            rightDoorGroupRef.current.rotation.y = rightAngleRef.current;
          }
        } else {
          rightAngleRef.current = nextAngle;
          rightDoorGroupRef.current.rotation.y = rightAngleRef.current;
        }
      }
    }

    // Drawer with collision
    if (drawerGroupRef.current) {
      const target = drawerOpen ? maxDrawerSlide : 0;
      const diff = target - drawerOffsetRef.current;
      if (Math.abs(diff) > 0.5) {
        let nextOffset = drawerOffsetRef.current + diff * 0.1;
        const isOpening = nextOffset > drawerOffsetRef.current + 0.1;

        if (
          isOpening &&
          checkClosetDrawerCollision(
            nextOffset,
            depth / 2 + raisedT + knobR,
            innerW - 4,
            itemCenterX,
            itemCenterZ,
            cosItem,
            sinItem,
            room.width,
            room.height,
            furniture,
            item.id,
          )
        ) {
          let lo = drawerOffsetRef.current;
          let hi = nextOffset;
          for (let i = 0; i < 5; i++) {
            const mid = (lo + hi) / 2;
            if (
              checkClosetDrawerCollision(
                mid,
                depth / 2 + raisedT + knobR,
                innerW - 4,
                itemCenterX,
                itemCenterZ,
                cosItem,
                sinItem,
                room.width,
                room.height,
                furniture,
                item.id,
              )
            ) {
              hi = mid;
            } else {
              lo = mid;
            }
          }
          nextOffset = lo;
          if (Math.abs(nextOffset - drawerOffsetRef.current) < 0.5) {
            drawerGroupRef.current.position.z = drawerOffsetRef.current;
          } else {
            drawerOffsetRef.current = nextOffset;
            drawerGroupRef.current.position.z = drawerOffsetRef.current;
          }
        } else {
          drawerOffsetRef.current = nextOffset;
          drawerGroupRef.current.position.z = drawerOffsetRef.current;
        }
      } else {
        drawerOffsetRef.current = target;
        drawerGroupRef.current.position.z = drawerOffsetRef.current;
      }
    }
  });

  const toggleLeftDoor = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setLeftDoorOpen((p) => !p);
  }, []);
  const toggleRightDoor = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setRightDoorOpen((p) => !p);
  }, []);
  const toggleDrawer = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setDrawerOpen((p) => !p);
  }, []);

  return (
    <>
      {/* Legs */}
      {(
        [
          [
            -width / 2 + legInset + legDiam / 2,
            -depth / 2 + legInset + legDiam / 2,
          ],
          [
            width / 2 - legInset - legDiam / 2,
            -depth / 2 + legInset + legDiam / 2,
          ],
          [
            -width / 2 + legInset + legDiam / 2,
            depth / 2 - legInset - legDiam / 2,
          ],
          [
            width / 2 - legInset - legDiam / 2,
            depth / 2 - legInset - legDiam / 2,
          ],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, legH / 2, z]}>
          <cylinderGeometry args={[legDiam / 2, legDiam * 0.35, legH, 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {/* Left side panel */}
      <mesh
        position={[
          -width / 2 + sideT / 2,
          legH + (height - legH) / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[sideT, height - legH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Right side panel */}
      <mesh
        position={[
          width / 2 - sideT / 2,
          legH + (height - legH) / 2,
          0,
        ]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[sideT, height - legH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Top panel */}
      <mesh position={[0, height - topT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, topT, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Bottom panel */}
      <mesh position={[0, legH + bottomT / 2, 0]} receiveShadow>
        <boxGeometry args={[innerW, bottomT, depth - backT]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Back panel */}
      <mesh
        position={[0, legH + (height - legH) / 2, -depth / 2 + backT / 2]}
      >
        <boxGeometry args={[innerW, height - legH, backT]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Divider between drawer and doors */}
      <mesh position={[0, dividerBottom + dividerT / 2, 0]}>
        <boxGeometry args={[innerW, dividerT, depth - backT]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Drawer */}
      <group ref={drawerGroupRef}>
        {/* Front face */}
        <mesh
          position={[0, drawerBottom + drawerH / 2, depth / 2 - doorT / 2]}
          onClick={toggleDrawer}
          castShadow
        >
          <boxGeometry args={[innerW - 4, drawerH - 4, doorT]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Raised panel on drawer front */}
        <mesh
          position={[
            0,
            drawerBottom + drawerH / 2,
            depth / 2 + raisedT / 2,
          ]}
          onClick={toggleDrawer}
        >
          <boxGeometry args={[innerW * 0.8, drawerH * 0.55, raisedT]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Drawer knob */}
        <mesh
          position={[
            0,
            drawerBottom + drawerH / 2,
            depth / 2 + raisedT + knobR * 0.5,
          ]}
          onClick={toggleDrawer}
        >
          <sphereGeometry args={[knobR, 12, 8]} />
          <meshPhongMaterial
            color="#aaaaaa"
            specular="#ffffff"
            shininess={120}
          />
        </mesh>
        {/* Drawer bottom */}
        <mesh position={[0, drawerBottom + 6, -(backT + doorT) / 2]}>
          <boxGeometry args={[innerW - 8, 6, depth - backT - doorT - 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Drawer left wall */}
        <mesh
          position={[
            -(innerW / 2 - 6),
            drawerBottom + drawerH / 2,
            -(backT + doorT) / 2,
          ]}
        >
          <boxGeometry args={[6, drawerH - 8, depth - backT - doorT - 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
        {/* Drawer right wall */}
        <mesh
          position={[
            innerW / 2 - 6,
            drawerBottom + drawerH / 2,
            -(backT + doorT) / 2,
          ]}
        >
          <boxGeometry args={[6, drawerH - 8, depth - backT - doorT - 8]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Left door — hinge at left outer edge, opens outward to the left */}
      <group position={[-innerW / 2, doorBottom, depth / 2]}>
        <group ref={leftDoorGroupRef}>
          {/* Invisible hit area */}
          <mesh
            position={[doorW / 2, doorSectionH / 2, 0]}
            onClick={toggleLeftDoor}
          >
            <boxGeometry
              args={[doorW, doorSectionH, doorT + raisedT * 2 + knobR * 2]}
            />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {/* Door panel */}
          <mesh
            position={[doorW / 2, doorSectionH / 2, -doorT / 2]}
            castShadow
          >
            <boxGeometry args={[doorW - 2, doorSectionH - 2, doorT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Upper raised panel */}
          <mesh
            position={[
              doorW / 2,
              doorSectionH - panelMargin - upperPanelH / 2,
              raisedT / 2,
            ]}
          >
            <boxGeometry args={[panelDetailW, upperPanelH, raisedT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Lower raised panel */}
          <mesh
            position={[
              doorW / 2,
              panelMargin + lowerPanelH / 2,
              raisedT / 2,
            ]}
          >
            <boxGeometry args={[panelDetailW, lowerPanelH, raisedT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Knob (near center edge) */}
          <mesh
            position={[
              doorW - panelMargin,
              doorSectionH / 2,
              raisedT + knobR * 0.5,
            ]}
          >
            <sphereGeometry args={[knobR, 12, 8]} />
            <meshPhongMaterial
              color="#aaaaaa"
              specular="#ffffff"
              shininess={120}
            />
          </mesh>
        </group>
      </group>

      {/* Right door — hinge at right outer edge, opens outward to the right */}
      <group position={[innerW / 2, doorBottom, depth / 2]}>
        <group ref={rightDoorGroupRef}>
          {/* Invisible hit area */}
          <mesh
            position={[-doorW / 2, doorSectionH / 2, 0]}
            onClick={toggleRightDoor}
          >
            <boxGeometry
              args={[doorW, doorSectionH, doorT + raisedT * 2 + knobR * 2]}
            />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {/* Door panel */}
          <mesh
            position={[-doorW / 2, doorSectionH / 2, -doorT / 2]}
            castShadow
          >
            <boxGeometry args={[doorW - 2, doorSectionH - 2, doorT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Upper raised panel */}
          <mesh
            position={[
              -doorW / 2,
              doorSectionH - panelMargin - upperPanelH / 2,
              raisedT / 2,
            ]}
          >
            <boxGeometry args={[panelDetailW, upperPanelH, raisedT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Lower raised panel */}
          <mesh
            position={[
              -doorW / 2,
              panelMargin + lowerPanelH / 2,
              raisedT / 2,
            ]}
          >
            <boxGeometry args={[panelDetailW, lowerPanelH, raisedT]} />
            <meshStandardMaterial color={color} />
          </mesh>
          {/* Knob (near center edge) */}
          <mesh
            position={[
              -(doorW - panelMargin),
              doorSectionH / 2,
              raisedT + knobR * 0.5,
            ]}
          >
            <sphereGeometry args={[knobR, 12, 8]} />
            <meshPhongMaterial
              color="#aaaaaa"
              specular="#ffffff"
              shininess={120}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

function MonitorStandMesh({
  item,
  color,
}: {
  item: FurnitureItem;
  color: string;
}) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#888888";
  const screenColor = "#1a1a1a";
  const bezelColor = "#222222";

  // Base / riser platform
  const baseH = height * 0.12;
  const baseW = width;
  const baseD = depth;

  // Neck (vertical support behind monitor)
  const neckW = width * 0.08;
  const neckT = depth * 0.06;
  const neckH = height * 0.2;
  const neckBottomY = baseH;

  // Monitor panel
  const monitorW = width * 0.92;
  const monitorH = height * 0.6;
  const monitorT = 18; // thin panel
  const monitorBottomY = neckBottomY + neckH * 0.3;
  const monitorCenterY = monitorBottomY + monitorH / 2;

  // Bezel (chin at bottom of monitor)
  const bezelH = height * 0.04;

  // Tilt angle (~5 degrees backward)
  const tiltAngle = -0.087; // ~5 degrees in radians

  // Monitor Z position (centered on base, slightly back)
  const monitorZ = -depth * 0.1;

  // Pivot animation
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
    [item.id, item.pivoted, updateFurniture, commitHistory],
  );

  return (
    <>
      {/* Base platform (riser) */}
      <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[baseW, baseH, baseD]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.6} />
      </mesh>

      {/* Neck (support post) */}
      <mesh
        position={[0, neckBottomY + neckH / 2, monitorZ]}
        castShadow
      >
        <boxGeometry args={[neckW, neckH, neckT]} />
        <meshStandardMaterial color={metalColor} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Monitor group (tilted) */}
      <group
        position={[0, monitorCenterY, monitorZ]}
        rotation={[tiltAngle, 0, 0]}
      >
        <group ref={pivotGroupRef}>
          {/* Monitor panel (screen) */}
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>

          {/* Screen surface (slightly inset, dark) */}
          <mesh position={[0, bezelH / 2, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>

          {/* Bottom bezel (chin) */}
          <mesh position={[0, -monitorH / 2 + bezelH / 2, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.3, bezelH, 1]} />
            <meshStandardMaterial color={bezelColor} />
          </mesh>
        </group>
      </group>
    </>
  );
}

function MonitorArmPoleMesh({
  item,
  color,
}: {
  item: FurnitureItem;
  color: string;
}) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#666666";
  const darkColor = "#333333";
  const screenColor = "#1a1a1a";

  // Clamp base (sits on desk edge)
  const clampW = width * 0.6;
  const clampD = depth * 0.15;
  const clampH = height * 0.06;

  // Vertical pole
  const poleR = width * 0.12;
  const poleH = height * 0.55;
  const poleBottomY = clampH;

  // Short horizontal arm
  const armW = depth * 0.35;
  const armH = poleR * 1.2;
  const armD = poleR * 1.2;
  const armY = poleBottomY + poleH * 0.85;

  // Joint (between arm and VESA mount)
  const jointR = poleR * 0.8;
  const jointH = armD * 0.6;

  // VESA mount plate
  const vesaW = 8;
  const vesaH = height * 0.12;
  const vesaD = depth * 0.15;

  // Monitor panel
  const monitorW = depth * 0.85;
  const monitorH = height * 0.45;
  const monitorT = 16;
  const monitorZ = armW / 2 + vesaW + monitorT / 2;

  // Tilt
  const tiltAngle = -0.087;

  // Pivot animation
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
    [item.id, item.pivoted, updateFurniture, commitHistory],
  );

  return (
    <>
      {/* Desk clamp base */}
      <mesh position={[0, clampH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[clampW, clampH, clampD]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Vertical pole */}
      <mesh position={[0, poleBottomY + poleH / 2, 0]} castShadow>
        <cylinderGeometry args={[poleR, poleR, poleH, 16]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Horizontal arm */}
      <mesh position={[0, armY, armW / 4]} castShadow>
        <boxGeometry args={[armD, armH, armW]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Joint */}
      <mesh
        position={[0, armY, armW / 2]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[jointR, jointR, jointH, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* VESA mount plate */}
      <mesh position={[0, armY, armW / 2 + vesaW / 2]}>
        <boxGeometry args={[vesaD, vesaH, vesaW]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Monitor (tilted) */}
      <group
        position={[0, armY, monitorZ]}
        rotation={[tiltAngle, 0, 0]}
      >
        <group ref={pivotGroupRef}>
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>

          {/* Screen surface */}
          <mesh position={[0, monitorH * 0.02, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>

          {/* Chin bezel */}
          <mesh position={[0, -monitorH / 2 + monitorH * 0.03, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.25, monitorH * 0.04, 1]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      </group>
    </>
  );
}

function MonitorArmClampMesh({
  item,
  color,
}: {
  item: FurnitureItem;
  color: string;
}) {
  const { width, depth, height } = item;
  const updateFurniture = useSimulatorStore((s) => s.updateFurniture);
  const commitHistory = useSimulatorStore((s) => s.commitHistory);

  const metalColor = "#666666";
  const darkColor = "#333333";
  const screenColor = "#1a1a1a";

  // Desk clamp
  const clampW = width * 0.7;
  const clampD = depth * 0.12;
  const clampH = height * 0.06;

  // Lower arm segment (goes up then forward)
  const lowerArmLen = height * 0.4;
  const armThick = width * 0.25;

  // Joint between arms
  const jointR = armThick * 0.6;

  // Upper arm segment (horizontal, forward)
  const upperArmLen = depth * 0.4;

  // Monitor
  const monitorW = depth * 0.85;
  const monitorH = height * 0.5;
  const monitorT = 16;

  // VESA plate
  const vesaW = 8;
  const vesaH = height * 0.12;
  const vesaD = depth * 0.12;

  // Lower arm angle (tilted forward ~70 degrees from vertical)
  const lowerArmAngle = 0.35; // ~20 degrees from vertical
  const lowerArmTopY = clampH + lowerArmLen * Math.cos(lowerArmAngle);
  const lowerArmTopZ = lowerArmLen * Math.sin(lowerArmAngle);

  // Upper arm
  const upperArmY = lowerArmTopY;
  const upperArmEndZ = lowerArmTopZ + upperArmLen;

  const tiltAngle = -0.087;

  // Pivot animation
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
    [item.id, item.pivoted, updateFurniture, commitHistory],
  );

  return (
    <>
      {/* Desk clamp */}
      <mesh position={[0, clampH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[clampW, clampH, clampD]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Lower arm segment (angled upward and forward) */}
      <mesh
        position={[
          0,
          clampH + lowerArmTopY / 2 - clampH / 2,
          lowerArmTopZ / 2,
        ]}
        rotation={[lowerArmAngle, 0, 0]}
        castShadow
      >
        <boxGeometry args={[armThick, lowerArmLen, armThick]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Joint (elbow) */}
      <mesh
        position={[0, upperArmY, lowerArmTopZ]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[jointR, jointR, armThick * 0.8, 12]} />
        <meshStandardMaterial color={darkColor} metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Upper arm segment (horizontal, forward) */}
      <mesh
        position={[0, upperArmY, lowerArmTopZ + upperArmLen / 2]}
        castShadow
      >
        <boxGeometry args={[armThick, armThick, upperArmLen]} />
        <meshStandardMaterial color={metalColor} metalness={0.5} roughness={0.3} />
      </mesh>

      {/* VESA mount plate */}
      <mesh position={[0, upperArmY, upperArmEndZ + vesaW / 2]}>
        <boxGeometry args={[vesaD, vesaH, vesaW]} />
        <meshStandardMaterial color={darkColor} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Monitor (tilted) */}
      <group
        position={[0, upperArmY, upperArmEndZ + vesaW + monitorT / 2]}
        rotation={[tiltAngle, 0, 0]}
      >
        <group ref={pivotGroupRef}>
          <mesh castShadow onClick={togglePivot}>
            <boxGeometry args={[monitorW, monitorH, monitorT]} />
            <meshStandardMaterial color={screenColor} />
          </mesh>

          {/* Screen surface */}
          <mesh position={[0, monitorH * 0.02, monitorT / 2 + 0.5]} onClick={togglePivot}>
            <boxGeometry args={[monitorW * 0.93, monitorH * 0.9, 1]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.1} />
          </mesh>

          {/* Chin bezel */}
          <mesh position={[0, -monitorH / 2 + monitorH * 0.03, monitorT / 2 + 0.5]}>
            <boxGeometry args={[monitorW * 0.25, monitorH * 0.04, 1]} />
            <meshStandardMaterial color={darkColor} />
          </mesh>
        </group>
      </group>
    </>
  );
}

export function FurnitureMesh({ item }: FurnitureMeshProps) {
  const color = item.color ?? DEFAULT_FURNITURE_COLOR;
  const rotationY = -(item.rotation * Math.PI) / 180;

  if (item.type === "closet" || item.type === "display-cabinet") {
    const Comp =
      item.type === "closet" ? ClosetMesh : DisplayCabinetMesh;
    return (
      <group
        position={[
          item.x + item.width / 2,
          0,
          item.y + item.depth / 2,
        ]}
        rotation={[0, rotationY, 0]}
      >
        <Comp item={item} color={color} />
      </group>
    );
  }

  if (item.type === "monitor-arm" || item.type === "monitor-stand") {
    const Mesh =
      item.type === "monitor-stand"
        ? MonitorStandMesh
        : item.name.includes("기둥")
          ? MonitorArmPoleMesh
          : MonitorArmClampMesh;
    return (
      <group
        position={[
          item.x + item.width / 2,
          0,
          item.y + item.depth / 2,
        ]}
        rotation={[0, rotationY, 0]}
      >
        <Mesh item={item} color={color} />
      </group>
    );
  }

  if (
    item.type === "bed" ||
    item.type === "bookshelf" ||
    item.type === "chair" ||
    item.type === "desk"
  ) {
    const meshMap = {
      bed: BedMesh,
      bookshelf: BookshelfMesh,
      chair: ChairMesh,
      desk: DeskMesh,
    } as const;
    const Mesh = meshMap[item.type as keyof typeof meshMap];
    return (
      <group
        position={[
          item.x + item.width / 2,
          0,
          item.y + item.depth / 2,
        ]}
        rotation={[0, rotationY, 0]}
      >
        <Mesh
          width={item.width}
          depth={item.depth}
          height={item.height}
          color={color}
        />
      </group>
    );
  }

  return (
    <mesh
      position={[
        item.x + item.width / 2,
        item.height / 2,
        item.y + item.depth / 2,
      ]}
      rotation={[0, rotationY, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[item.width, item.height, item.depth]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
