import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const stillFrames = process.env.STILLS ? process.env.STILLS.split(",").map(Number) : null;
const out = process.env.OUT ?? "/mnt/documents/cronos-curiosidades.mp4";
const range = process.env.RANGE ? process.env.RANGE.split("-").map(Number) : null;

const bundled = await bundle({
  entryPoint: path.resolve(__dirname, "../src/index.ts"),
  webpackOverride: (config) => config,
});

const browser = await openBrowser("chrome", {
  browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: process.env.COMP ?? "main",
  puppeteerInstance: browser,
});

if (stillFrames) {
  for (const f of stillFrames) {
    await renderStill({
      composition,
      serveUrl: bundled,
      output: `/tmp/browser/frame-${f}.png`,
      frame: f,
      puppeteerInstance: browser,
      overwrite: true,
    });
    console.log("still", f);
  }
} else {
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: out,
    puppeteerInstance: browser,
    muted: true,
    concurrency: 2,
    frameRange: range ? [range[0], range[1]] : undefined,
    onProgress: ({ progress }) => {
      if (Math.round(progress * 100) % 20 === 0) console.log("progress", progress);
    },
  });
}

await browser.close({ silent: false });
console.log("done");
