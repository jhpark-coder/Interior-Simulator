import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import {
  canvasStatus,
  createPhotoPng,
  loadSample,
  openApp,
  openMoreMenu,
  projectId,
  readStoredAssetIds,
  waitForStoredProject,
} from "./helpers";

test("기록 핀·사진 추가·삭제와 패키지 왕복", async ({ page }) => {
  await openApp(page);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill("E2E 기록");
  await loadSample(page, /84㎡ 방 3개 아파트/);
  const id = await projectId(page);

  // 공간 기록은 더보기 메뉴에서 연다. 들어가면 핀 도구가 켜져 있다.
  const menu = await openMoreMenu(page);
  await menu.getByRole("button", { name: "공간 기록 열기" }).click();
  await expect(page.getByRole("heading", { name: "공간 기록 (보조 기능)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "핀 배치 종료" })).toBeVisible();
  await expect(canvasStatus(page)).toContainText("기록 0개");

  await page.locator(".structure-canvas").click({ position: { x: 170, y: 170 } });
  await expect(canvasStatus(page)).toContainText("기록 1개");
  const title = page.getByRole("textbox", { name: "제목" });
  await expect(title).toHaveValue("공간 기록 1");
  await title.fill("거실 창가");
  await page.getByRole("textbox", { name: "메모" }).fill("남향 창");

  // 사진 2장 추가: 원본과 썸네일이 IndexedDB에 저장된다.
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles([
    { name: "photo-a.png", mimeType: "image/png", buffer: await createPhotoPng(page, "#d33") },
    { name: "photo-b.png", mimeType: "image/png", buffer: await createPhotoPng(page, "#33d") },
  ]);
  const photos = page.locator(".memory-photo-grid figure");
  await expect(photos).toHaveCount(2);
  await expect(page.locator(".memory-list-item")).toContainText("사진 2장");
  await expect.poll(async () => (await readStoredAssetIds(page, id)).length).toBe(4);

  // 사진 하나 연결 해제: 다른 핀이 쓰지 않으므로 원본과 썸네일이 함께 지워진다.
  await page.getByRole("button", { name: "photo-a.png 연결 해제" }).click();
  await expect(photos).toHaveCount(1);
  await expect(photos.locator("figcaption")).toHaveText("photo-b.png");
  await expect.poll(async () => (await readStoredAssetIds(page, id)).length).toBe(2);

  // 백업 패키지 내보내기
  const downloadPromise = page.waitForEvent("download");
  await (await openMoreMenu(page)).getByRole("button", { name: "백업 파일로 내보내기" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("E2E 기록.interior-project");
  const packagePath = test.info().outputPath("backup.interior-project");
  await download.saveAs(packagePath);

  const zip = await JSZip.loadAsync(await readFile(packagePath));
  const packaged = JSON.parse(await zip.file("project.json")!.async("string"));
  expect(packaged.memoryPins).toHaveLength(1);
  expect(packaged.memoryPins[0]).toMatchObject({ title: "거실 창가", note: "남향 창" });
  expect(packaged.memoryPins[0].assetIds).toHaveLength(1);
  const packagedAssets = packaged.assets as Array<{ id: string; kind: string; fileName: string }>;
  expect(packagedAssets.map((asset) => asset.kind).sort()).toEqual(["photo", "thumbnail"]);
  for (const asset of packagedAssets) {
    const entry = zip.file(`assets/${encodeURIComponent(asset.id)}`);
    expect(entry, `${asset.fileName} 파일이 패키지에 있어야 한다`).toBeTruthy();
    expect((await entry!.async("uint8array")).byteLength).toBeGreaterThan(0);
  }

  // 핀 삭제: 남은 사진과 썸네일까지 정리된다.
  await page.getByRole("button", { name: "기록 삭제" }).click();
  await expect(canvasStatus(page)).toContainText("기록 0개");
  await expect.poll(async () => (await readStoredAssetIds(page, id)).length).toBe(0);

  // 백업 파일 열기로 되돌린다.
  const chooserPromise = page.waitForEvent("filechooser");
  await (await openMoreMenu(page)).getByRole("button", { name: "백업 파일 열기" }).click();
  await (await chooserPromise).setFiles(packagePath);
  await expect(page.locator(".project-save-state")).toHaveText("프로젝트 가져오기 완료");
  await expect(canvasStatus(page)).toContainText("기록 1개");
  const restoredPin = page.locator(".memory-list-item");
  await expect(restoredPin).toContainText("거실 창가");
  await expect(restoredPin).toContainText("사진 1장");
  await restoredPin.click();
  await expect(page.getByRole("textbox", { name: "메모" })).toHaveValue("남향 창");
  const restoredImage = page.locator(".memory-photo-grid img");
  await expect(restoredImage).toHaveCount(1);
  await expect
    .poll(() => restoredImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  expect(await readStoredAssetIds(page, id)).toEqual(
    packagedAssets.map((asset) => asset.id).sort()
  );

  // 가져온 프로젝트도 저장되어 새로 고침 후 다시 열린다.
  await waitForStoredProject(
    page,
    (project) => project.memoryPins.length === 1 && project.memoryPins[0].title === "거실 창가"
  );
  await page.reload();
  await (await openMoreMenu(page)).getByRole("button", { name: "공간 기록 열기" }).click();
  await expect(canvasStatus(page)).toContainText("기록 1개");
  await expect(page.locator(".memory-list-item")).toContainText("사진 1장");
});
