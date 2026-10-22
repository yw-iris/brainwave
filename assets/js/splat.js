/* =========================================================
   splat.js — 程序化生成「喷射」墨迹
   参考视频：油漆自角色嘴部向右爆射，笔触为硬边像素化喷漆。
   质感——方块状飞边、水平飞白拖痕、脱离主体的碎块与液滴。
   揭示方式：椭圆遮罩自原点向右单向扩张（先细长射流，再炸开成墨团）。
   固定随机种子，保证每次刷新形状一致。
   ========================================================= */
(function (global) {
  'use strict';

  const ORIGIN_X = 545;   /* 喷射原点（画面 1600×900 坐标系）——角色嘴部右侧轮廓线 */
  const ORIGIN_Y = 420;
  const REVEAL_RX = 1560; /* 揭示椭圆最终半径 */
  const REVEAL_RY = 480;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------- 硬边墨块主体：返回点集 ---------- */
  function massPoints(cx, cy, r, rand, n, squash) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.28;
      const rr = r * (0.60 + rand() * 0.66);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * (squash || 1)]);
    }
    return pts;
  }

  function polyPath(pts) {
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 1; i < pts.length; i++) d += 'L' + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return d + 'Z';
  }

  /* ---------- 方块飞边：沿轮廓撒小方块，模拟喷漆笔触的锯齿边 ---------- */
  function edgeBlocks(pts, rand, density, size) {
    let out = '';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.round(seg / (size * (0.6 + rand() * 0.8))));
      for (let k = 0; k < n; k++) {
        if (rand() > density) continue;
        const t = rand();
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        const s = size * (0.4 + rand() * 1.5);
        const rot = Math.floor(rand() * 4) * 45;
        out += '<rect x="' + f(x - s / 2) + '" y="' + f(y - s / 2) + '" width="' + f(s) +
               '" height="' + f(s * (0.45 + rand() * 0.8)) + '" transform="rotate(' + rot + ' ' + f(x) + ' ' + f(y) + ')"/>';
      }
    }
    return out;
  }

  /* ---------- 水平飞白拖痕：漆被甩出去留下的长条 ---------- */
  function streak(x, y, len, h, rand) {
    let out = '';
    let cx = x;
    let ch = h;
    while (cx < x + len) {
      const seg = 30 + rand() * 120;
      const w = Math.min(seg, x + len - cx);
      out += '<rect x="' + f(cx) + '" y="' + f(y - ch / 2 + (rand() - 0.5) * 4) + '" width="' + f(w) +
             '" height="' + f(ch) + '"/>';
      cx += w * (0.7 + rand() * 0.5);
      ch *= 0.62 + rand() * 0.35;
      if (ch < 1.6) break;
    }
    return out;
  }

  /* ---------- 碎块与液滴 ---------- */
  function bits(cx, cy, spread, count, rand, sMin, sMax) {
    let out = '';
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const d = spread * (0.25 + rand() * 0.95);
      const x = cx + Math.cos(a) * d * 1.3;
      const y = cy + Math.sin(a) * d * 0.8;
      const s = sMin + rand() * (sMax - sMin);
      if (rand() < 0.72) {
        out += '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(s) + '" height="' + f(s * (0.5 + rand() * 0.9)) + '"/>';
      } else {
        out += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(s * 0.5) + '"/>';
      }
    }
    return out;
  }

  /* ---------------- 喷射墨迹图层 ---------------- */
  function build() {
    const rand = mulberry32(20260418);
    const ox = ORIGIN_X, oy = ORIGIN_Y;
    let s = '';

    /* 揭示遮罩：自原点向右单向扩张的椭圆。
       rx 先行拉长（细长射流），ry 后半程炸开（大团墨迹）。
       注意：fill 必须用 style 内联，否则会被 .l-splat ellipse 规则染成主题色，
       导致遮罩亮度不足、整片墨迹变成半透明。 */
    s += '<defs><mask id="bwSpray" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2200" height="1400">';
    s += '<ellipse id="bwSprayDot" cx="' + ox + '" cy="' + oy + '" rx="0" ry="0" style="fill:#fff">';
    s += '<animate id="bwSprayAnim" attributeName="rx" values="0;' + REVEAL_RX + '" keyTimes="0;1" ';
    s += 'calcMode="spline" keySplines="0.16 0.88 0.2 1" dur="0.5s" begin="0.45s" fill="freeze"/>';
    s += '<animate id="bwSprayAnimY" attributeName="ry" values="0;46;' + REVEAL_RY + '" keyTimes="0;0.26;1" ';
    s += 'calcMode="spline" keySplines="0.2 0.8 0.3 1;0.25 0.92 0.35 1" dur="0.5s" begin="0.45s" fill="freeze"/>';
    s += '</ellipse></mask></defs>';

    s += '<g mask="url(#bwSpray)">';

    /* 1. 主体墨块（硬边多边形，位置对齐参考视频右侧的黄色墨团） */
    const m1 = massPoints(950, 480, 290, rand, 17, 0.90);
    const m2 = massPoints(1250, 620, 250, rand, 14, 0.95);
    const m3 = massPoints(1355, 330, 175, rand, 12, 0.95);
    const m4 = massPoints(700, 420, 125, rand, 10, 0.9);
    const m5 = massPoints(1080, 800, 150, rand, 11, 0.9);
    s += '<path d="' + polyPath(m1) + '"/>';
    s += '<path d="' + polyPath(m2) + '"/>';
    s += '<path d="' + polyPath(m3) + '"/>';
    s += '<path d="' + polyPath(m4) + '"/>';
    s += '<path d="' + polyPath(m5) + '"/>';

    /* 2. 飞边方块 */
    s += edgeBlocks(m1, rand, 0.75, 13);
    s += edgeBlocks(m2, rand, 0.70, 11);
    s += edgeBlocks(m3, rand, 0.70, 9);
    s += edgeBlocks(m4, rand, 0.60, 8);
    s += edgeBlocks(m5, rand, 0.62, 10);

    /* 3. 喷口射流：自嘴部向右甩出的细长条 */
    for (let i = 0; i < 14; i++) {
      const y = oy - 72 + rand() * 144;
      s += streak(ox - 10 + rand() * 95, y, 180 + rand() * 520, 4 + rand() * 15, rand);
    }

    /* 4. 水平飞白拖痕：贯穿整个墨区的长条 */
    for (let i = 0; i < 20; i++) {
      const y = 150 + rand() * 620;
      const x = ox + 10 + rand() * 430;
      const len = 170 + rand() * 480;
      const h = 4 + rand() * 17;
      s += streak(x, y, len, h, rand);
    }

    /* 5. 脱离主体的碎块与液滴 */
    s += bits(950, 460, 360, 44, rand, 4, 16);
    s += bits(1250, 620, 300, 26, rand, 4, 14);
    s += bits(1355, 330, 240, 18, rand, 3, 11);
    s += bits(1450, 880, 240, 14, rand, 3, 11);

    /* 6. 顶部 / 边缘的粗大飞白块（参考视频右上那几块） */
    s += '<rect x="1210" y="22" width="215" height="25"/>';
    s += '<rect x="1395" y="8" width="150" height="17"/>';
    s += '<rect x="1465" y="62" width="170" height="19"/>';
    s += '<rect x="1330" y="52" width="86" height="13"/>';

    /* 7. 底部垂挂的漆滴 */
    for (let i = 0; i < 9; i++) {
      const x = 780 + rand() * 700;
      const h = 36 + rand() * 110;
      s += '<rect x="' + f(x) + '" y="790" width="' + f(8 + rand() * 16) + '" height="' + f(h) + '"/>';
    }

    s += '</g>';

    /* 8. 角色甩出的蓝色弧线（自嘴部掠向画面右上方）。
          起点在角色嘴上，但角色图层在其之上，弧线会从角色身后钻出。 */
    s += '<path class="arc" pathLength="1" d="M265,424 C540,610 900,220 1570,45"/>';

    return s;
  }

  global.Splat = {
    build: build,
    mulberry32: mulberry32,
    ORIGIN: { x: ORIGIN_X, y: ORIGIN_Y },
    REVEAL: { rx: REVEAL_RX, ry: REVEAL_RY, begin: 0.45, dur: 0.5 }
  };
})(window);
