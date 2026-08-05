import { beforeEach, describe, expect, it } from "vitest";
import { createThreeRoomStructureFixture } from "../domain/structure";
import { useSimulatorStore } from "./useSimulatorStore";

function state() {
  return useSimulatorStore.getState();
}

describe("memorySlice", () => {
  beforeEach(() => {
    useSimulatorStore.setState({
      structure: createThreeRoomStructureFixture(),
      memoryPins: [],
      savedViewpoints: [],
      selectedMemoryPinId: null,
      activeViewpointId: null,
      memorySearch: "",
      navigationMode: "orbit",
    });
  });

  it("creates a room-linked memory pin and updates its note", () => {
    const id = state().addMemoryPin({ x: 1000, y: 1000 });
    const pin = state().memoryPins[0];
    expect(pin.id).toBe(id);
    expect(pin.roomId).toBeDefined();

    state().updateMemoryPin(id, { note: "현관에서 본 거실" });
    expect(state().memoryPins[0].note).toBe("현관에서 본 거실");
  });

  it("attaches and detaches photo assets without duplicates", () => {
    const id = state().addMemoryPin({ x: 1000, y: 1000 });
    state().attachPhotoToMemoryPin(id, "photo-1");
    state().attachPhotoToMemoryPin(id, "photo-1");
    expect(state().memoryPins[0].assetIds).toEqual(["photo-1"]);
    state().detachPhotoFromMemoryPin(id, "photo-1");
    expect(state().memoryPins[0].assetIds).toEqual([]);
  });

  it("stores and activates a 3D viewpoint", () => {
    const id = state().addSavedViewpoint(
      "거실 입구",
      { x: 1000, y: 1600, z: 1200 },
      { x: 2500, y: 1400, z: 1200 }
    );
    expect(state().activeViewpointId).toBe(id);
    expect(state().savedViewpoints[0].name).toBe("거실 입구");
    state().removeSavedViewpoint(id);
    expect(state().activeViewpointId).toBeNull();
  });
});
