import { beforeEach, describe, expect, it } from "vitest";
import { useSimulatorStore } from "./useSimulatorStore";
import { DEFAULT_ROOM, FURNITURE_CATALOG } from "../constants";
import type { FurnitureType } from "../types";
import {
  createApartment84StructureFixture,
  createLShapedStructureFixture,
  createRectangularStructureFixture,
  createThreeRoomStructureFixture,
  polygonArea,
  polygonCentroid,
} from "../domain/structure";

function resetStore() {
  useSimulatorStore.setState({
    room: { ...DEFAULT_ROOM },
    furniture: [],
    doors: [],
    windows: [],
    selectedEntity: null,
    viewMode: "2d",
    roomDimensionPlacement: { horizontalSide: "top", verticalSide: "right" },
    historyPast: [],
    historyFuture: [],
    validationErrors: [],
    pendingFurniture: null,
    pendingDoor: null,
    pendingWindow: null,
    placingFurnitureId: null,
    placingFurniture: null,
    structure: createRectangularStructureFixture(),
    structureIssues: [],
    selectedStructureEntity: null,
    structurePast: [],
    structureFuture: [],
  });
}

function gs() {
  return useSimulatorStore.getState();
}

// ─── Furniture ───────────────────────────────────────────────────────────────

describe("furnitureSlice", () => {
  beforeEach(resetStore);

  it("addFurniture places item and selects it", () => {
    gs().addFurniture("desk");
    const { furniture, selectedEntity } = gs();
    expect(furniture).toHaveLength(1);
    expect(furniture[0].type).toBe("desk");
    expect(selectedEntity).toEqual({ kind: "furniture", id: furniture[0].id });
  });

  it("addFurniture infers the correct category", () => {
    gs().addFurniture("refrigerator");
    expect(gs().furniture[0].category).toBe("appliance");

    resetStore();
    gs().addFurniture("sink");
    expect(gs().furniture[0].category).toBe("fixture");
  });

  it("removeFurniture deletes the item and clears selection", () => {
    gs().addFurniture("chair");
    const id = gs().furniture[0].id;
    gs().selectEntity({ kind: "furniture", id });
    gs().removeFurniture(id);
    expect(gs().furniture).toHaveLength(0);
    expect(gs().selectedEntity).toBeNull();
  });

  it("removeFurniture cascades to attached children", () => {
    gs().addFurniture("desk");
    const parentId = gs().furniture[0].id;
    gs().addFurniture("monitor-stand");
    const childId = gs().furniture[1].id;
    gs().attachToParent(childId, parentId);
    expect(gs().furniture[1].parentId).toBe(parentId);

    gs().removeFurniture(parentId);
    expect(gs().furniture).toHaveLength(0);
  });

  it("updateFurniture applies patch", () => {
    gs().addFurniture("bed");
    const id = gs().furniture[0].id;
    gs().updateFurniture(id, { name: "큰 침대" });
    expect(gs().furniture[0].name).toBe("큰 침대");
  });

  it("commitPendingFurniture adds item and clears pending", () => {
    gs().setPendingFurniture("sofa");
    expect(gs().pendingFurniture).not.toBeNull();
    gs().commitPendingFurniture();
    expect(gs().pendingFurniture).toBeNull();
    expect(gs().furniture).toHaveLength(1);
  });

  it("setPendingFurniture places the draft inside a room even when extra walls stretch the bounds", () => {
    // ScenarioCanvas는 room을 구조 bounds 끝까지 늘린다. 방 바깥의 벽 하나로
    // bounds 중앙이 실제 방 밖으로 밀려도 추가 대기 위치는 방 안이어야 한다.
    gs().addWall({ x: 2800, y: 11900 }, { x: 11800, y: 11900 });
    gs().setRoom({ width: 11800, height: 11900 });

    gs().setPendingFurniture("bed", { name: "퀸 침대", width: 1500, depth: 2000 });
    const pending = gs().pendingFurniture!;
    const [room] = gs().structure.rooms;
    const xs = room.polygon.map((point) => point.x);
    const ys = room.polygon.map((point) => point.y);
    expect(pending.x).toBeGreaterThanOrEqual(Math.min(...xs));
    expect(pending.y).toBeGreaterThanOrEqual(Math.min(...ys));
    expect(pending.x + pending.width).toBeLessThanOrEqual(Math.max(...xs));
    expect(pending.y + pending.depth).toBeLessThanOrEqual(Math.max(...ys));

    gs().commitPendingFurniture();
    expect(gs().validationErrors).toEqual([]);
    expect(gs().furniture).toHaveLength(1);
  });

  it("updatePendingFurniture clears a stale placement error after moving the draft", () => {
    gs().setPendingFurniture("table", { width: 800, depth: 600 });
    gs().updatePendingFurniture({ x: 6000, y: 6000 });
    gs().commitPendingFurniture();
    expect(gs().validationErrors[0]).toContain("구조 바깥");

    gs().updatePendingFurniture({ x: 300, y: 300 });
    expect(gs().validationErrors).toEqual([]);
    gs().commitPendingFurniture();
    expect(gs().furniture).toHaveLength(1);
  });

  it("setPendingFurniture centers the draft in the largest room", () => {
    gs().setStructure(createThreeRoomStructureFixture(), false);
    const largest = [...gs().structure.rooms].sort(
      (a, b) => polygonArea(b.polygon) - polygonArea(a.polygon)
    )[0];
    const center = polygonCentroid(largest.polygon);

    gs().setPendingFurniture("table", { width: 800, depth: 600 });
    const pending = gs().pendingFurniture!;
    expect(pending.x + pending.width / 2).toBeCloseTo(center.x);
    expect(pending.y + pending.depth / 2).toBeCloseTo(center.y);
  });

  it("setPendingFurniture keeps a thin L-shaped room's draft out of the empty notch", () => {
    // 팔이 얇은 L자 방은 무게중심이 빈 모서리 쪽에 떨어진다.
    gs().clearStructure();
    const corners = [
      { x: 0, y: 0 },
      { x: 6000, y: 0 },
      { x: 6000, y: 1500 },
      { x: 1500, y: 1500 },
      { x: 1500, y: 6000 },
      { x: 0, y: 6000 },
    ];
    corners.forEach((corner, index) =>
      gs().addWall(corner, corners[(index + 1) % corners.length])
    );
    gs().setRoom({ width: 6000, height: 6000 });
    expect(gs().structure.rooms).toHaveLength(1);

    gs().setPendingFurniture("table", { width: 800, depth: 600 });
    gs().commitPendingFurniture();
    expect(gs().validationErrors).toEqual([]);
    expect(gs().furniture).toHaveLength(1);
  });

  it("setPendingFurniture keeps every catalog item clear of walls in the 84㎡ sample", () => {
    // 84㎡ 샘플의 가장 큰 방(L자 거실)은 무게중심이 내부 벽에 가까워, 무게중심에
    // 침대를 두면 벽을 가로질러 바로 '추가'가 거절됐다.
    gs().setStructure(createApartment84StructureFixture(), false);
    for (const type of Object.keys(FURNITURE_CATALOG) as FurnitureType[]) {
      useSimulatorStore.setState({ furniture: [], validationErrors: [] });
      gs().setPendingFurniture(type);
      gs().commitPendingFurniture();
      expect({ type, errors: gs().validationErrors }).toEqual({ type, errors: [] });
      expect(gs().furniture).toHaveLength(1);
    }
  });

  it("setPendingFurniture fits a rotated single bed in the 84㎡ sample", () => {
    gs().setStructure(createApartment84StructureFixture(), false);
    gs().setPendingFurniture("bed", { name: "싱글 침대", width: 1000, depth: 2000, rotation: 90 });
    gs().commitPendingFurniture();
    expect(gs().validationErrors).toEqual([]);
    expect(gs().furniture).toHaveLength(1);
  });

  it("commitPendingFurniture rejects collision and sets validationErrors", () => {
    // Place first item at room center
    gs().addFurniture("desk");
    const first = gs().furniture[0];

    // Place pending item at the exact same position
    gs().setPendingFurniture("desk");
    gs().updatePendingFurniture({ x: first.x, y: first.y });
    gs().commitPendingFurniture();

    expect(gs().validationErrors).toHaveLength(1);
    expect(gs().furniture).toHaveLength(1); // rejected
  });

  it("commitPendingFurniture rejects the empty notch of an L-shaped floor", () => {
    gs().setStructure(createLShapedStructureFixture(), false);
    gs().setPendingFurniture("table", { width: 800, depth: 600 });
    gs().updatePendingFurniture({ x: 4500, y: 3500 });
    gs().commitPendingFurniture();

    expect(gs().furniture).toHaveLength(0);
    expect(gs().validationErrors[0]).toContain("구조 바깥");
  });

  it("commitPendingFurniture rejects an internal wall crossing", () => {
    gs().setStructure(createThreeRoomStructureFixture(), false);
    gs().setPendingFurniture("table", { width: 600, depth: 1000 });
    gs().updatePendingFurniture({ x: 2750, y: 1000 });
    gs().commitPendingFurniture();

    expect(gs().furniture).toHaveLength(0);
    expect(gs().validationErrors[0]).toContain("벽을 가로");
  });

  it("attachToParent sets parentId and offsets", () => {
    gs().addFurniture("desk");
    gs().addFurniture("monitor-stand");
    const parentId = gs().furniture[0].id;
    const childId = gs().furniture[1].id;

    gs().attachToParent(childId, parentId);
    const child = gs().furniture.find((f) => f.id === childId)!;
    expect(child.parentId).toBe(parentId);
    expect(child.attachOffsetX).toBeDefined();
    expect(child.attachOffsetY).toBeDefined();
  });

  it("detachFromParent clears attachment fields", () => {
    gs().addFurniture("desk");
    gs().addFurniture("monitor-stand");
    const parentId = gs().furniture[0].id;
    const childId = gs().furniture[1].id;
    gs().attachToParent(childId, parentId);
    gs().detachFromParent(childId);

    const child = gs().furniture.find((f) => f.id === childId)!;
    expect(child.parentId).toBeUndefined();
    expect(child.attachOffsetX).toBeUndefined();
    expect(child.attachOffsetY).toBeUndefined();
  });

  it("cancelPending clears all pending state", () => {
    gs().setPendingFurniture("chair");
    gs().cancelPending();
    expect(gs().pendingFurniture).toBeNull();
    expect(gs().pendingDoor).toBeNull();
    expect(gs().pendingWindow).toBeNull();
  });
});

