/* =========================================================
   splat.js — 程序化生成「喷射」墨迹
   参考视频：油漆自角色嘴部向右爆射。
   形态——一把自喷口散开的扇形：
     1) 扇心为致密实心块，由大量相互重叠的水平笔触堆叠而成
     2) 越靠近中轴，笔触越长越厚；越靠外围越短越细（干笔飞白）
     3) 笔触末端自然收细、留少量断口，形成视频里的"干刷"毛边
     4) 只有极少数零散方块与圆点碎片，避免整体发脏
   揭示方式：椭圆遮罩自喷口向右单向扩张。
   固定随机种子，保证每次刷新形状一致。
   ========================================================= */
(function (global) {
  'use strict';

  const ORIGIN_X = 520;   /* 喷口（画面 1600×900 坐标系）——角色脸右侧轮廓 */
  const ORIGIN_Y = 395;
  const SPREAD = 330;     /* 扇形上下半展 */
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

  /* ---------- 水平笔触：一段有厚度的横条
       gap   —— 相邻笔触之间的断口比例（0 = 完全无缝堆叠）
       taper —— 厚度递减系数（1 = 基本不收细） ---------- */
  function bar(x, y, len, h, rand, gap, taper) {
    let out = '';
    let cx = x;
    let ch = h;
    let guard = 0;
    while (cx < x + len && guard++ < 30) {
      const seg = 90 + rand() * 250;
      const w = Math.min(seg, x + len - cx);
      const dy = (rand() - 0.5) * h * 0.45;
      out += '<rect x="' + f(cx) + '" y="' + f(y - ch / 2 + dy) + '" width="' + f(w) +
             '" height="' + f(ch) + '"/>';
      cx += w * (1 - (gap || 0)) * (0.98 + rand() * 0.02);
      ch *= (taper || 0.96) + rand() * 0.04;
      if (ch < 3) break;
    }
    return out;
  }

  /* ---------- 干笔飞白：细长、带明显断口的横条 ---------- */
  function streak(x, y, len, h, rand) {
    let out = '';
    let cx = x;
    let ch = h;
    let guard = 0;
    while (cx < x + len && guard++ < 20) {
      const seg = 40 + rand() * 150;
      const w = Math.min(seg, x + len - cx);
      out += '<rect x="' + f(cx) + '" y="' + f(y - ch / 2 + (rand() - 0.5) * 5) + '" width="' + f(w) +
             '" height="' + f(ch) + '"/>';
      cx += w * (0.62 + rand() * 0.42);
      ch *= 0.58 + rand() * 0.36;
      if (ch < 1.6) break;
    }
    return out;
  }

  /* ---------- 圆点碎片：粗糙的小圆片 ---------- */
  function blob(cx, cy, r, rand) {
    const n = 7 + Math.floor(rand() * 4);
    let d = 'M';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.72 + rand() * 0.5);
      d += (i ? 'L' : '') + f(cx + Math.cos(a) * rr) + ' ' + f(cy + Math.sin(a) * rr * 0.9);
    }
    return '<path d="' + d + 'Z"/>';
  }

  /* ---------------- 喷射墨迹图层 ---------------- */
  function build() {
    const rand = mulberry32(20260418);
    const ox = ORIGIN_X, oy = ORIGIN_Y;
    let s = '';

    /* 揭示遮罩：自喷口向右单向扩张的椭圆。
       fill 必须内联为白色，否则会被 .l-splat 规则染成主题色，
       导致遮罩亮度不足、整片墨迹变成半透明。 */
    s += '<defs><mask id="bwSpray" maskUnits="userSpaceOnUse" x="-300" y="-300" width="2400" height="1600">';
    s += '<ellipse id="bwSprayDot" cx="' + ox + '" cy="' + oy + '" rx="0" ry="0" style="fill:#fff">';
    s += '<animate id="bwSprayAnim" attributeName="rx" values="0;' + REVEAL_RX + '" keyTimes="0;1" ';
    s += 'calcMode="spline" keySplines="0.32 0.58 0.42 1" dur="0.5s" begin="0.45s" fill="freeze"/>';
    s += '<animate id="bwSprayAnimY" attributeName="ry" values="0;' + REVEAL_RY + '" keyTimes="0;1" ';
    s += 'calcMode="spline" keySplines="0.18 0.82 0.28 1" dur="0.5s" begin="0.45s" fill="freeze"/>';
    s += '</ellipse></mask></defs>';

    s += '<g mask="url(#bwSpray)">';

    /* 1. 扇心实心块：48 条水平肋条沿"张角"排布 —— 越靠中轴起点越靠左、越长越厚，
          右端落在一段参差的近竖线上，于是整体形成一把自喷口散开的扇形。 */
    for (let i = 0; i < 48; i++) {
      const t = (i + 0.5) / 48;
      const d = (t - 0.5) * 2 * SPREAD;      /* 相对喷口的上下偏移 */
      const ad = Math.abs(d) / SPREAD;        /* 0..1 */
      const x0 = ox + ad * SPREAD * 1.25 + rand() * 70;
      const endX = 1130 + rand() * 340;
      const len = Math.max(170, endX - x0);
      const h = 18 + (1 - ad) * 46 + rand() * 20;
      s += bar(x0, oy + d + (rand() - 0.5) * 20, len, h, rand, 0.0, 0.99);
    }

    /* 2. 扇形上下缘的长飞白：更细、更长、带明显断口 */
    for (let i = 0; i < 16; i++) {
      const up = rand() < 0.5;
      const ad = 0.62 + rand() * 0.62;
      const y = oy + (up ? ad : -ad) * SPREAD;
      const x = ox + ad * SPREAD * 1.45 + rand() * 150;
      const len = 320 + rand() * 600;
      const h = 8 + rand() * 18;
      s += streak(x, y, len, h, rand);
    }

    /* 3. 右缘伸出的长短手指 */
    for (let i = 0; i < 10; i++) {
      const d = (rand() - 0.5) * 2 * SPREAD;
      const y = oy + d;
      const x = 1330 + rand() * 300;
      const len = 130 + rand() * 330;
      const h = 10 + rand() * 26;
      s += bar(x, y, len, h, rand, 0.15, 0.9);
    }

    /* 4. 扇形外缘的少量圆点碎片（视频右下角那种脱离的小圆块） */
    const spots = [
      [1195, 806, 22], [1272, 748, 15], [1452, 690, 16], [1520, 442, 13],
      [1548, 318, 10], [1096, 742, 11], [1436, 806, 9]
    ];
    for (const sp of spots) s += blob(sp[0], sp[1], sp[2], rand);

    /* 5. 极少量方块飞边：只钉在扇形外轮廓上，给画面一点像素颗粒 */
    const blocks = [
      [1215, 58, 168, 20], [1408, 32, 132, 14], [1500, 86, 120, 16],
      [964, 116, 74, 12], [1310, 240, 58, 11], [876, 636, 66, 11],
      [1424, 706, 52, 10], [1088, 54, 96, 13]
    ];
    for (const b of blocks) {
      s += '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '"/>';
    }

    s += '</g>';

    /* 6. 角色甩出的蓝色弧线（自嘴部掠向画面右上方） */
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
