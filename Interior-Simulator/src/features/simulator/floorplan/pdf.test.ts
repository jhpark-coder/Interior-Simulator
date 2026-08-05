import { describe, expect, it } from "vitest";
import { clampPdfPageNumber } from "./pdfPage";

describe("PDF floor plan page selection", () => {
  it("clamps page numbers to the document range", () => {
    expect(clampPdfPageNumber(0, 5)).toBe(1);
    expect(clampPdfPageNumber(3, 5)).toBe(3);
    expect(clampPdfPageNumber(99, 5)).toBe(5);
  });

  it("rounds fractional pages and handles non-finite values", () => {
    expect(clampPdfPageNumber(2.6, 5)).toBe(3);
    expect(clampPdfPageNumber(Number.NaN, 5)).toBe(1);
  });
});
