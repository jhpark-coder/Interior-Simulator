import { expect, test, type Page } from "@playwright/test";
import {
  activeStructure,
  canvasStatus,
  openApp,
  step,
  structureTool,
  waitForStoredProject,
} from "./helpers";

// 그리는 동안 화면이 다시 맞춰지지 않으므로 같은 캔버스 좌표는 같은 벽 끝점이 된다.
// 실제 mm 좌표는 확대 배율에 따라 다르지만 닫힌 사각형 방 하나가 된다.
const RECTANGLE = [
  [200, 200],
  [600, 200],
  [600, 500],
  [200, 500],
  [200, 200],
] as const;

async function zoomLabel(page: Page) {
  return (await canvasStatus(page).textContent())?.split("·")[0].trim();
}

async function drawRectangleRoom(page: Page) {
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await expect(canvasStatus(page)).toContainText("벽 0개");
  const zoomBefore = await zoomLabel(page);
  const canvas = page.locator(".structure-canvas");
  for (const [x, y] of RECTANGLE) {
    await canvas.click({ position: { x, y } });
  }
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 4개");
  await expect(canvasStatus(page)).toContainText("방 1개");
  // 첫 벽 뒤 인스펙터가 길어져 캔버스가 커져도 그리던 화면이 다시 맞춰지면 안 된다.
  expect(await zoomLabel(page)).toBe(zoomBefore);
}

function field(page: Page, label: string) {
  return page.locator(".structure-field", { hasText: label }).locator("select, input");
}

test("문 종류·경첩·열리는 쪽·각도를 편집하고 저장 후 다시 연다", async ({ page }) => {
  await openApp(page);
  await drawRectangleRoom(page);

  // 위쪽 벽 가운데에 문을 단다. 새 문은 바로 선택된다.
  await structureTool(page, "문").click();
  await page.locator(".structure-canvas").click({ position: { x: 400, y: 200 } });
  await expect(page.getByRole("heading", { name: "문", exact: true })).toBeVisible();
  await expect(field(page, "문 종류")).toHaveValue("swing");
  await expect(field(page, "경첩 위치")).toHaveValue("left");
  await expect(field(page, "열리는 쪽")).toHaveValue("inward");
  await expect(field(page, "열림 각도")).toHaveValue("90");

  await field(page, "경첩 위치").selectOption({ label: "벽 끝점 쪽" });
  await field(page, "열리는 쪽").selectOption({ label: "방 바깥쪽" });
  await field(page, "열림 각도").fill("60");
  // 스키마 상한(180°)을 넘는 값은 저장 전에 잘라 프로젝트 복원이 깨지지 않게 한다.
  await field(page, "열림 각도").fill("250");
  await expect(field(page, "열림 각도")).toHaveValue("180");
  await field(page, "열림 각도").fill("60");

  let saved = await waitForStoredProject(page, (project) => {
    const door = activeStructure(project).openings[0] as Record<string, unknown> | undefined;
    return door?.hinge === "right" && door.swing === "outward" && door.openAngle === 60;
  });
  expect(activeStructure(saved).openings).toHaveLength(1);

  // 미닫이로 바꾸면 경첩 대신 미는 방향을 고른다.
  await field(page, "문 종류").selectOption({ label: "미닫이문" });
  await expect(field(page, "경첩 위치")).toHaveCount(0);
  await field(page, "미는 방향").selectOption({ label: "벽 시작점 쪽" });
  saved = await waitForStoredProject(page, (project) => {
    const door = activeStructure(project).openings[0] as Record<string, unknown> | undefined;
    return door?.doorType === "sliding" && door.slideDirection === "left";
  });

  // 3D에서도 미닫이문 구조가 오류 없이 그려진다.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await step(page, "구경하기").click();
  await expect(page.locator(".sim-canvas canvas").first()).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  expect(errors).toEqual([]);

  // 다시 열어도 세부값이 유지된다.
  await page.reload();
  await expect(canvasStatus(page)).toContainText("벽 4개");
  await structureTool(page, "선택").click();
  await page.locator(".structure-canvas").click({ position: { x: 400, y: 200 } });
  await expect(field(page, "문 종류")).toHaveValue("sliding");
  await expect(field(page, "미는 방향")).toHaveValue("left");
});

test("가구 배치의 문·창문 안내는 집 구조의 문 도구로 보낸다", async ({ page }) => {
  await openApp(page);
  await step(page, "가구 배치").click();
  // 저장되지도 그려지지도 않던 구형 벽 방향(북·동·남·서) 문 추가는 없어야 한다.
  await expect(page.getByRole("button", { name: "문 선택", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "집 구조에서 문·창문 편집" }).click();
  await expect(step(page, "집 구조")).toHaveAttribute("aria-current", "step");
  await expect(structureTool(page, "문")).toHaveClass(/active/);
});
