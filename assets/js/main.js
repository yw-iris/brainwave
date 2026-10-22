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
    scene.classList.add('is-intro');
    setTimeout(() => scene.classList.add('is-in'), 140);
    setTimeout(() => {
      scene.classList.remove('is-intro');
      introDone = true;
      startAutoCycle();
    }, 3000);
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

  /* ---------------- 关注按钮 ---------------- */
  const followBtn = $('#followBtn');
  if (followBtn) {
    followBtn.addEventListener('click', () => {
      const on = followBtn.classList.toggle('is-followed');
      followBtn.textContent = on ? '已关注' : '关注';
    });
  }

  /* ---------------- 键盘 ---------------- */
  document.addEventListener('keydown', e => {
    if (bootActive) { e.preventDefault(); endBoot(); return; }
    if (e.key === 'Escape') { closePanels(); return; }
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
  const qs = new URLSearchParams(location.search).get('theme');
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
  setTimeout(() => { if (prefs.autocycle) startAutoCycle(); }, 3000);
})();
