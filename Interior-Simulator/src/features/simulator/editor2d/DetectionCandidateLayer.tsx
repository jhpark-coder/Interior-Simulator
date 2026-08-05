import { Circle, Group, Layer, Line, Text } from "react-konva";
import type { DetectionCandidate } from "../floorplan/detectionTypes";

function candidateColor(candidate: DetectionCandidate, selected: boolean) {
  if (candidate.status === "accepted") return "#16a34a";
  if (candidate.status === "rejected") return "#94a3b8";
  return selected ? "#f97316" : "#7c3aed";
}

export function DetectionCandidateLayer({
  candidates,
  selectedId,
  scale,
  onSelect,
}: {
  candidates: DetectionCandidate[];
  selectedId: string | null;
  scale: number;
  onSelect: (id: string) => void;
}) {
  return (
    <Layer>
      {candidates.map((candidate) => {
        const selected = candidate.id === selectedId;
        const color = candidateColor(candidate, selected);
        if (candidate.kind === "wall") {
          return (
            <Line
              key={candidate.id}
              points={[
                candidate.start.x,
                candidate.start.y,
                candidate.end.x,
                candidate.end.y,
              ]}
              stroke={color}
              strokeWidth={Math.max(candidate.thickness, 7 / scale)}
              dash={
                candidate.status === "accepted"
                  ? undefined
                  : [18 / scale, 10 / scale]
              }
              opacity={candidate.status === "rejected" ? 0.25 : 0.72}
              hitStrokeWidth={18 / scale}
              onClick={(event) => {
                event.cancelBubble = true;
                onSelect(candidate.id);
              }}
            />
          );
        }
        if (candidate.kind === "opening") {
          return (
            <Group
              key={candidate.id}
              x={candidate.position.x}
              y={candidate.position.y}
              onClick={(event) => {
                event.cancelBubble = true;
                onSelect(candidate.id);
              }}
            >
              <Circle
                radius={12 / scale}
                fill={color}
                stroke="#ffffff"
                strokeWidth={2 / scale}
                opacity={candidate.status === "rejected" ? 0.3 : 0.9}
              />
              <Text
                text={candidate.suggestedKind === "door" ? "D" : "W"}
                x={-9 / scale}
                y={-7 / scale}
                width={18 / scale}
                align="center"
                fill="#ffffff"
                fontStyle="bold"
                fontSize={12 / scale}
                listening={false}
              />
            </Group>
          );
        }
        return (
          <Group
            key={candidate.id}
            x={candidate.position.x}
            y={candidate.position.y}
            onClick={(event) => {
              event.cancelBubble = true;
              onSelect(candidate.id);
            }}
          >
            <Circle
              radius={8 / scale}
              fill={color}
              stroke="#ffffff"
              strokeWidth={2 / scale}
            />
            <Text
              text={candidate.text}
              x={12 / scale}
              y={-10 / scale}
              fontSize={13 / scale}
              fill={color}
            />
          </Group>
        );
      })}
    </Layer>
  );
}
