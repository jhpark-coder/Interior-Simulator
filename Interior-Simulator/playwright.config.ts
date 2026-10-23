import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        launchOptions: {
          // 브라우저를 내려받을 수 없는 환경에서는 설치된 Chromium 경로를 지정한다.
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          // 로캘이 POSIX인 Linux에서는 Chromium이 한글 다운로드 파일명을 "download"로 바꾼다.
          env: { ...process.env, LANG: process.env.LANG || "C.UTF-8" },
        },
      },
    },
  ],
  // 실제 배포와 같은 production 빌드로 검증한다. 외부 네트워크 없이 동작해야 한다.
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
