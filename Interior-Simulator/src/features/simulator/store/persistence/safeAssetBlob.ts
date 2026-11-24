/**
 * 프로젝트 에셋(평면도·사진·썸네일) Blob의 형식을 안전한 것만 남긴다.
 *
 * 백업 패키지(.interior-project)의 mimeType은 파일을 만든 사람이 마음대로 적을 수 있다.
 * "text/html"이나 "image/svg+xml" 형식의 Blob으로 Object URL을 만들어 새 탭에서 열면,
 * 그 안의 스크립트가 이 앱과 같은 출처(origin)에서 실행되어 IndexedDB·localStorage에
 * 접근할 수 있다. 그래서 화면에 보여 줄 수 있는 래스터 이미지와 PDF만 형식을 유지하고,
 * 나머지는 브라우저가 실행하지 않고 내려받기만 하는 형식으로 바꾼다.
 */
export const SAFE_ASSET_MIME_TYPES: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
  "application/pdf",
]);

const DOWNLOAD_ONLY_MIME_TYPE = "application/octet-stream";

export function isSafeAssetMimeType(mimeType: string | undefined): boolean {
  return SAFE_ASSET_MIME_TYPES.has((mimeType ?? "").trim().toLowerCase());
}

export function toSafeAssetBlob(blob: Blob): Blob {
  // Blob이 아닌 값(일부 테스트용 IndexedDB 구현이 돌려주는 사본)은 건드리지 않는다.
  if (!(blob instanceof Blob)) return blob;
  if (isSafeAssetMimeType(blob.type)) return blob;
  return new Blob([blob], { type: DOWNLOAD_ONLY_MIME_TYPE });
}
