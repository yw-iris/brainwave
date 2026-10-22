/* =========================================================
   main.js — BRAINWAVE 标题界面交互
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const THEMES = ['blue', 'green', 'red'];
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
    scene.classList.add('is-intro');
    setTimeout(() => scene.classList.add('is-in'), 140 * k);
    if (frame > 0) {
      /* 定格模式：保持 is-intro，用 WAAPI 把每条动画定格在第 F 秒 */
      setTimeout(() => {
        document.getAnimations().forEach(a => {
          try { a.pause(); a.currentTime = frame * 1000; } catch (e) { /* ignore */ }
        });
      }, 90);
      introDone = true;
      return;
    }
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

  function injectCss(css) {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
  }

  if (frame > 0) {
    /* 定格模式：把入场动画冻结在第 F 秒（由 playIntro 用 WAAPI 精确定位） */
    const anim = document.getElementById('bwSprayAnim');
    if (anim) anim.remove();
    const dot = document.getElementById('bwSprayDot');
    if (dot) {
      const u = (frame - 0.15) / 0.62;
      let r = 0;
      if (u >= 1) r = 1500;
      else if (u > 0) r = u < 0.72 ? 1340 * (u / 0.72) : 1340 + 160 * ((u - 0.72) / 0.28);
      dot.setAttribute('r', r.toFixed(1));
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
      '.scene.is-intro .l-title-wrap::after{animation-duration:calc(.68s * var(--slow)) !important;animation-delay:calc(1.3s * var(--slow)) !important;}',
      '.scene.is-intro .l-tagline{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.4s * var(--slow)) !important;}',
      '.scene.is-intro .l-strip{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.85s * var(--slow)) !important;}',
      '.scene.is-intro .l-version{animation-duration:calc(.5s * var(--slow)) !important;animation-delay:calc(1.93s * var(--slow)) !important;}',
      '.scene.is-intro .mi{animation-duration:calc(.45s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(1){animation-delay:calc(1.55s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(2){animation-delay:calc(1.65s * var(--slow)) !important;}',
      '.scene.is-intro .mi:nth-child(3){animation-delay:calc(1.75s * var(--slow)) !important;}',
    ].join('\n'));
    /* 喷射遮罩是 SMIL 动画，一并放慢 */
    const anim = document.getElementById('bwSprayAnim');
    if (anim) {
      anim.setAttribute('dur', (0.62 * slow).toFixed(3) + 's');
      anim.setAttribute('begin', (0.15 * slow).toFixed(3) + 's');
    }
  }

  const qs = params.get('theme');
  const stored = (() => { try { return localStorage.getItem('bw-theme'); } catch (e) { return null; } })();
  const initial = (qs && THEMES.indexOf(qs) >= 0) ? qs
                : (stored && THEMES.indexOf(stored) >= 0) ? stored : 'blue';

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
