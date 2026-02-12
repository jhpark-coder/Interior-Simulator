import { useMemo } from "react";
import type { Room, Door, Window } from "../types";

type RoomMeshProps = {
  room: Room;
  doors: Door[];
  windows: Window[];
};

type WallSegment = {
  key: string;
  position: [number, number, number];
  size: [number, number, number];
};

type WallName = "north" | "south" | "east" | "west";

export function RoomMesh({ room, doors, windows }: RoomMeshProps) {
  const { width, height, wallThickness, ceilingHeight, wallColor, floorColor } = room;

  const wallSegments = useMemo(() => {
    const segments: WallSegment[] = [];
    const walls: WallName[] = ["north", "south", "east", "west"];

    walls.forEach((wall) => {
      const isHorizontal = wall === "north" || wall === "south";
      const wallLength = isHorizontal ? width : height;

      const openings = [
        ...doors
          .filter((d) => d.wall === wall)
          .map((d) => ({
            start: d.offset,
            end: d.offset + d.width,
            height: d.height,
            sillHeight: 0,
          })),
        ...windows
          .filter((w) => w.wall === wall)
          .map((w) => ({
            start: w.offset,
            end: w.offset + w.width,
            height: w.height,
            sillHeight: w.sillHeight,
          })),
      ].sort((a, b) => a.start - b.start);

      let currentPos = 0;

      const getPosition = (
        wall: WallName,
        along: number,
        y: number
      ): [number, number, number] => {
        switch (wall) {
          case "north":
            return [along, y, -wallThickness / 2];
          case "south":
            return [along, y, height + wallThickness / 2];
          case "east":
            return [width + wallThickness / 2, y, along];
          case "west":
            return [-wallThickness / 2, y, along];
        }
      };

      const getSize = (
        isHorizontal: boolean,
        segWidth: number,
        segHeight: number
      ): [number, number, number] => {
        return isHorizontal
          ? [segWidth, segHeight, wallThickness]
          : [wallThickness, segHeight, segWidth];
      };

      openings.forEach((opening, i) => {
        // Solid segment before this opening
        if (opening.start > currentPos) {
          const segW = opening.start - currentPos;
          segments.push({
            key: `${wall}-before-${i}`,
            position: getPosition(
              wall,
              currentPos + segW / 2,
              ceilingHeight / 2
            ),
            size: getSize(isHorizontal, segW, ceilingHeight),
          });
        }

        // Top segment (above opening)
        const topH = ceilingHeight - opening.height - opening.sillHeight;
        if (topH > 0) {
          const openingCenter = (opening.start + opening.end) / 2;
          const openingWidth = opening.end - opening.start;
          segments.push({
            key: `${wall}-top-${i}`,
            position: getPosition(
              wall,
              openingCenter,
              opening.height + opening.sillHeight + topH / 2
            ),
            size: getSize(isHorizontal, openingWidth, topH),
          });
        }

        // Bottom segment (below window, sillHeight > 0)
        if (opening.sillHeight > 0) {
          const openingCenter = (opening.start + opening.end) / 2;
          const openingWidth = opening.end - opening.start;
          segments.push({
            key: `${wall}-bottom-${i}`,
            position: getPosition(
              wall,
              openingCenter,
              opening.sillHeight / 2
            ),
            size: getSize(isHorizontal, openingWidth, opening.sillHeight),
          });
        }

        currentPos = opening.end;
      });

      // Remaining segment after last opening
      if (currentPos < wallLength) {
        const segW = wallLength - currentPos;
        segments.push({
          key: `${wall}-after`,
          position: getPosition(
            wall,
            currentPos + segW / 2,
            ceilingHeight / 2
          ),
          size: getSize(isHorizontal, segW, ceilingHeight),
        });
      }
    });

    return segments;
  }, [width, height, wallThickness, ceilingHeight, doors, windows]);

  return (
    <group>
      {/* Floor */}
      <mesh
        position={[width / 2, 0, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={floorColor ?? "#c4a882"} roughness={0.6} metalness={0.05} />
      </mesh>

      {/* Wall segments */}
      {wallSegments.map((seg) => (
        <mesh
          key={seg.key}
          position={seg.position}
          castShadow
          receiveShadow
        >
          <boxGeometry args={seg.size} />
          <meshStandardMaterial color={wallColor ?? "#b0b0b0"} />
        </mesh>
      ))}

      {/* Ceiling (semi-transparent) */}
      <mesh
        position={[width / 2, ceilingHeight, height / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#f5f5f5" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}
