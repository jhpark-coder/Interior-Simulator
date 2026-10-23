import { expect, test } from "@playwright/test";
import {
  activeStructure,
  canvasStatus,
  createFloorPlanPng,
  loadSample,
  openApp,
  readLastStoredProject,
  step,
  structureTool,
  waitForStoredProject,
} from "./helpers";

type StoredWall = {
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness: number;
  height: number;
};

function storedWalls(project: Parameters<typeof activeStructure>[0]): StoredWall[] {
  return activeStructure(project).walls as unknown as StoredWall[];
}

function length(wall: StoredWall): number {
  return Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
}

test("통로 도구, 벽 길이 직접 입력, 벽 일괄 변경", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("작은 기능");
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  const canvas = page.locator(".structure-canvas");
  await canvas.click({ position: { x: 200, y: 300 } });
  await canvas.click({ position: { x: 600, y: 300 } });
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 1개");

  // 통로: 벽을 클릭하면 너비 1000mm 통로가 생긴다.
  await structureTool(page, "통로").click();
  await expect(page.getByText("문·창문·통로를 달 벽을 클릭하세요.")).toBeVisible();
  await canvas.click({ position: { x: 400, y: 300 } });
  let saved = await waitForStoredProject(
    page,
    (project) => project.name === "작은 기능" && activeStructure(project).openings.length === 1
  );
  expect(activeStructure(saved).openings[0]).toMatchObject({ kind: "passage", width: 1000 });

  // 벽 길이: 선택 도구로 벽을 고르고 길이를 입력한다. Enter를 눌러야 반영된다.
  await structureTool(page, "선택").click();
  await canvas.click({ position: { x: 230, y: 300 } });
  const lengthInput = page.locator(".structure-field", { hasText: "길이 (mm)" }).locator("input");
  const before = Number(await lengthInput.inputValue());
  const target = Math.round(before + 500);
  await lengthInput.fill(String(target));
  await lengthInput.press("Enter");
  await expect(lengthInput).toHaveValue(String(target));
  saved = await waitForStoredProject(
    page,
    (project) => Math.abs(length(storedWalls(project)[0]) - target) < 0.5
  );

  // 일괄 변경: 모든 벽의 두께·높이를 한 번에 바꾼다.
  const bulk = page.locator("details", { hasText: "벽 일괄 변경" });
  await bulk.locator("summary").click();
  await bulk.locator(".structure-field", { hasText: "두께 (mm)" }).locator("input").fill("150");
  await bulk.locator(".structure-field", { hasText: "높이 (mm)" }).locator("input").fill("2300");
  await bulk.getByRole("button", { name: "적용" }).click();
  await expect(bulk).toContainText("모든 벽 1개에 적용했습니다.");
  saved = await waitForStoredProject(page, (project) =>
    storedWalls(project).every((wall) => wall.thickness === 150 && wall.height === 2300)
  );
  expect(Math.abs(length(storedWalls(saved)[0]) - target)).toBeLessThan(0.5);

  // 범위 밖 값은 적용하지 않는다.
  await bulk.locator(".structure-field", { hasText: "두께 (mm)" }).locator("input").fill("5");
  await bulk.getByRole("button", { name: "적용" }).click();
  await expect(bulk).toContainText("두께는");
  await page.waitForTimeout(5500);
  expect(storedWalls((await readLastStoredProject(page))!)[0].thickness).toBe(150);
});

test("평면도 밝기·대비·흑백 보정을 저장하고 다시 연다", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("평면도 보정");
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await page
    .locator('input[type="file"][accept="image/jpeg,image/png,application/pdf"]')
    .setInputFiles({
      name: "adjust.png",
      mimeType: "image/png",
      buffer: await createFloorPlanPng(page),
    });
  await expect(page.locator(".structure-select option:checked")).toHaveText("adjust.png");

  const brightness = page.locator("label", { hasText: /^밝기/ }).locator('input[type="range"]');
  const contrast = page.locator("label", { hasText: /^대비/ }).locator('input[type="range"]');
  await brightness.fill("0.3");
  await contrast.fill("-0.25");
  await page.getByLabel("흑백").check();
  await expect(page.locator("label", { hasText: /^밝기/ })).toContainText("밝기 30");
  await expect(page.getByText("자동 인식은 보정 전 이미지를 씁니다.")).toBeVisible();

  type Adjusted = {
    sources: Array<{ adjustments: { brightness: number; contrast: number; grayscale: boolean } }>;
  };
  await waitForStoredProject(page, (project) => {
    const adjustments = (project as unknown as Adjusted).sources[0]?.adjustments;
    return (
      project.name === "평면도 보정" &&
      adjustments?.brightness === 0.3 &&
      adjustments.contrast === -0.25 &&
      adjustments.grayscale === true
    );
  });

  await page.reload();
  await expect(page.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue("평면도 보정");
  await expect(brightness).toHaveValue("0.3");
  await expect(contrast).toHaveValue("-0.25");
  await expect(page.getByLabel("흑백")).toBeChecked();

  await page.getByRole("button", { name: "보정 초기화" }).click();
  await expect(brightness).toHaveValue("0");
  await expect(page.getByLabel("흑백")).not.toBeChecked();
});

test("가구 배치에서 통행 폭을 켜고 끈다", async ({ page }) => {
  await openApp(page);
  await loadSample(page, /84㎡ 방 3개 아파트/);
  await step(page, "가구 배치").click();
  await page
    .getByRole("button", { name: /^싱글 침대/ })
    .first()
    .click();
  await page.getByRole("button", { name: "추가", exact: true }).click();
  const inspector = page.locator(".sim-right");
  await inspector.getByRole("button", { name: "복제", exact: true }).click();
  await expect(canvasStatus(page)).toContainText("가구 2개");
  await expect(canvasStatus(page)).not.toContainText("좁은 통로");

  const toggle = page.getByLabel("통행 폭");
  await toggle.check();
  const countOf = async () =>
    Number((await canvasStatus(page).textContent())?.match(/좁은 통로 (\d+)곳/)?.[1] ?? NaN);
  await expect.poll(countOf).toBeGreaterThan(0);
  const near = await countOf();

  // 복제본(원본 옆 200mm)을 지우면 두 침대 사이와 복제본·벽 사이 통로가 사라진다.
  await inspector.getByRole("button", { name: "가구 삭제" }).click();
  await expect(canvasStatus(page)).toContainText("가구 1개");
  await expect.poll(countOf).toBeLessThan(near);

  await toggle.uncheck();
  await expect(canvasStatus(page)).not.toContainText("좁은 통로");
});
