// Renders src/index.html frame by frame and encodes it to MP4.
//   node render.mjs                 -> out/wits-watts-intro.mp4
//   node render.mjs --stills 1,5,10 -> out/stills/t-<sec>.png for quick checks
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright-core";
import ffmpegPath from "ffmpeg-static";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FPS = 30;
const OUT = path.join(ROOT, "out");
const CHROME = process.env.CHROME_PATH || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";

const TYPES = { ".html": "text/html", ".woff2": "font/woff2", ".js": "text/javascript" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/src/index.html`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(url);
await page.evaluate(() => document.fonts.ready);

const stillsArg = process.argv.indexOf("--stills");
fs.mkdirSync(OUT, { recursive: true });

if (stillsArg > -1) {
  const dir = path.join(OUT, "stills");
  fs.mkdirSync(dir, { recursive: true });
  for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
    await page.evaluate((t) => window.renderAt(t), t);
    await page.screenshot({ path: path.join(dir, `t-${t.toFixed(2)}.png`) });
  }
} else {
  const duration = await page.evaluate(() => window.DURATION);
  const target = path.join(OUT, "wits-watts-intro.mp4");
  const ff = spawn(ffmpegPath, [
    "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "png", "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", target,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(duration * FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.renderAt(t), f / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on("close", (c) => (c === 0 ? r() : j(new Error(`ffmpeg exited ${c}`)))));
  console.log(`wrote ${target}`);
}

await browser.close();
server.close();
