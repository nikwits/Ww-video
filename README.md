# Wits + Watts videos

Silent 1920x1080 brand videos. Every frame is a pure function of time in `src/<name>.html`, captured in headless Chromium and encoded to MP4. Shared brand styles, background wave and end card live in `src/shared.css` and `src/shared.js`.

- `npm install`
- `node render.mjs intro` writes `out/wits-watts-intro.mp4`
- `node render.mjs baseline` writes `out/wits-watts-baseline.mp4`
- `node render.mjs baseline --stills 2.2,9,19.5` writes single frames to `out/stills/` for quick checks
- Open `src/<name>.html` through any local server to watch a live loop

## Intro (20s)

| Time | Beat |
|---|---|
| 0 to 3.5s | "You've spent the money on AI." / "Can you prove it worked?" |
| 3.5 to 7.5s | 70% stat, 10-20-70 bar, "Most organisations fund the other 30%." (BCG) |
| 7.5 to 12.5s | Word pairs roll and land on wits + watts. "Judgement decides what to build. Capacity builds it." |
| 12.5 to 16s | "Six weeks. Fixed fee. A score you can take to the board." |
| 16 to 20s | Logo, "Get your baseline", witsandwatts.ai |

## Baseline (25s)

| Time | Beat |
|---|---|
| 0 to 4s | "Most of what we find is no surprise to your people." / "It's a surprise to whoever signed off the spend." |
| 4 to 7.3s | "Six weeks to an honest baseline." |
| 7.3 to 14.6s | Week by week timeline, playhead sweeps six weeks, four phases light up |
| 14.6 to 18.7s | 01 A baseline. 02 A Proof Score for the board. 03 The 3 things to fix first. |
| 18.7 to 21.4s | "Fixed fee. From $9,500" NZD excl. GST. "About 12 hours of your leadership's time." |
| 21.4 to 25s | Logo, "Book a 30-minute call", witsandwatts.ai |

Brand: Signal #C4197C, Ink #0F0E14, Spectral Italic 400 and IBM Plex Mono.
