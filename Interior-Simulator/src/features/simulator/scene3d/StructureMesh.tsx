import { useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { DoubleSide, Shape, type Group } from "three";
import {
  doorLeafDirection,
  doorSwingGeometry,
  inwardNormal,
  resolvedDoorDetails,
  slidingDoorDirection,
  type FloorStructure,
  type Opening,
  type Wall,
} from "../domain/structure";
import type { MaterialAssignment } from "../domain/scenario";
import {
  buildStructureWallSegments,
  directionToRotationY,
  getOpeningMeshPlacement,
} from "./structure3dMath";

function assignedColor(
  materials: MaterialAssignment[],
  targetId: string,
  surface: MaterialAssignment["surface"],
  fallback: string
) {
  return (
    materials.find(
      (material) =>
        material.surface === surface &&
        (material.targetId === targetId ||
          material.targetId === `all-${surface}s`)
    )?.color ?? fallback
  );
}

// 화면을 끌어 시점을 돌린 뒤 손을 뗀 것은 클릭으로 보지 않는다(px).
const CLICK_MOVE_TOLERANCE = 6;
const LEAF_GAP = 8;
const FRAME_SIZE = 40;

/** current를 target 쪽으로 프레임 시간에 비례해 옮긴다. 충분히 가까우면 target을 돌려준다. */
function approach(current: number, target: number, delta: number, epsilon: number) {
  const next = current + (target - current) * Math.min(1, delta * 8);
  return Math.abs(target - next) < epsilon ? target : next;
}

function toggleOnClick(toggle: () => void) {
  return (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > CLICK_MOVE_TOLERANCE) return;
    event.stopPropagation();
    toggle();
  };
}

