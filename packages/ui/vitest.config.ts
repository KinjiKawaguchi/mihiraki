import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: "jsdom",
    globals: true,
    // These render whole views in jsdom; the first test of a file also pays for loading
    // Markdown and sanitiser modules, which under parallel runs exceeded the 5 s default.
    testTimeout: 15_000,
  },
});
