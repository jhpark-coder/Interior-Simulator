import { writeFile } from "node:fs/promises";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const outputPath = globalThis.process.argv[2];
if (!outputPath) {
  throw new Error("Usage: node scripts/generate-floorplan-fixture.mjs <output.pdf>");
}

const document = await PDFDocument.create();
const page = document.addPage([900, 650]);
const font = await document.embedFont(StandardFonts.Helvetica);
const dark = rgb(0.07, 0.09, 0.14);
const muted = rgb(0.28, 0.33, 0.41);

const wall = (x1, y1, x2, y2, thickness = 18) =>
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color: dark,
  });

wall(70, 585, 830, 585);
wall(70, 65, 830, 65);
wall(70, 65, 70, 585);
wall(830, 65, 830, 585);
wall(398, 585, 398, 380, 16);
wall(398, 305, 398, 65, 16);
wall(398, 330, 585, 330, 16);
wall(660, 330, 830, 330, 16);

[
  ["BEDROOM", 190, 470],
  ["LIVING", 565, 470],
  ["KITCHEN", 190, 180],
  ["ROOM 2", 570, 180],
  ["7600 mm", 415, 615],
].forEach(([text, x, y]) => {
  page.drawText(String(text), {
    x: Number(x),
    y: Number(y),
    size: 22,
    font,
    color: muted,
  });
});

await writeFile(outputPath, await document.save());