// ─── Openings ─────────────────────────────────────────────────────────────────

describe("openingSlice", () => {
  beforeEach(resetStore);

  it("addDoor adds a door and selects it", () => {
    gs().addDoor("north");
    expect(gs().doors).toHaveLength(1);
    expect(gs().doors[0].wall).toBe("north");
    expect(gs().selectedEntity?.kind).toBe("door");
  });

  it("addDoor rejects placement outside wall bounds", () => {
    gs().addDoor("north", 99999);
    // offset is constrained — door should still be added but clamped
    expect(gs().doors).toHaveLength(1);
    const door = gs().doors[0];
    expect(door.offset + door.width).toBeLessThanOrEqual(DEFAULT_ROOM.width);
  });

  it("removeDoor deletes the door and clears selection", () => {
    gs().addDoor("south");
    const id = gs().doors[0].id;
    gs().selectEntity({ kind: "door", id });
    gs().removeDoor(id);
    expect(gs().doors).toHaveLength(0);
    expect(gs().selectedEntity).toBeNull();
  });

  it("addWindow adds a window and selects it", () => {
    gs().addWindow("east");
    expect(gs().windows).toHaveLength(1);
    expect(gs().windows[0].wall).toBe("east");
    expect(gs().selectedEntity?.kind).toBe("window");
  });

  it("removeWindow deletes the window and clears selection", () => {
    gs().addWindow("west");
    const id = gs().windows[0].id;
    gs().selectEntity({ kind: "window", id });
    gs().removeWindow(id);
    expect(gs().windows).toHaveLength(0);
    expect(gs().selectedEntity).toBeNull();
  });

  it("updateDoor applies patch and constrains offset", () => {
    gs().addDoor("north");
    const id = gs().doors[0].id;
    gs().updateDoor(id, { offset: 500 });
    expect(gs().doors[0].offset).toBe(500);
  });

  it("commitPendingDoor adds door and clears pending", () => {
    gs().setPendingDoor("north");
    expect(gs().pendingDoor).not.toBeNull();
    gs().commitPendingDoor();
    expect(gs().pendingDoor).toBeNull();
    expect(gs().doors).toHaveLength(1);
  });

  it("commitPendingWindow adds window and clears pending", () => {
    gs().setPendingWindow("east");
    gs().commitPendingWindow();
    expect(gs().pendingWindow).toBeNull();
    expect(gs().windows).toHaveLength(1);
  });
});

