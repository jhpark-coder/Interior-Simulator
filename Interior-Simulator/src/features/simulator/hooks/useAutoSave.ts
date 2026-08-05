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
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let saving = false;
    const interval = setInterval(() => {
      if (saving) return;
      saving = true;
      const project = snapshotRef.current();
      saveProject(project)
        .then(() => {
          claimLastProjectIfUnset(project.id);
        })
        .catch((error) => {
          console.error("Failed to auto-save:", error);
        })
        .finally(() => {
          saving = false;
        });
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, []);
}
