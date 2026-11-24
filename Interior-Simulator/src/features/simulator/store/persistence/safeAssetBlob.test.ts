import { describe, expect, it } from "vitest";
import { isSafeAssetMimeType, toSafeAssetBlob } from "./safeAssetBlob";

describe("safeAssetBlob", () => {
  it("keeps raster images and PDF as they are", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "application/pdf"]) {
      const blob = new Blob(["x"], { type });
      expect(toSafeAssetBlob(blob)).toBe(blob);
    }
  });

  it("turns types a browser could execute into download-only blobs", () => {
    for (const type of ["text/html", "image/svg+xml", "application/xhtml+xml", "text/javascript"]) {
      const safe = toSafeAssetBlob(new Blob(["<script>alert(1)</script>"], { type }));
      expect(safe.type).toBe("application/octet-stream");
    }
  });

  it("keeps the bytes when it changes the type", () => {
    const safe = toSafeAssetBlob(new Blob(["hello"], { type: "text/html" }));
    expect(safe.size).toBe(5);
  });

  it("treats an empty type as unsafe and ignores case", () => {
    expect(isSafeAssetMimeType("")).toBe(false);
    expect(isSafeAssetMimeType("IMAGE/PNG")).toBe(true);
  });
});
