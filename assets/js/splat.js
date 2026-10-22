/* =========================================================
   splat.js — 程序化生成涂鸦 / 泼墨笔触
   固定随机种子，保证每次刷新形状一致
   ========================================================= */
(function (global) {
  'use strict';

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
    const pts = opt.pts || 24;
    const rough = opt.rough == null ? 0.45 : opt.rough;
    const sy = opt.squash == null ? 1 : opt.squash;
    const p = [];
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      let rr = r * (1 - rough / 2 + rand() * rough);
      if (opt.spikes && rand() < 0.3) rr *= 1 + rand() * 0.95;
      p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sy]);
    }
    /* 棱角模式：直边多边形，接近干墨飞溅的硬边 */
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

  /* 飞溅小液滴 */
  function droplets(cx, cy, spread, count, rand, rMin, rMax) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = spread * (0.35 + rand() * 0.75);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d * 0.8;
      const r = rMin + rand() * (rMax - rMin);
      out += '<ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r) + '" ry="' + f(r * (0.65 + rand() * 0.5)) + '"/>';
    }
    return out;
  }

  /* 带尖刺的溅射轮廓（星芒状） */
  function burst(cx, cy, r, rand, spikes) {
    let out = '';
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + rand() * 0.3;
      const len = r * (0.5 + rand() * 1.5);
      const w = r * (0.05 + rand() * 0.1);
      const x1 = cx + Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.85;
      const nx = Math.cos(a + Math.PI / 2) * w, ny = Math.sin(a + Math.PI / 2) * w;
      const x2 = cx + Math.cos(a + Math.PI / 2) * w * 0.4, y2 = cy + Math.sin(a + Math.PI / 2) * w * 0.4;
      out += '<path d="M' + f(cx + nx) + ' ' + f(cy + ny) + 'L' + f(x1) + ' ' + f(y1) + 'L' + f(cx - nx) + ' ' + f(cy - ny) + 'Z"/>';
      if (rand() < 0.5) {
        out += '<ellipse cx="' + f(x1 + (rand() - 0.5) * 20) + '" cy="' + f(y1 + (rand() - 0.5) * 20) + '" rx="' + f(2 + rand() * 5) + '" ry="' + f(2 + rand() * 4) + '"/>';
      }
    }
    return out;
  }

  /* 渐细的毛笔甩笔（两端收锋） */
  function swipe(x1, y1, x2, y2, w1, w2, rand, rough) {
    const steps = 30;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len, ny = dx / len;
    const top = [], bot = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const taper = Math.min(1, t * 7, (1 - t) * 7 + 0.12);
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

  /* 完整的涂鸦图层 */
  function build() {
    const rand = mulberry32(20260418);
    let s = '';

    /* 标题后方的长甩笔 */
    s += '<path d="' + swipe(500, 552, 1592, 104, 44, 9, rand, 6) + '"/>';
    /* 白色干笔叠加 */
    s += '<path class="splat-dry" d="' + swipe(620, 486, 1530, 158, 21, 4, rand, 5) + '"/>';
    s += '<path class="splat-dry" d="' + swipe(760, 420, 1380, 214, 12, 3, rand, 4) + '"/>';

    /* 右侧主墨团 */
    s += '<path d="' + blob(1342, 492, 146, rand, { pts: 14, rough: 0.7, squash: 0.9, spikes: true, angular: true }) + '"/>';
    s += '<path d="' + blob(1456, 628, 90, rand, { pts: 11, rough: 0.75, spikes: true, angular: true }) + '"/>';
    s += '<path d="' + blob(1216, 652, 72, rand, { pts: 10, rough: 0.78, spikes: true, angular: true }) + '"/>';
    s += burst(1342, 492, 116, rand, 12);
    s += burst(1216, 652, 56, rand, 7);

    /* 标题右上方的墨团 */
    s += '<path d="' + blob(1046, 286, 86, rand, { pts: 12, rough: 0.72, squash: 0.88, spikes: true, angular: true }) + '"/>';
    s += '<path d="' + blob(1208, 172, 56, rand, { pts: 9, rough: 0.78, spikes: true, angular: true }) + '"/>';
    s += burst(1046, 286, 72, rand, 9);

    /* 飞溅 */
    s += droplets(1206, 176, 320, 30, rand, 2, 7);
    s += droplets(1452, 626, 260, 20, rand, 2, 6);
    s += droplets(1046, 288, 250, 22, rand, 2, 6);
    s += droplets(1338, 496, 360, 26, rand, 2, 8);

    /* 向下甩的墨条 */
    s += '<path d="' + swipe(1398, 630, 1444, 858, 15, 3, rand, 4) + '"/>';
    s += '<path d="' + swipe(1252, 660, 1216, 856, 10, 2, rand, 3) + '"/>';
    s += '<ellipse cx="1448" cy="866" rx="7" ry="9"/>';
    s += '<ellipse cx="1214" cy="862" rx="5" ry="6"/>';

    /* 零星小点 */
    s += droplets(700, 770, 330, 16, rand, 1.5, 4.5);
    s += droplets(1470, 420, 230, 13, rand, 1.5, 4);
    s += droplets(900, 620, 300, 14, rand, 1.5, 4.5);

    return s;
  }

  global.Splat = { build: build, mulberry32: mulberry32 };
})(window);
