import { expect, test } from "@playwright/test";
import { canvasStatus, loadSample, openApp, waitForStoredProject } from "./helpers";

test("자동 저장 간격(5초) 안에 창을 닫아도 마지막 편집이 남는다", async ({ page, context }) => {
  await openApp(page);
  // 첫 자동 저장으로 이 프로젝트가 '마지막 프로젝트'가 될 때까지 기다린다.
  await waitForStoredProject(page, () => true);

  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("닫기 직전 편집");
  await loadSample(page, /84㎡ 방 3개 아파트/);
  await expect(canvasStatus(page)).toContainText("벽 35개");
  await page.close();

  const reopened = await context.newPage();
  await openApp(reopened);
  await expect(reopened.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue(
    "닫기 직전 편집"
  );
  await expect(canvasStatus(reopened)).toContainText("벽 35개");
});
