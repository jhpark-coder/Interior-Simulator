import { detectRoomRegions, pointInPolygon } from "./geometry";
import type {
  FloorStructure,
  Opening,
  RoomUsage,
  Vec2,
  Wall,
  WallKind,
} from "./types";
import { MANUAL_SOURCE } from "./types";

// Generic 84㎡ (전용) three-bedroom apartment, transcribed in mm from
// typical published dimensions: 9000 mm wide, 11900 mm deep.
const ID = "fixture-apt84";
const CEILING = 2300;

function wall(id: string, start: Vec2, end: Vec2, kind: WallKind = "interior"): Wall {
  return {
    id: `${ID}-${id}`,
    start,
    end,
    thickness: kind === "exterior" ? 200 : 120,
    height: CEILING,
    kind,
    source: { ...MANUAL_SOURCE },
  };
}

function opening(
  id: string,
  kind: "door" | "window",
  wallId: string,
  offset: number,
  width: number,
  extra: Partial<Opening> = {}
): Opening {
  return {
    id: `${ID}-${id}`,
    kind,
    wallId: `${ID}-${wallId}`,
    offset,
    width,
    height: kind === "door" ? 2100 : 1200,
    sillHeight: kind === "door" ? 0 : 900,
    ...(kind === "door" ? { doorType: "swing" as const } : {}),
    source: { ...MANUAL_SOURCE },
    ...extra,
  };
}

const WALLS: Wall[] = [
  wall("e-top-balcony", { x: 0, y: 300 }, { x: 3300, y: 300 }, "exterior"),
  wall("e-top-step", { x: 3300, y: 300 }, { x: 3300, y: 0 }, "exterior"),
  wall("e-top-kitchen", { x: 3300, y: 0 }, { x: 6300, y: 0 }, "exterior"),
  wall("e-top-step2", { x: 6300, y: 0 }, { x: 6300, y: 750 }, "exterior"),
  wall("e-top-right", { x: 6300, y: 750 }, { x: 9000, y: 750 }, "exterior"),
  wall("e-right-1", { x: 9000, y: 750 }, { x: 9000, y: 2250 }, "exterior"),
  wall("e-right-2", { x: 9000, y: 2250 }, { x: 9000, y: 5250 }, "exterior"),
  wall("e-right-3", { x: 9000, y: 5250 }, { x: 9000, y: 10600 }, "exterior"),
  wall("e-right-4", { x: 9000, y: 10600 }, { x: 9000, y: 11900 }, "exterior"),
  wall("e-bottom", { x: 9000, y: 11900 }, { x: 0, y: 11900 }, "exterior"),
  wall("e-left-1", { x: 0, y: 11900 }, { x: 0, y: 10600 }, "exterior"),
  wall("e-left-2", { x: 0, y: 10600 }, { x: 0, y: 6700 }, "exterior"),
  wall("e-left-3", { x: 0, y: 6700 }, { x: 0, y: 5000 }, "exterior"),
  wall("e-left-4", { x: 0, y: 5000 }, { x: 0, y: 4400 }, "exterior"),
  wall("e-left-5", { x: 0, y: 4400 }, { x: 0, y: 1700 }, "exterior"),
  wall("e-left-6", { x: 0, y: 1700 }, { x: 0, y: 300 }, "exterior"),
  wall("i-balcony-room2", { x: 0, y: 1700 }, { x: 3300, y: 1700 }),
  wall("i-kitchen-balcony", { x: 3300, y: 300 }, { x: 3300, y: 1700 }),
  wall("i-kitchen-room2", { x: 3300, y: 1700 }, { x: 3300, y: 4400 }),
  wall("i-hall-bath2", { x: 3300, y: 4400 }, { x: 3300, y: 6700 }),
  wall("i-room2-utility", { x: 0, y: 4400 }, { x: 1570, y: 4400 }),
  wall("i-room2-bath2", { x: 1570, y: 4400 }, { x: 3300, y: 4400 }),
  wall("i-utility-bath2", { x: 1570, y: 4400 }, { x: 1570, y: 5000 }),
  wall("i-bath1-bath2", { x: 1570, y: 5000 }, { x: 1570, y: 6700 }),
  wall("i-utility-bath1", { x: 0, y: 5000 }, { x: 1570, y: 5000 }),
  wall("i-bath1-room1", { x: 0, y: 6700 }, { x: 1570, y: 6700 }),
  wall("i-bath2-room1", { x: 1570, y: 6700 }, { x: 3300, y: 6700 }),
  wall("i-hall-room1", { x: 3300, y: 6700 }, { x: 4500, y: 6700 }),
  wall("i-room1-living", { x: 4500, y: 6700 }, { x: 4500, y: 10600 }),
  wall("i-room1-balcony", { x: 0, y: 10600 }, { x: 4500, y: 10600 }),
  wall("i-living-balcony", { x: 4500, y: 10600 }, { x: 9000, y: 10600 }),
  wall("i-kitchen-balcony2", { x: 6300, y: 750 }, { x: 6300, y: 2250 }),
  wall("i-kitchen-room3", { x: 6300, y: 2250 }, { x: 6300, y: 5250 }),
  wall("i-balcony2-room3", { x: 6300, y: 2250 }, { x: 9000, y: 2250 }),
  wall("i-room3-living", { x: 6300, y: 5250 }, { x: 9000, y: 5250 }),
];

