import { clampPdfPageNumber } from "./pdfPage";

export type RenderedPdfPage = {
  blob: Blob;
  pageNumber: number;
  pageCount: number;
  widthPx: number;
  heightPx: number;
};

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("PDF 페이지를 이미지로 변환하지 못했습니다."));
    }, "image/png");
  });
}

export async function renderPdfFloorPlanPage(
  file: File,
  requestedPage = 1
): Promise<RenderedPdfPage> {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const pdfDocument = await loadingTask.promise;
  try {
    const pageNumber = clampPdfPageNumber(
      requestedPage,
      pdfDocument.numPages
    );
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = globalThis.document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("PDF 렌더링용 캔버스를 만들 수 없습니다.");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return {
      blob: await canvasToPngBlob(canvas),
      pageNumber,
      pageCount: pdfDocument.numPages,
      widthPx: canvas.width,
      heightPx: canvas.height,
    };
  } finally {
    await loadingTask.destroy();
  }
}
