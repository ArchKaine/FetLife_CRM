// ==UserScript==
// @name         FetLife CRM Card Display Toggle
// @namespace    local.fl.card.display
// @version      1.0.0
// @description  Adds a toggle for inline card display to use either full detail or minimal dot-only indicators while leaving profile pages and the CRM unchanged.
// @match        https://fetlife.com/*
// @match        https://*.fetlife.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const MODE_KEY = 'flx_card_display_mode';
  const DEFAULT_MODE = 'full';
  const VALID_MODES = new Set(['full', 'minimal', 'off']);

  function readMode() {
    try {
      if (typeof GM_getValue === 'function') {
        const value = GM_getValue(MODE_KEY, DEFAULT_MODE);
        if (VALID_MODES.has(value)) return value;
      }
    } catch (e) {
      console.warn('[FLX card mode] GM_getValue failed:', e);
    }

    try {
      const raw = localStorage.getItem(`flx_${MODE_KEY}`);
      if (!raw) return DEFAULT_MODE;
      const parsed = JSON.parse(raw);
      return VALID_MODES.has(parsed) ? parsed : DEFAULT_MODE;
    } catch (e) {
      console.warn('[FLX card mode] localStorage read failed:', e);
      return DEFAULT_MODE;
    }
  }

  function writeMode(mode) {
    const nextMode = VALID_MODES.has(mode) ? mode : DEFAULT_MODE;

    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(MODE_KEY, nextMode);
      }
    } catch (e) {
      console.warn('[FLX card mode] GM_setValue failed:', e);
    }

    try {
      localStorage.setItem(`flx_${MODE_KEY}`, JSON.stringify(nextMode));
    } catch (e) {
      console.warn('[FLX card mode] localStorage write failed:', e);
    }
  }

  function getModeLabel(mode) {
    if (mode === 'minimal') return 'Minimal';
    if (mode === 'off') return 'Off';
    return 'Full';
  }

  function isProfileOrCrmToolbar(bar) {
    return !!(
      bar.closest('.flx-profile-bar') ||
      bar.closest('.flx-chat-context') ||
      bar.closest('#flx-crm-host') ||
      bar.closest('#flx-hud-host')
    );
  }

  function shouldKeepNode(node, isMinimal) {
    if (!isMinimal) return true;

    if (node.tagName === 'BUTTON' || node.tagName === 'SELECT') return true;

    if (node.tagName === 'SPAN') {
      const hasDotCluster = !!node.querySelector('span') && typeof node.title === 'string' && node.title.includes(':');
      if (hasDotCluster) return true;
      const text = (node.textContent || '').trim();
      if (!text) return false;
      return false;
    }

    if (node.tagName === 'DIV') {
      const noteLike = !!(node.style && node.style.whiteSpace === 'pre-wrap' && node.style.borderLeft !== '');
      return !noteLike;
    }

    return true;
  }

  function applyMinimalMode(mode) {
    const bars = Array.from(document.querySelectorAll('.flx-toolbar'));
    for (const bar of bars) {
      if (isProfileOrCrmToolbar(bar)) continue;

      const nodes = Array.from(bar.children);
      if (mode === 'minimal') {
        bar.classList.add('flx-card-minimal');
        for (const node of nodes) {
          if (shouldKeepNode(node, true)) {
            node.style.display = '';
          } else {
            node.style.display = 'none';
          }
        }
      } else {
        bar.classList.remove('flx-card-minimal');
        for (const node of nodes) {
          node.style.display = '';
        }
      }
    }
  }

  function ensureToggleButton() {
    if (document.getElementById('flx-card-toggle-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'flx-card-toggle-btn';
    btn.type = 'button';
    btn.title = 'Toggle inline card detail mode';
    btn.textContent = 'Cards: Full';
    btn.style.cssText = [
      'position:fixed',
      'right:18px',
      'bottom:18px',
      'z-index:2147483647',
      'padding:6px 10px',
      'border:1px solid #37373d',
      'border-radius:8px',
      'background:rgba(20,20,24,0.96)',
      'color:#e4e4e7',
      'font:12px/1.2 system-ui,-apple-system,sans-serif',
      'cursor:pointer',
      'box-shadow:0 8px 24px rgba(0,0,0,0.45)',
    ].join(';');

    btn.addEventListener('click', () => {
      const current = readMode();
      const next = current === 'full' ? 'minimal' : 'full';
      writeMode(next);
      applyMinimalMode(next);
      btn.textContent = `Cards: ${getModeLabel(next)}`;
    });

    document.body.appendChild(btn);
    return btn;
  }

  function updateToggleButton() {
    const btn = document.getElementById('flx-card-toggle-btn');
    if (!btn) return;
    const mode = readMode();
    btn.textContent = `Cards: ${getModeLabel(mode)}`;
  }

  function startup() {
    const mode = readMode();
    const btn = ensureToggleButton();
    if (btn) btn.textContent = `Cards: ${getModeLabel(mode)}`;
    applyMinimalMode(mode === 'off' ? 'full' : mode);

    const observer = new MutationObserver(() => {
      applyMinimalMode(readMode() === 'off' ? 'full' : readMode());
      updateToggleButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('keydown', (event) => {
      if (event.altKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        const current = readMode();
        const next = current === 'minimal' ? 'full' : 'minimal';
        writeMode(next);
        applyMinimalMode(next);
        updateToggleButton();
      }
    });
  }

  startup();
})();