const OPENINGS: Opening[] = [
  opening("front-door", "door", "e-right-3", 600, 900),
  opening("door-room2", "door", "i-kitchen-room2", 1750, 850),
  opening("door-bath2", "door", "i-hall-bath2", 1450, 750),
  opening("door-bath1", "door", "i-bath1-room1", 800, 700),
  opening("door-room1", "door", "i-hall-room1", 100, 900),
  opening("door-room3", "door", "i-room3-living", 100, 850),
  opening("door-balcony1", "door", "i-kitchen-balcony", 300, 800),
  opening("door-balcony2", "door", "i-kitchen-balcony2", 300, 800),
  opening("door-balcony3", "door", "i-living-balcony", 780, 2730, {
    doorType: "sliding",
    slideDirection: "left",
  }),
  opening("window-room2", "window", "i-balcony-room2", 700, 1450),
  opening("window-room1", "window", "i-room1-balcony", 1050, 2400),
  opening("window-room3", "window", "i-balcony2-room3", 600, 1500),
  opening("window-kitchen", "window", "e-top-kitchen", 1000, 950),
  opening("window-balcony1", "window", "e-top-balcony", 300, 2700, {
    height: 1500,
    sillHeight: 600,
  }),
  opening("window-balcony2", "window", "e-top-right", 200, 2300, {
    height: 1500,
    sillHeight: 600,
  }),
  opening("window-balcony3", "window", "e-bottom", 500, 8000, {
    height: 1500,
    sillHeight: 600,
  }),
];

const ROOM_LABELS: Array<{ point: Vec2; name: string; usage: RoomUsage }> = [
  { point: { x: 1650, y: 1000 }, name: "발코니", usage: "balcony" },
  { point: { x: 1650, y: 3050 }, name: "방 2", usage: "bedroom" },
  { point: { x: 780, y: 4700 }, name: "다용도", usage: "utility" },
  { point: { x: 780, y: 5850 }, name: "욕실 1", usage: "bathroom" },
  { point: { x: 2400, y: 5550 }, name: "욕실 2", usage: "bathroom" },
  { point: { x: 2250, y: 8650 }, name: "방 1", usage: "bedroom" },
  { point: { x: 6000, y: 8000 }, name: "거실·주방", usage: "living" },
  { point: { x: 7650, y: 1500 }, name: "발코니", usage: "balcony" },
  { point: { x: 7650, y: 3750 }, name: "방 3", usage: "bedroom" },
  { point: { x: 4500, y: 11250 }, name: "발코니", usage: "balcony" },
];

export function createApartment84StructureFixture(): FloorStructure {
  const walls = structuredClone(WALLS);
  let index = 0;
  const rooms = detectRoomRegions(walls, {
    idFactory: () => `${ID}-room-${(index += 1)}`,
  }).map((room) => {
    const label = ROOM_LABELS.find((item) => pointInPolygon(item.point, room.polygon));
    return label ? { ...room, name: label.name, usage: label.usage } : room;
  });

  return {
    id: ID,
    name: "84㎡ 방 3개 아파트",
    elevation: 0,
    ceilingHeight: CEILING,
    walls,
    rooms,
    openings: structuredClone(OPENINGS),
  };
}
