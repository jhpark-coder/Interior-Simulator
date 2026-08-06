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
  const undo = useSimulatorStore((state) => state.undo);
  const redo = useSimulatorStore((state) => state.redo);
  const snapshotProject = useSimulatorStore((state) => state.snapshotProject);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete/Backspace - Delete selected entity
      if (e.key === "Delete" || e.key === "Backspace") {
        if (
          selectedEntity?.kind === "furniture" &&
          document.activeElement?.tagName !== "INPUT" &&
          document.activeElement?.tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          removeFurniture(selectedEntity.id);
        }
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z - Redo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
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
  }, [selectedEntity, removeFurniture, undo, redo, snapshotProject]);
}
