import { useEffect } from "react";
import { useSimulatorStore } from "../store/useSimulatorStore";

const AUTO_SAVE_KEY = "interior-simulator-autosave";
const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

export function useAutoSave() {
  const exportLayout = useSimulatorStore((state) => state.exportLayout);
  const importLayout = useSimulatorStore((state) => state.importLayout);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        importLayout(data);
      }
    } catch (error) {
      console.error("Failed to load auto-save:", error);
    }
  }, [importLayout]);

  // Save to localStorage periodically
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const layout = exportLayout();
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(layout));
      } catch (error) {
        console.error("Failed to auto-save:", error);
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(interval);
  }, [exportLayout]);
}
