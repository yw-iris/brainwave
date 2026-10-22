/* =========================================================
   main.js — BRAINWAVE 标题界面交互
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const THEMES = ['cream', 'peach', 'night'];
  const scene = $('#scene');
  const splatLayer = $('#splatLayer');
  const menuItems = $$('.mi');
  const tagline = $('.l-tagline');
  const boot = $('#boot');
  const bootBar = $('#bootBar');
  const bootHint = $('#bootHint');
  const flash = $('#flash');
  const panels = { records: $('#panelRecords'), settings: $('#panelSettings') };

  let themeIdx = 0;
  let focusIdx = 0;
  let autoTimer = null;
  let busy = false;          // 面板 / 开机动画期间暂停主题轮播
  let bootActive = false;
  let introDone = false;

  const prefs = { music: true, sfx: true, shake: false, autocycle: true, fullscreen: false };

  /* ---------------- 涂鸦层 ---------------- */
  if (window.Splat) splatLayer.innerHTML = window.Splat.build();

  /* ---------------- 主题 ---------------- */
  function applyTheme(name, opts) {
    opts = opts || {};
    const idx = THEMES.indexOf(name);
    if (idx < 0) return;
    themeIdx = idx;
    scene.dataset.theme = name;
    try { localStorage.setItem('bw-theme', name); } catch (e) { /* 隐私模式忽略 */ }
    $$('.sw').forEach(s => s.classList.toggle('is-on', s.dataset.theme === name));
    if (!opts.silent) {
      scene.classList.remove('is-shifting');
      void scene.offsetWidth;
      scene.classList.add('is-shifting');
      setTimeout(() => scene.classList.remove('is-shifting'), 620);
    }
  }

  function nextTheme() {
    applyTheme(THEMES[(themeIdx + 1) % THEMES.length]);
  }

  function stopAutoCycle(syncToggle) {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    if (syncToggle) {
      const box = $('input[data-toggle="autocycle"]');
      if (box && box.checked) {
        box.checked = false;
        prefs.autocycle = false;
      }
    }
  }

  function startAutoCycle() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    if (!prefs.autocycle) return;
    autoTimer = setInterval(() => {
      if (!busy && !document.hidden && introDone) nextTheme();
    }, 4200);
  }

  /* ---------------- 入场 ---------------- */
  function playIntro() {
    const k = slow || 1;
    if (frame > 0) {
      /* 定格模式：不跑 CSS 入场动画，直接落到终态；
         喷射揭示由 JS 按 frame 手动设置 rx/ry（见下方 frame 分支）。 */
      scene.classList.add('is-settled');
      introDone = true;
      return;
    }
    scene.classList.add('is-intro');
    setTimeout(() => scene.classList.add('is-in'), 140 * k);
    setTimeout(() => {
      scene.classList.remove('is-intro');
      introDone = true;
      startAutoCycle();
    }, 3000 * k);
  }

  /* ---------------- 菜单 ---------------- */
  function focusItem(i) {
    focusIdx = (i + menuItems.length) % menuItems.length;
    menuItems.forEach((m, k) => m.classList.toggle('is-active', k === focusIdx));
  }

  function activate(i) {
    const btn = menuItems[i];
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'theme') {
      stopAutoCycle(true);
      nextTheme();
    } else if (action === 'records') {
      openPanel('records');
    } else if (action === 'settings') {
      openPanel('settings');
    }
  }

  menuItems.forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => focusItem(i));
    btn.addEventListener('click', () => { focusItem(i); activate(i); });
  });

  if (tagline) {
    tagline.style.pointerEvents = 'auto';
    tagline.style.cursor = 'pointer';
    tagline.addEventListener('click', () => newGame());
  }

  /* ---------------- 面板 ---------------- */
  function openPanel(key) {
    busy = true;
    Object.keys(panels).forEach(k => { panels[k].hidden = (k !== key); });
    const first = panels[key].querySelector('input,button');
    if (first) setTimeout(() => first.focus(), 60);
  }

  function closePanels() {
    Object.keys(panels).forEach(k => { panels[k].hidden = true; });
    busy = false;
  }

  $$('[data-close]').forEach(b => b.addEventListener('click', closePanels));
  Object.keys(panels).forEach(k => {
    panels[k].addEventListener('click', e => { if (e.target === panels[k]) closePanels(); });
  });

  /* ---------------- 新游戏 / 开机动画 ---------------- */
  function newGame() {
    if (bootActive) return;
    bootActive = true;
    busy = true;
    boot.hidden = false;
    bootBar.style.width = '0%';
    bootHint.textContent = '加载中…';
    flash.classList.remove('is-flash');
    void flash.offsetWidth;
    flash.classList.add('is-flash');

    let p = 0;
    const t = setInterval(() => {
      p = Math.min(100, p + 4 + Math.random() * 13);
      bootBar.style.width = p.toFixed(0) + '%';
      if (p >= 100) {
        clearInterval(t);
        bootHint.textContent = '按任意键 / 点击屏幕返回标题';
      }
    }, 150);
  }

  function endBoot() {
    if (!bootActive) return;
    bootActive = false;
    boot.hidden = true;
    busy = false;
    flash.classList.remove('is-flash');
    void flash.offsetWidth;
    flash.classList.add('is-flash');
  }

  boot.addEventListener('click', endBoot);

  /* ---------------- 设置项 ---------------- */
  $$('input[data-toggle]').forEach(inp => {
    inp.addEventListener('change', () => {
      prefs[inp.dataset.toggle] = inp.checked;
      if (inp.dataset.toggle === 'autocycle') {
        if (inp.checked) startAutoCycle(); else stopAutoCycle();
      }
      if (inp.dataset.toggle === 'fullscreen' && inp.checked) toggleFullscreen();
    });
  });

  $$('.sw').forEach(sw => {
    sw.addEventListener('click', () => {
      stopAutoCycle(true);
      applyTheme(sw.dataset.theme);
    });
  });

  /* ---------------- 全屏 ---------------- */
  const viewport = $('#viewport');
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (viewport.requestFullscreen) viewport.requestFullscreen().catch(() => {});
      else if (viewport.webkitRequestFullscreen) viewport.webkitRequestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
  $('#watchAll').addEventListener('click', toggleFullscreen);
  scene.addEventListener('dblclick', toggleFullscreen);

  /* ---------------- 操作提示 ---------------- */
  const hint = $('#hint');
  if (hint) {
    setTimeout(() => hint.classList.add('is-gone'), 7000);
  }

  /* ---------------- 键盘 ---------------- */
  document.addEventListener('keydown', e => {
    if (bootActive) { e.preventDefault(); endBoot(); return; }
    if (e.key === 'Escape') { closePanels(); return; }
    if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault(); focusItem(focusIdx + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault(); focusItem(focusIdx - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const open = Object.keys(panels).find(k => !panels[k].hidden);
      if (open) closePanels(); else activate(focusIdx);
    }
  });

  /* ---------------- 鼠标视差 ---------------- */
  let px = 0, py = 0, tx = 0, ty = 0, raf = null;
  function loop() {
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    scene.style.setProperty('--px', px.toFixed(2));
    scene.style.setProperty('--py', py.toFixed(2));
    raf = requestAnimationFrame(loop);
  }
  scene.addEventListener('mousemove', e => {
    const r = scene.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  scene.addEventListener('mouseleave', () => { tx = 0; ty = 0; });
  if (window.matchMedia('(hover:none)').matches) { tx = 0; ty = 0; }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stopAutoCycle(); } else { startAutoCycle(); }
  });

  /* ---------------- 启动 ---------------- */
  const params = new URLSearchParams(location.search);
  const slow = Math.min(20, Math.max(0, parseFloat(params.get('slow') || '0') || 0));
  const frame = Math.max(0, parseFloat(params.get('frame') || '0') || 0);

  /* 三次贝塞尔缓动求值（与 SMIL keySplines 保持一致，用于逐帧定格） */
  function cubicBezier(x1, y1, x2, y2) {
    const A = (a, b) => 1 - 3 * b + 3 * a;
    const B = (a, b) => 3 * b - 6 * a;
    const C = a => 3 * a;
    const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
    const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 12; i++) {
        const s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s;
        if (t < 0) t = 0; else if (t > 1) t = 1;
      }
      return calc(t, y1, y2);
    };
  }

  function injectCss(css) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  if (frame > 0) {
    /* 定格模式：把入场动画冻结在第 F 秒（由 playIntro 用 WAAPI 精确定位） */
    const anim = document.getElementById('bwSprayAnim');
    if (anim) anim.remove();
    const animY = document.getElementById('bwSprayAnimY');
    if (animY) animY.remove();
    const dot = document.getElementById('bwSprayDot');
    if (dot && window.Splat) {
      const R = window.Splat.REVEAL;
      const u = Math.min(1, Math.max(0, (frame - R.begin) / R.dur));
      const easeX = cubicBezier(0.16, 0.88, 0.2, 1);
      const easeY1 = cubicBezier(0.2, 0.8, 0.3, 1);
      const easeY2 = cubicBezier(0.25, 0.92, 0.35, 1);
      let rx = R.rx * easeX(u);
      let ry;
      if (u < 0.26) ry = 46 * easeY1(u / 0.26);
      else ry = 46 + (R.ry - 46) * easeY2((u - 0.26) / 0.74);
      dot.setAttribute('rx', rx.toFixed(1));
      dot.setAttribute('ry', ry.toFixed(1));
    }
  } else if (slow > 0) {
    /* 慢放入场动画，便于演示 / 逐帧检查：?slow=4 */
    document.documentElement.style.setProperty('--slow', String(slow));
    injectCss([
      '.scene.is-intro .l-band{animation-duration:calc(.9s * var(--slow)) !important;animation-delay:0s !important;}',
      '.scene.is-intro .l-face{animation-duration:calc(.8s * var(--slow)) !important;animation-delay:calc(.1s * var(--slow)) !important;}',
      '.scene.is-intro .l-splat .arc{animation-duration:calc(.62s * var(--slow)) !important;animation-delay:calc(.8s * var(--slow)) !important;}',
      '.scene.is-intro .l-title{animation-duration:calc(.72s * var(--slow)) !important;animation-delay:calc(.95s * var(--slow)) !important;}',
      '.scene.is-intro .l-title-shadow{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.06s * var(--slow)) !important;}',
      '.scene.is-intro .l-tagline{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.4s * var(--slow)) !important;}',
      '.scene.is-intro .l-strip{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.85s * var(--slow)) !important;}',
      '.scene.is-intro .l-version{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.93s * var(--slow)) !important;}',
      '.scene.is-intro .mi{animation-duration:calc(.45s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(1){animation-delay:calc(1.55s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(2){animation-delay:calc(1.65s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(3){animation-delay:calc(1.75s * var(--slow)) !important;}',
    ].join('\n'));
    /* 喷射遮罩是 SMIL 动画，一并放慢 */
    ['bwSprayAnim', 'bwSprayAnimY'].forEach(id => {
      const a = document.getElementById(id);
      if (a) {
        a.setAttribute('dur', (0.5 * slow).toFixed(3) + 's');
        a.setAttribute('begin', (0.45 * slow).toFixed(3) + 's');
      }
    });
  }

  const qs = params.get('theme');
  const stored = (() => { try { return localStorage.getItem('bw-theme'); } catch (e) { return null; } })();
  const initial = (qs && THEMES.indexOf(qs) >= 0) ? qs
                : (stored && THEMES.indexOf(stored) >= 0) ? stored : 'cream';

  applyTheme(initial, { silent: true });
  if (qs && THEMES.indexOf(qs) >= 0) {
    /* 显式指定主题时不再自动轮播 */
    prefs.autocycle = false;
    const box = $('input[data-toggle="autocycle"]');
    if (box) box.checked = false;
  }
  focusItem(0);
  playIntro();
  if (!frame) setTimeout(() => { if (prefs.autocycle) startAutoCycle(); }, 3000 * (slow || 1));
})();
