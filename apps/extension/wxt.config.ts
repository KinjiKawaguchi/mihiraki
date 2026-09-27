import preact from "@preact/preset-vite";
import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    plugins: [preact()],
  }),
  zip: {
    artifactTemplate: "better-gh-md-{{version}}-{{browser}}.zip",
  },
  manifest: {
    name: "better-gh-md",
    description:
      "GitHubのPull RequestでMarkdownをレンダリングしたまま左右分割で比較し、レビューコメントを付ける",
    permissions: [],
  },
});