function SwingDoorMesh({
  opening,
  wall,
  structure,
  color,
}: {
  opening: Opening;
  wall: Wall;
  structure: FloorStructure;
  color: string;
}) {
  const leafRef = useRef<Group>(null);
  const angleRef = useRef(0);
  const [open, setOpen] = useState(false);
  const geometry = doorSwingGeometry(opening, wall, structure);
  const { thickness } = resolvedDoorDetails(opening);
  const target = open ? geometry.openAngle : 0;

  const applyAngle = (angle: number) => {
    const direction = doorLeafDirection(geometry, angle);
    leafRef.current?.rotation.set(0, directionToRotationY(direction), 0);
  };

  useFrame((_, delta) => {
    if (angleRef.current === target) {
      applyAngle(target);
      return;
    }
    angleRef.current = approach(angleRef.current, target, delta, 0.05);
    applyAngle(angleRef.current);
  });

  const leafLength = Math.max(1, opening.width - LEAF_GAP);
  const leafHeight = Math.max(1, opening.height - LEAF_GAP);
  return (
    <group
      ref={leafRef}
      position={[geometry.hinge.x, opening.sillHeight + opening.height / 2, geometry.hinge.y]}
      onClick={toggleOnClick(() => setOpen((current) => !current))}
    >
      <mesh position={[leafLength / 2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[leafLength, leafHeight, thickness]} />
        <meshStandardMaterial color={color} roughness={0.72} metalness={0.02} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[leafLength - 120, -opening.height / 2 + 1000, side * (thickness / 2 + 30)]}
          castShadow
        >
          <sphereGeometry args={[35, 16, 12]} />
          <meshStandardMaterial color="#b8b8b8" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function SlidingDoorMesh({
  opening,
  wall,
  structure,
  color,
}: {
  opening: Opening;
  wall: Wall;
  structure: FloorStructure;
  color: string;
}) {
  const panelRef = useRef<Group>(null);
  const progressRef = useRef(0);
  const [open, setOpen] = useState(false);
  const { thickness } = resolvedDoorDetails(opening);
  const placement = getOpeningMeshPlacement(opening, wall);
  const inward = inwardNormal(opening, wall, structure);
  const along = slidingDoorDirection(opening, wall);
  // 문짝은 방 쪽 벽면에 붙어 벽을 따라 미끄러진다.
  const faceOffset = wall.thickness / 2 + thickness / 2 + 4;
  const travel = opening.width * 0.9;
  const target = open ? 1 : 0;

  const applyProgress = (progress: number) => {
    panelRef.current?.position.set(
      placement.position[0] + inward.x * faceOffset + along.x * travel * progress,
      placement.position[1],
      placement.position[2] + inward.y * faceOffset + along.y * travel * progress
    );
  };

  useFrame((_, delta) => {
    if (progressRef.current === target) {
      applyProgress(target);
      return;
    }
    progressRef.current = approach(progressRef.current, target, delta, 0.002);
    applyProgress(progressRef.current);
  });

  return (
    // 위치는 useFrame이 매 프레임 정한다. position prop을 주면 다시 렌더링될 때 닫힌 위치로 튄다.
    <group
      ref={panelRef}
      rotation={[0, placement.rotationY, 0]}
      onClick={toggleOnClick(() => setOpen((current) => !current))}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[opening.width + 60, Math.max(1, opening.height - LEAF_GAP), thickness]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.02} />
      </mesh>
    </group>
  );
}

function SlidingWindowMesh({
  opening,
  wall,
  color,
}: {
  opening: Opening;
  wall: Wall;
  color: string;
}) {
  const movingRef = useRef<Group>(null);
  const progressRef = useRef(0);
  const [open, setOpen] = useState(false);
  const placement = getOpeningMeshPlacement(opening, wall);
  const paneWidth = opening.width / 2 + FRAME_SIZE / 2;
  const paneHeight = Math.max(1, opening.height - FRAME_SIZE * 2);
  const paneDepth = Math.max(10, Math.min(30, placement.wallThickness * 0.1));
  const target = open ? 1 : 0;

  const applyProgress = (progress: number) => {
    // 오른쪽 창짝이 왼쪽 창짝 앞으로 미끄러져 겹친다.
    movingRef.current?.position.set(opening.width / 4 - (opening.width / 2) * progress, 0, paneDepth);
  };

  useFrame((_, delta) => {
    if (progressRef.current === target) {
      applyProgress(target);
      return;
    }
    progressRef.current = approach(progressRef.current, target, delta, 0.002);
    applyProgress(progressRef.current);
  });

  const pane = (
    <>
      <mesh>
        <boxGeometry args={[paneWidth, paneHeight, paneDepth / 2]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.42}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      <mesh position={[-paneWidth / 2 + 12, 0, 0]}>
        <boxGeometry args={[24, paneHeight, paneDepth]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.35} />
      </mesh>
    </>
  );

  return (
    <group
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
      onClick={toggleOnClick(() => setOpen((current) => !current))}
    >
      {[1, -1].map((side) => (
        <mesh key={`h${side}`} position={[0, side * (opening.height / 2 - FRAME_SIZE / 2), 0]}>
          <boxGeometry args={[opening.width, FRAME_SIZE, placement.wallThickness * 0.6]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
      {[1, -1].map((side) => (
        <mesh key={`v${side}`} position={[side * (opening.width / 2 - FRAME_SIZE / 2), 0, 0]}>
          <boxGeometry args={[FRAME_SIZE, opening.height, placement.wallThickness * 0.6]} />
          <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.35} />
        </mesh>
      ))}
      <group position={[-opening.width / 4, 0, -paneDepth]}>{pane}</group>
      <group ref={movingRef}>{pane}</group>
    </group>
  );
}

function OpeningMesh({
  opening,
  wall,
  structure,
  materials,
}: {
  opening: Opening;
  wall: Wall;
  structure: FloorStructure;
  materials: MaterialAssignment[];
}) {
  if (opening.kind === "passage") return null;
  const surface = opening.kind === "door" ? "door" : "window";
  const color = assignedColor(
    materials,
    opening.id,
    surface,
    opening.color ?? (opening.kind === "door" ? "#8b5e3c" : "#9bd8ef")
  );
  if (opening.kind === "window") {
    return <SlidingWindowMesh opening={opening} wall={wall} color={color} />;
  }
  return resolvedDoorDetails(opening).doorType === "sliding" ? (
    <SlidingDoorMesh opening={opening} wall={wall} structure={structure} color={color} />
  ) : (
    <SwingDoorMesh opening={opening} wall={wall} structure={structure} color={color} />
  );
}

export function StructureMesh({
  structure,
  materials = [],
}: {
  structure: FloorStructure;
  materials?: MaterialAssignment[];
}) {
  const segments = useMemo(
    () => buildStructureWallSegments(structure),
    [structure]
  );
  const wallById = useMemo(
    () => new Map(structure.walls.map((wall) => [wall.id, wall])),
    [structure.walls]
  );
  const roomShapes = useMemo(
    () =>
      structure.rooms.map((room) => {
        const shape = new Shape();
        room.polygon.forEach((point, index) => {
          if (index === 0) shape.moveTo(point.x, point.y);
          else shape.lineTo(point.x, point.y);
        });
        shape.closePath();
        return { room, shape };
      }),
    [structure.rooms]
  );

  return (
    <group>
      {roomShapes.map(({ room, shape }) => (
        <group key={room.id}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -8, 0]} receiveShadow>
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={assignedColor(
                materials,
                room.id,
                "floor",
                room.floorColor ?? "#c9a783"
              )}
              side={DoubleSide}
              roughness={0.76}
            />
          </mesh>
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, structure.ceilingHeight, 0]}
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color="#f8f5ef"
              side={DoubleSide}
              transparent
              opacity={0.06}
              roughness={0.98}
            />
          </mesh>
        </group>
      ))}

      {segments.map((segment) => {
        const wall = wallById.get(segment.wallId);
        return (
          <mesh
            key={segment.key}
            position={segment.position}
            rotation={[0, segment.rotationY, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={segment.size} />
            <meshStandardMaterial
              color={assignedColor(
                materials,
                segment.wallId,
                "wall",
                wall?.color ?? "#e6ddd2"
              )}
              roughness={0.92}
              metalness={0.01}
            />
          </mesh>
        );
      })}

      {structure.openings.map((opening) => {
        const wall = wallById.get(opening.wallId);
        return wall ? (
          <OpeningMesh
            key={opening.id}
            opening={opening}
            wall={wall}
            structure={structure}
            materials={materials}
          />
        ) : null;
      })}
    </group>
  );
}
