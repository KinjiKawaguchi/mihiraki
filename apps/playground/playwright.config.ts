import { defineConfig, devices } from "@playwright/test";

/** Pointer behaviour depends on real layout, which jsdom cannot provide. */
export default defineConfig({
  testDir: "e2e",
  use: {
    baseURL: "http://localhost:5179",
    ...devices["Desktop Chrome"],
    viewport: { width: 1400, height: 1000 },
    // The specs read the Japanese UI; the playground follows the browser's language.
    locale: "ja-JP",
  },
  webServer: {
    command: "vite --port 5179 --strictPort",
    url: "http://localhost:5179",
    reuseExistingServer: false,
  },
});
