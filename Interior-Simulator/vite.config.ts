import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages는 /Interior-Simulator/ 하위 경로로 서비스된다. 배포 워크플로가 VITE_BASE로 넘겨 주고,
  // 로컬 개발·테스트는 기본값 "/"를 그대로 쓴다.
  base: process.env.VITE_BASE || "/",
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
