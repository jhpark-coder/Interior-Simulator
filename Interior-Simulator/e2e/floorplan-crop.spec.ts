import { expect, test, type Page } from "@playwright/test";
import {
  canvasStatus,
  createFloorPlanPng,
  floorPlanClicker,
  openApp,
  readLastStoredProject,
  waitForStoredProject,
} from "./helpers";

const IMAGE = { widthPx: 1000, heightPx: 700 };
// helpers.ts의 FIT_PADDING과 같다. `전체 보기` 직후 평면도 왼쪽 위가 이 위치에 온다.
const FIT_PADDING = 72;

type Crop = { x: number; y: number; width: number; height: number };
type WithCrop = { sources: Array<{ crop?: Crop }> };

function storedCrop(project: unknown): Crop | undefined {
  return (project as WithCrop).sources[0]?.crop;
}

/**
 * 평면도 레이어(첫 Konva 캔버스)의 한 점이 그려졌는지(alpha > 0). 레이어 배경은 투명이라
 * 잘려 나간 곳은 0이다. 좌표는 `전체 보기` 직후의 평면도 픽셀이다.
 */
async function floorPlanDrawnAt(page: Page, x: number, y: number): Promise<boolean> {
  const box = (await page.locator(".structure-canvas").boundingBox())!;
  const scale = Math.min(
    (box.width - FIT_PADDING * 2) / IMAGE.widthPx,
    (box.height - FIT_PADDING * 2) / IMAGE.heightPx
  );
  return page.evaluate(
    ({ cssX, cssY }) => {
      const canvas = document.querySelector<HTMLCanvasElement>(".structure-canvas canvas")!;
      const ratio = canvas.width / canvas.clientWidth;
      const pixel = canvas
        .getContext("2d")!
        .getImageData(Math.round(cssX * ratio), Math.round(cssY * ratio), 1, 1).data;
      return pixel[3] > 0;
    },
    { cssX: FIT_PADDING + x * scale, cssY: FIT_PADDING + y * scale }
  );
}

function zoomPercent(text: string | null): number {
  return Number(text?.match(/(\d+)%/)?.[1]);
}

test("평면도를 잘라 보이는 영역을 정하고 저장·해제한다", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("자르기 테스트");
  await page.getByRole("button", { name: "빈 구조에서 시작" }).click();
  await page
    .locator('input[type="file"][accept="image/jpeg,image/png,application/pdf"]')
    .setInputFiles({
      name: "crop.png",
      mimeType: "image/png",
      buffer: await createFloorPlanPng(page),
    });
  await expect(page.getByText("자르기: 이미지 전체 사용")).toBeVisible();

  const clickPixel = await floorPlanClicker(page, IMAGE);
  const fullZoom = zoomPercent(await canvasStatus(page).textContent());
  expect(await floorPlanDrawnAt(page, 200, 350)).toBe(true);
  expect(await floorPlanDrawnAt(page, 600, 350)).toBe(true);

  // 왼쪽 벽과 위쪽 치수선을 빼고 오른쪽 부분만 남긴다. 반대 순서로 찍어도 같다.
  await page.getByRole("button", { name: "영역 자르기" }).click();
  await expect(
    page.getByText("자르기: 평면도에서 남길 영역의 한쪽 모서리를 클릭하세요.")
  ).toBeVisible();
  await clickPixel(950, 650);
  await expect(page.getByText("반대쪽 모서리를 클릭하세요. Esc로 취소합니다.")).toBeVisible();
  await clickPixel(300, 80);
  await expect(page.getByText(/^자르기: \d+×\d+px 영역 사용$/)).toBeVisible();
  await expect(page.getByText("벽·방·개구부를 선택해 오른쪽에서 수정합니다.")).toBeVisible();

  const saved = await waitForStoredProject(
    page,
    (project) => project.name === "자르기 테스트" && storedCrop(project) !== undefined
  );
  const crop = storedCrop(saved)!;
  // 클릭 위치를 정수 픽셀로 넓히므로 1~2px 오차가 있다.
  expect(Math.abs(crop.x - 300)).toBeLessThanOrEqual(2);
  expect(Math.abs(crop.y - 80)).toBeLessThanOrEqual(2);
  expect(Math.abs(crop.x + crop.width - 950)).toBeLessThanOrEqual(2);
  expect(Math.abs(crop.y + crop.height - 650)).toBeLessThanOrEqual(2);

  // 잘린 바깥은 그리지 않고, 남긴 부분은 같은 자리에 그대로 있다.
  expect(await floorPlanDrawnAt(page, 200, 350)).toBe(false);
  expect(await floorPlanDrawnAt(page, 600, 350)).toBe(true);

  // 전체 보기는 잘린 영역에 맞춰 더 크게 보여 준다.
  await page.locator(".structure-canvas-status").getByRole("button", { name: "전체 보기" }).click();
  await expect
    .poll(async () => zoomPercent(await canvasStatus(page).textContent()))
    .toBeGreaterThan(fullZoom);

  // 너무 작은 영역은 받지 않는다.
  await page.getByRole("button", { name: "영역 자르기" }).click();
  const canvas = page.locator(".structure-canvas");
  await canvas.click({ position: { x: 400, y: 400 } });
  await canvas.click({ position: { x: 402, y: 402 } });
  await expect(
    page.getByText("영역이 너무 작습니다. 남길 영역의 한쪽 모서리를 다시 클릭하세요.")
  ).toBeVisible();
  await page.getByRole("button", { name: "자르기 취소" }).click();

  await page.reload();
  await expect(page.getByRole("textbox", { name: "프로젝트 이름" })).toHaveValue("자르기 테스트");
  await expect(page.getByText(`자르기: ${crop.width}×${crop.height}px 영역 사용`)).toBeVisible();

  await page.getByRole("button", { name: "자르기 해제" }).click();
  await expect(page.getByText("자르기: 이미지 전체 사용")).toBeVisible();
  await waitForStoredProject(
    page,
    (project) => project.name === "자르기 테스트" && storedCrop(project) === undefined
  );
  expect(storedCrop(await readLastStoredProject(page))).toBeUndefined();
});
