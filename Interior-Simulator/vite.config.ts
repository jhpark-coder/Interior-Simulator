import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, "/");
          if (
            /\/node_modules\/(react|react-dom|scheduler|zustand|zod)\//.test(
              normalized
            )
          ) {
            return "vendor-react";
          }
          if (
            /\/node_modules\/(konva|react-konva)\//.test(normalized)
          ) {
            return "vendor-canvas";
          }
          if (/\/node_modules\/(idb|jszip)\//.test(normalized)) {
            return "vendor-storage";
          }
          return undefined;
        },
      },
    },
  },
});
