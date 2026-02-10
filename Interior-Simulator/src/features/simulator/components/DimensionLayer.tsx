import { Layer, Line, Text, Arrow, Group, Rect, Shape } from "react-konva";
import type {
  Room,
  FurnitureItem,
  Door,
  Window,
  SelectedEntity,
  DimensionPlacement,
} from "../types";

type DimensionLayerProps = {
  room: Room;
  furniture: FurnitureItem[];
  doors: Door[];
  windows: Window[];
  selectedEntity: SelectedEntity;
  zoom: number;
  roomDimensionPlacement?: DimensionPlacement;
};

type VerticalLabelOptions = {
  labelSide?: "left" | "right";
  labelRotation?: number;
};

type HorizontalLabelOptions = {
  labelSide?: "top" | "bottom";
};

export function DimensionLayer({
  room,
  furniture,
  doors,
  windows,
  selectedEntity,
  zoom,
  roomDimensionPlacement,
}: DimensionLayerProps) {
  const safeZoom = Math.max(zoom, 0.01);
  const toWorld = (px: number) => px / safeZoom;

  const lineColor = "#2f2f2f";
  const lineWidth = toWorld(1.4);
  const dashSoft: [number, number] = [toWorld(4), toWorld(3)];
  const extensionLength = toWorld(22);
  const pointerLength = toWorld(7);
  const pointerWidth = toWorld(7);
  const labelFontSize = toWorld(13);
  const subLabelFontSize = toWorld(11);
  const labelHeight = toWorld(20);
  const labelPaddingX = toWorld(8);
  const roomTop = -room.wallThickness;
  const roomBottom = room.height + room.wallThickness;
  const roomLeft = -room.wallThickness;
  const roomRight = room.width + room.wallThickness;
  const roomDimensionOffset = toWorld(28);
  const horizontalSide = roomDimensionPlacement?.horizontalSide ?? "top";
  const verticalSide = roomDimensionPlacement?.verticalSide ?? "right";
  const roomHorizontalAnchorY = horizontalSide === "top" ? roomTop : roomBottom;
  const roomHorizontalDimY =
    horizontalSide === "top"
      ? roomHorizontalAnchorY - roomDimensionOffset
      : roomHorizontalAnchorY + roomDimensionOffset;
  const roomVerticalAnchorX = verticalSide === "right" ? roomRight : roomLeft;
  const roomVerticalDimX =
    verticalSide === "right"
      ? roomVerticalAnchorX + roomDimensionOffset
      : roomVerticalAnchorX - roomDimensionOffset;
  const roomVerticalLabelRotation = verticalSide === "left" ? 90 : -90;

  const getLabelWidth = (label: string, fontSize: number) => {
    return Math.max(toWorld(44), label.length * fontSize * 0.58 + labelPaddingX * 2);
  };

  const drawHorizontalDimension = (
    x1: number,
    x2: number,
    y: number,
    label: string,
    key: string,
    options: HorizontalLabelOptions = {}
  ) => {
    const midX = (x1 + x2) / 2;
    const labelSide = options.labelSide ?? "top";
    const labelWidth = getLabelWidth(label, labelFontSize);
    const labelX = midX - labelWidth / 2;
    const labelY = y - labelHeight / 2;
    const parabolaPeakY = labelSide === "top" ? y - toWorld(18) : y + toWorld(18);

    return (
      <Group key={key}>
        <Line
          points={[x1, y, x2, y]}
          stroke={lineColor}
          strokeWidth={lineWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        <Arrow
          points={[x1 + toWorld(16), y, x1, y]}
          stroke={lineColor}
          fill={lineColor}
          strokeWidth={lineWidth}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
        />
        <Arrow
          points={[x2 - toWorld(16), y, x2, y]}
          stroke={lineColor}
          fill={lineColor}
          strokeWidth={lineWidth}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
        />
        <Line
          points={[x1, y - extensionLength / 2, x1, y + extensionLength / 2]}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Line
          points={[x2, y - extensionLength / 2, x2, y + extensionLength / 2]}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Rect
          x={labelX}
          y={labelY}
          width={labelWidth}
          height={labelHeight}
          fill="rgba(255, 255, 255, 0.9)"
          stroke="#d9d9d9"
          strokeWidth={toWorld(1)}
          cornerRadius={toWorld(4)}
          listening={false}
        />
        <Text
          x={labelX}
          y={labelY + (labelHeight - labelFontSize) / 2}
          width={labelWidth}
          text={label}
          fontSize={labelFontSize}
          fontStyle="bold"
          fill="#111"
          align="center"
          listening={false}
        />
      </Group>
    );
  };

  const drawVerticalDimension = (
    y1: number,
    y2: number,
    x: number,
    label: string,
    key: string,
    options: VerticalLabelOptions = {}
  ) => {
    const midY = (y1 + y2) / 2;
    const labelSide = options.labelSide ?? "right";
    const labelRotation = options.labelRotation ?? 0;
    const isQuarterTurn = Math.abs(labelRotation) % 180 === 90;
    const labelWidth = getLabelWidth(label, labelFontSize);
    const labelGap = toWorld(8);
    const labelHalfExtentX = isQuarterTurn ? labelHeight / 2 : labelWidth / 2;
    const labelCenterX =
      labelSide === "right"
        ? x + labelGap + labelHalfExtentX
        : x - labelGap - labelHalfExtentX;
    const parabolaPeakX = labelSide === "right" ? x + toWorld(18) : x - toWorld(18);
    const textY = -labelFontSize / 2;

    return (
      <Group key={key}>
        <Line
          points={[x, y1, x, y2]}
          stroke={lineColor}
          strokeWidth={lineWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
        <Arrow
          points={[x, y1 + toWorld(16), x, y1]}
          stroke={lineColor}
          fill={lineColor}
          strokeWidth={lineWidth}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
        />
        <Arrow
          points={[x, y2 - toWorld(16), x, y2]}
          stroke={lineColor}
          fill={lineColor}
          strokeWidth={lineWidth}
          pointerLength={pointerLength}
          pointerWidth={pointerWidth}
        />
        <Line
          points={[x - extensionLength / 2, y1, x + extensionLength / 2, y1]}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Line
          points={[x - extensionLength / 2, y2, x + extensionLength / 2, y2]}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
        <Group x={labelCenterX} y={midY} rotation={labelRotation} listening={false}>
          <Rect
            x={-labelWidth / 2}
            y={-labelHeight / 2}
            width={labelWidth}
            height={labelHeight}
            fill="rgba(255, 255, 255, 0.9)"
            stroke="#d9d9d9"
            strokeWidth={toWorld(1)}
            cornerRadius={toWorld(4)}
            listening={false}
          />
          <Text
            x={-labelWidth / 2}
            y={textY}
            width={labelWidth}
            text={label}
            fontSize={labelFontSize}
            fontStyle="bold"
            fill="#111"
            align="center"
            listening={false}
          />
        </Group>
      </Group>
    );
  };

  const dimensions: JSX.Element[] = [];

  // 방 외부 치수선
  // 상단 수평 치수 (전체 너비)
  dimensions.push(
    <Group key="room-width-ext">
      <Line
        points={[roomLeft, roomHorizontalAnchorY, roomLeft, roomHorizontalDimY]}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />
      <Line
        points={[roomRight, roomHorizontalAnchorY, roomRight, roomHorizontalDimY]}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />
    </Group>
  );
  dimensions.push(
    drawHorizontalDimension(
      roomLeft,
      roomRight,
      roomHorizontalDimY,
      `${room.width} mm`,
      "room-width",
      { labelSide: horizontalSide }
    )
  );

  // 좌측 수직 치수 (전체 높이)
  dimensions.push(
    <Group key="room-height-ext">
      <Line
        points={[roomVerticalAnchorX, roomTop, roomVerticalDimX, roomTop]}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />
      <Line
        points={[roomVerticalAnchorX, roomBottom, roomVerticalDimX, roomBottom]}
        stroke={lineColor}
        strokeWidth={lineWidth}
      />
    </Group>
  );
  dimensions.push(
    drawVerticalDimension(
      roomTop,
      roomBottom,
      roomVerticalDimX,
      `${room.height} mm`,
      "room-height",
      { labelSide: verticalSide, labelRotation: roomVerticalLabelRotation }
    )
  );

  // 모든 가구의 치수 표시 (회전되지 않은 가구만)
  furniture.forEach((item) => {
    if (item.rotation === 0) {
      const furnitureDimensionInset = toWorld(20);
      const isSelected = selectedEntity?.kind === "furniture" && selectedEntity.id === item.id;

      // 가구 내부 가로 치수
      dimensions.push(
        drawHorizontalDimension(
          item.x,
          item.x + item.width,
          item.y + furnitureDimensionInset,
          `${item.width} mm`,
          `furniture-width-${item.id}`,
          { labelSide: "bottom" }
        )
      );

      // 가구 내부 세로 치수
      dimensions.push(
        drawVerticalDimension(
          item.y,
          item.y + item.depth,
          item.x + furnitureDimensionInset,
          `${item.depth} mm`,
          `furniture-depth-${item.id}`,
          { labelSide: "right", labelRotation: 0 }
        )
      );
    }
  });

  // 문 치수 표시
  doors.forEach((door, idx) => {
    const isSelected = selectedEntity?.kind === "door" && selectedEntity.id === door.id;

    if (door.wall === "north") {
      const x = door.offset;
      const lineY = -room.wallThickness - toWorld(16);
      dimensions.push(
        <Group key={`door-${idx}`}>
          <Line
            points={[x, lineY, x + door.width, lineY]}
            stroke={isSelected ? "#4A90E2" : "#999"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={x + door.width / 2}
            y={lineY - toWorld(12)}
            text={`${door.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4A90E2" : "#666"}
            align="center"
            offsetX={toWorld(30)}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (door.wall === "south") {
      const x = door.offset;
      const lineY = room.height + room.wallThickness + toWorld(16);
      dimensions.push(
        <Group key={`door-${idx}`}>
          <Line
            points={[x, lineY, x + door.width, lineY]}
            stroke={isSelected ? "#4A90E2" : "#999"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={x + door.width / 2}
            y={lineY + toWorld(12)}
            text={`${door.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4A90E2" : "#666"}
            align="center"
            offsetX={toWorld(30)}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (door.wall === "west") {
      const y = door.offset;
      const lineX = -room.wallThickness - toWorld(16);
      dimensions.push(
        <Group key={`door-${idx}`}>
          <Line
            points={[lineX, y, lineX, y + door.width]}
            stroke={isSelected ? "#4A90E2" : "#999"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={lineX - toWorld(12)}
            y={y + door.width / 2}
            text={`${door.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4A90E2" : "#666"}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (door.wall === "east") {
      const y = door.offset;
      const lineX = room.width + room.wallThickness + toWorld(16);
      dimensions.push(
        <Group key={`door-${idx}`}>
          <Line
            points={[lineX, y, lineX, y + door.width]}
            stroke={isSelected ? "#4A90E2" : "#999"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={lineX + toWorld(10)}
            y={y + door.width / 2}
            text={`${door.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4A90E2" : "#666"}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    }
  });

  // 창문 치수 표시
  windows.forEach((window, idx) => {
    const isSelected = selectedEntity?.kind === "window" && selectedEntity.id === window.id;

    if (window.wall === "north") {
      const x = window.offset;
      const lineY = -room.wallThickness - toWorld(34);
      dimensions.push(
        <Group key={`window-${idx}`}>
          <Line
            points={[x, lineY, x + window.width, lineY]}
            stroke={isSelected ? "#4682B4" : "#aaa"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={x + window.width / 2}
            y={lineY - toWorld(10)}
            text={`${window.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4682B4" : "#888"}
            align="center"
            offsetX={toWorld(30)}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (window.wall === "south") {
      const x = window.offset;
      const lineY = room.height + room.wallThickness + toWorld(34);
      dimensions.push(
        <Group key={`window-${idx}`}>
          <Line
            points={[x, lineY, x + window.width, lineY]}
            stroke={isSelected ? "#4682B4" : "#aaa"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={x + window.width / 2}
            y={lineY + toWorld(10)}
            text={`${window.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4682B4" : "#888"}
            align="center"
            offsetX={toWorld(30)}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (window.wall === "west") {
      const y = window.offset;
      const lineX = -room.wallThickness - toWorld(34);
      dimensions.push(
        <Group key={`window-${idx}`}>
          <Line
            points={[lineX, y, lineX, y + window.width]}
            stroke={isSelected ? "#4682B4" : "#aaa"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={lineX - toWorld(10)}
            y={y + window.width / 2}
            text={`${window.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4682B4" : "#888"}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    } else if (window.wall === "east") {
      const y = window.offset;
      const lineX = room.width + room.wallThickness + toWorld(34);
      dimensions.push(
        <Group key={`window-${idx}`}>
          <Line
            points={[lineX, y, lineX, y + window.width]}
            stroke={isSelected ? "#4682B4" : "#aaa"}
            strokeWidth={isSelected ? lineWidth * 1.4 : lineWidth}
            dash={dashSoft}
          />
          <Text
            x={lineX + toWorld(10)}
            y={y + window.width / 2}
            text={`${window.width} mm`}
            fontSize={subLabelFontSize}
            fill={isSelected ? "#4682B4" : "#888"}
            offsetY={subLabelFontSize / 2}
            listening={false}
          />
        </Group>
      );
    }
  });

  return <Layer listening={false}>{dimensions}</Layer>;
}
