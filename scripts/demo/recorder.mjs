// Shared helpers for recording workflow demo videos with Playwright + ffmpeg.
// Each workflow has its own short script in scripts/demo/ that uses these.
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const N8N = "http://localhost:5678";
export const MAILPIT = "http://localhost:8025";
const SIZE = { width: 1280, height: 720 };

function readEnv() {
  const env = {};
  for (const line of readFileSync(new URL("../../.env", import.meta.url), "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2];
  }
  return env;
}

export async function startRecording() {
  const videoDir = mkdtempSync(join(tmpdir(), "n8n-demo-"));
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({ viewport: SIZE, recordVideo: { dir: videoDir, size: SIZE } });
  const page = await context.newPage();
  const startedAt = Date.now();
  const cuts = [];
  let cutFrom = null;

  return {
    page,
    /** Logs the demo browser into n8n with the owner account from .env. */
    async loginToN8n() {
      const env = readEnv();
      const res = await context.request.post(`${N8N}/rest/login`, {
        data: { emailOrLdapLoginId: env.N8N_OWNER_EMAIL, password: env.N8N_OWNER_PASSWORD },
      });
      if (!res.ok()) throw new Error(`n8n login failed (${res.status()}): set N8N_OWNER_EMAIL/PASSWORD in .env`);
    },
    /** Shows a caption bar at the bottom of the page (call again after each navigation). */
    async caption(text) {
      await page.evaluate((t) => {
        let bar = document.getElementById("demo-caption");
        if (!bar) {
          bar = document.createElement("div");
          bar.id = "demo-caption";
          bar.style.cssText =
            "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;" +
            "max-width:80%;padding:14px 26px;border-radius:12px;background:rgba(17,24,39,.92);" +
            "color:#fff;font:600 22px/1.35 system-ui,sans-serif;text-align:center;" +
            "box-shadow:0 8px 30px rgba(0,0,0,.35);pointer-events:none";
          document.body.appendChild(bar);
        }
        bar.textContent = t;
      }, text);
    },
    /** Marks the start of a boring wait that is cut out of the final video. */
    cutStart() {
      cutFrom = (Date.now() - startedAt) / 1000;
    },
    cutEnd() {
      cuts.push([cutFrom, (Date.now() - startedAt) / 1000]);
      cutFrom = null;
    },
    /** Opens a page and cuts the loading time, so the video never shows blank frames. */
    async open(url, readySelector) {
      this.cutStart();
      await page.goto(url);
      await page.locator(readySelector).first().waitFor();
      await page.waitForTimeout(600);
      this.cutEnd();
    },
    /**
     * Opens an n8n page with the onboarding checklist closed.
     * fit: also zoom the editor canvas to fit (only for the editor view).
     */
    async openN8n(url, readySelector, { fit = false } = {}) {
      this.cutStart();
      await page.goto(url);
      await page.locator(readySelector).first().waitFor();
      await page.waitForTimeout(800);
      const closeChecklist = page.locator('[data-test-id="suggested-actions-close"]');
      if (await closeChecklist.isVisible().catch(() => false)) await closeChecklist.click();
      if (fit) {
        // Focus the canvas so the shortcut reaches it; skip if an overlay is in the way.
        await page.locator(".vue-flow__pane").first().click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {});
        await page.keyboard.press("1"); // n8n shortcut: zoom to fit
      }
      await page.waitForTimeout(600);
      this.cutEnd();
    },
    /** Closes the browser and writes <outBase>.mp4 and a small <outBase>.gif preview. */
    async finish(outBase) {
      const video = page.video();
      await context.close();
      await browser.close();
      const raw = await video.path();
      encode(raw, cuts, outBase);
      rmSync(videoDir, { recursive: true, force: true });
    },
  };
}

function encode(raw, cuts, outBase) {
  // Keep everything outside the cut ranges, then join the pieces.
  const keep = [];
  let from = 0;
  for (const [a, b] of cuts) {
    keep.push([from, a]);
    from = b;
  }
  keep.push([from, null]);
  const parts = keep.map(([a, b], i) => `[0:v]trim=start=${a}${b === null ? "" : `:end=${b}`},setpts=PTS-STARTPTS[v${i}]`);
  const filter = `${parts.join(";")};${keep.map((_, i) => `[v${i}]`).join("")}concat=n=${keep.length}:v=1:a=0[out]`;

  const mp4 = `${outBase}.mp4`;
  const tmp = `${outBase}.tmp.mp4`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-filter_complex", filter, "-map", "[out]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", tmp]);
  renameSync(tmp, mp4);

  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf",
    "fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer",
    `${outBase}.gif`]);
}
