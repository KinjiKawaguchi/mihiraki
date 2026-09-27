import { createMemoryBackend } from "@better-gh-md/core";
import { ReviewApp } from "@better-gh-md/ui";
import "@better-gh-md/ui/styles.css";
import { render } from "preact";
import { sampleFiles, sampleThreads } from "./samples";

const root = document.getElementById("app");
if (root) {
  render(<ReviewApp backend={createMemoryBackend(sampleFiles, sampleThreads)} />, root);
}
