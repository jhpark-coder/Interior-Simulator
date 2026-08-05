import { beforeEach, describe, expect, it } from "vitest";
import { claimLastProjectIfUnset } from "./useAutoSave";

describe("auto-save project selection", () => {
  beforeEach(() => localStorage.clear());

  it("claims the initial project when no selection exists", () => {
    claimLastProjectIfUnset("project-a");
    expect(localStorage.getItem("interior-simulator-last-project")).toBe(
      "project-a"
    );
  });

  it("does not let another auto-saving tab replace the selected project", () => {
    localStorage.setItem("interior-simulator-last-project", "project-a");
    claimLastProjectIfUnset("project-b");
    expect(localStorage.getItem("interior-simulator-last-project")).toBe(
      "project-a"
    );
  });
});
