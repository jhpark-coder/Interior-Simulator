import { expect, test } from "@playwright/test";
import {
  activeStructure,
  canvasStatus,
  openApp,
  readLastStoredProject,
  waitForStoredProject,
} from "./helpers";

async function drawOneWall(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  const canvas = page.locator(".structure-canvas");
  await canvas.click({ position: { x: 200, y: 300 } });
  await canvas.click({ position: { x: 600, y: 300 } });
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 1개");
}

test("벽 두께 칸을 비워도 저장된 프로젝트가 깨지지 않는다", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("두께 칸 테스트");
  await drawOneWall(page);

  const thickness = page.locator(".structure-field", { hasText: "벽 두께" }).locator("input");
  const original = await thickness.inputValue();
  await thickness.fill("");
  // 비운 칸은 적용되지 않는다. 자동 저장이 돌 때까지 기다린 뒤에도 원래 두께다.
  const saved = await waitForStoredProject(
    page,
    (project) => project.name === "두께 칸 테스트" && activeStructure(project).walls.length === 1
  );
  await page.waitForTimeout(5500);
  const later = (await readLastStoredProject(page))!;
  expect((activeStructure(later).walls[0] as unknown as { thickness: number }).thickness).toBe(
    Number(original)
  );
  expect(saved.id).toBe(later.id);

  await thickness.blur();
  await expect(thickness).toHaveValue(original);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue("두께 칸 테스트");
  await expect(canvasStatus(page)).toContainText("벽 1개");
});

test("이전 버전이 범위 밖 값으로 저장한 프로젝트도 고쳐서 연다", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("예전 저장본");
  await drawOneWall(page);
  const saved = await waitForStoredProject(
    page,
    (project) => project.name === "예전 저장본" && activeStructure(project).walls.length === 1
  );

  // 이전 버전에서 생길 수 있던 저장본(벽 두께 0)을 다른 id로 넣고 마지막 프로젝트로 지정한다.
  // 같은 id에 넣으면 페이지를 닫을 때 현재 상태 저장이 덮어써 복구 경로를 시험하지 못한다.
  await page.evaluate(async (projectId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("interior-simulator");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    type Stored = {
      id: string;
      name: string;
      project: {
        id: string;
        name: string;
        structureRevisions: Array<{ structure: { walls: Array<{ thickness: number }> } }>;
      };
    };
    const read = db.transaction("projects").objectStore("projects").get(projectId);
    const record = await new Promise<Stored>((resolve, reject) => {
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    const broken = structuredClone(record);
    broken.id = broken.project.id = "legacy-broken";
    broken.name = broken.project.name = "예전 저장본(두께 0)";
    for (const revision of broken.project.structureRevisions) {
      for (const wall of revision.structure.walls) wall.thickness = 0;
    }
    const write = db.transaction("projects", "readwrite").objectStore("projects").put(broken);
    await new Promise<void>((resolve, reject) => {
      write.onsuccess = () => resolve();
      write.onerror = () => reject(write.error);
    });
    db.close();
    localStorage.setItem("interior-simulator-last-project", "legacy-broken");
  }, saved.id);

  const context = page.context();
  await page.close();
  const reopened = await context.newPage();
  await openApp(reopened);
  await expect(reopened.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue(
    "예전 저장본(두께 0)"
  );
  await expect(canvasStatus(reopened)).toContainText("벽 1개");
});
