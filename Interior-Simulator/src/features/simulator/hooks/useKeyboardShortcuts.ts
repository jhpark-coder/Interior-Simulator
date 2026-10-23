import { useEffect } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";
import { createProjectPackage } from "../store/persistence/projectPackage";
import { loadProjectAsset, saveProject } from "../store/persistence/projectDb";

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export function useKeyboardShortcuts() {
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const removeFurniture = useSimulatorStore((state) => state.removeFurniture);
  const duplicateFurniture = useSimulatorStore((state) => state.duplicateFurniture);
  const undo = useSimulatorStore((state) => state.undo);
  const redo = useSimulatorStore((state) => state.redo);
  const snapshotProject = useSimulatorStore((state) => state.snapshotProject);
  const workspaceMode = useSimulatorStore((state) => state.workspaceMode);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";
      const key = e.key.toLowerCase();
      // 가구 단축키는 가구 배치 단계에서만 쓴다. 다른 단계에서는 화면에 없는 가구가
      // 선택된 채 남아 있어, 집 구조에서 Delete·Ctrl+Z를 누르면 가구가 지워졌다.
      // 집 구조의 Delete·실행 취소는 StructureCanvas가 따로 처리한다.
      const furnitureShortcuts = workspaceMode === "scenario" && !typing;

      // Delete/Backspace - Delete selected entity
      if (
        furnitureShortcuts &&
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedEntity?.kind === "furniture"
      ) {
        e.preventDefault();
        removeFurniture(selectedEntity.id);
      }

      // Ctrl/Cmd + D - Duplicate selected furniture (instead of the browser bookmark)
      if (
        furnitureShortcuts &&
        (e.ctrlKey || e.metaKey) &&
        key === "d" &&
        selectedEntity?.kind === "furniture"
      ) {
        e.preventDefault();
        duplicateFurniture(selectedEntity.id);
      }

      // Ctrl/Cmd + Z - Undo, Ctrl/Cmd + Shift + Z - Redo
      // Shift를 누르면 e.key가 "Z"가 되므로 소문자로 비교한다.
      if (furnitureShortcuts && (e.ctrlKey || e.metaKey) && key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      // Ctrl/Cmd + S - Save a complete project package
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void (async () => {
          const project = snapshotProject();
          await saveProject(project);
          const bytes = await createProjectPackage(project, (assetId) =>
            loadProjectAsset(project.id, assetId)
          );
          const blob = new Blob([bytesToArrayBuffer(bytes)], {
            type: "application/x-interior-project",
          });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = `${project.name.replace(/[<>:"/\\|?*]/g, "_")}.interior-project`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        })().catch((error) => {
          window.alert(error instanceof Error ? error.message : "프로젝트를 저장하지 못했습니다.");
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedEntity,
    removeFurniture,
    duplicateFurniture,
    undo,
    redo,
    snapshotProject,
    workspaceMode,
  ]);
}
