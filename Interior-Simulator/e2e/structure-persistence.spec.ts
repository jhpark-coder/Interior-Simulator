import { expect, test } from "@playwright/test";
import {
  activeStructure,
  answerNextPrompt,
  canvasStatus,
  createFloorPlanPng,
  floorPlanClicker,
  openApp,
  readStoredAssetIds,
  structureTool,
  waitForStoredProject,
} from "./helpers";

const IMAGE = { widthPx: 1000, heightPx: 700 };

test("평면도 가져오기 → 축척 → 구조 편집 → 저장 → 재열기", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("E2E 평면도");
  // 기본 방(벽 4개) 없이 평면도만 따라 그리도록 구조를 비운다.
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await expect(canvasStatus(page)).toContainText("벽 0개");

  // ① 평면도 불러오기
  await page
    .locator('input[type="file"][accept="image/jpeg,image/png,application/pdf"]')
    .setInputFiles({
      name: "e2e-floorplan.png",
      mimeType: "image/png",
      buffer: await createFloorPlanPng(page),
    });
  await expect(page.locator(".structure-select option:checked")).toHaveText("e2e-floorplan.png");
  await expect(page.getByText("축척 미설정")).toBeVisible();

  // ② 축척: 치수선 양 끝(800px)을 4000mm로 지정하면 5mm/px
  await structureTool(page, "축척").click();
  let clickPixel = await floorPlanClicker(page, IMAGE);
  await clickPixel(100, 60);
  answerNextPrompt(page, "4000");
  await clickPixel(900, 60);
  const scaleText = page.locator(".floorplan-scale-state");
  await expect(scaleText).toHaveText(/축척: [\d.]+ mm\/px/);
  const mmPerPixel = Number((await scaleText.textContent())?.match(/([\d.]+) mm/)?.[1]);
  expect(mmPerPixel).toBeGreaterThan(4.95);
  expect(mmPerPixel).toBeLessThan(5.05);

  // ③ 외곽선(100,100)-(900,600)px을 따라 벽 4개를 닫힌 사각형으로 그린다.
  // 5mm/px와 100mm 격자 스냅으로 실제 좌표는 (500,500)-(4500,3000)mm가 된다.
  await structureTool(page, "벽").click();
  clickPixel = await floorPlanClicker(page, IMAGE);
  for (const [x, y] of [
    [100, 100],
    [900, 100],
    [900, 600],
    [100, 600],
    [100, 100],
  ]) {
    await clickPixel(x, y);
  }
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 4개");
  await expect(canvasStatus(page)).toContainText("방 1개");

  // 위쪽 벽 가운데(500,100)px에 문을 단다.
  await structureTool(page, "문").click();
  await clickPixel(500, 100);

  // 자동 저장(5초 간격)이 IndexedDB에 반영될 때까지 기다린다.
  const saved = await waitForStoredProject(page, (project) => {
    const structure = activeStructure(project);
    return (
      project.name === "E2E 평면도" &&
      structure.walls.length === 4 &&
      structure.openings.length === 1 &&
      project.sources[0]?.transform.scaleMmPerPixel !== null
    );
  });
  const structure = activeStructure(saved);
  const corners = structure.walls
    .flatMap((wall) => [wall.start, wall.end])
    .map((point) => `${point.x},${point.y}`);
  expect(new Set(corners)).toEqual(new Set(["500,500", "4500,500", "4500,3000", "500,3000"]));
  expect(structure.rooms).toHaveLength(1);

  const door = structure.openings[0];
  expect(door.kind).toBe("door");
  const doorWall = structure.walls.find((wall) => wall.id === door.wallId);
  expect(doorWall?.start.y).toBe(500);
  expect(doorWall?.end.y).toBe(500);
  const doorCenterX =
    Math.min(doorWall!.start.x, doorWall!.end.x) + door.offset + door.width / 2;
  expect(Math.abs(doorCenterX - 2500)).toBeLessThan(50);

  const floorPlanAssetId = saved.sources[0].assetId;
  expect(await readStoredAssetIds(page, saved.id)).toEqual([floorPlanAssetId]);

  // 재열기: 새로 고침 후 마지막 프로젝트가 복원되어야 한다.
  await page.reload();
  await expect(page.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue("E2E 평면도");
  await expect(canvasStatus(page)).toContainText("벽 4개");
  await expect(canvasStatus(page)).toContainText("방 1개");
  await expect(page.locator(".structure-select option:checked")).toHaveText("e2e-floorplan.png");
  await expect(scaleText).toHaveText(`축척: ${mmPerPixel.toFixed(3)} mm/px`);

  // 평면도 원본도 IndexedDB에서 다시 읽혀 캔버스에 그릴 수 있어야 한다.
  const restoredImageSize = await page.evaluate(async (assetId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("interior-simulator");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rows = await new Promise<Array<{ assetId: string; blob: Blob }>>((resolve, reject) => {
      const request = db.transaction("assets").objectStore("assets").getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const row = rows.find((item) => item.assetId === assetId);
    if (!row) return null;
    const bitmap = await createImageBitmap(row.blob);
    return { width: bitmap.width, height: bitmap.height };
  }, floorPlanAssetId);
  expect(restoredImageSize).toEqual({ width: IMAGE.widthPx, height: IMAGE.heightPx });
  await expect(page.locator(".structure-canvas canvas").first()).toBeVisible();
});
