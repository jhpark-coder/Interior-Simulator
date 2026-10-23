import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSimulatorStore } from "../store/useSimulatorStore";

const db = vi.hoisted(() => ({
  loadProject: vi.fn(),
  loadProjectAsset: vi.fn(),
  saveProject: vi.fn(),
}));
vi.mock("../store/persistence/projectDb", () => db);

const { claimLastProjectIfUnset, useAutoSave } = await import("./useAutoSave");

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("auto-save project selection", () => {
  beforeEach(() => localStorage.clear());

  it("claims the initial project when no selection exists", () => {
    claimLastProjectIfUnset("project-a");
    expect(localStorage.getItem("interior-simulator-last-project")).toBe(
      "project-a"
    );
  });

  it("does not let another auto-saving tab replace the selected project", () => {
    localStorage.setItem("interior-simulator-last-project", "project-a");
    claimLastProjectIfUnset("project-b");
    expect(localStorage.getItem("interior-simulator-last-project")).toBe(
      "project-a"
    );
  });
});

describe("useAutoSave page lifecycle saves", () => {
  let visibility: DocumentVisibilityState = "visible";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    db.saveProject.mockResolvedValue(undefined);
    db.loadProjectAsset.mockResolvedValue(undefined);
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
  });

  afterEach(() => {
    // jsdom 기본 구현으로 되돌린다.
    delete (document as { visibilityState?: unknown }).visibilityState;
  });

  function hide() {
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
  }

  it("saves the current project immediately when the page is hidden", async () => {
    renderHook(() => useAutoSave());
    // 저장된 마지막 프로젝트가 없으면 복원은 바로 끝난다.
    await act(async () => undefined);

    act(() => hide());
    await waitFor(() => expect(db.saveProject).toHaveBeenCalledTimes(1));
    expect(db.saveProject.mock.calls[0][0].id).toBe(useSimulatorStore.getState().projectId);
    expect(localStorage.getItem("interior-simulator-last-project")).toBe(
      useSimulatorStore.getState().projectId
    );
  });

  it("saves on pagehide and ignores visibilitychange back to visible", async () => {
    renderHook(() => useAutoSave());
    await act(async () => undefined);

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(db.saveProject).not.toHaveBeenCalled();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await waitFor(() => expect(db.saveProject).toHaveBeenCalledTimes(1));
  });

  it("does not save before the last project has been restored", async () => {
    localStorage.setItem("interior-simulator-last-project", "stored-project");
    const load = deferred();
    db.loadProject.mockReturnValue(load.promise.then(() => undefined));
    renderHook(() => useAutoSave());

    act(() => hide());
    await act(async () => undefined);
    expect(db.saveProject).not.toHaveBeenCalled();

    // 복원이 끝나면(여기서는 저장본이 없어 기본 프로젝트 유지) 다시 저장한다.
    await act(async () => load.resolve());
    act(() => hide());
    await waitFor(() => expect(db.saveProject).toHaveBeenCalledTimes(1));
  });

  it("writes the latest snapshot on hide without waiting for an in-flight interval save", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    try {
      const intervalSave = deferred();
      db.saveProject.mockReturnValueOnce(intervalSave.promise);
      renderHook(() => useAutoSave());
      await act(async () => undefined);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(db.saveProject).toHaveBeenCalledTimes(1);

      act(() => useSimulatorStore.getState().setProjectName("닫기 직전 이름"));
      act(() => hide());
      expect(db.saveProject).toHaveBeenCalledTimes(2);
      expect(db.saveProject.mock.calls[1][0].name).toBe("닫기 직전 이름");
      intervalSave.resolve();
    } finally {
      vi.useRealTimers();
    }
  });

  it("logs a failed page-leave save instead of throwing", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    db.saveProject.mockRejectedValueOnce(new Error("QuotaExceededError"));
    renderHook(() => useAutoSave());
    await act(async () => undefined);

    act(() => hide());
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        "Failed to save before leaving the page:",
        expect.any(Error)
      )
    );
    error.mockRestore();
  });

  it("restores a last project that an older version saved with out-of-range values", async () => {
    const broken = structuredClone(useSimulatorStore.getState().snapshotProject());
    broken.id = "stored-broken";
    broken.name = "두께 0 프로젝트";
    broken.structureRevisions[0].structure.walls[0].thickness = 0;
    localStorage.setItem("interior-simulator-last-project", broken.id);
    db.loadProject.mockResolvedValue(broken);

    renderHook(() => useAutoSave());
    await waitFor(() => expect(useSimulatorStore.getState().projectId).toBe("stored-broken"));
    expect(useSimulatorStore.getState().projectName).toBe("두께 0 프로젝트");
    expect(useSimulatorStore.getState().structure.walls[0].thickness).toBe(20);
  });

  it("removes its listeners on unmount", async () => {
    const { unmount } = renderHook(() => useAutoSave());
    await act(async () => undefined);
    unmount();

    act(() => hide());
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    await act(async () => undefined);
    expect(db.saveProject).not.toHaveBeenCalled();
  });
});
