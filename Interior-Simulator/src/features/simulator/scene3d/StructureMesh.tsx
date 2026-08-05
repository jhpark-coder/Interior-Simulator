import { useMemo } from "react";
import { DoubleSide, Shape } from "three";
import type { FloorStructure, Opening, Wall } from "../domain/structure";
import type { MaterialAssignment } from "../domain/scenario";
import {
  buildStructureWallSegments,
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

function OpeningMesh({
  opening,
  wall,
  materials,
}: {
  opening: Opening;
  wall: Wall;
  materials: MaterialAssignment[];
}) {
  const placement = getOpeningMeshPlacement(opening, wall);
  if (opening.kind === "passage") return null;
  const surface = opening.kind === "door" ? "door" : "window";
  const color = assignedColor(
    materials,
    opening.id,
    surface,
    opening.color ?? (opening.kind === "door" ? "#8b5e3c" : "#9bd8ef")
  );
  const depth = Math.max(12, placement.wallThickness * 0.35);

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]}>
      <mesh castShadow={opening.kind === "door"}>
        <boxGeometry args={[opening.width, opening.height, depth]} />
        <meshStandardMaterial
          color={color}
          transparent={opening.kind === "window"}
          opacity={opening.kind === "window" ? 0.42 : 1}
          roughness={opening.kind === "window" ? 0.15 : 0.72}
          metalness={opening.kind === "window" ? 0.1 : 0.02}
        />
      </mesh>
      {opening.kind === "window" && (
        <>
          <mesh position={[0, 0, depth]}>
            <boxGeometry args={[24, opening.height, 24]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -depth]}>
            <boxGeometry args={[opening.width, 24, 24]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.45} roughness={0.35} />
          </mesh>
        </>
      )}
    </group>
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
            materials={materials}
          />
        ) : null;
      })}
    </group>
  );
}
