# Video export

Optional. Read this only after the user has said yes to a video. The live demo is
the deliverable; the video is a copy of it for places that cannot run code: a social
post, a GitHub README, an email, a launch post, a slide deck.

## The rule

**Recording is read-only.** It never changes the demo, its `BEATS`, its hooks or its
stylesheet, and it never adds a "recording mode" to them. If the recording looks
wrong, the demo looks wrong: fix the demo, re-run the ship gate, then record again.
The video is only ever as good as the live demo it was taken from.

## What the script does

`assets/record-demo.mjs` opens the page in headless Chromium and centres the demo in
view so `useDemoActive` lets it run. It logs every change to the root's `data-beat`
attribute, which the template already renders, and records the screen. It starts on
one wrap back to `BEATS[0]` and stops on the next. So the file holds exactly one
loop, and it plays back seamlessly when looped.

It writes the formats asked for, plus a poster: the last frame of the loop, which is
the payoff. That frame works as a thumbnail or an `og:image`.

| Format | For | Notes |
| --- | --- | --- |
| `mp4` | social posts, Product Hunt, slides, email links | H.264, `yuv420p`, `+faststart`; plays everywhere |
| `gif` | GitHub READMEs, docs, chat | 15 fps, `--gif-width` wide (800 default); far larger per second than MP4 |
| `webm` | `<video>` on the web | VP9; smaller than MP4 at the same quality |

## Dependencies

It needs `playwright` with Chromium installed, plus an ffmpeg that has libx264. That
means `ffmpeg` on PATH or the `ffmpeg-static` package. It looks for both in the
current directory first, then in `--deps <dir>`.

If the project already has them, use them. If not, **ask before installing**: the
browser download is around 150 MB. Install them into a scratch folder outside the
repo so the project's `package.json` and lockfile stay untouched:

```bash
npm i --prefix <scratch>/demo-video-deps playwright ffmpeg-static
npx --prefix <scratch>/demo-video-deps playwright install chromium
```

## Run it

The page must be served: the dev server you verified the demo on in the ship gate.

```bash
node <skill>/assets/record-demo.mjs \
  --url http://localhost:3000/ \
  --first-beat establish \
  --formats mp4,gif \
  --out public/demo/approvals \
  --deps <scratch>/demo-video-deps
```

| Flag | Default | Set it when |
| --- | --- | --- |
| `--url` | required | always: the page the demo is on |
| `--selector` | `[data-beat][data-phase]` | the page has more than one demo, or the root was renamed |
| `--first-beat` | read on mount | always pass `BEATS[0].id`; it is in the beat script you wrote |
| `--width` / `--height` | 1440 × 900 | the demo must show at a specific breakpoint, or the video should be larger |
| `--fps` | 30 | rarely; 60 for very fast cursor travel |
| `--formats` | `mp4` | the user asked for GIF or WebM |
| `--gif-width` | 800 | the GIF is for a narrow column |
| `--out` | `./demo-video` | always: put it where the user will use it, never in `assets/` of this skill |
| `--timeout` | 90 s | the loop is long; it needs two whole loops to play |

**Resolution is the demo's on-page size in CSS pixels.** Chrome's screencast does not
honour the device pixel ratio, so a 960 × 600 stage gives a 960 × 600 video. For a
larger video, use a wider `--width`: the camera fills whatever stage it gets, and a
responsive stage grows with the viewport. A stage with a fixed pixel width does not.

## Check it before handing it over

Look at it; do not report success from the exit code. Extract a few frames: one from
the establish beat, one mid-action, and the poster. Confirm:

- [ ] Only the demo is in frame: no page header, no scrollbar, no neighbouring copy.
- [ ] The frame fills the video: no bars, no sliced chrome (invariant 7 still holds).
- [ ] The click still lands before the state it causes.
- [ ] The loop length matches the beat script's total (sum of `travel`, press, `hold`).
- [ ] The poster shows the payoff, not the before-state.

## When it fails

| Symptom | Cause | Fix |
| --- | --- | --- |
| "did not play two loops", beats seen: only the first | the demo is not active: off screen, inside a deck panel that is not live, or `reduced` stuck on | make the demo the live panel on that URL, or record a page that renders it alone |
| "did not play two loops", beats seen: a full cycle | the loop is longer than the timeout, or `--first-beat` is wrong | pass `BEATS[0].id`; raise `--timeout` |
| "No demo root matching" | the root is not `[data-beat][data-phase]` | pass `--selector` |
| "larger than the viewport and will be cropped" | the stage is taller or wider than `--width`/`--height` | raise them |
| Video smaller than expected | the stage has a fixed pixel width | expected: resolution is the stage's size; see above |
| No ffmpeg / Playwright found | dependencies missing | the Dependencies section; pass `--deps` |
