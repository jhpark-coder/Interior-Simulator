export function clampPdfPageNumber(
  requestedPage: number,
  pageCount: number
): number {
  if (!Number.isFinite(requestedPage)) return 1;
  return Math.max(1, Math.min(pageCount, Math.round(requestedPage)));
}
