import { expect, type Locator, type Page } from "@playwright/test";

const LAST_PROJECT_KEY = "interior-simulator-last-project";
const DATABASE_NAME = "interior-simulator";

// StructureCanvas.fitStructure의 여백과 같은 값. 구조가 비어 있을 때 평면도의
// 왼쪽 위 모서리가 캔버스 (72, 72)에 놓인다.
const FIT_PADDING = 72;

type Point = { x: number; y: number };

type StoredStructure = {
  walls: Array<{ id: string; start: Point; end: Point }>;
  rooms: unknown[];
  openings: Array<{ kind: string; wallId: string; offset: number; width: number }>;
};

/** IndexedDB에 저장된 InteriorProject v2 중 테스트가 확인하는 필드. */
export type StoredProject = {
  id: string;
  name: string;
  structureRevisions: Array<{ id: string; name: string; structure: StoredStructure }>;
  activeStructureRevisionId: string;
  sources: Array<{
    fileName: string;
    assetId: string;
    transform: { scaleMmPerPixel: number | null };
  }>;
  scenarios: Array<{ id: string; name: string; structureRevisionId: string }>;
  memoryPins: Array<{ title: string; note: string; assetIds: string[] }>;
  assets: Array<{ id: string; kind: string; fileName: string }>;
};

export function activeStructure(project: StoredProject): StoredStructure {
  const revision = project.structureRevisions.find(
    (item) => item.id === project.activeStructureRevisionId
  );
  if (!revision) throw new Error("활성 구조 리비전이 없습니다.");
  return revision.structure;
}

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "작업 단계" })).toBeVisible();
}

export function step(page: Page, label: "집 구조" | "가구 배치" | "구경하기") {
  return page.getByRole("navigation", { name: "작업 단계" }).getByRole("button", { name: label });
}

export function canvasStatus(page: Page): Locator {
  return page.locator(".structure-canvas-status span");
}

/** 집 구조 단계의 편집 도구 버튼. 접근성 이름에 아이콘이 섞여 있어 title로 찾는다. */
export function structureTool(
  page: Page,
  label: "선택" | "이동" | "벽" | "문" | "창문" | "통로" | "축척"
): Locator {
  return page.locator(`.structure-tool[title="${label}"]`);
}

export async function loadSample(page: Page, name: RegExp) {
  await page.locator("summary", { hasText: "샘플 구조" }).click();
  await page.getByRole("button", { name }).click();
}

export async function openMoreMenu(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "더보기", exact: true }).click();
  const panel = page.getByRole("region", { name: "더보기" });
  await expect(panel).toBeVisible();
  return panel;
}

/** 다음 window.prompt 하나에 지정한 값을 입력한다. */
export function answerNextPrompt(page: Page, value: string) {
  page.once("dialog", (dialog) => {
    expect(dialog.type()).toBe("prompt");
    void dialog.accept(value);
  });
}

export async function projectId(page: Page): Promise<string> {
  const title = await page.locator(".project-save-state").getAttribute("title");
  const id = title?.replace("프로젝트 ID: ", "");
  if (!id) throw new Error("프로젝트 ID를 읽을 수 없습니다.");
  return id;
}

/**
 * 테스트용 평면도 PNG를 브라우저 canvas로 그린다. 외곽 벽은 (100,100)-(900,600)px,
 * 위쪽 치수선은 y=60px에서 x=100~900px이다.
 */
export async function createFloorPlanPng(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 700;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D context unavailable");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#111111";
    context.lineWidth = 12;
    context.strokeRect(100, 100, 800, 500);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(100, 60);
    context.lineTo(900, 60);
    context.moveTo(100, 50);
    context.lineTo(100, 70);
    context.moveTo(900, 50);
    context.lineTo(900, 70);
    context.stroke();
    context.fillStyle = "#111111";
    context.font = "20px sans-serif";
    context.fillText("4000", 480, 45);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(base64, "base64");
}

