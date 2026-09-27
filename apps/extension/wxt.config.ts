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
    // Localized in public/_locales; English is used for any other browser language.
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    homepage_url: "https://github.com/KinjiKawaguchi/mihiraki",
    permissions: [],
  },
});
