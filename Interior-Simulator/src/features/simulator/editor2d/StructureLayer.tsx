import { Circle, Group, Layer, Line, Text } from "react-konva";
import type Konva from "konva";
import type { SelectedStructureEntity } from "../store/slices/structureSlice";
import type {
  FloorStructure,
  Opening,
  StructureIssue,
  Vec2,
  Wall,
  WallEndpoint,
} from "../domain/structure";
import type { MaterialAssignment } from "../domain/scenario";
import {
  pointAlongWall,
  projectPointToWall,
  wallLength,
  wallNormal,
} from "../domain/structure";

type StructureLayerProps = {
  structure: FloorStructure;
  issues: StructureIssue[];
  selected: SelectedStructureEntity;
  scale: number;
  interactive?: boolean;
  materials?: MaterialAssignment[];
  onSelect: (entity: SelectedStructureEntity) => void;
  onMoveEndpoint: (
    wallId: string,
    endpoint: WallEndpoint,
    point: Vec2
  ) => void;
  onMoveOpening: (openingId: string, offset: number) => void;
};

function roomPoints(polygon: Vec2[]): number[] {
  return polygon.flatMap((point) => [point.x, point.y]);
}

function WallNode({
  wall,
  selected,
  scale,
  onSelect,
  onMoveEndpoint,
  color,
}: {
  wall: Wall;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onMoveEndpoint: (endpoint: WallEndpoint, point: Vec2) => void;
  color?: string;
}) {
  const normal = wallNormal(wall);
  const midpoint = pointAlongWall(wall, wallLength(wall) / 2);
  const labelPosition = {
    x: midpoint.x + normal.x * (wall.thickness / 2 + 18 / scale),
    y: midpoint.y + normal.y * (wall.thickness / 2 + 18 / scale),
  };

  const endpoint = (kind: WallEndpoint, point: Vec2) => (
    <Circle
      key={kind}
      x={point.x}
      y={point.y}
      radius={8 / scale}
      fill="#ffffff"
      stroke="#2563eb"
      strokeWidth={2 / scale}
      draggable
      onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) =>
        onMoveEndpoint(kind, {
          x: event.target.x(),
          y: event.target.y(),
        })
      }
    />
  );

  return (
    <Group>
      <Line
        points={[wall.start.x, wall.start.y, wall.end.x, wall.end.y]}
        stroke={
          selected
            ? "#2563eb"
            : color ?? (wall.kind === "exterior" ? "#293241" : "#52606d")
        }
        strokeWidth={wall.thickness}
        lineCap="square"
        lineJoin="miter"
        hitStrokeWidth={Math.max(wall.thickness, 18 / scale)}
        onClick={(event) => {
          event.cancelBubble = true;
          onSelect();
        }}
        onTap={(event) => {
          event.cancelBubble = true;
          onSelect();
        }}
      />
      <Text
        x={labelPosition.x - 45 / scale}
        y={labelPosition.y - 7 / scale}
        width={90 / scale}
        align="center"
        text={`${Math.round(wallLength(wall))} mm`}
        fontSize={12 / scale}
        fill="#334155"
        listening={false}
      />
      {selected && endpoint("start", wall.start)}
      {selected && endpoint("end", wall.end)}
    </Group>
  );
}

function OpeningNode({
  opening,
  wall,
  selected,
  scale,
  onSelect,
  onMove,
}: {
  opening: Opening;
  wall: Wall;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onMove: (offset: number) => void;
}) {
  const start = pointAlongWall(wall, opening.offset);
  const end = pointAlongWall(wall, opening.offset + opening.width);
  const center = pointAlongWall(wall, opening.offset + opening.width / 2);
  const color =
    opening.kind === "door"
      ? "#d97706"
      : opening.kind === "window"
        ? "#0284c7"
        : "#16a34a";

  return (
    <Group
      x={center.x}
      y={center.y}
      draggable
      onClick={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
        const projection = projectPointToWall(
          { x: event.target.x(), y: event.target.y() },
          wall
        );
        event.target.position(center);
        onMove(
          Math.max(
            0,
            Math.min(wallLength(wall) - opening.width, projection.offset - opening.width / 2)
          )
        );
      }}
    >
      <Line
        points={[
          start.x - center.x,
          start.y - center.y,
          end.x - center.x,
          end.y - center.y,
        ]}
        stroke={color}
        strokeWidth={(selected ? 8 : 5) / scale}
        lineCap="round"
        hitStrokeWidth={18 / scale}
      />
      <Circle
        radius={selected ? 6 / scale : 4 / scale}
        fill="#ffffff"
        stroke={color}
        strokeWidth={2 / scale}
      />
    </Group>
  );
}

export function StructureLayer({
  structure,
  issues,
  selected,
  scale,
  interactive = true,
  materials = [],
  onSelect,
  onMoveEndpoint,
  onMoveOpening,
}: StructureLayerProps) {
  const materialColor = (
    targetId: string,
    surface: "wall" | "floor",
    fallback: string
  ) =>
    materials.find(
      (material) =>
        material.surface === surface &&
        (material.targetId === targetId ||
          material.targetId === `all-${surface}s`)
    )?.color ?? fallback;
  return (
    <Layer listening={interactive}>
      {structure.rooms.map((room) => (
        <Line
          key={room.id}
          points={roomPoints(room.polygon)}
          closed
          fill={materialColor(
            room.id,
            "floor",
            room.floorColor ?? "#f5efe4"
          )}
          opacity={0.55}
          stroke={
            selected?.kind === "structure-room" && selected.id === room.id
              ? "#16a34a"
              : "#d6c8b5"
          }
          strokeWidth={selected?.id === room.id ? 3 / scale : 1 / scale}
          onClick={(event) => {
            event.cancelBubble = true;
            onSelect({ kind: "structure-room", id: room.id });
          }}
        />
      ))}

      {structure.walls.map((wall) => (
        <WallNode
          key={wall.id}
          wall={wall}
          scale={scale}
          selected={selected?.kind === "wall" && selected.id === wall.id}
          onSelect={() => onSelect({ kind: "wall", id: wall.id })}
          onMoveEndpoint={(endpoint, point) =>
            onMoveEndpoint(wall.id, endpoint, point)
          }
          color={materialColor(
            wall.id,
            "wall",
            wall.kind === "exterior" ? "#293241" : "#52606d"
          )}
        />
      ))}

      {structure.openings.map((opening) => {
        const wall = structure.walls.find(
          (candidate) => candidate.id === opening.wallId
        );
        if (!wall) return null;
        return (
          <OpeningNode
            key={opening.id}
            opening={opening}
            wall={wall}
            scale={scale}
            selected={
              selected?.kind === "structure-opening" &&
              selected.id === opening.id
            }
            onSelect={() =>
              onSelect({ kind: "structure-opening", id: opening.id })
            }
            onMove={(offset) => onMoveOpening(opening.id, offset)}
          />
        );
      })}

      {issues
        .filter((issue) => issue.position)
        .map((issue) => (
          <Group key={issue.id} x={issue.position?.x} y={issue.position?.y}>
            <Circle
              radius={8 / scale}
              fill={issue.severity === "error" ? "#dc2626" : "#f59e0b"}
              opacity={0.9}
            />
            <Text
              x={-5 / scale}
              y={-7 / scale}
              width={10 / scale}
              text="!"
              align="center"
              fontStyle="bold"
              fontSize={12 / scale}
              fill="#ffffff"
              listening={false}
            />
          </Group>
        ))}
    </Layer>
  );
}
