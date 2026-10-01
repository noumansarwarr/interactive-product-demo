#!/usr/bin/env node
/**
 * Records exactly one loop of a live interactive product demo to a video file.
 *
 * Read-only: it opens the page in headless Chromium, watches the `data-beat`
 * attribute the demo root already renders, and captures the screen. It never
 * changes the demo, its script, or the page.
 *
 * The recording starts on one wrap back to the first beat and stops on the
 * next, so the file is one whole loop and loops seamlessly.
 *
 *   node record-demo.mjs --url http://localhost:3000/ --formats mp4,gif
 *
 * Needs `playwright` (with Chromium installed) and an ffmpeg with libx264:
 * `ffmpeg` on PATH, or the `ffmpeg-static` package. Both are resolved from the
 * current directory first, then from `--deps <dir>`, so they can live in a
 * scratch folder instead of the project's package.json.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const HELP = `Record one loop of an interactive product demo.

  --url <url>          page the demo is on (required)
  --selector <css>     demo root (default: "[data-beat][data-phase]")
  --first-beat <id>    id of BEATS[0] (default: read from the page on mount)
  --width <px>         viewport width (default: 1440). The video is the demo's
                       on-page size in CSS pixels, so a wider viewport that
                       grows the stage gives a larger video.
  --height <px>        viewport height (default: 900)
  --fps <n>            output frame rate (default: 30)
  --formats <list>     mp4, gif, webm, comma-separated (default: mp4)
  --gif-width <px>     GIF width; height follows (default: 800)
  --out <path>         output path without extension (default: ./demo-video)
  --timeout <s>        give up if two loops haven't played by then (default: 90)
  --deps <dir>         extra folder to resolve playwright / ffmpeg-static from
  --ffmpeg <path>      ffmpeg binary to use
`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key === '-h' || key === '--help') args.help = true;
    else if (key.startsWith('--')) args[key.slice(2)] = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.url) {
  console.log(HELP);
  process.exit(args.help ? 0 : 1);
}

const opt = {
  url: args.url,
  selector: args.selector ?? '[data-beat][data-phase]',
  firstBeat: args['first-beat'],
  width: Number(args.width ?? 1440),
  height: Number(args.height ?? 900),
  fps: Number(args.fps ?? 30),
  formats: (args.formats ?? 'mp4').split(',').map((f) => f.trim().toLowerCase()),
  gifWidth: Number(args['gif-width'] ?? 800),
  out: path.resolve(args.out ?? 'demo-video'),
  timeout: Number(args.timeout ?? 90) * 1000,
  deps: args.deps ? path.resolve(args.deps) : undefined,
  ffmpeg: args.ffmpeg,
};

for (const f of opt.formats) {
  if (!['mp4', 'gif', 'webm'].includes(f)) fail(`Unknown format "${f}". Use mp4, gif or webm.`);
}

class Failure extends Error {}

// Throws rather than exiting, so the browser and temp frames still get cleaned up.
function fail(message) {
  throw new Failure(message);
}

for (const event of ['uncaughtException', 'unhandledRejection']) {
  process.on(event, (error) => {
    console.error(error instanceof Failure ? `\n✗ ${error.message}\n` : error);
    process.exit(1);
  });
}

// ── Dependencies ─────────────────────────────────────────────────────────────

function resolveFrom(name) {
  const bases = [process.cwd(), opt.deps].filter(Boolean);
  for (const base of bases) {
    try {
      return createRequire(path.join(base, 'noop.js')).resolve(name);
    } catch {}
  }
  return undefined;
}

async function loadChromium() {
  for (const name of ['playwright', 'playwright-core']) {
    const entry = resolveFrom(name);
    if (entry) {
      const mod = await import(pathToFileURL(entry).href);
      return (mod.chromium ?? mod.default?.chromium);
    }
  }
  fail(
    'Playwright not found. Install it, then its browser:\n' +
      '  npm i --prefix <scratch-dir> playwright && npx --prefix <scratch-dir> playwright install chromium\n' +
      'and pass --deps <scratch-dir>.',
  );
}

async function findFfmpeg() {
  const candidates = [];
  if (opt.ffmpeg) candidates.push(opt.ffmpeg);
  const staticEntry = resolveFrom('ffmpeg-static');
  if (staticEntry) {
    const mod = await import(pathToFileURL(staticEntry).href);
    if (mod.default) candidates.push(mod.default);
  }
  candidates.push('ffmpeg');
  for (const bin of candidates) {
    const probe = spawnSync(bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
    if (probe.status === 0 && probe.stdout.includes('libx264')) return bin;
  }
  fail(
    'No ffmpeg with libx264 found. Install ffmpeg on PATH, or:\n' +
      '  npm i --prefix <scratch-dir> ffmpeg-static   and pass --deps <scratch-dir>.',
  );
}

function ffmpeg(bin, argv) {
  const run = spawnSync(bin, ['-hide_banner', '-loglevel', 'error', '-y', ...argv], {
    encoding: 'utf8',
  });
  if (run.status !== 0) fail(`ffmpeg failed:\n${run.stderr}`);
}

// ── Record ───────────────────────────────────────────────────────────────────

const chromium = await loadChromium();
const ffmpegBin = await findFfmpeg();
const work = mkdtempSync(path.join(tmpdir(), 'demo-video-'));

const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    viewport: { width: opt.width, height: opt.height },
    // A reduced-motion render is the end state with no walkthrough to record.
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();

  // Log every beat change from document start, with wall-clock times that
  // line up with the screencast's frame timestamps. Observation only.
  await page.addInitScript((selector) => {
    const log = [];
    window.__demoBeats = log;
    let last;
    const read = () => {
      const id = document.querySelector(selector)?.getAttribute('data-beat');
      if (id && id !== last) {
        last = id;
        log.push({ id, t: Date.now() });
      }
    };
    new MutationObserver(read).observe(document, {
      attributeFilter: ['data-beat'],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }, opt.selector);

  await page.goto(opt.url, { waitUntil: 'load' });
  const root = page.locator(opt.selector).first();
  try {
    await root.waitFor({ state: 'visible', timeout: 15000 });
  } catch {
    fail(`No demo root matching ${opt.selector} on ${opt.url}. Pass --selector.`);
  }
  await page.evaluate(() => document.fonts?.ready);
  await root.evaluate((el) => el.scrollIntoView({ block: 'center' }));

  // A demo mounts at beat 0, so the first id logged is BEATS[0].
  const firstBeat =
    opt.firstBeat ?? (await page.evaluate(() => window.__demoBeats[0]?.id));
  if (!firstBeat) fail('Could not read the first beat. Pass --first-beat <BEATS[0].id>.');

  const box = await root.boundingBox();
  if (!box) fail('The demo root has no layout box.');
  const clip = {
    x: Math.max(0, box.x),
    y: Math.max(0, box.y),
    w: Math.min(box.width, opt.width - Math.max(0, box.x)),
    h: Math.min(box.height, opt.height - Math.max(0, box.y)),
  };
  if (clip.w < box.width - 1 || clip.h < box.height - 1) {
    console.warn('! The demo is larger than the viewport and will be cropped. Raise --width/--height.');
  }

  const cdp = await context.newCDPSession(page);
  const frames = [];
  let frameNo = 0;
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    const file = path.join(work, `f${String(++frameNo).padStart(6, '0')}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    frames.push({ file, t: metadata.timestamp * 1000 });
    await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const since = Date.now();
  // Screencast frames are always CSS-pixel sized, whatever the device pixel
  // ratio, so the viewport size is what sets the video's resolution.
  await cdp.send('Page.startScreencast', { everyNthFrame: 1, format: 'png' });
  console.log(`● Recording ${opt.url}, waiting for the loop to wrap to "${firstBeat}"…`);

  // A wrap is the beat id returning to BEATS[0]. Record from one wrap to the next.
  const wraps = async () =>
    page.evaluate(
      ([first, after]) => {
        const out = [];
        const log = window.__demoBeats;
        for (let i = 1; i < log.length; i++) {
          if (log[i].id === first && log[i - 1].id !== first && log[i].t >= after) out.push(log[i].t);
        }
        return out;
      },
      [firstBeat, since],
    );
  const deadline = Date.now() + opt.timeout;
  let seam = [];
  while ((seam = await wraps()).length < 2) {
    if (Date.now() > deadline) {
      const seen = await page.evaluate(() => window.__demoBeats.map((b) => b.id));
      fail(
        `The demo did not play two loops within ${opt.timeout / 1000}s.\n` +
          `  Beats seen: ${seen.join(' → ') || 'none'}\n` +
          '  Check that it is on screen (it only runs while visible), that --first-beat\n' +
          '  is BEATS[0].id, or raise --timeout.',
      );
    }
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(300);
  await cdp.send('Page.stopScreencast');

  const [start, end] = seam;
  frames.sort((a, b) => a.t - b.t);
  const firstIdx = Math.max(0, frames.findLastIndex((f) => f.t <= start));
  const used = frames.slice(firstIdx).filter((f) => f.t < end);
  if (used.length < 2) fail('Too few frames were captured. Is the demo animating?');

  // Concat list with each frame held until the next one, clamped to the loop.
  let list = '';
  used.forEach((f, i) => {
    const from = Math.max(f.t, start);
    const to = Math.min(used[i + 1]?.t ?? end, end);
    list += `file '${f.file.replace(/\\/g, '/')}'\nduration ${((to - from) / 1000).toFixed(4)}\n`;
  });
  list += `file '${used.at(-1).file.replace(/\\/g, '/')}'\n`;
  const listFile = path.join(work, 'frames.txt');
  writeFileSync(listFile, list);

  // Crop in CSS-pixel ratios so it is right at any device pixel ratio.
  const crop =
    `crop=iw*${clip.w / opt.width}:ih*${clip.h / opt.height}:` +
    `iw*${clip.x / opt.width}:ih*${clip.y / opt.height},` +
    'scale=trunc(iw/2)*2:trunc(ih/2)*2';
  const input = ['-f', 'concat', '-safe', '0', '-i', listFile];

  mkdirSync(path.dirname(opt.out), { recursive: true });
  const written = [];
  const mp4 = `${opt.out}.mp4`;
  const needMp4 = opt.formats.includes('mp4') || opt.formats.includes('gif');
  if (needMp4) {
    ffmpeg(ffmpegBin, [
      ...input, '-vf', `${crop},fps=${opt.fps}`, '-c:v', 'libx264', '-preset', 'slow',
      '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4,
    ]);
    if (opt.formats.includes('mp4')) written.push(mp4);
  }
  if (opt.formats.includes('webm')) {
    const webm = `${opt.out}.webm`;
    ffmpeg(ffmpegBin, [
      ...input, '-vf', `${crop},fps=${opt.fps}`, '-c:v', 'libvpx-vp9', '-crf', '32',
      '-b:v', '0', '-pix_fmt', 'yuv420p', webm,
    ]);
    written.push(webm);
  }
  if (opt.formats.includes('gif')) {
    const gif = `${opt.out}.gif`;
    ffmpeg(ffmpegBin, [
      '-i', mp4, '-vf',
      `fps=15,scale=${opt.gifWidth}:-1:flags=lanczos,split[a][b];` +
        '[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5',
      '-loop', '0', gif,
    ]);
    written.push(gif);
    if (!opt.formats.includes('mp4')) rmSync(mp4, { force: true });
  }

  // Poster: the payoff, i.e. the last frame of the loop.
  const poster = `${opt.out}-poster.png`;
  const posterSrc = path.join(work, 'poster-src.png');
  copyFileSync(used.at(-1).file, posterSrc);
  ffmpeg(ffmpegBin, ['-i', posterSrc, '-vf', crop, '-frames:v', '1', poster]);
  written.push(poster);

  console.log(`✓ One loop, ${((end - start) / 1000).toFixed(1)}s, ${used.length} captured frames`);
  for (const file of written) console.log(`  ${path.relative(process.cwd(), file) || file}`);
} finally {
  await browser.close();
  rmSync(work, { recursive: true, force: true });
}
