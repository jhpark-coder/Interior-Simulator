import type { LayoutDoc } from "../types";

export const LEGACY_LAYOUT_V110_FIXTURE: LayoutDoc = {
  version: "1.1.0",
  room: {
    width: 5000,
    height: 4000,
    wallThickness: 200,
    ceilingHeight: 2400,
    gridSize: 100,
    snapEnabled: true,
    displayUnit: "mm",
    wallColor: "#d9d2c7",
    floorColor: "#c6a47e",
  },
  furniture: [
    {
      id: "legacy-bed",
      type: "bed",
      category: "furniture",
      name: "침대",
      x: 600,
      y: 700,
      width: 1600,
      depth: 2100,
      height: 500,
      rotation: 0,
      zIndex: 0,
      locked: false,
    },
  ],
  doors: [
    {
      id: "legacy-door",
      wall: "south",
      offset: 700,
      width: 900,
      height: 2100,
      doorType: "swing",
      hinge: "left",
      swing: "inward",
      slideDirection: "left",
      openAngle: 90,
      thickness: 40,
      color: "#654321",
    },
  ],
  windows: [
    {
      id: "legacy-window",
      wall: "east",
      offset: 1000,
      width: 1500,
      height: 1200,
      sillHeight: 900,
    },
  ],
  meta: {
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
};

export const LEGACY_LAYOUT_V120_FIXTURE: LayoutDoc = {
  ...LEGACY_LAYOUT_V110_FIXTURE,
  version: "1.2.0",
};
