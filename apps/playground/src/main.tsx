import { createMemoryBackend } from "@mihiraki/core/memory";
import { ReviewApp, resolveLocale } from "@mihiraki/ui";
import "@mihiraki/ui/styles.css";
import { render } from "preact";
import { sampleFiles, sampleThreads } from "./samples";

const root = document.getElementById("app");
if (root) {
  render(
    <ReviewApp
      backend={createMemoryBackend(sampleFiles, sampleThreads)}
      locale={resolveLocale(navigator.languages)}
    />,
    root,
  );
}
