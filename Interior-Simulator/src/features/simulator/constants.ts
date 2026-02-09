import type { Door, FurnitureType, Room, Window } from "./types";

export const DEFAULT_ROOM: Room = {
  width: 4000,
  height: 3000,
  wallThickness: 200,
  ceilingHeight: 2400,
  gridSize: 100,
  snapEnabled: true,
  displayUnit: "mm",
};

export const FURNITURE_CATALOG: Record<
  FurnitureType,
  { label: string; width: number; depth: number; height: number }
> = {
  bed: { label: "침대", width: 2000, depth: 1500, height: 500 },
  desk: { label: "책상", width: 1200, depth: 600, height: 720 },
  chair: { label: "의자", width: 450, depth: 450, height: 900 },
  closet: { label: "수납장", width: 1200, depth: 600, height: 2000 },
  sofa: { label: "소파", width: 1800, depth: 900, height: 800 },
  table: { label: "테이블", width: 1200, depth: 800, height: 750 },
};

export type FurniturePreset = {
  id: string;
  label: string;
  type: FurnitureType;
  name: string;
  width: number;
  depth: number;
  height: number;
};

export const FURNITURE_PRESETS: FurniturePreset[] = [
  // Beds
  {
    id: "bed-single",
    label: "싱글",
    type: "bed",
    name: "싱글 침대",
    width: 1000,
    depth: 2000,
    height: 500,
  },
  {
    id: "bed-super-single",
    label: "슈퍼싱글",
    type: "bed",
    name: "슈퍼싱글 침대",
    width: 1100,
    depth: 2000,
    height: 500,
  },
  {
    id: "bed-double",
    label: "더블",
    type: "bed",
    name: "더블 침대",
    width: 1400,
    depth: 2000,
    height: 500,
  },
  {
    id: "bed-queen",
    label: "퀸",
    type: "bed",
    name: "퀸 침대",
    width: 1500,
    depth: 2000,
    height: 500,
  },
  {
    id: "bed-king",
    label: "킹",
    type: "bed",
    name: "킹 침대",
    width: 1650,
    depth: 2050,
    height: 500,
  },
  {
    id: "bed-family",
    label: "패밀리",
    type: "bed",
    name: "패밀리 침대",
    width: 1800,
    depth: 2100,
    height: 500,
  },

  // Desks
  {
    id: "desk-compact",
    label: "컴팩트",
    type: "desk",
    name: "컴팩트 책상",
    width: 1000,
    depth: 600,
    height: 720,
  },
  {
    id: "desk-standard",
    label: "스탠다드",
    type: "desk",
    name: "스탠다드 책상",
    width: 1400,
    depth: 700,
    height: 720,
  },
  {
    id: "desk-wide",
    label: "와이드",
    type: "desk",
    name: "와이드 책상",
    width: 1800,
    depth: 800,
    height: 720,
  },

  // Chairs
  {
    id: "chair-dining",
    label: "식탁의자",
    type: "chair",
    name: "식탁 의자",
    width: 450,
    depth: 500,
    height: 900,
  },
  {
    id: "chair-office",
    label: "사무의자",
    type: "chair",
    name: "사무 의자",
    width: 520,
    depth: 520,
    height: 1000,
  },
  {
    id: "chair-lounge",
    label: "라운지",
    type: "chair",
    name: "라운지 체어",
    width: 700,
    depth: 800,
    height: 900,
  },

  // Closets
  {
    id: "closet-single",
    label: "1자",
    type: "closet",
    name: "1자 수납장",
    width: 1200,
    depth: 600,
    height: 2200,
  },
  {
    id: "closet-double",
    label: "2자",
    type: "closet",
    name: "2자 수납장",
    width: 1800,
    depth: 600,
    height: 2200,
  },
  {
    id: "closet-built-in",
    label: "붙박이",
    type: "closet",
    name: "붙박이장",
    width: 2400,
    depth: 650,
    height: 2300,
  },

  // Sofas
  {
    id: "sofa-1",
    label: "1인",
    type: "sofa",
    name: "1인 소파",
    width: 900,
    depth: 900,
    height: 850,
  },
  {
    id: "sofa-2",
    label: "2인",
    type: "sofa",
    name: "2인 소파",
    width: 1600,
    depth: 900,
    height: 850,
  },
  {
    id: "sofa-3",
    label: "3인",
    type: "sofa",
    name: "3인 소파",
    width: 2000,
    depth: 950,
    height: 850,
  },
  {
    id: "sofa-4",
    label: "4인",
    type: "sofa",
    name: "4인 소파",
    width: 2400,
    depth: 1000,
    height: 850,
  },

  // Tables
  {
    id: "table-2",
    label: "2인",
    type: "table",
    name: "2인 식탁",
    width: 800,
    depth: 800,
    height: 750,
  },
  {
    id: "table-4",
    label: "4인",
    type: "table",
    name: "4인 식탁",
    width: 1400,
    depth: 800,
    height: 750,
  },
  {
    id: "table-6",
    label: "6인",
    type: "table",
    name: "6인 식탁",
    width: 1800,
    depth: 850,
    height: 750,
  },
  {
    id: "table-round",
    label: "원형 4인",
    type: "table",
    name: "원형 4인 테이블",
    width: 1100,
    depth: 1100,
    height: 750,
  },
];

export const DEFAULT_DOOR: Omit<Door, "id" | "wall" | "offset"> = {
  width: 900,
  height: 2100,
  hinge: "left",
  swing: "inward",
  openAngle: 90,
  thickness: 40,
};

export const DEFAULT_WINDOW: Omit<Window, "id" | "wall" | "offset"> = {
  width: 1200,
  height: 1200,
  sillHeight: 900,
};