/** 사진 대용으로 쓸 단색 PNG를 만든다. */
export async function createPhotoPng(page: Page, color: string): Promise<Buffer> {
  const base64 = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D context unavailable");
    context.fillStyle = fill;
    context.fillRect(0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png").split(",")[1];
  }, color);
  return Buffer.from(base64, "base64");
}

/**
 * 평면도만 있고 구조가 빈 상태에서 `전체 보기`를 누른 뒤, 평면도 픽셀 좌표를
 * 클릭하는 함수를 돌려준다. 축척(mm/px)과 무관하게 같은 위치가 된다.
 * 버튼 클릭으로 페이지가 스크롤될 수 있어 캔버스 위치는 클릭할 때마다 다시 읽는다.
 */
export async function floorPlanClicker(
  page: Page,
  image: { widthPx: number; heightPx: number }
) {
  await page.locator(".structure-canvas-status").getByRole("button", { name: "전체 보기" }).click();
  const canvas = page.locator(".structure-canvas");
  const initial = await canvas.boundingBox();
  if (!initial) throw new Error("구조 캔버스를 찾을 수 없습니다.");
  const pixelScale = Math.min(
    (initial.width - FIT_PADDING * 2) / image.widthPx,
    (initial.height - FIT_PADDING * 2) / image.heightPx
  );
  return async (x: number, y: number) => {
    await canvas.scrollIntoViewIfNeeded();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("구조 캔버스를 찾을 수 없습니다.");
    await page.mouse.click(
      box.x + FIT_PADDING + x * pixelScale,
      box.y + FIT_PADDING + y * pixelScale
    );
  };
}

/** 마지막으로 연 프로젝트를 IndexedDB에서 읽는다. 아직 저장 전이면 null. */
export async function readLastStoredProject(page: Page): Promise<StoredProject | null> {
  return page.evaluate(
    async ({ lastProjectKey, databaseName }) => {
      const id = localStorage.getItem(lastProjectKey);
      if (!id) return null;
      // 존재하지 않는 DB를 열면 버전 1의 빈 DB가 생겨 앱의 upgrade가 실행되지 않는다.
      const databases = await indexedDB.databases();
      if (!databases.some((database) => database.name === databaseName)) return null;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        if (!db.objectStoreNames.contains("projects")) return null;
        const stored = await new Promise<{ project: unknown } | undefined>((resolve, reject) => {
          const request = db.transaction("projects").objectStore("projects").get(id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return (stored?.project ?? null) as never;
      } finally {
        db.close();
      }
    },
    { lastProjectKey: LAST_PROJECT_KEY, databaseName: DATABASE_NAME }
  );
}

/** 프로젝트의 IndexedDB 자산(평면도·사진·썸네일) ID 목록을 읽는다. */
export async function readStoredAssetIds(page: Page, id: string): Promise<string[]> {
  return page.evaluate(
    async ({ databaseName, projectId }) => {
      const databases = await indexedDB.databases();
      if (!databases.some((database) => database.name === databaseName)) return [];
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      try {
        if (!db.objectStoreNames.contains("assets")) return [];
        const rows = await new Promise<Array<{ assetId: string }>>((resolve, reject) => {
          const request = db
            .transaction("assets")
            .objectStore("assets")
            .index("by-project")
            .getAll(projectId);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return rows.map((row) => row.assetId).sort();
      } finally {
        db.close();
      }
    },
    { databaseName: DATABASE_NAME, projectId: id }
  );
}

/** 5초 간격 자동 저장이 조건을 만족하는 상태를 IndexedDB에 쓸 때까지 기다린다. */
export async function waitForStoredProject(
  page: Page,
  predicate: (project: StoredProject) => boolean
): Promise<StoredProject> {
  let matched: StoredProject | null = null;
  await expect
    .poll(
      async () => {
        const project = await readLastStoredProject(page);
        matched = project && predicate(project) ? project : null;
        return matched !== null;
      },
      { timeout: 15_000, intervals: [500] }
    )
    .toBe(true);
  return matched as unknown as StoredProject;
}
