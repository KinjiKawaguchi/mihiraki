import { resolve } from "node:path";
import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "entry.ts"),
      formats: ["iife"],
      name: "mihirakiHarness",
      fileName: () => "harness.js",
    },
  },
});
