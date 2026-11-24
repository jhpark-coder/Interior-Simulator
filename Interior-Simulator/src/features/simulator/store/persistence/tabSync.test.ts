import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSimulatorStore } from "../useSimulatorStore";

const db = vi.hoisted(() => ({ saveProject: vi.fn() }));
vi.mock("./projectDb", () => db);

const {
  isProjectStale,
  markProjectLoaded,
  projectFingerprint,
  resetTabSyncForTests,
  saveProjectFromThisTab,
} = await import("./tabSync");

// 다른 탭을 흉내 낸다: 같은 이름의 채널로 "저장했다"는 알림을 보낸다.
function announceSaveFromOtherTab(projectId: string) {
  const other = new BroadcastChannel("interior-simulator-projects");
  other.postMessage({ type: "saved", projectId, tabId: "other-tab" });
  other.close();
}

async function waitForMessage() {
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe("tabSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.saveProject.mockResolvedValue(undefined);
    resetTabSyncForTests();
  });

  afterEach(() => resetTabSyncForTests());

  it("ignores updatedAt when comparing project contents", () => {
    const project = useSimulatorStore.getState().snapshotProject();
    const later = { ...project, meta: { ...project.meta, updatedAt: "2099-01-01T00:00:00.000Z" } };
    expect(projectFingerprint(later)).toBe(projectFingerprint(project));
  });

  it("skips auto-save when nothing changed since the last save", async () => {
    const project = useSimulatorStore.getState().snapshotProject();
    expect(await saveProjectFromThisTab(project, { onlyIfChanged: true })).toBe("saved");
    expect(await saveProjectFromThisTab(project, { onlyIfChanged: true })).toBe("unchanged");
    expect(db.saveProject).toHaveBeenCalledTimes(1);

    const renamed = { ...project, name: `${project.name} 수정` };
    expect(await saveProjectFromThisTab(renamed, { onlyIfChanged: true })).toBe("saved");
    expect(db.saveProject).toHaveBeenCalledTimes(2);
  });

  it("stops saving a project that another tab saved more recently", async () => {
    const project = useSimulatorStore.getState().snapshotProject();
    announceSaveFromOtherTab(project.id);
    await waitForMessage();

    expect(isProjectStale(project.id)).toBe(true);
    expect(await saveProjectFromThisTab({ ...project, name: "오래된 탭의 변경" })).toBe("stale");
    expect(db.saveProject).not.toHaveBeenCalled();
  });

  it("saves again after this tab reloads the project, or when forced", async () => {
    const project = useSimulatorStore.getState().snapshotProject();
    announceSaveFromOtherTab(project.id);
    await waitForMessage();

    expect(await saveProjectFromThisTab(project, { force: true })).toBe("saved");
    announceSaveFromOtherTab(project.id);
    await waitForMessage();
    markProjectLoaded(project);
    expect(isProjectStale(project.id)).toBe(false);
    expect(await saveProjectFromThisTab({ ...project, name: "새로 불러온 뒤 변경" })).toBe("saved");
  });
});
