import { expect, test, type Page } from "@playwright/test";
import { canvasStatus, loadSample, openApp, step, structureTool } from "./helpers";

async function addSingleBed(page: Page) {
  await page.getByRole("button", { name: /^싱글 침대/ }).first().click();
  await page.getByRole("button", { name: "추가", exact: true }).click();
}

function inspector(page: Page) {
  return page.locator(".sim-right");
}

test("가구 복제·잠금·실행 취소와 다른 단계의 단축키 격리", async ({ page }) => {
  await openApp(page);
  await loadSample(page, /84㎡ 방 3개 아파트/);
  await step(page, "가구 배치").click();
  await addSingleBed(page);
  await expect(canvasStatus(page)).toContainText("가구 1개");

  // 복제 버튼과 Ctrl/Cmd+D. 복제본은 원본과 겹치지 않는 자리에 놓이고 선택된다.
  await inspector(page).getByRole("button", { name: "복제", exact: true }).click();
  await expect(canvasStatus(page)).toContainText("가구 2개");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("ControlOrMeta+d");
  await expect(canvasStatus(page)).toContainText("가구 3개");
  await expect(page.getByText("복제한 가구를 놓을 빈 자리")).toHaveCount(0);

  // 가구를 선택한 채 집 구조로 가서 Delete·실행 취소를 눌러도 가구는 그대로다.
  await step(page, "집 구조").click();
  await structureTool(page, "벽").click();
  const canvas = page.locator(".structure-canvas");
  await canvas.click({ position: { x: 640, y: 560 } });
  await canvas.click({ position: { x: 690, y: 560 } });
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 36개");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  // 집 구조의 실행 취소는 방금 그린 벽만 되돌린다. 이전에는 가구 기록도 함께 되돌렸다.
  await page.keyboard.press("ControlOrMeta+z");
  await expect(canvasStatus(page)).toContainText("벽 35개");
  // 선택된 구조 요소가 없으면 Delete는 아무것도 지우지 않는다. 이전에는 숨은 가구를 지웠다.
  await page.keyboard.press("Delete");
  await expect(canvasStatus(page)).toContainText("벽 35개");
  await step(page, "가구 배치").click();
  await expect(canvasStatus(page)).toContainText("가구 3개");

  // 잠그면 편집·배치 모드·삭제가 막힌다.
  await inspector(page).getByRole("button", { name: "잠금", exact: true }).click();
  await expect(inspector(page).getByRole("button", { name: "잠금 해제" })).toBeVisible();
  await expect(inspector(page).getByRole("button", { name: "가구 삭제" })).toHaveCount(0);
  await expect(inspector(page).getByRole("button", { name: "배치 모드로 전환" })).toHaveCount(0);
  await expect(inspector(page).getByLabel("X (mm)")).toHaveCount(0);
  await page.keyboard.press("Delete");
  await expect(canvasStatus(page)).toContainText("가구 3개");
  await expect(page.getByText("잠긴 가구입니다.")).toBeVisible();

  await inspector(page).getByRole("button", { name: "잠금 해제" }).click();
  await page.keyboard.press("Delete");
  await expect(canvasStatus(page)).toContainText("가구 2개");

  // 실행 취소와 다시 실행(Shift 조합)
  await page.keyboard.press("ControlOrMeta+z");
  await expect(canvasStatus(page)).toContainText("가구 3개");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(canvasStatus(page)).toContainText("가구 2개");
});

test("구조를 바꾼 뒤 벽 밖이 된 가구를 배치 검토에 모은다", async ({ page }) => {
  await openApp(page);
  await loadSample(page, /84㎡ 방 3개 아파트/);
  await step(page, "가구 배치").click();
  await addSingleBed(page);
  await expect(page.getByRole("region", { name: "배치 검토" })).toHaveCount(0);

  // 구조를 비우면 침대는 집 구조 바깥이 된다.
  await step(page, "집 구조").click();
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await step(page, "가구 배치").click();
  const review = page.getByRole("region", { name: "배치 검토" });
  await expect(review).toBeVisible();
  await expect(review).toContainText("확인할 가구 1개");
  await expect(review).toContainText("집 구조 바깥");

  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await review.getByRole("button", { name: /싱글 침대/ }).click();
  await expect(inspector(page).getByRole("heading", { name: "싱글 침대" })).toBeVisible();

  // 원래 구조로 되돌리면 검토 목록이 사라진다.
  await step(page, "집 구조").click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(canvasStatus(page)).toContainText("벽 35개");
  await step(page, "가구 배치").click();
  await expect(review).toHaveCount(0);
});
