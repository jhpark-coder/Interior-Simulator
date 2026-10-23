import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // Agent worktrees under .claude/ hold full repo copies; never collect them.
    // e2e/ specs run under Playwright, not Vitest.
    exclude: [...configDefaults.exclude, ".claude/**", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
