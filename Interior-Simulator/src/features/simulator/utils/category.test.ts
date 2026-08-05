import { describe, expect, it } from "vitest";
import { inferCategoryFromType } from "./category";

describe("inferCategoryFromType", () => {
  it("maps furniture types to 'furniture'", () => {
    expect(inferCategoryFromType("bed")).toBe("furniture");
    expect(inferCategoryFromType("desk")).toBe("furniture");
    expect(inferCategoryFromType("chair")).toBe("furniture");
    expect(inferCategoryFromType("closet")).toBe("furniture");
    expect(inferCategoryFromType("display-cabinet")).toBe("furniture");
    expect(inferCategoryFromType("bookshelf")).toBe("furniture");
    expect(inferCategoryFromType("sofa")).toBe("furniture");
    expect(inferCategoryFromType("table")).toBe("furniture");
    expect(inferCategoryFromType("custom")).toBe("furniture");
  });

  it("maps appliance types to 'appliance'", () => {
    expect(inferCategoryFromType("refrigerator")).toBe("appliance");
    expect(inferCategoryFromType("washing-machine")).toBe("appliance");
    expect(inferCategoryFromType("dryer")).toBe("appliance");
    expect(inferCategoryFromType("dishwasher")).toBe("appliance");
    expect(inferCategoryFromType("oven")).toBe("appliance");
    expect(inferCategoryFromType("microwave")).toBe("appliance");
  });

  it("maps electronics types to 'electronics'", () => {
    expect(inferCategoryFromType("tv")).toBe("electronics");
    expect(inferCategoryFromType("air-conditioner")).toBe("electronics");
    expect(inferCategoryFromType("air-purifier")).toBe("electronics");
    expect(inferCategoryFromType("humidifier")).toBe("electronics");
    expect(inferCategoryFromType("monitor-stand")).toBe("electronics");
    expect(inferCategoryFromType("monitor-arm")).toBe("electronics");
  });

  it("maps fixture types to 'fixture'", () => {
    expect(inferCategoryFromType("sink")).toBe("fixture");
    expect(inferCategoryFromType("toilet")).toBe("fixture");
    expect(inferCategoryFromType("bathtub")).toBe("fixture");
    expect(inferCategoryFromType("shower")).toBe("fixture");
  });
});
