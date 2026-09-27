/**
 * Renders the artwork sources in this directory to the PNGs that are shipped or uploaded:
 * the extension icons (public/icon/<size>.png) and the Chrome Web Store promo tile
 * (store/). Browsers cannot use SVG for extension icons, so the PNGs are committed; run
 * `pnpm --filter @mihiraki/extension artwork` after changing a source.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const extensionRoot = join(here, "..");

/**
 * `inset` is transparent padding around the artwork: the store asks for 96px of artwork
 * with 16px of padding at 128px.
 */
const OUTPUTS = [
  { source: "mihiraki.svg", target: "public/icon/128.png", width: 128, height: 128, inset: 16 },
  { source: "mihiraki.svg", target: "public/icon/48.png", width: 48, height: 48, inset: 0 },
  { source: "mihiraki-32.svg", target: "public/icon/32.png", width: 32, height: 32, inset: 0 },
  { source: "mihiraki-16.svg", target: "public/icon/16.png", width: 16, height: 16, inset: 0 },
  {
    source: "promo-tile.svg",
    target: "store/promo-tile-440x280.png",
    width: 440,
    height: 280,
    inset: 0,
  },
];

async function render(page, { source, target, width, height, inset }) {
  const svg = await readFile(join(here, source));
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style>` +
      `<img src="data:image/svg+xml;base64,${svg.toString("base64")}" ` +
      `style="position:absolute;left:${inset}px;top:${inset}px;` +
      `width:${width - inset * 2}px;height:${height - inset * 2}px">`,
  );
  await page.locator("img").evaluate((img) => img.decode());
  const path = join(extensionRoot, target);
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
