import { useEffect } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";

export function useKeyboardShortcuts() {
  const selectedEntity = useSimulatorStore((state) => state.selectedEntity);
  const removeFurniture = useSimulatorStore((state) => state.removeFurniture);
  const undo = useSimulatorStore((state) => state.undo);
  const redo = useSimulatorStore((state) => state.redo);
  const exportLayout = useSimulatorStore((state) => state.exportLayout);

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

      // Ctrl/Cmd + S - Save (export JSON)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const layout = exportLayout();
        const blob = new Blob([JSON.stringify(layout, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `layout-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEntity, removeFurniture, undo, redo, exportLayout]);
}
