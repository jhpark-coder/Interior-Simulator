import { useEffect, useRef } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";
import {
  loadProject,
  loadProjectAsset,
  saveProject,
} from "../store/persistence/projectDb";
import { validateInteriorProject } from "../domain/project";
import { migrateLegacyLayoutToProject } from "../store/migrations/layoutV1ToProjectV2";
import { validateLayoutDoc } from "../utils/zodSchemas";
import { inferCategoryFromType } from "../utils";
import type { LayoutDoc } from "../types";

const AUTO_SAVE_KEY = "interior-simulator-autosave";
const LAST_PROJECT_KEY = "interior-simulator-last-project";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

export function claimLastProjectIfUnset(projectId: string): void {
  if (!localStorage.getItem(LAST_PROJECT_KEY)) {
    localStorage.setItem(LAST_PROJECT_KEY, projectId);
  }
}

export function useAutoSave() {
  const snapshotProject = useSimulatorStore((state) => state.snapshotProject);
  const importProject = useSimulatorStore((state) => state.importProject);
  const setObjectUrl = useSimulatorStore(
    (state) => state.setFloorPlanObjectUrl
  );

  const snapshotRef = useRef(snapshotProject);
  snapshotRef.current = snapshotProject;

  const importRef = useRef(importProject);
  importRef.current = importProject;

  const setObjectUrlRef = useRef(setObjectUrl);
  setObjectUrlRef.current = setObjectUrl;

  // 복원 전에 저장하면 마지막 프로젝트 대신 빈 기본 프로젝트가 저장된다.
  const restoredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      try {
        const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
        if (lastProjectId) {
          const stored = await loadProject(lastProjectId);
          const validation = validateInteriorProject(stored);
          if (validation.success && !cancelled) {
            const project = validation.data;
            importRef.current(project);
            await Promise.all(
              project.assets.map(async (asset) => {
                const blob = await loadProjectAsset(project.id, asset.id);
                if (blob && !cancelled) {
                  setObjectUrlRef.current(asset.id, URL.createObjectURL(blob));
                }
              })
            );
            return;
          }
        }

        const legacySaved = localStorage.getItem(AUTO_SAVE_KEY);
        if (legacySaved && !cancelled) {
          const legacyData = JSON.parse(legacySaved);
          const validation = validateLayoutDoc(legacyData);
          if (validation.success && validation.data) {
            const normalizedLayout = {
              ...validation.data,
              furniture: validation.data.furniture.map((item) => ({
                ...item,
                category: item.category ?? inferCategoryFromType(item.type),
              })),
            } as LayoutDoc;
            importRef.current(
              migrateLegacyLayoutToProject(
                normalizedLayout,
                "기존 자동 저장 복구본"
              )
            );
          }
        }
      } catch (error) {
        console.error("Failed to load auto-save:", error);
      } finally {
        // StrictMode에서 취소된 첫 실행이 두 번째 복원보다 먼저 끝날 수 있다.
        if (!cancelled) restoredRef.current = true;
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const saveSnapshot = async () => {
      const project = snapshotRef.current();
      await saveProject(project);
      claimLastProjectIfUnset(project.id);
    };

    let saving = false;
    const interval = setInterval(() => {
      if (saving || !restoredRef.current) return;
      saving = true;
      saveSnapshot()
        .catch((error) => {
          console.error("Failed to auto-save:", error);
        })
        .finally(() => {
          saving = false;
        });
    }, AUTO_SAVE_INTERVAL);

    // 탭을 닫거나 다른 앱으로 넘어갈 때는 다음 주기나 진행 중인 저장을 기다리지 않고
    // 바로 쓴다. IndexedDB는 같은 저장소의 쓰기 트랜잭션을 만든 순서대로 처리하므로
    // 이 최신 스냅샷이 마지막으로 남는다.
    const saveNow = () => {
      if (!restoredRef.current) return;
      saveSnapshot().catch((error) => {
        console.error("Failed to save before leaving the page:", error);
      });
    };
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") saveNow();
    };
    document.addEventListener("visibilitychange", saveWhenHidden);
    window.addEventListener("pagehide", saveNow);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", saveWhenHidden);
      window.removeEventListener("pagehide", saveNow);
    };
  }, []);
}
