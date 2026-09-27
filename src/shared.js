// Shared animation engine for every Wits + Watts video.
// Each page defines renderAt(t) and calls boot(renderAt, duration).
const W = 1920, H = 1080;
const $ = (s) => document.querySelector(s);

// ---------- easing + timing helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const outExpo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const inExpo = (x) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// Splits text into masked words. Words wrapped in *asterisks* are pink.
function words(el, text) {
  el.innerHTML = text.split(" ").map((w) => {
    const pink = w.startsWith("*");
    w = w.replace(/\*/g, "");
    return `<span class="w"><span class="wi${pink ? " pink" : ""}">${w}</span></span>`;
  }).join(" ");
  return [...el.querySelectorAll(".wi")];
}
// Masked rise-in, one word after another.
function riseWords(ws, t, start, stagger = 0.08, dur = 0.55) {
  ws.forEach((w, i) => {
    const p = outExpo(P(t, start + i * stagger, start + i * stagger + dur));
    w.style.transform = `translateY(${(1 - p) * 115}%)`;
  });
}

// Pink full-screen wipe centred on time T. Returns a transform, or null when idle.
function wipeAt(t, T, dir = 1) {
  if (t < T - 0.22 || t > T + 0.26) return null;
  const x = t < T ? lerp(-100, 0, inExpo(P(t, T - 0.22, T)) ** 0.6) : lerp(0, 100, outExpo(P(t, T, T + 0.26)));
  return `translateX(${x * dir}%)`;
}

// ---------- canvas background ----------
const cx = $("#bg").getContext("2d");

function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rnd = mulberry(7);
const JITTER = Array.from({ length: 4000 }, () => rnd());

function clearBg() {
  cx.fillStyle = "#0F0E14";
  cx.fillRect(0, 0, W, H);
}

function drawGrid(t, alpha) {
  if (alpha <= 0) return;
  const g = 48, off = (t * 7) % g;
  cx.fillStyle = `rgba(236,234,242,${0.06 * alpha})`;
  for (let y = -g + off; y < H + g; y += g)
    for (let x = -g + off * 0.5; x < W + g; x += g) cx.fillRect(x, y, 2, 2);
}

// Flat signal line with a spark (zigzag pulse) travelling across between times a and b.
function drawSignal(t, alpha, a, b, y0 = 860) {
  if (alpha <= 0) return;
  const head = lerp(-300, W + 300, inOut(P(t, a, b)));
  cx.lineWidth = 2;
  cx.strokeStyle = `rgba(236,91,168,${0.55 * alpha})`;
  cx.beginPath();
  for (let x = 0; x <= W; x += 4) {
    const d = x - head;
    let y = y0;
    if (Math.abs(d) < 90) {
      const k = d / 90;
      y -= Math.sin(k * Math.PI * 3) * 70 * (1 - Math.abs(k)) * (d < 0 ? 0.6 : 1);
    }
    x === 0 ? cx.moveTo(x, y) : cx.lineTo(x, y);
  }
  cx.stroke();
  const glow = cx.createRadialGradient(head, y0, 0, head, y0, 220);
  glow.addColorStop(0, `rgba(236,91,168,${0.35 * alpha})`);
  glow.addColorStop(1, "rgba(236,91,168,0)");
  cx.fillStyle = glow;
  cx.fillRect(head - 220, y0 - 220, 440, 440);
}

// Particle wave (the brand's signal wave), peaking at the junction (centre).
function drawWave(t, cy, amp, alpha, spread = 0.2) {
  if (alpha <= 0) return;
  cx.save();
  cx.globalCompositeOperation = "lighter";
  const STRANDS = 9;
  let j = 0;
  for (let s = 0; s < STRANDS; s++) {
    const sp = 0.55 + 0.45 * Math.sin(s * 1.7 + t * 0.9);
    for (let x = 0; x <= W; x += 6, j++) {
      const u = (x - W / 2) / W;
      const env = Math.exp(-(u * u) / (2 * spread * spread));
      const a = amp * (env * 200 + 10);
      const y = cy + a * sp * (0.62 * Math.sin(x * 0.0085 + t * 2.4 + s * 0.45) + 0.38 * Math.sin(x * 0.019 - t * 1.6 + s * 0.8));
      const jit = (JITTER[j % JITTER.length] - 0.5) * 10 * env;
      const al = alpha * (0.18 + 0.7 * env) * (0.6 + 0.4 * JITTER[(j * 7) % JITTER.length]);
      cx.fillStyle = `rgba(214,52,146,${al})`;
      const r = 1.4 + 1.6 * env;
      cx.fillRect(x - r / 2, y + jit - r / 2, r, r);
    }
  }
  const glow = cx.createRadialGradient(W / 2, cy, 0, W / 2, cy, 520);
  glow.addColorStop(0, `rgba(196,25,124,${0.22 * alpha * amp})`);
  glow.addColorStop(1, "rgba(196,25,124,0)");
  cx.fillStyle = glow;
  cx.fillRect(0, cy - 520, W, 1040);
  cx.restore();
}

// ---------- end card: logo assembles, CTA fills, URL fades in ----------
function renderEndCard(t, T0) {
  const a = outExpo(P(t, T0 + 0.05, T0 + 0.75));
  $("#lw").style.transform = `translateX(${-140 * (1 - a)}px)`;
  $("#lw").style.opacity = a;
  $("#lt").style.transform = `translateX(${140 * (1 - a)}px)`;
  $("#lt").style.opacity = a;
  const pp = outBack(P(t, T0 + 0.35, T0 + 0.85));
  $("#lp").style.transform = `rotate(${(1 - pp) * -180}deg) scale(${pp})`;

  const c = outExpo(P(t, T0 + 0.85, T0 + 1.35));
  $("#cta").style.opacity = c;
  $("#cta").style.transform = `translateX(-50%) translateY(${30 * (1 - c)}px)`;
  $("#ctaFill").style.transform = `scaleX(${outExpo(P(t, T0 + 1.2, T0 + 1.85))})`;
  $("#url").style.opacity = P(t, T0 + 1.45, T0 + 1.95);
}

// Exposes renderAt to the renderer, and loops it live when opened in a normal browser.
function boot(renderAt, duration) {
  window.renderAt = renderAt;
  window.DURATION = duration;
  if (!navigator.webdriver) {
    const t0 = performance.now();
    const loop = () => { renderAt(((performance.now() - t0) / 1000) % duration); requestAnimationFrame(loop); };
    document.fonts.ready.then(loop);
  }
}
