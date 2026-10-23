import { expect, test, type Page } from "@playwright/test";
import {
  answerNextPrompt,
  canvasStatus,
  loadSample,
  openApp,
  openMoreMenu,
  step,
  waitForStoredProject,
} from "./helpers";

function activeScenario(page: Page) {
  return page.getByRole("combobox", { name: "활성 배치안" });
}

async function scenarioNames(page: Page) {
  return activeScenario(page).locator("option").allTextContents();
}

async function saveStructureRevision(page: Page, name: string) {
  const menu = await openMoreMenu(page);
  answerNextPrompt(page, name);
  await menu.getByRole("button", { name: "현재 구조 저장" }).click();
}

async function activeRevisionName(page: Page) {
  const menu = await openMoreMenu(page);
  const name = await menu
    .getByRole("combobox", { name: "활성 구조 리비전" })
    .locator("option:checked")
    .textContent();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  return name;
}

async function addFurniture(page: Page, label: string, moveXBy = 0) {
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
  if (moveXBy !== 0) {
    const x = page.getByLabel("X (mm)");
    const current = Number(await x.inputValue());
    await x.fill(String(current + moveXBy));
    await x.press("Enter");
  }
  await page.getByRole("button", { name: "추가", exact: true }).click();
}

async function expectStructure(page: Page, walls: number, issuesClean: boolean) {
  await step(page, "집 구조").click();
  await expect(canvasStatus(page)).toContainText(`벽 ${walls}개`);
  const ok = page.getByText("발견된 구조 오류가 없습니다.");
  if (issuesClean) await expect(ok).toBeVisible();
  else await expect(page.locator(".structure-issue-list li").first()).toBeVisible();
  await step(page, "가구 배치").click();
}

test("배치안 생성·복제·전환·삭제와 구조 리비전 복원", async ({ page }) => {
  await openApp(page);

  // 배치안 1(현재 배치): 84㎡ 샘플 + 싱글 침대
  await loadSample(page, /84㎡ 방 3개 아파트/);
  await expect(canvasStatus(page)).toContainText("벽 35개");
  await expect(page.getByText("발견된 구조 오류가 없습니다.")).toBeVisible();
  await step(page, "가구 배치").click();
  await addFurniture(page, "싱글 침대");
  await expect(canvasStatus(page)).toContainText("가구 1개");
  await saveStructureRevision(page, "84㎡ 구조");

  // 배치안 2: 벽 하나만 있는 미완성 구조(구조 오류가 있는 상태)
  answerNextPrompt(page, "배치안 2");
  await page.getByRole("button", { name: "새 배치" }).click();
  await expect(activeScenario(page)).toHaveValue(/.+/);
  await expect(activeScenario(page).locator("option:checked")).toHaveText("배치안 2");
  await expect(canvasStatus(page)).toContainText("가구 0개");
  await step(page, "집 구조").click();
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await expect(canvasStatus(page)).toContainText("벽 0개");
  const canvas = page.locator(".structure-canvas");
  await canvas.click({ position: { x: 300, y: 300 } });
  await canvas.click({ position: { x: 600, y: 300 } });
  await page.keyboard.press("Escape");
  await expect(canvasStatus(page)).toContainText("벽 1개");
  await expect(page.locator(".structure-issue-list li").first()).toBeVisible();
  await saveStructureRevision(page, "미완성 구조");
  await step(page, "가구 배치").click();

  // 배치안 1로 전환하면 가구와 구조 리비전이 함께 돌아와야 한다.
  await activeScenario(page).selectOption({ label: "현재 배치" });
  await expect(canvasStatus(page)).toContainText("가구 1개");
  expect(await activeRevisionName(page)).toBe("84㎡ 구조");
  await expectStructure(page, 35, true);

  // 복제: 가구가 복사되고, 이후 편집은 원본과 독립적이어야 한다.
  await page.getByRole("button", { name: "복제" }).click();
  await expect(activeScenario(page).locator("option:checked")).toHaveText("현재 배치 복사본");
  await expect(canvasStatus(page)).toContainText("가구 1개");
  await addFurniture(page, "가습기", -1200);
  await expect(canvasStatus(page)).toContainText("가구 2개");
  await activeScenario(page).selectOption({ label: "현재 배치" });
  await expect(canvasStatus(page)).toContainText("가구 1개");
  await activeScenario(page).selectOption({ label: "현재 배치 복사본" });
  await expect(canvasStatus(page)).toContainText("가구 2개");

  // 배치안 2로 전환하면 미완성 구조로 바뀐다.
  await activeScenario(page).selectOption({ label: "배치안 2" });
  await expect(canvasStatus(page)).toContainText("가구 0개");
  expect(await activeRevisionName(page)).toBe("미완성 구조");
  await expectStructure(page, 1, false);

  // 활성 배치안(배치안 2)을 지우면 남은 첫 배치안의 구조 리비전까지 복원된다.
  await page.getByRole("button", { name: "삭제" }).click();
  expect(await scenarioNames(page)).toEqual(["현재 배치", "현재 배치 복사본"]);
  await expect(activeScenario(page).locator("option:checked")).toHaveText("현재 배치");
  await expect(canvasStatus(page)).toContainText("가구 1개");
  expect(await activeRevisionName(page)).toBe("84㎡ 구조");
  await expectStructure(page, 35, true);

  // 배치안이 하나만 남으면 삭제할 수 없다.
  await activeScenario(page).selectOption({ label: "현재 배치 복사본" });
  await page.getByRole("button", { name: "삭제" }).click();
  expect(await scenarioNames(page)).toEqual(["현재 배치"]);
  await expect(page.getByRole("button", { name: "삭제" })).toBeDisabled();

  // 저장 후 다시 열어도 배치안과 리비전이 유지된다.
  await waitForStoredProject(
    page,
    (project) =>
      project.scenarios.length === 1 &&
      project.structureRevisions.some((revision) => revision.name === "미완성 구조")
  );
  await page.reload();
  await step(page, "가구 배치").click();
  expect(await scenarioNames(page)).toEqual(["현재 배치"]);
  await expect(canvasStatus(page)).toContainText("가구 1개");
  expect(await activeRevisionName(page)).toBe("84㎡ 구조");
});
