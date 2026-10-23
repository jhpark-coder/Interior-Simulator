import { Group, Label, Layer, Line, Tag, Text } from "react-konva";
import type { WalkwayGap } from "../utils/walkway";

const COLORS: Record<WalkwayGap["severity"], string> = {
  blocked: "#dc2626",
  narrow: "#d97706",
};

/** 좁은 통로를 양 끝 눈금이 있는 치수선과 폭(mm)으로 그린다. 클릭은 아래 가구로 통과한다. */
export function WalkwayLayer({ gaps, scale }: { gaps: WalkwayGap[]; scale: number }) {
  return (
    <Layer listening={false}>
      {gaps.map((gap, index) => {
        const color = COLORS[gap.severity];
        const dx = gap.to.x - gap.from.x;
        const dy = gap.to.y - gap.from.y;
        const length = Math.hypot(dx, dy) || 1;
        // 치수선에 수직인 짧은 눈금.
        const tick = { x: (-dy / length) * (6 / scale), y: (dx / length) * (6 / scale) };
        const mid = { x: (gap.from.x + gap.to.x) / 2, y: (gap.from.y + gap.to.y) / 2 };
        return (
          <Group key={`${gap.furnitureIds.join("-")}-${index}`}>
            <Line
              points={[gap.from.x, gap.from.y, gap.to.x, gap.to.y]}
              stroke={color}
              strokeWidth={2 / scale}
            />
            {[gap.from, gap.to].map((point, end) => (
              <Line
                key={end}
                points={[point.x - tick.x, point.y - tick.y, point.x + tick.x, point.y + tick.y]}
                stroke={color}
                strokeWidth={2 / scale}
              />
            ))}
            <Label x={mid.x} y={mid.y}>
              <Tag
                fill="#ffffff"
                stroke={color}
                strokeWidth={1 / scale}
                cornerRadius={3 / scale}
                pointerDirection="down"
                pointerWidth={0}
                pointerHeight={0}
              />
              <Text
                text={`${Math.round(gap.width)} mm`}
                fontSize={11 / scale}
                padding={3 / scale}
                fill={color}
                fontStyle="bold"
              />
            </Label>
          </Group>
        );
      })}
    </Layer>
  );
}
