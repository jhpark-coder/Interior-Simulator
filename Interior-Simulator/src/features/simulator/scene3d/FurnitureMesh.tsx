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

  if (item.type === "bed" || item.type === "bookshelf") {
    const Mesh = item.type === "bed" ? BedMesh : BookshelfMesh;
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
