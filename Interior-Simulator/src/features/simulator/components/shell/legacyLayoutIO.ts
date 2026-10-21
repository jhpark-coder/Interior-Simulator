import { useSimulatorStore } from "../../store/useSimulatorStore";
import { validateLayoutDoc } from "../../utils/zodSchemas";
import type { LayoutDoc } from "../../types";
import { inferCategoryFromType } from "../../utils";
import { migrateLegacyLayoutToProject } from "../../store/migrations/layoutV1ToProjectV2";
import { saveActiveProjectBeforeTransition } from "../../store/persistence/projectTransition";
import { saveProject } from "../../store/persistence/projectDb";

export function exportLegacyLayoutFile(): void {
  const layout = useSimulatorStore.getState().exportLayout();
  const blob = new Blob([JSON.stringify(layout, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `layout-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importLegacyLayoutFile(
  file: File
): Promise<{ ok: boolean; message: string }> {
  try {
    const data = JSON.parse(await file.text());
    const validation = validateLayoutDoc(data);
    if (!validation.success || !validation.data) {
      return {
        ok: false,
        message: `유효하지 않은 레이아웃 파일: ${validation.errors?.[0] ?? "알 수 없는 오류"}`,
      };
    }

    const normalizedLayout = {
      ...validation.data,
      furniture: validation.data.furniture.map((item) => ({
        ...item,
        category: item.category ?? inferCategoryFromType(item.type),
      })),
    } as LayoutDoc;
    const projectName = file.name.replace(/\.json$/i, "").trim() || "가져온 레이아웃";
    const project = migrateLegacyLayoutToProject(
      normalizedLayout,
      projectName,
      `project-migrated-${crypto.randomUUID()}`
    );
    await saveActiveProjectBeforeTransition();
    useSimulatorStore.getState().importProject(project);
    await saveProject(project);
    localStorage.setItem("interior-simulator-last-project", project.id);
    return { ok: true, message: "구형 레이아웃을 현재 프로젝트 형식으로 변환했습니다." };
  } catch (error) {
    return {
      ok: false,
      message: `레이아웃 불러오기 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
    };
  }
}