// ─── History ──────────────────────────────────────────────────────────────────

describe("historySlice", () => {
  beforeEach(resetStore);

  it("undo restores the previous state", () => {
    gs().addFurniture("desk"); // this pushes snapshot before adding
    expect(gs().furniture).toHaveLength(1);
    gs().undo();
    expect(gs().furniture).toHaveLength(0);
  });

  it("redo re-applies the undone state", () => {
    gs().addFurniture("sofa");
    gs().undo();
    expect(gs().furniture).toHaveLength(0);
    gs().redo();
    expect(gs().furniture).toHaveLength(1);
  });

  it("undo clears pending state", () => {
    gs().addFurniture("chair");
    gs().setPendingFurniture("desk");
    gs().undo();
    expect(gs().pendingFurniture).toBeNull();
  });

  it("commitHistory enables undo back to the committed state", () => {
    gs().addFurniture("bed");
    const id = gs().furniture[0].id;
    // Commit explicit snapshot with original name
    gs().commitHistory();
    // Now update name without committing
    gs().updateFurniture(id, { name: "수정됨" });
    expect(gs().furniture[0].name).toBe("수정됨");
    // Undo should restore to the committed snapshot (original name "침대")
    gs().undo();
    expect(gs().furniture[0].name).toBe("침대");
  });

  it("importLayout resets all entity arrays and history", () => {
    gs().addFurniture("desk");
    gs().addDoor("north");
    gs().addWindow("east");

    gs().importLayout({
      version: "1.2.0",
      room: { ...DEFAULT_ROOM, width: 5000 },
      furniture: [],
      doors: [],
      windows: [],
      meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    });

    expect(gs().furniture).toHaveLength(0);
    expect(gs().doors).toHaveLength(0);
    expect(gs().windows).toHaveLength(0);
    expect(gs().room.width).toBe(5000);
    expect(gs().historyPast).toHaveLength(0);
    expect(gs().historyFuture).toHaveLength(0);
  });

  it("snapshot returns the current layout as LayoutDoc", () => {
    gs().addFurniture("table");
    const snap = gs().snapshot();
    expect(snap.version).toBe("1.2.0");
    expect(snap.furniture).toHaveLength(1);
    expect(snap.furniture[0].type).toBe("table");
  });
});

// ─── Room ─────────────────────────────────────────────────────────────────────

describe("roomSlice", () => {
  beforeEach(resetStore);

  it("setRoom merges room patch", () => {
    gs().setRoom({ width: 6000 });
    expect(gs().room.width).toBe(6000);
    expect(gs().room.height).toBe(DEFAULT_ROOM.height);
  });

  it("setViewMode updates viewMode", () => {
    gs().setViewMode("3d");
    expect(gs().viewMode).toBe("3d");
  });

  it("selectEntity and clearSelection work", () => {
    gs().addFurniture("chair");
    const id = gs().furniture[0].id;
    gs().selectEntity({ kind: "furniture", id });
    expect(gs().selectedEntity).toEqual({ kind: "furniture", id });
    gs().clearSelection();
    expect(gs().selectedEntity).toBeNull();
  });
});
