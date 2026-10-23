import { expect, test, type Page } from "@playwright/test";
import {
  activeStructure,
  canvasStatus,
  openApp,
  step,
  structureTool,
  waitForStoredProject,
} from "./helpers";

async function setPendingField(page: Page, label: string, value: number) {
  const field = page.locator(".sim-right").getByLabel(label);
  await field.fill(String(Math.round(value)));
  await field.press("Enter");
}

test("문 열림 범위를 막는 가구를 배치 검토에 알리고, 옮기면 사라진다", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  const canvas = page.locator(".structure-canvas");
  for (const [x, y] of [
    [200, 200],
    [600, 200],
    [600, 500],
    [200, 500],
    [200, 200],
  ]) {
    await canvas.click({ position: { x, y } });
  }
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("방 1개");
  await structureTool(page, "문").click();
  await canvas.click({ position: { x: 400, y: 200 } });

  // 저장된 구조에서 위쪽 벽의 문 위치(mm)를 읽어 문이 열리는 자리에 가구를 둔다.
  const saved = await waitForStoredProject(
    page,
    (project) => activeStructure(project).openings.length === 1
  );
  const structure = activeStructure(saved);
  const door = structure.openings[0];
  const wall = structure.walls.find((item) => item.id === door.wallId)!;
  expect(wall.start.y).toBe(wall.end.y);
  // offset은 벽 시작점에서 벽 방향으로 잰 거리다.
  const direction = Math.sign(wall.end.x - wall.start.x);
  const doorCenterX = wall.start.x + direction * (door.offset + door.width / 2);
  const wallY = wall.start.y;

  await step(page, "가구 배치").click();
  await page.getByRole("button", { name: /^가습기/ }).first().click();
  // 가습기(300×300)를 문 가운데 앞 400mm에 둔다. 안쪽(방 쪽)으로 열리는 문짝이 닿는다.
  await setPendingField(page, "X (mm)", doorCenterX - 150);
  await setPendingField(page, "Y (mm)", wallY + 250);
  await page.getByRole("button", { name: "추가", exact: true }).click();
  await expect(canvasStatus(page)).toContainText("가구 1개");

  const review = page.getByRole("region", { name: "배치 검토" });
  await expect(review).toContainText("확인할 가구 1개");
  await expect(review).toContainText(/문이 \d+°까지만 열림/);
  const angle = Number((await review.textContent())?.match(/문이 (\d+)°까지만 열림/)?.[1]);
  expect(angle).toBeGreaterThan(10);
  expect(angle).toBeLessThan(90);

  // 3D에서도 오류 없이 그려진다.
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await step(page, "구경하기").click();
  await expect(page.locator(".sim-canvas canvas").first()).toBeVisible();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  expect(errors).toEqual([]);

  // 문에서 먼 곳으로 옮기면 검토 목록이 사라진다.
  await step(page, "가구 배치").click();
  await setPendingField(page, "Y (mm)", wallY + 1500);
  await expect(review).toHaveCount(0);
});
