import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { importLegacyLayoutFile } from "./legacyLayoutIO";
import { useSimulatorStore } from "../../store/useSimulatorStore";
import { LEGACY_LAYOUT_V120_FIXTURE } from "../../testFixtures/legacyLayout";

// jsdom's File has no text(); browsers do.
function textFile(content: string, name: string): File {
  return Object.assign(new File([content], name), { text: async () => content });
}

describe("legacyLayoutIO", () => {
  it("imports a v1.2 legacy layout as a new project", async () => {
    const file = textFile(JSON.stringify(LEGACY_LAYOUT_V120_FIXTURE), "옛집.json");
    const result = await importLegacyLayoutFile(file);
    expect(result).toEqual({
      ok: true,
      message: "구형 레이아웃을 현재 프로젝트 형식으로 변환했습니다.",
    });
    expect(useSimulatorStore.getState().projectName).toBe("옛집");
  });

  it("rejects invalid JSON without touching the current project", async () => {
    const before = useSimulatorStore.getState().projectId;
    const result = await importLegacyLayoutFile(textFile('{"nope":1}', "bad.json"));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/^유효하지 않은 레이아웃 파일: /);
    expect(useSimulatorStore.getState().projectId).toBe(before);
  });

  it("reports unreadable files as a load failure", async () => {
    const result = await importLegacyLayoutFile(textFile("not json", "broken.json"));
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/^레이아웃 불러오기 실패: /);
  });
});
