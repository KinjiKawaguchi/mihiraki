import preact from "@preact/preset-vite";
import { defineConfig } from "wxt";

export default defineConfig({
  vite: () => ({
    plugins: [preact()],
  }),
  zip: {
    artifactTemplate: "mihiraki-{{version}}-{{browser}}.zip",
  },
  manifest: {
    name: "Mihiraki for GitHub",
    description:
      "Review Markdown changes in GitHub pull requests rendered side by side, and comment on them inline.",
    homepage_url: "https://github.com/KinjiKawaguchi/mihiraki",
    permissions: [],
  },
});
