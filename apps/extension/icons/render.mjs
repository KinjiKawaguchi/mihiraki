/**
 * Renders the icon sources in this directory to the PNGs the extension ships
 * (public/icon/<size>.png). SVG cannot be used for extension icons, so the PNGs are
 * committed; run `pnpm --filter @mihiraki/extension icons` after changing a source.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));

/** The Chrome Web Store asks for 96px of artwork with 16px of transparent padding at 128px. */
const OUTPUTS = [
  { source: "mihiraki.svg", size: 128, art: 96 },
  { source: "mihiraki.svg", size: 48, art: 48 },
  { source: "mihiraki-32.svg", size: 32, art: 32 },
  { source: "mihiraki-16.svg", size: 16, art: 16 },
];

async function render(page, { source, size, art }) {
  const svg = await readFile(join(here, source));
  const offset = (size - art) / 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>` +
      `<img src="data:image/svg+xml;base64,${svg.toString("base64")}" ` +
      `style="position:absolute;left:${offset}px;top:${offset}px;width:${art}px;height:${art}px">`,
  );
  await page.locator("img").evaluate((img) => img.decode());
  const path = join(here, "..", "public", "icon", `${size}.png`);
  await page.screenshot({ path, omitBackground: true });
  return path;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const output of OUTPUTS) console.log(await render(page, output));
} finally {
  await browser.close();
}
