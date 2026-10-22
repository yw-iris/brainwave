/* =========================================================
   splat.js — 程序化生成「喷射」墨迹
   参考视频：黄色油漆自画面左侧一点向右爆射，拖出方向性笔触、
   飞溅液滴与干笔纹理，轨迹上叠一道背景色弧线。
   固定随机种子，保证每次刷新形状一致。
   ========================================================= */
(function (global) {
  'use strict';

  const ORIGIN_X = 600;   /* 喷射原点（画面 1600 宽坐标系） */
  const ORIGIN_Y = 330;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* 不规则闭合墨块 */
  function blob(cx, cy, r, rand, opt) {
    opt = opt || {};
    const pts = opt.pts || 20;
    const rough = opt.rough == null ? 0.45 : opt.rough;
    const sy = opt.squash == null ? 1 : opt.squash;
    const p = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      let rr = r * (1 - rough / 2 + rand() * rough);
      if (opt.spikes && rand() < 0.32) rr *= 1 + rand() * 0.95;
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
    }
    if (opt.angular) {
      let d = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
      for (let i = 1; i < pts; i++) d += 'L' + f(p[i][0]) + ' ' + f(p[i][1]);
      return d + 'Z';
    }
    const first = [(p[0][0] + p[pts - 1][0]) / 2, (p[0][1] + p[pts - 1][1]) / 2];
    let d = 'M' + f(first[0]) + ' ' + f(first[1]);
    for (let i = 0; i < pts; i++) {
      const c = p[i], n = p[(i + 1) % pts];
      const mx = (c[0] + n[0]) / 2, my = (c[1] + n[1]) / 2;
      d += 'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(mx) + ' ' + f(my);
    }
    return d + 'Z';
  }

  /* 飞溅液滴 */
  function droplets(cx, cy, spread, count, rand, rMin, rMax, dirX) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      let d = spread * (0.3 + rand() * 0.85);
      const x = cx + Math.cos(a) * d + (dirX || 0) * d * 0.5;
      const y = cy + Math.sin(a) * d * 0.8;
      const r = rMin + rand() * (rMax - rMin);
      out += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r) + '" ry="' + f(r * (0.6 + rand() * 0.55)) + '"/>';
    }
    return out;
  }

  /* 带尖刺的溅射轮廓 */
  function burst(cx, cy, r, rand, spikes) {
    let out = '';
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + rand() * 0.3;
      const len = r * (0.5 + rand() * 1.6);
      const w = r * (0.05 + rand() * 0.1);
      const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.85;
      const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
      out += '<path d="M' + f(cx + nx) + ' ' + f(cy + ny) + 'L' + f(x1) + ' ' + f(y1) + 'L' + f(cx - nx) + ' ' + f(cy - ny) + 'Z"/>';
      if (rand() < 0.55) {
        out += '<ellipse cx="' + f(x1 + (rand() - 0.5) * 26) + '" cy="' + f(y1 + (rand() - 0.5) * 26) + '" rx="' + f(2 + rand() * 5) + '" ry="' + f(2 + rand() * 4) + '"/>';
      }
    }
    return out;
  }

  /* 甩笔：origin 端收锋，末端可保持宽度（喷射尾迹用） */
  function swipe(x1, y1, x2, y2, w1, w2, rand, rough, keepEnd) {
    const steps = 26;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const top = [], bot = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const taper = keepEnd ? Math.min(1, t * 9) : Math.min(1, t * 7, (1 - t) * 7 + 0.12);
      const w = (w1 + (w2 - w1) * Math.pow(t, 0.85)) * taper * (0.7 + rand() * 0.6);
      const px = x1 + dx * t, py = y1 + dy * t;
      top.push([px + nx * w + (rand() - 0.5) * rough, py + ny * w + (rand() - 0.5) * rough]);
      bot.push([px - nx * w * (0.55 + rand() * 0.55) + (rand() - 0.5) * rough, py - ny * w * (0.55 + rand() * 0.55) + (rand() - 0.5) * rough]);
    }
    let d = 'M' + f(top[0][0]) + ' ' + f(top[0][1]);
    for (let i = 1; i < top.length; i++) d += 'L' + f(top[i][0]) + ' ' + f(top[i][1]);
    for (let i = bot.length - 1; i >= 0; i--) d += 'L' + f(bot[i][0]) + ' ' + f(bot[i][1]);
    return d + 'Z';
  }

  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------------- 喷射墨迹图层 ---------------- */
  function build() {
    const rand = mulberry32(20260418);
    const ox = ORIGIN_X, oy = ORIGIN_Y;
    let s = '';

    /* 遮罩：从原点扩散的圆，逐帧"喷"出墨迹 */
    s += '<defs><mask id="bwSpray" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">';
    s += '<circle id="bwSprayDot" cx="' + ox + '" cy="' + oy + '" r="0" fill="#fff">';
    s += '<animate id="bwSprayAnim" attributeName="r" values="0;1340;1500" keyTimes="0;0.72;1" ';
    s += 'keySplines="0.1 0.85 0.2 1;0.35 0 0.25 1" calcMode="spline" dur="0.62s" begin="0.15s" fill="freeze"/>';
    s += '</circle></mask></defs>';

    s += '<g mask="url(#bwSpray)">';

    /* 1. 喷射尾迹：自原点向右发散的锥形笔触（起点带抖动，避免收成一个尖点） */
    for (let i = 0; i < 16; i++) {
      const ang = (-40 + rand() * 80) * Math.PI / 180;
      const len = 380 + rand() * 700;
      const jx = ox + (rand() - 0.5) * 46;
      const jy = oy + (rand() - 0.5) * 46;
      const ex = jx + Math.cos(ang) * len;
      const ey = jy + Math.sin(ang) * len;
      s += '<path d="' + swipe(jx, jy, ex, ey, 4 + rand() * 10, 16 + rand() * 30, rand, 4, true) + '"/>';
    }
    /* 更细的飞丝 */
    for (let i = 0; i < 12; i++) {
      const ang = (-46 + rand() * 92) * Math.PI / 180;
      const len = 500 + rand() * 800;
      const jx = ox + (rand() - 0.5) * 60;
      const jy = oy + (rand() - 0.5) * 60;
      const ex = jx + Math.cos(ang) * len;
      const ey = jy + Math.sin(ang) * len;
      s += '<path d="' + swipe(jx, jy, ex, ey, 2, 5 + rand() * 10, rand, 2, true) + '"/>';
    }

    /* 2. 主墨团：圆润撕裂边 */
    s += '<path d="' + blob(1200, 372, 246, rand, { pts: 26, rough: 0.58, squash: 0.92, spikes: true }) + '"/>';
    s += '<path d="' + blob(1000, 236, 132, rand, { pts: 20, rough: 0.62, squash: 0.9, spikes: true }) + '"/>';
    s += '<path d="' + blob(1390, 580, 176, rand, { pts: 22, rough: 0.6, spikes: true }) + '"/>';
    s += '<path d="' + blob(830, 560, 96, rand, { pts: 15, rough: 0.66, spikes: true }) + '"/>';
    s += '<path d="' + blob(1230, 800, 130, rand, { pts: 17, rough: 0.64, spikes: true }) + '"/>';
    s += '<path d="' + blob(1490, 330, 86, rand, { pts: 12, rough: 0.7, angular: true }) + '"/>';
    s += burst(1200, 372, 190, rand, 13);
    s += burst(1390, 580, 120, rand, 9);
    s += burst(830, 560, 62, rand, 6);

    /* 3. 干笔纹理：顺着喷射方向的细条纹 */
    for (let i = 0; i < 34; i++) {
      const x = 760 + rand() * 760;
      const y = 90 + rand() * 700;
      const w = 90 + rand() * 300;
      s += '<path d="' + swipe(x, y, x + w, y + (rand() - 0.5) * 40, 3 + rand() * 5, 1, rand, 2, true) + '" opacity="' + (0.05 + rand() * 0.1).toFixed(2) + '"/>';
    }

    /* 4. 飞溅液滴 */
    s += droplets(1220, 330, 420, 34, rand, 2, 8, 0.5);
    s += droplets(1440, 600, 320, 22, rand, 2, 7, 0.4);
    s += droplets(1000, 236, 300, 18, rand, 2, 6, 0.3);

    s += '</g>';

    /* 5. 喷射轨迹弧线（背景色，压在墨迹之上、标题之下） */
    s += '<path class="arc" pathLength="1" d="M372,596 C760,690 1080,258 1588,34"/>';

    return s;
  }

  global.Splat = { build: build, mulberry32: mulberry32, ORIGIN: { x: ORIGIN_X, y: ORIGIN_Y } };
})(window);
