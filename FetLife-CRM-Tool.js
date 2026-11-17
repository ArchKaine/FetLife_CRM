// ==UserScript==
// @name         FetLife Local Cache Filter & CRM
// @namespace    local.fl.enhancer
// @version      1.11.0
// @description  Zero-fetch passive profile & fetish caching, Fetishes-only red-kink exclusions, toggleable Minimal/Compact/Full card views, sticky profile controls, gender/age filtering, and searchable CRM modal
// @match        https://fetlife.com/*
// @match        https://*.fetlife.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  // =========================================================================
  // 1. PROFILE-TUNED DEFAULTS, PIPELINE STAGES, TEMPLATES & KEYBINDS
  // =========================================================================
  const PIPELINE_STAGES = [
    { id: 'shortlist', label: 'Shortlisted', short: '★ Shortlist', icon: '★', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.16)', border: '#b45309' },
    { id: 'messaged',  label: 'Messaged',    short: '✉ Messaged',  icon: '✉', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: '#0369a1' },
    { id: 'talking',   label: 'Talking',     short: '💬 Talking',   icon: '💬', color: '#34d399', bg: 'rgba(52, 211, 153, 0.16)', border: '#047857' },
    { id: 'met',       label: 'Met IRL',     short: '☕ Met IRL',   icon: '☕', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.16)', border: '#7e22ce' },
    { id: 'hidden',    label: 'Passed',      short: '✕ Pass',      icon: '✕', color: '#f87171', bg: 'rgba(248, 113, 113, 0.16)', border: '#b91c1c' }
  ];

  const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, s]));

  const VIEW_MODES = ['full', 'compact', 'minimal'];
  const VIEW_MODE_LABELS = {
    full: 'View: Full',
    compact: 'View: Compact',
    minimal: 'View: Minimal',
    off: 'View: Off'
  };

  const DEFAULT_HIGHLIGHT_RULES = [
    {
      id: 'values',
      label: 'Family / Vee',
      color: '#f59e0b',
      keywords: [
        'closed vee', 'polyfidelity', 'three-parent', 'co-parent', 'co-parenting',
        'motherhood', 'want kids', 'biological dad', 'platonic meta', 'long-term', 'loyal'
      ]
    },
    {
      id: 'kink',
      label: 'Sensation / Play',
      color: '#a855f7',
      keywords: [
        'non-d/s', 'sensation', 'edging', 'violet wand', 'estim', 'e-stim',
        'garment leather', 'leather', 'fluid-positive', 'squirting', 'voyeur', 'switch'
      ]
    },
    {
      id: 'lifestyle',
      label: 'Sober / Lifestyle',
      color: '#10b981',
      keywords: [
        'zero proof', 'sober', 'alcohol-free', 'drug-free', 'substance-free',
        'straight edge', 'clothing-optional', 'nudist', 'nude yoga', 'homeschool',
        'evidence-based', 'bodily autonomy'
      ]
    },
    {
      id: 'neurotype',
      label: 'Neurotype / Style',
      color: '#fb7185',
      keywords: [
        'neurodivergent', 'autistic', 'autism', 'low-masking', 'intj', 'literal',
        'plain english', 'direct communication', 'blunt', 'no mind games',
        'analytical', 'engineer'
      ]
    },
    {
      id: 'local',
      label: 'Local / PDX',
      color: '#38bdf8',
      keywords: [
        'portland', 'pdx', 'oregon', 'pnw', 'pacific northwest',
        'beaverton', 'hillsboro', 'vancouver', 'zero proof munch'
      ]
    },
    {
      id: 'geek',
      label: 'Geek / Metal',
      color: '#2dd4bf',
      keywords: [
        '3d print', 'coding', 'software', 'computer science', 'sci-fi',
        'doom metal', 'industrial metal', 'heavy metal', 'tinkerer', 'dark chocolate'
      ]
    }
  ];

  const DEFAULT_EXCLUDE_KEYWORDS = [
    'findom', 'paypig', 'tribute',
    'restraint', 'ropes', 'shibari', 'blindfold', 'sensory deprivation',
    'impact play', 'flogger', 'paddle', 'masochism', 'watersports', 'scat',
    'ddlg', 'daddy/little', 'tpe', '24/7', 'protocols',
    '420', 'stoner'
  ];

  const DEFAULT_MESSAGE_TEMPLATES = [
    {
      id: 'tpl_munch',
      title: 'PDX Zero Proof Munch / Local Hello',
      body: "Hey {username} — saw your profile and noticed we're both local to the PDX area. Michele and I regularly attend the PDX Zero Proof Munch if you ever want a low-stakes hello in a safe, alcohol-free public room, or happy to meet up at a quiet café for hot cocoa sometime. No pressure at all—just wanted to say hi."
    },
    {
      id: 'tpl_writings',
      title: 'About + Writings Pointer',
      body: "Hi {username} — appreciated what you shared in your About section. If you're curious where my head is at, I put together two short pieces in my Writings ('I want a family, not a playmate' and 'Dad Mode') that lay out what I'm looking for plainly. Would love to hear your thoughts if any of it resonates."
    },
    {
      id: 'tpl_coffee',
      title: 'Direct Quiet Café / Cocoa Invite',
      body: "Hey {username} — I'm straightforward and not big on noisy crowds, so figured I'd reach out directly. Would you be up for a low-pressure coffee or hot cocoa sometime to see if our gears mesh?"
    }
  ];

  const DEFAULT_KEYBINDS = {
    navEnabled: true,
    toggleCrm: 'Alt+C',
    cycleView: 'v',
    nextCard: 'j',
    prevCard: 'k',
    toggleMinimal: 'm',
    shortlist: 's',
    pass: 'x',
    cycleGender: 'f',
    note: 'n',
    openTab: 'o'
  };

  const KEYBIND_LABELS = [
    { key: 'toggleCrm',     label: 'Toggle CRM Modal' },
    { key: 'cycleView',     label: 'Cycle Global Card View' },
    { key: 'nextCard',      label: 'Next Card in List' },
    { key: 'prevCard',      label: 'Previous Card in List' },
    { key: 'toggleMinimal', label: 'Toggle Focused Card Minimal' },
    { key: 'shortlist',     label: 'Shortlist Focused Card' },
    { key: 'pass',          label: 'Pass / Hide Focused Card' },
    { key: 'cycleGender',   label: 'Cycle Gender (♀/♂/⚧/Auto)' },
    { key: 'note',          label: 'Edit Note on Card' },
    { key: 'openTab',       label: 'Open Profile in New Tab' }
  ];

  const DEFAULT_SETTINGS = {
    excludeKeywords: DEFAULT_EXCLUDE_KEYWORDS,
    highlightRules: DEFAULT_HIGHLIGHT_RULES,
    messageTemplates: DEFAULT_MESSAGE_TEMPLATES,
    keybinds: DEFAULT_KEYBINDS,
    hideMode: 'dim',                  // 'dim' | 'collapse'
    dimOpacity: 0.18,                 // 0.05 to 0.75
    showHidden: false,
    hideNoAbout: false,
    genderFilter: 'female',           // 'all' | 'female' | 'male' | 'other'
    filterByAge: false,
    minAge: 30,
    maxAge: 45,
    paused: false,
    hudPosition: 'bottom-right',      // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    cardViewMode: 'full',             // 'full' | 'compact' | 'minimal' | 'off'
    cardToolbarPosition: 'top-sticky',// 'top-sticky' | 'top' | 'bottom'
    stickyProfileBar: true,
    showNotesInline: true,
    bioCacheTtlDays: 14
  };

  const RESERVED_PATHS = new Set([
    'search', 'groups', 'events', 'places', 'writings', 'pictures', 'videos',
    'conversations', 'notifications', 'settings', 'users', 'explore', 'feed',
    'ads', 'support', 'privacy', 'terms', 'p', 'kinks', 'requests', 'bookmarks',
    'activity', 'home', 'login', 'signup', 'tags', 'festivals', 'about', 'help',
    'guidelines', 'safety', 'merch', 'gift_certificates', 'supporters', 'glossary',
    'chat', 'live', 'contact', 'logout', 'api', 'assets', 'notifications_settings',
    'inbox', 'verify', 'languages', 'legal', 'kinktionary', 'tiles'
  ]);

  const PROFILE_SUBTABS = new Set([
    'posts', 'writings', 'l', 'lists', 'pictures', 'videos', 'kinks', 'fetishes',
    'friends', 'followers', 'following', 'activity', 'groups', 'events', 'wall',
    'collections', 'statuses', 'audios', 'profile', 'about'
  ]);

  const LOCAL_PDX_TERMS = [
    'portland', 'pdx', 'oregon', 'beaverton', 'hillsboro', 'lake oswego',
    'tigard', 'milwaukie', 'gresham', 'vancouver', 'oregon city', 'west linn'
  ];

  const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,36}$/;

  const HEADLINE_DEMO_RE = /^([1-9]\d)\s*(Cis\s*Female|Cis\s*Woman|Cis\s*Male|Cis\s*Man|Trans\s*Woman|Trans\s*Female|Trans\s*Man|Trans\s*Male|Non-binary|Nonbinary|Genderfluid|Genderqueer|Crossdresser|Transvestite|Intersex|Agender|Female|Woman|Male|Man|MtF|FtM|NB|GF|GQ|IS|AG|TG|TS|CD|TV|M|F)(?:\s+([A-Za-z][A-Za-z /-]{1,32}))?$/i;

  const OTHER_GENDER_RE = /\b(nb|non-?binary|mtf|ftm|trans\s*woman|trans\s*female|trans\s*man|trans\s*male|transgender|transsexual|gf|genderfluid|gq|genderqueer|ag|agender|is|intersex|cd|crossdresser|tv|transvestite|two-?spirit|amab|afab)\b/i;
  const FEMALE_GENDER_RE = /^(f|female|cis\s*f|cis\s*female|cisgender\s*female|woman|cis\s*woman|cisgender\s*woman)$/i;
  const MALE_GENDER_RE = /^(m|male|cis\s*m|cis\s*male|cisgender\s*male|man|cis\s*man|cisgender\s*man)$/i;

  const cardViewOverrides = new Map();

  // =========================================================================
  // 2. STICKY VIEWPORT TRACKER (SYNCS WITH FETLIFE'S #main-nav)
  // =========================================================================
  let stickyRafPending = false;
  let boundScrollEl = null;

  function syncStickyViewportOffset() {
    stickyRafPending = false;
    let offsetTop = 8;
    const nav = document.getElementById('main-nav');
    if (nav) {
      const rect = nav.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 0) {
        offsetTop = Math.round(rect.bottom) + 8;
      }
    }
    document.documentElement.style.setProperty('--flx-sticky-top', `${offsetTop}px`);
  }

  function scheduleStickySync() {
    if (stickyRafPending) return;
    stickyRafPending = true;
    requestAnimationFrame(syncStickyViewportOffset);
  }

  function attachScrollListeners() {
    const mainContent = document.getElementById('main-content');
    if (mainContent && boundScrollEl !== mainContent) {
      boundScrollEl = mainContent;
      mainContent.addEventListener('scroll', scheduleStickySync, { passive: true });
    }
  }

  window.addEventListener('scroll', scheduleStickySync, { passive: true });
  window.addEventListener('resize', scheduleStickySync, { passive: true });

  // =========================================================================
  // 3. GENDER CLASSIFICATION, KEYBIND HELPERS & PERSISTENT STORAGE
  // =========================================================================
  function classifyGenderToken(rawToken, explicitRowText = '') {
    const cleanToken = (rawToken || '').replace(/\s+/g, ' ').trim();
    const cleanRow = (explicitRowText || '').replace(/\s+/g, ' ').trim();
    const combined = `${cleanToken} ${cleanRow}`.trim();
    if (!combined) return { gender: null, genderCategory: null };

    if (OTHER_GENDER_RE.test(cleanToken) || OTHER_GENDER_RE.test(cleanRow)) {
      return { gender: cleanRow || cleanToken, genderCategory: 'other' };
    }
    if (FEMALE_GENDER_RE.test(cleanToken) || FEMALE_GENDER_RE.test(cleanRow)) {
      return { gender: cleanRow || cleanToken.toUpperCase(), genderCategory: 'female' };
    }
    if (MALE_GENDER_RE.test(cleanToken) || MALE_GENDER_RE.test(cleanRow)) {
      return { gender: cleanRow || cleanToken.toUpperCase(), genderCategory: 'male' };
    }
    return { gender: cleanRow || cleanToken || null, genderCategory: null };
  }

  function inferAutoGender(record, cachedBio, liveDemos = null) {
    if (liveDemos?.genderCategory) {
      return { gender: liveDemos.gender || null, genderCategory: liveDemos.genderCategory };
    }
    if (cachedBio?.genderCategory) {
      return { gender: cachedBio.gender || null, genderCategory: cachedBio.genderCategory };
    }
    if (!record?.manualGender && record?.genderCategory) {
      return { gender: record.gender || null, genderCategory: record.genderCategory };
    }

    const roleStr = liveDemos?.genderRole || record?.genderRole || cachedBio?.genderRole || '';
    const m = roleStr.match(HEADLINE_DEMO_RE);
    if (m) {
      return classifyGenderToken(m[2], liveDemos?.gender || cachedBio?.gender || '');
    }

    const rawG = liveDemos?.gender || cachedBio?.gender || (!record?.manualGender ? record?.gender : '');
    if (rawG) {
      const classified = classifyGenderToken(rawG);
      if (classified.genderCategory) return classified;
    }

    if (cachedBio?.isFemale === true || (!record?.manualGender && record?.isFemale === true)) {
      return { gender: rawG || 'F', genderCategory: 'female' };
    }
    if (cachedBio?.isFemale === false || (!record?.manualGender && record?.isFemale === false)) {
      return { gender: rawG || 'Other', genderCategory: 'other' };
    }

    return { gender: null, genderCategory: null };
  }

  function resolveEffectiveGender(record, cachedBio, liveDemos = null) {
    const auto = inferAutoGender(record, cachedBio, liveDemos);

    if (record?.manualGender === 'female') {
      return {
        gender: '♀ Female (Manual)',
        genderCategory: 'female',
        isManual: true,
        manualGender: 'female',
        autoDetected: auto
      };
    }

    if (record?.manualGender === 'male') {
      return {
        gender: '♂ Male (Manual)',
        genderCategory: 'male',
        isManual: true,
        manualGender: 'male',
        autoDetected: auto
      };
    }

    if (record?.manualGender === 'other') {
      return {
        gender: '⚧ Other (Manual)',
        genderCategory: 'other',
        isManual: true,
        manualGender: 'other',
        autoDetected: auto
      };
    }

    return {
      gender: auto.gender,
      genderCategory: auto.genderCategory,
      isManual: false,
      manualGender: null,
      autoDetected: auto
    };
  }

  function formatKeyComboFromEvent(e) {
    const ignored = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab']);
    if (ignored.has(e.key)) return null;

    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey && (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1)) {
      parts.push('Shift');
    }
    if (e.metaKey) parts.push('Meta');

    let keyName = e.key;
    if (keyName === ' ') keyName = 'Space';
    else if (keyName.length === 1) {
      keyName = parts.length > 0 ? keyName.toUpperCase() : keyName.toLowerCase();
    }

    parts.push(keyName);
    return parts.join('+');
  }

  function matchesKeyCombo(e, configuredCombo) {
    if (!configuredCombo) return false;
    const actual = formatKeyComboFromEvent(e);
    if (!actual) return false;
    return actual.toLowerCase() === configuredCombo.trim().toLowerCase();
  }

  function isEditableTarget(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    for (const el of path) {
      if (!el || el.nodeType !== 1) continue;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'LEXXY-EDITOR') return true;
      if (el.isContentEditable) return true;
    }
    return false;
  }

  function openProfileInBackgroundTab(url) {
    try {
      if (typeof GM_openInTab === 'function') {
        GM_openInTab(url, { active: false, insert: true });
        return;
      }
    } catch (e) {
      console.warn('[FLX] GM_openInTab fallback:', e);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function daysSinceIsoDate(isoDateStr) {
    if (!isoDateStr) return null;
    const ts = Date.parse(isoDateStr);
    if (Number.isNaN(ts)) return null;
    return Math.max(0, Math.floor((Date.now() - ts) / 86400000));
  }

  const Store = {
    _read(key, fallback) {
      try {
        if (typeof GM_getValue === 'function') {
          const val = GM_getValue(key, null);
          if (val !== null && val !== undefined) return val;
        }
      } catch (e) {
        console.warn('[FLX] GM_getValue fallback:', e);
      }
      try {
        const raw = localStorage.getItem(`flx_${key}`);
        return raw ? JSON.parse(raw) : fallback;
      } catch {
        return fallback;
      }
    },
    _write(key, value) {
      try {
        if (typeof GM_setValue === 'function') {
          GM_setValue(key, value);
        }
      } catch (e) {
        console.warn('[FLX] GM_setValue fallback:', e);
      }
      try {
        localStorage.setItem(`flx_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('[FLX] Storage write failed:', e);
      }
    },
    getSettings() {
      const saved = this._read('fl_settings', {});
      const merged = Object.assign({}, DEFAULT_SETTINGS, saved);

      if (!saved.cardViewMode && saved.cardToolbarMode) {
        merged.cardViewMode = saved.cardToolbarMode;
      }

      if (!saved.genderFilter && typeof saved.filterFemaleOnly === 'boolean') {
        merged.genderFilter = saved.filterFemaleOnly ? 'female' : 'all';
      }

      if (!Array.isArray(merged.highlightRules) || merged.highlightRules.length === 0) {
        merged.highlightRules = JSON.parse(JSON.stringify(DEFAULT_HIGHLIGHT_RULES));
      } else {
        const existingIds = new Set(merged.highlightRules.map(r => r.id));
        for (const defRule of DEFAULT_HIGHLIGHT_RULES) {
          if (!existingIds.has(defRule.id)) {
            merged.highlightRules.push(JSON.parse(JSON.stringify(defRule)));
          }
        }
      }

      if (!Array.isArray(merged.messageTemplates) || merged.messageTemplates.length === 0) {
        merged.messageTemplates = JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES));
      }

      merged.keybinds = Object.assign({}, DEFAULT_KEYBINDS, saved.keybinds || {});
      return merged;
    },
    saveSettings(patch) {
      const next = Object.assign(this.getSettings(), patch);
      this._write('fl_settings', next);
      return next;
    },
    resetRulesToDefaults() {
      return this.saveSettings({
        highlightRules: JSON.parse(JSON.stringify(DEFAULT_HIGHLIGHT_RULES)),
        excludeKeywords: [...DEFAULT_EXCLUDE_KEYWORDS]
      });
    },
    resetTemplatesToDefaults() {
      return this.saveSettings({
        messageTemplates: JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES))
      });
    },
    resetKeybindsToDefaults() {
      return this.saveSettings({
        keybinds: Object.assign({}, DEFAULT_KEYBINDS)
      });
    },
    getSelfGroups() {
      const arr = this._read('fl_self_groups', []);
      return Array.isArray(arr) ? arr : [];
    },
    setSelfGroups(groups) {
      if (Array.isArray(groups) && groups.length > 0) {
        this._write('fl_self_groups', groups);
      }
    },
    getAllUsers() {
      return this._read('fl_users', {});
    },
    getUser(key) {
      const db = this.getAllUsers();
      return Object.assign({
        status: null,
        note: '',
        lastSeen: null,
        lastContacted: null,
        username: null,
        age: null,
        gender: null,
        genderCategory: null,
        manualGender: null,
        genderRole: null,
        location: null,
        relationships: null,
        lookingFor: null,
        groups: []
      }, db[key] || {});
    },
    setUser(key, patch) {
      const db = this.getAllUsers();
      const prev = this.getUser(key);
      const next = Object.assign({}, prev, patch);

      if (
        patch.status &&
        ['messaged', 'talking', 'met'].includes(patch.status) &&
        patch.status !== prev.status &&
        !patch.lastContacted
      ) {
        next.lastContacted = new Date().toISOString().slice(0, 10);
      }

      if (Object.prototype.hasOwnProperty.call(patch, 'manualGender')) {
        if (patch.manualGender === 'female') {
          next.manualGender = 'female';
          next.genderCategory = 'female';
          next.gender = '♀ Female (Manual)';
        } else if (patch.manualGender === 'male') {
          next.manualGender = 'male';
          next.genderCategory = 'male';
          next.gender = '♂ Male (Manual)';
        } else if (patch.manualGender === 'other') {
          next.manualGender = 'other';
          next.genderCategory = 'other';
          next.gender = '⚧ Other (Manual)';
        } else {
          next.manualGender = null;
          const cached = this.getBioCache()[key] || null;
          const auto = inferAutoGender({}, cached);
          next.genderCategory = auto.genderCategory;
          next.gender = auto.gender;
        }
      } else if (next.manualGender === 'female') {
        next.genderCategory = 'female';
        next.gender = '♀ Female (Manual)';
      } else if (next.manualGender === 'male') {
        next.genderCategory = 'male';
        next.gender = '♂ Male (Manual)';
      } else if (next.manualGender === 'other') {
        next.genderCategory = 'other';
        next.gender = '⚧ Other (Manual)';
      }

      db[key] = next;
      this._write('fl_users', db);
      return next;
    },
    deleteUserAndCache(key) {
      const users = this.getAllUsers();
      delete users[key];
      this._write('fl_users', users);

      const cache = this.getBioCache();
      delete cache[key];
      this._write('fl_bio_cache', cache);
    },
    getBioCache() {
      return this._read('fl_bio_cache', {});
    },
    getBioCacheCount() {
      return Object.keys(this.getBioCache()).length;
    },
    getStorageStats() {
      const settingsStr = JSON.stringify(this.getSettings());
      const usersStr = JSON.stringify(this.getAllUsers());
      const cacheStr = JSON.stringify(this.getBioCache());
      const totalBytes = settingsStr.length + usersStr.length + cacheStr.length;
      return {
        kb: (totalBytes / 1024).toFixed(1),
        cacheCount: Object.keys(this.getBioCache()).length,
        userCount: Object.keys(this.getAllUsers()).length
      };
    },
    pruneExpiredCache() {
      const settings = this.getSettings();
      const maxAgeMs = Math.max(1, Number(settings.bioCacheTtlDays) || 14) * 86400000;
      const now = Date.now();
      const cache = this.getBioCache();
      const users = this.getAllUsers();

      let pruned = 0;
      let retainedTracked = 0;

      for (const [key, entry] of Object.entries(cache)) {
        const isExpired = !entry || (now - (entry.fetchedAt || 0) > maxAgeMs);
        if (!isExpired) continue;

        const u = users[key];
        const isTracked = Boolean(u && (u.status || u.manualGender || (u.note && u.note.trim().length > 0)));
        if (isTracked) {
          retainedTracked++;
        } else {
          delete cache[key];
          pruned++;
        }
      }

      this._write('fl_bio_cache', cache);
      return { pruned, retainedTracked };
    },
    getCachedBio(key, ttlDays) {
      const cache = this.getBioCache();
      const entry = cache[key];
      if (!entry || typeof entry.text !== 'string') return null;

      const u = this.getUser(key);
      const isTracked = Boolean(u.status || u.manualGender || (u.note && u.note.trim().length > 0));
      if (!isTracked) {
        const maxAgeMs = Math.max(1, Number(ttlDays) || 14) * 86400000;
        if (Date.now() - (entry.fetchedAt || 0) > maxAgeMs) return null;
      }
      return entry;
    },
    mergeCachedProfile(key, incoming, username = null) {
      const cache = this.getBioCache();
      const prev = cache[key] || {};
      const prevSections = prev.sections || {};

      const nextInto = (incoming.fetishesInto && incoming.fetishesInto.length > 0)
        ? incoming.fetishesInto
        : (prev.fetishesInto || []);
      const nextLimits = (incoming.fetishesLimits && incoming.fetishesLimits.length > 0)
        ? incoming.fetishesLimits
        : (prev.fetishesLimits || []);

      const nextGroups = (incoming.groups && incoming.groups.length > 0)
        ? incoming.groups
        : (prev.groups || []);

      const intoText = nextInto.length > 0 ? `Into: ${nextInto.join(', ')}` : '';
      const limitsText = nextLimits.length > 0 ? nextLimits.join(', ') : (prevSections.fetishesLimits || '');

      const unsplitFetishes = (nextInto.length === 0 && nextLimits.length === 0)
        ? (incoming.fetishesText || prevSections.fetishes || '')
        : '';

      const nextSections = {
        about: incoming.aboutText || prevSections.about || prev.aboutText || '',
        fetishes: incoming.fetishesText || prevSections.fetishes || '',
        fetishesInto: intoText,
        fetishesLimits: limitsText,
        writings: incoming.writingsText || prevSections.writings || '',
        header: incoming.headerText || prevSections.header || ''
      };

      const hasAbout = typeof incoming.hasAbout === 'boolean'
        ? (incoming.hasAbout || Boolean(nextSections.about))
        : Boolean(prev.hasAbout || nextSections.about);

      const positiveParts = [
        nextSections.header,
        nextSections.about,
        nextSections.fetishesInto,
        unsplitFetishes,
        nextSections.writings,
        incoming.nonFetishFullText || prev.text || ''
      ].filter(Boolean);

      const combinedPositiveText = Array.from(new Set(positiveParts)).join(' \n ').slice(0, 24000);
      const nextGenderCategory = incoming.genderCategory || prev.genderCategory || null;

      const nextEntry = {
        username: username || prev.username || null,
        text: combinedPositiveText,
        aboutText: nextSections.about.slice(0, 8000),
        hasAbout,
        fetishesInto: nextInto,
        fetishesLimits: nextLimits,
        limitsText: limitsText.slice(0, 4000),
        sections: nextSections,
        age: incoming.age ?? prev.age ?? null,
        gender: incoming.gender || prev.gender || null,
        genderCategory: nextGenderCategory,
        genderRole: incoming.genderRole || prev.genderRole || null,
        location: incoming.location || prev.location || null,
        relationships: incoming.relationships || prev.relationships || null,
        lookingFor: incoming.lookingFor || prev.lookingFor || null,
        groups: nextGroups,
        fetchedAt: Date.now()
      };

      cache[key] = nextEntry;
      this._write('fl_bio_cache', cache);

      const u = this.getUser(key);
      const userPatch = {
        username: username || u.username || null,
        age: nextEntry.age ?? u.age ?? null,
        genderRole: nextEntry.genderRole || u.genderRole || null,
        location: nextEntry.location || u.location || null,
        relationships: nextEntry.relationships || u.relationships || null,
        lookingFor: nextEntry.lookingFor || u.lookingFor || null,
        groups: nextGroups.length > 0 ? nextGroups : (u.groups || [])
      };

      if (!u.manualGender) {
        userPatch.gender = nextEntry.gender || u.gender || null;
        userPatch.genderCategory = nextEntry.genderCategory || u.genderCategory || null;
      }

      this.setUser(key, userPatch);
      return nextEntry;
    },
    clearBioCache() {
      this._write('fl_bio_cache', {});
    },
    exportAll() {
      return JSON.stringify({
        settings: this.getSettings(),
        users: this.getAllUsers(),
        bioCache: this.getBioCache(),
        selfGroups: this.getSelfGroups()
      }, null, 2);
    },
    importAll(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (parsed.settings) this._write('fl_settings', Object.assign({}, DEFAULT_SETTINGS, parsed.settings));
      if (parsed.users) this._write('fl_users', parsed.users);
      if (parsed.bioCache) this._write('fl_bio_cache', parsed.bioCache);
      if (Array.isArray(parsed.selfGroups)) this._write('fl_self_groups', parsed.selfGroups);
    }
  };

  // =========================================================================
  // 4. COLOR, URL, DEMOGRAPHIC, GROUPS & FETLIFE DOM PARSERS (NO BRACKETS)
  // =========================================================================
  function hexToRgba(hex, alpha) {
    const clean = (hex || '#38bdf8').replace('#', '').trim();
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return `rgba(56, 189, 248, ${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function cleanHandleCandidate(rawText) {
    if (!rawText) return null;
    const cleaned = rawText.replace(/\s+/g, ' ').trim().replace(/^@/, '');
    const firstToken = cleaned.split(' ')[0];
    if (firstToken && USERNAME_RE.test(firstToken) && !RESERVED_PATHS.has(firstToken.toLowerCase())) {
      return firstToken;
    }
    return null;
  }

  function findProfileHeaderElement() {
    const headers = document.getElementsByTagName('header');
    for (const h of headers) {
      if (h.dataset && h.dataset.testId === 'profile-header') return h;
      if (h.querySelector('h1')) {
        const links = h.getElementsByTagName('a');
        for (const a of links) {
          if ((a.getAttribute('href') || '').startsWith('/p/')) return h;
        }
      }
    }
    return null;
  }

  function getSelfIdentity() {
    const flUser = window.FL && window.FL.user;
    const selfId = flUser && flUser.id ? String(flUser.id) : null;
    let selfUsername = null;
    const sidebar = document.getElementById('account-sidebar');
    if (sidebar) {
      const anchors = sidebar.getElementsByTagName('a');
      for (const a of anchors) {
        const parsed = parseUserHref(a.getAttribute('href'));
        if (parsed && parsed.username) {
          selfUsername = parsed.key;
          break;
        }
      }
    }
    return { selfId, selfUsername };
  }

  function parseUserHref(href) {
    if (!href) return null;
    try {
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return null;

      if (parts.length === 1 && !RESERVED_PATHS.has(parts[0].toLowerCase())) {
        const rawHandle = decodeURIComponent(parts[0]);
        if (USERNAME_RE.test(rawHandle)) {
          return {
            key: rawHandle.toLowerCase(),
            username: rawHandle,
            url: `${window.location.origin}/${rawHandle}`,
            subtab: null
          };
        }
      }

      if (parts.length === 2 && !RESERVED_PATHS.has(parts[0].toLowerCase())) {
        const sub = parts[1].toLowerCase();
        const rawHandle = decodeURIComponent(parts[0]);
        if (USERNAME_RE.test(rawHandle) && PROFILE_SUBTABS.has(sub)) {
          return {
            key: rawHandle.toLowerCase(),
            username: rawHandle,
            url: `${window.location.origin}/${rawHandle}`,
            subtab: sub
          };
        }
      }

      if (parts.length === 2 && parts[0] === 'users' && /^\d+$/.test(parts[1])) {
        return {
          key: `users/${parts[1]}`,
          username: null,
          url: `${window.location.origin}/users/${parts[1]}`,
          subtab: null
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  function parseDemographicsFromContainer(container) {
    let age = null;
    let rawGenderToken = null;
    let genderRole = null;
    let explicitGenderRow = '';
    let relationships = null;
    let lookingFor = null;
    const locationParts = [];

    const anchors = container.getElementsByTagName('a');
    for (const a of anchors) {
      if (a.closest('.flx-toolbar, .flx-profile-bar')) continue;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/p/')) {
        const locLabel = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (locLabel && locLabel.toLowerCase() !== 'united states' && !locationParts.includes(locLabel)) {
          locationParts.push(locLabel);
        }
      }
    }

    const divs = container.getElementsByTagName('div');
    for (const d of divs) {
      if (d.children.length === 0 && d.nextElementSibling) {
        const label = (d.textContent || '').replace(/\s+/g, ' ').trim();
        const val = (d.nextElementSibling.textContent || '').replace(/\s+/g, ' ').trim();
        if (!val) continue;

        if (/^gender$/i.test(label)) {
          explicitGenderRow = val;
        } else if (/^relationships?$/i.test(label)) {
          relationships = val;
        } else if (/^looking\s+for$/i.test(label)) {
          lookingFor = val;
        }
      }
    }

    const rawText = (container.innerText || container.textContent || '');
    const segments = rawText
      .split(/\r?\n|·|\|/)
      .map(s => s.replace(/\s+/g, ' ').trim())
      .filter(s => s.length >= 2 && s.length <= 52);

    for (const seg of segments) {
      const m = seg.match(HEADLINE_DEMO_RE);
      if (m) {
        const parsedAge = parseInt(m[1], 10);
        if (parsedAge >= 18 && parsedAge <= 99) {
          age = parsedAge;
          rawGenderToken = m[2];
          genderRole = seg;
          break;
        }
      }
    }

    const classified = classifyGenderToken(rawGenderToken, explicitGenderRow);

    return {
      age,
      gender: classified.gender,
      genderCategory: classified.genderCategory,
      genderRole,
      location: locationParts.length > 0 ? locationParts.slice(0, 2).join(', ') : null,
      relationships,
      lookingFor
    };
  }

  function parseProfileGroupsList() {
    const groupsFrame = document.getElementById('profile-groups-member_of');
    if (!groupsFrame) return [];
    const groups = [];
    const anchors = groupsFrame.getElementsByTagName('a');
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('/groups/')) continue;
      let title = '';
      for (const child of a.childNodes) {
        if (child.nodeType === 3) {
          title += child.nodeValue;
        }
      }
      title = title.replace(/\s+/g, ' ').trim();
      if (!title) {
        const clone = a.cloneNode(true);
        clone.querySelectorAll('div, span').forEach(n => n.remove());
        title = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      }
      if (title && !groups.includes(title)) {
        groups.push(title);
      }
    }
    return groups;
  }

  function getSharedOrNotableGroups(userGroups) {
    if (!Array.isArray(userGroups) || userGroups.length === 0) return [];
    const selfGroups = new Set(Store.getSelfGroups().map(g => g.toLowerCase()));
    const matches = [];
    for (const g of userGroups) {
      const lower = g.toLowerCase();
      if (lower === 'fetlife announcements') continue;
      const inSelf = selfGroups.has(lower);
      const isNotableLocal = /pdx|portland|zero proof|nerd|poly|co-?parent|vee|neurodivergent|autis/i.test(lower);
      if (inSelf || isNotableLocal) {
        matches.push(g);
      }
    }
    return matches;
  }

  function detectCurrentProfilePage() {
    const urlParsed = parseUserHref(window.location.pathname);
    const profileHeader = findProfileHeaderElement();
    const profileNav = document.getElementById('profile-navigation');

    let headerUsername = null;
    if (profileHeader) {
      const h1 = profileHeader.querySelector('h1');
      if (h1) {
        const firstSpan = h1.querySelector('span');
        headerUsername = cleanHandleCandidate(firstSpan ? firstSpan.textContent : h1.textContent);
      }
    }

    let ogUsername = null;
    const metas = document.getElementsByTagName('meta');
    for (const m of metas) {
      if (m.getAttribute('property') === 'og:url' && m.content) {
        const p = parseUserHref(m.content);
        if (p && p.username) {
          ogUsername = p.username;
          break;
        }
      }
    }

    if (!urlParsed && !profileHeader && !profileNav) return null;

    const username = headerUsername || ogUsername || (urlParsed && urlParsed.username);
    if (!username) return urlParsed;

    let activeView = (urlParsed && urlParsed.subtab) || 'about';
    if (profileNav) {
      const navLinks = profileNav.getElementsByTagName('a');
      for (const a of navLinks) {
        if (a.getAttribute('aria-current') === 'page') {
          const tabHrefParsed = parseUserHref(a.getAttribute('href'));
          if (tabHrefParsed) {
            activeView = tabHrefParsed.subtab || 'about';
          }
          break;
        }
      }
    }

    return {
      key: username.toLowerCase(),
      username,
      url: `${window.location.origin}/${username}`,
      activeView
    };
  }

  function resolveAuthorFromPostOrCard(container, link, initialParsed) {
    let username = initialParsed.username;

    if (!username) {
      username = cleanHandleCandidate(link.textContent);
    }

    const headerScope = link.parentElement || container;
    const headerAnchors = headerScope.getElementsByTagName('a');
    for (const a of headerAnchors) {
      if (a.closest('.flx-toolbar, .flx-profile-bar')) continue;
      const parsed = parseUserHref(a.getAttribute('href'));
      if (!parsed) continue;
      if (parsed.username) {
        username = parsed.username;
        break;
      } else if (!username) {
        username = cleanHandleCandidate(a.textContent);
      }
    }

    const demos = parseDemographicsFromContainer(container);

    if (username) {
      return {
        key: username.toLowerCase(),
        username,
        profileUrl: `${window.location.origin}/${username}`,
        demographics: demos
      };
    }

    return {
      key: initialParsed.key,
      username: null,
      profileUrl: initialParsed.url,
      demographics: demos
    };
  }

  function findPostOrCardContainer(link, root) {
    if (link.closest('p, blockquote, pre, code')) return null;

    const commentItem = link.closest('li');
    if (commentItem && root.contains(commentItem)) {
      return commentItem;
    }

    const article = link.closest('article');
    if (article && root.contains(article)) {
      const allAnchors = article.getElementsByTagName('a');
      for (const a of allAnchors) {
        if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote')) continue;
        if (parseUserHref(a.getAttribute('href'))) {
          return a === link ? article : null;
        }
      }
    }

    let el = link.parentElement;
    let bestSingleCard = null;
    let depth = 0;

    while (el && el !== root && el !== document.body && depth < 7) {
      if (el.dataset && el.dataset.flxUser) {
        return el.dataset.flxLinkHref === link.getAttribute('href') ? el : null;
      }

      const distinctKeys = new Set();
      let firstUserAnchor = null;
      const anchors = el.getElementsByTagName('a');

      for (const a of anchors) {
        if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote')) continue;
        const p = parseUserHref(a.getAttribute('href'));
        if (!p) continue;
        if (!firstUserAnchor) firstUserAnchor = a;
        distinctKeys.add(p.key);
      }

      let effectiveUsers = distinctKeys.size;
      if (effectiveUsers === 2) {
        const arr = [...distinctKeys];
        if (arr.some(k => k.startsWith('users/')) && arr.some(k => !k.startsWith('users/'))) {
          effectiveUsers = 1;
        }
      }

      if (effectiveUsers === 1) {
        const textLen = (el.textContent || '').trim().length;
        if (textLen > 1 && el.tagName !== 'A') {
          bestSingleCard = el;
        }
      } else if (effectiveUsers > 1) {
        if (bestSingleCard) return bestSingleCard;

        const isTopLevelList = el.parentElement === root || el.children.length > 8;
        if (!isTopLevelList && firstUserAnchor === link) {
          return el;
        }
        break;
      }

      el = el.parentElement;
      depth++;
    }

    return bestSingleCard;
  }

  // =========================================================================
  // 5. PROFILE, ABOUT, GROUPS & FETISH SECTION PARSER (NO BRACKETS)
  // =========================================================================
  function cleanSectionText(raw) {
    return (raw || '')
      .replace(/\s+/g, ' ')
      .replace(/^(nothing written yet\.?|hasn['’]t written anything yet\.?|no bio\.?)$/i, '')
      .trim();
  }

  function extractCopyBlockText(el) {
    if (!el) return '';
    const clone = el.cloneNode(true);
    const removeEls = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      if (
        node.tagName === 'BUTTON' ||
        node.tagName === 'SCRIPT' ||
        node.tagName === 'STYLE' ||
        (node.dataset && node.dataset.continueReadingTarget === 'link')
      ) {
        removeEls.push(node);
      }
    }
    removeEls.forEach(n => n.remove());
    return cleanSectionText(clone.textContent);
  }

  function parseFetishesContainer(rootEl) {
    const into = [];
    const limits = [];
    if (!rootEl) return { fetishesInto: into, fetishesLimits: limits, fetishesText: '' };

    const rawText = (rootEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawText || rawText.length < 4) {
      return { fetishesInto: into, fetishesLimits: limits, fetishesText: '' };
    }

    let currentBucket = 'into';
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      const tag = node.tagName;
      if (tag === 'A' || (node.closest && node.closest('a'))) {
        if (tag === 'A') {
          const href = node.getAttribute('href') || '';
          if (href.startsWith('/fetishes/') || href.startsWith('/kinks/') || href.startsWith('/tags/')) {
            const item = (node.textContent || '').replace(/\s+/g, ' ').trim();
            if (item && item.length < 60 && !/^(edit|learn more|see all|show more)$/i.test(item)) {
              if (currentBucket === 'limits') {
                if (!limits.includes(item)) limits.push(item);
              } else {
                if (!into.includes(item)) into.push(item);
              }
            }
          }
        }
        continue;
      }

      // Check section headers (semantic headings or leaf label elements like <div>Limits</div>)
      const isHeadingTag = /^H[1-6]$/.test(tag) || tag === 'STRONG' || tag === 'DT' || tag === 'B';
      const isLeafLabel = node.children.length === 0;
      if (isHeadingTag || isLeafLabel) {
        const label = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (label.length >= 3 && label.length <= 28) {
          if (/^(hard\s+|soft\s+)?limits?:?$/i.test(label) || /^not\s+into:?$/i.test(label)) {
            currentBucket = 'limits';
          } else if (/^(into|curious(\s+about)?|giving|receiving|favou?rites?|likes?|kinks|fetishes):?$/i.test(label)) {
            currentBucket = 'into';
          }
        }
      }
    }

    return {
      fetishesInto: into,
      fetishesLimits: limits,
      fetishesText: rawText
    };
  }

  function sanitizeProfileClone(rootEl, stripFetishesFrame = false) {
    const clone = rootEl.cloneNode(true);
    const toRemove = [];
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_ELEMENT, null);
    let node;
    while ((node = walker.nextNode())) {
      const tag = node.tagName;
      const id = node.id || '';
      const cls = typeof node.className === 'string' ? node.className : '';
      if (
        tag === 'SCRIPT' ||
        tag === 'STYLE' ||
        tag === 'NAV' ||
        tag === 'FOOTER' ||
        tag === 'DIALOG' ||
        id === 'profile-sidebar-ad' ||
        id === 'profile-navigation' ||
        id === 'flx-hud-host' ||
        id === 'flx-crm-host' ||
        (stripFetishesFrame && id === 'profile-fetishes') ||
        cls.includes('flx-toolbar') ||
        cls.includes('flx-profile-bar') ||
        (node.dataset && (node.dataset.testId === 'profile-header-cover-actions' || 'popoverTemplate' in node.dataset))
      ) {
        toRemove.push(node);
      }
    }
    toRemove.forEach(n => n.remove());
    return clone;
  }

  function extractProfileData(activeView = 'about') {
    const scope = document.getElementById('main-content') || document.body;
    if (!scope) {
      return {
        nonFetishFullText: '',
        aboutText: '',
        hasAbout: null,
        fetishesText: '',
        fetishesInto: [],
        fetishesLimits: [],
        writingsText: '',
        headerText: '',
        age: null,
        gender: null,
        genderCategory: null,
        genderRole: null,
        location: null,
        relationships: null,
        lookingFor: null,
        groups: []
      };
    }

    const profileHeader = findProfileHeaderElement();
    const demos = profileHeader
      ? parseDemographicsFromContainer(profileHeader)
      : { age: null, gender: null, genderCategory: null, genderRole: null, location: null, relationships: null, lookingFor: null };

    let headerText = '';
    if (profileHeader) {
      const hClone = sanitizeProfileClone(profileHeader, false);
      headerText = (hClone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const groups = parseProfileGroupsList();

    let aboutText = '';
    let hasAbout = activeView === 'about' ? false : null;

    const aboutAnchor = document.getElementById('about');
    if (aboutAnchor) {
      let sib = aboutAnchor.nextElementSibling;
      while (sib) {
        if (sib.tagName !== 'H2' && sib.tagName !== 'H1' && sib.tagName !== 'H3') {
          const candidate = extractCopyBlockText(sib);
          if (candidate) {
            aboutText = candidate;
            hasAbout = true;
            break;
          }
        }
        sib = sib.nextElementSibling;
      }
    }

    if (!aboutText) {
      const headings = scope.getElementsByTagName('h2');
      for (const h2 of headings) {
        const h2Clone = h2.cloneNode(true);
        h2Clone.querySelectorAll('span, a, button').forEach(n => n.remove());
        const headingLabel = (h2Clone.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^about(\s+me)?$/i.test(headingLabel) && h2.nextElementSibling) {
          const candidate = extractCopyBlockText(h2.nextElementSibling);
          if (candidate) {
            aboutText = candidate;
            hasAbout = true;
            break;
          }
        }
      }
    }

    const fetishesFrame = document.getElementById('profile-fetishes');
    const fetishSource = fetishesFrame || ((activeView === 'kinks' || activeView === 'fetishes') ? scope : null);
    const parsedFetishes = parseFetishesContainer(fetishSource);

    let writingsText = '';
    if (activeView === 'posts' || activeView === 'writings' || activeView === 'l' || activeView === 'lists') {
      const wClone = sanitizeProfileClone(scope, true);
      writingsText = (wClone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const cleanScope = sanitizeProfileClone(scope, true);
    const nonFetishFullText = (cleanScope.textContent || '').replace(/\s+/g, ' ').trim();

    return {
      nonFetishFullText,
      aboutText,
      hasAbout,
      fetishesText: parsedFetishes.fetishesText,
      fetishesInto: parsedFetishes.fetishesInto,
      fetishesLimits: parsedFetishes.fetishesLimits,
      writingsText,
      headerText,
      age: demos.age,
      gender: demos.gender,
      genderCategory: demos.genderCategory,
      genderRole: demos.genderRole,
      location: demos.location,
      relationships: demos.relationships,
      lookingFor: demos.lookingFor,
      groups
    };
  }

  // =========================================================================
  // 6. RULE MATCHING, LIMIT CONFLICTS & DEMOGRAPHIC FILTERING
  // =========================================================================
  function getFetishIntoSearchText(cachedBio) {
    if (!cachedBio) return '';
    if (Array.isArray(cachedBio.fetishesInto) && cachedBio.fetishesInto.length > 0) {
      return cachedBio.fetishesInto.join(' | ');
    }
    if (cachedBio.sections && typeof cachedBio.sections.fetishesInto === 'string' && cachedBio.sections.fetishesInto.trim()) {
      return cachedBio.sections.fetishesInto;
    }
    return '';
  }

  function findSimpleMatches(text, keywords) {
    const lower = (text || '').toLowerCase();
    const seen = new Set();
    const hits = [];
    for (const kw of keywords) {
      if (!kw) continue;
      const norm = kw.toLowerCase();
      if (!seen.has(norm) && lower.includes(norm)) {
        seen.add(norm);
        hits.push(kw);
      }
    }
    return hits;
  }

  function findRuleMatches(cardText, cachedPositiveText, rules) {
    const lowerCard = (cardText || '').toLowerCase();
    const lowerBio = (cachedPositiveText || '').toLowerCase();
    const hits = [];
    const seenTypes = new Set();

    for (const rule of rules) {
      if (!rule || !Array.isArray(rule.keywords)) continue;
      const typeKey = (rule.id || rule.label || '').toLowerCase();
      if (typeKey && seenTypes.has(typeKey)) continue;

      let matchedKw = null;
      let fromCache = false;

      for (const kw of rule.keywords) {
        if (!kw) continue;
        if (lowerCard.includes(kw.toLowerCase())) {
          matchedKw = kw;
          fromCache = false;
          break;
        }
      }

      if (!matchedKw && lowerBio) {
        for (const kw of rule.keywords) {
          if (!kw) continue;
          if (lowerBio.includes(kw.toLowerCase())) {
            matchedKw = kw;
            fromCache = true;
            break;
          }
        }
      }

      if (matchedKw) {
        if (typeKey) seenTypes.add(typeKey);
        hits.push({
          id: rule.id || rule.label,
          label: rule.label || 'Match',
          color: rule.color || '#38bdf8',
          keyword: matchedKw,
          fromCache
        });
      }
    }
    return hits;
  }

  function findLimitConflicts(limitsList, rules) {
    if (!Array.isArray(limitsList) || limitsList.length === 0) return [];
    const lowerLimits = limitsList.join(' | ').toLowerCase();
    const conflicts = [];
    const seenTypes = new Set();

    for (const rule of rules) {
      if (!rule || !Array.isArray(rule.keywords)) continue;
      const typeKey = (rule.id || rule.label || '').toLowerCase();
      if (typeKey && seenTypes.has(typeKey)) continue;

      for (const kw of rule.keywords) {
        if (!kw || kw.length < 3) continue;
        if (lowerLimits.includes(kw.toLowerCase())) {
          if (typeKey) seenTypes.add(typeKey);
          conflicts.push({
            label: rule.label || 'Limit',
            keyword: kw
          });
          break;
        }
      }
    }
    return conflicts;
  }

  function isAgeOutOfRange(age, settings) {
    if (!settings.filterByAge || typeof age !== 'number') return false;
    const min = Number(settings.minAge) || 18;
    const max = Number(settings.maxAge) || 99;
    return age < min || age > max;
  }

  function isGenderRejected(genderCategory, settings) {
    const target = settings.genderFilter || 'all';
    if (target === 'all') return false;
    if (!genderCategory) return false;
    return genderCategory !== target;
  }

  function isLocalPdx(entryOrDemos) {
    const loc = (entryOrDemos.location || '').toLowerCase();
    const txt = (entryOrDemos.fullText || '').toLowerCase();
    return LOCAL_PDX_TERMS.some(term => loc.includes(term) || txt.includes(term));
  }

  // =========================================================================
  // 7. SHARED UI COMPONENTS & MINIMAL/COMPACT/FULL CARD VIEW ENGINE
  // =========================================================================
  function createMatchDotsCluster(ruleHits, limitConflicts = [], excludedHits = []) {
    if (!ruleHits || ruleHits.length === 0) return null;
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);';

    const tooltipLines = ruleHits.map(h => `${h.label}: ${h.keyword}`);
    if (limitConflicts.length > 0) {
      tooltipLines.push(`⚠ Limits: ${limitConflicts.map(c => c.keyword).join(', ')}`);
    }
    if (excludedHits.length > 0) {
      tooltipLines.push(`Red kinks (Fetishes): -${excludedHits.join(', -')}`);
    }
    wrap.title = tooltipLines.join(' • ');

    for (const hit of ruleHits) {
      const dot = document.createElement('span');
      dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${hit.color};box-shadow:0 0 6px ${hit.color};display:inline-block;`;
      dot.title = `${hit.label}: ${hit.keyword}`;
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function formatDemographicSummary(age, gender, genderRole, location, isManualGender = false) {
    const parts = [];
    if (genderRole) {
      parts.push(isManualGender ? `${genderRole} (${gender})` : genderRole);
    } else {
      const head = [age ? String(age) : '', gender || ''].filter(Boolean).join(' • ');
      if (head) parts.push(head);
    }
    if (location) parts.push(location);
    return parts.join(' • ');
  }

  function createDemographicPill(age, gender, genderRole, location, isManualGender = false, genderCategory = null) {
    const summary = formatDemographicSummary(age, gender, genderRole, location, isManualGender);
    if (!summary) return null;

    const pill = document.createElement('span');
    if (isManualGender) {
      if (genderCategory === 'male') {
        pill.style.cssText = 'font-size:11px;color:#93c5fd;background:rgba(59,130,246,0.16);border:1px solid rgba(59,130,246,0.38);padding:1px 6px;border-radius:4px;font-weight:500;';
      } else if (genderCategory === 'other') {
        pill.style.cssText = 'font-size:11px;color:#d8b4fe;background:rgba(168,85,247,0.16);border:1px solid rgba(168,85,247,0.38);padding:1px 6px;border-radius:4px;font-weight:500;';
      } else {
        pill.style.cssText = 'font-size:11px;color:#f9a8d4;background:rgba(244,114,182,0.14);border:1px solid rgba(244,114,182,0.35);padding:1px 6px;border-radius:4px;font-weight:500;';
      }
    } else {
      pill.style.cssText = 'font-size:11px;color:#cbd5e1;background:rgba(148,163,184,0.12);border:1px solid rgba(148,163,184,0.25);padding:1px 6px;border-radius:4px;font-weight:500;';
    }
    pill.textContent = summary;
    return pill;
  }

  function buildGenderSelect(record, autoGenderObj, onSelectChange, compact = false) {
    const sel = document.createElement('select');
    const mg = record.manualGender || '';

    if (mg === 'female') {
      sel.style.cssText = 'background:rgba(244,114,182,0.18);color:#f9a8d4;border:1px solid #db2777;border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;font-weight:600;';
    } else if (mg === 'male') {
      sel.style.cssText = 'background:rgba(59,130,246,0.18);color:#93c5fd;border:1px solid #2563eb;border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;font-weight:600;';
    } else if (mg === 'other') {
      sel.style.cssText = 'background:rgba(168,85,247,0.18);color:#d8b4fe;border:1px solid #7e22ce;border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;font-weight:600;';
    } else {
      sel.style.cssText = 'background:#202024;color:#a1a1aa;border:1px solid #3f3f46;border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;';
    }

    sel.title = 'Override Gender (for profiles that do not state gender)';

    const cat = autoGenderObj?.genderCategory;
    const autoHint = cat === 'female' ? '♀' : (cat === 'male' ? '♂' : (cat === 'other' ? '⚧' : '?'));

    const opts = [
      { val: '',       text: compact ? `G:${autoHint}` : `Gender: Auto (${autoHint})`, color: '#e4e4e7' },
      { val: 'female', text: compact ? '♀ F' : '♀ Female',                           color: '#f9a8d4' },
      { val: 'male',   text: compact ? '♂ M' : '♂ Male',                             color: '#93c5fd' },
      { val: 'other',  text: compact ? '⚧ Oth' : '⚧ Other',                          color: '#d8b4fe' }
    ];

    for (const o of opts) {
      const optEl = document.createElement('option');
      optEl.value = o.val;
      optEl.textContent = o.text;
      optEl.style.background = '#18181b';
      optEl.style.color = o.color;
      if (mg === o.val) optEl.selected = true;
      sel.appendChild(optEl);
    }

    sel.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    sel.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectChange(e.target.value || null);
    });

    return sel;
  }

  function applyCardAccentStyle(el, status, ruleHits, isFilteredOut, settings) {
    el.style.opacity = '';
    el.style.display = '';
    el.style.outline = '';
    el.style.borderLeft = '';
    el.style.backgroundColor = '';
    el.style.boxShadow = '';

    if (isFilteredOut && !settings.showHidden) {
      if (settings.hideMode === 'collapse') {
        el.style.display = 'none';
      } else {
        el.style.opacity = String(settings.dimOpacity);
      }
      return;
    }

    if (ruleHits.length > 0) {
      const primary = ruleHits[0];
      el.style.outline = `1px solid ${hexToRgba(primary.color, 0.75)}`;
      el.style.backgroundColor = hexToRgba(primary.color, 0.08);
      if (ruleHits.length >= 2) {
        const secondary = ruleHits[1];
        el.style.boxShadow = `inset 0 2px 0 0 ${primary.color}, inset 0 -2px 0 0 ${secondary.color}`;
      }
    }

    const stageDef = status ? STAGE_MAP[status] : null;
    if (stageDef && status !== 'hidden') {
      el.style.borderLeft = `4px solid ${stageDef.color}`;
      if (ruleHits.length === 0) {
        el.style.outline = `1px solid ${stageDef.border}`;
        el.style.backgroundColor = stageDef.bg;
      }
    }
  }

  function setContainerNativeContentHidden(container, shouldHide) {
    for (const child of container.children) {
      if (child.classList && child.classList.contains('flx-toolbar')) continue;
      if (shouldHide) {
        if (!('flxOrigDisplay' in child.dataset)) {
          child.dataset.flxOrigDisplay = child.style.display || '';
        }
        child.style.display = 'none';
      } else if ('flxOrigDisplay' in child.dataset) {
        child.style.display = child.dataset.flxOrigDisplay;
        delete child.dataset.flxOrigDisplay;
      }
    }
  }

  function buildToolbar(userKey, settings, onUpdate, options = {}) {
    const {
      viewMode = 'full',      // 'full' | 'compact' | 'minimal'
      isProfileBar = false,
      displayHandle = null,
      profileUrl = null,
      demos = null,
      isStickyTop = false,
      onToggleCardView = null
    } = options;

    const record = Store.getUser(userKey);
    const isMinimal = !isProfileBar && viewMode === 'minimal';
    const isCompact = !isProfileBar && viewMode === 'compact';
    const compactControls = !isProfileBar && (isCompact || isMinimal);

    const bar = document.createElement('div');
    bar.className = 'flx-toolbar';

    if (isMinimal) {
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:2px 0;padding:4px 8px;background:rgba(22,22,27,0.9);border:1px solid #2e2e38;border-radius:6px;position:relative;z-index:5;font-family:system-ui,-apple-system,sans-serif;';
    } else if (isCompact) {
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 4px 0;padding:2px 0;background:transparent;border:none;position:relative;z-index:5;font-family:system-ui,-apple-system,sans-serif;';
    } else if (isStickyTop) {
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0 0 6px 0;padding:5px 8px;position:sticky;top:var(--flx-sticky-top, 62px);z-index:25;background:rgba(20,20,25,0.94);backdrop-filter:blur(8px);border:1px solid #30303a;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.45);font-family:system-ui,-apple-system,sans-serif;';
    } else {
      bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px;margin-bottom:4px;position:relative;z-index:5;font-family:system-ui,-apple-system,sans-serif;';
    }

    const stopNav = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const persistMeta = (patch) => {
      const cur = Store.getUser(userKey);
      const baseMeta = {
        username: displayHandle || cur.username || null,
        age: (demos && demos.age) ?? cur.age ?? null,
        genderRole: (demos && demos.genderRole) || cur.genderRole || null,
        location: (demos && demos.location) || cur.location || null,
        relationships: (demos && demos.relationships) || cur.relationships || null,
        lookingFor: (demos && demos.lookingFor) || cur.lookingFor || null
      };
      if (!cur.manualGender && !Object.prototype.hasOwnProperty.call(patch, 'manualGender')) {
        baseMeta.gender = (demos && demos.gender) || cur.gender || null;
        baseMeta.genderCategory = (demos && demos.genderCategory) || cur.genderCategory || null;
      }
      Store.setUser(userKey, Object.assign(baseMeta, patch));
      onUpdate();
    };

    const baseBtnStyle = 'background:#202024;color:#d4d4d8;border:1px solid #3f3f46;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;line-height:1.45;transition:background 0.15s,border-color 0.15s;';

    if (!isProfileBar && typeof onToggleCardView === 'function') {
      const viewToggleBtn = document.createElement('button');
      viewToggleBtn.type = 'button';
      viewToggleBtn.style.cssText = isMinimal
        ? `${baseBtnStyle}background:rgba(56,189,248,0.14);border-color:#0284c7;color:#7dd3fc;font-weight:700;padding:2px 6px;`
        : `${baseBtnStyle}color:#9ca3af;padding:2px 6px;`;
      viewToggleBtn.textContent = isMinimal ? '▸' : '▾';
      viewToggleBtn.title = isMinimal
        ? 'Expand card to Full view (M)'
        : 'Collapse card to Minimal strip (M)';
      viewToggleBtn.addEventListener('click', (e) => {
        stopNav(e);
        onToggleCardView();
      });
      bar.appendChild(viewToggleBtn);
    }

    if (isMinimal) {
      const handleText = displayHandle || userKey;
      const userLink = document.createElement('a');
      userLink.href = profileUrl || `${window.location.origin}/${handleText}`;
      userLink.textContent = `/${handleText}`;
      const demoSummary = formatDemographicSummary(demos?.age, demos?.gender, demos?.genderRole, demos?.location, demos?.isManualGender);
      if (demoSummary) {
        userLink.title = `${handleText} • ${demoSummary}`;
      }
      userLink.style.cssText = 'color:#93c5fd;font-weight:700;font-size:12px;text-decoration:none;margin-right:2px;';
      userLink.addEventListener('click', (e) => e.stopPropagation());
      bar.appendChild(userLink);
    }

    const isStarred = record.status === 'shortlist';
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.style.cssText = isStarred
      ? `${baseBtnStyle}background:rgba(251,191,36,0.18);border-color:#d97706;color:#fde047;font-weight:600;`
      : baseBtnStyle;
    starBtn.textContent = compactControls ? (isStarred ? '★' : '☆') : (isStarred ? '★ Shortlisted' : '☆ Shortlist');
    starBtn.title = 'Toggle Shortlist';
    starBtn.addEventListener('click', (e) => {
      stopNav(e);
      persistMeta({ status: isStarred ? null : 'shortlist' });
    });

    const stageSelect = document.createElement('select');
    const activeStage = record.status ? STAGE_MAP[record.status] : null;
    stageSelect.style.cssText = activeStage
      ? `background:${activeStage.bg};color:${activeStage.color};border:1px solid ${activeStage.border};border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;font-weight:600;`
      : 'background:#202024;color:#a1a1aa;border:1px solid #3f3f46;border-radius:5px;padding:2px 5px;font-size:11px;cursor:pointer;';
    stageSelect.title = 'Vetting Pipeline Stage';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = compactControls ? 'Stage…' : 'Stage: None';
    noneOpt.style.background = '#18181b';
    noneOpt.style.color = '#e4e4e7';
    stageSelect.appendChild(noneOpt);

    for (const st of PIPELINE_STAGES) {
      const opt = document.createElement('option');
      opt.value = st.id;
      opt.textContent = st.short;
      opt.style.background = '#18181b';
      opt.style.color = st.color;
      if (record.status === st.id) opt.selected = true;
      stageSelect.appendChild(opt);
    }

    stageSelect.addEventListener('click', stopNav);
    stageSelect.addEventListener('change', (e) => {
      stopNav(e);
      persistMeta({ status: e.target.value || null });
    });

    const genderSelect = buildGenderSelect(
      record,
      demos?.autoDetected || null,
      (nextManualGender) => persistMeta({ manualGender: nextManualGender }),
      compactControls
    );

    const isPassed = record.status === 'hidden';
    const passBtn = document.createElement('button');
    passBtn.type = 'button';
    passBtn.style.cssText = isPassed
      ? `${baseBtnStyle}background:rgba(248,113,113,0.18);border-color:#dc2626;color:#fca5a5;font-weight:600;`
      : baseBtnStyle;
    passBtn.textContent = compactControls ? '✕' : (isPassed ? '✕ Passed' : '✕ Pass');
    passBtn.title = 'Pass / Hide Profile';
    passBtn.addEventListener('click', (e) => {
      stopNav(e);
      persistMeta({ status: isPassed ? null : 'hidden' });
    });

    const noteBtn = document.createElement('button');
    noteBtn.type = 'button';
    noteBtn.style.cssText = record.note
      ? `${baseBtnStyle}background:rgba(212,175,55,0.15);border-color:#b45309;color:#fcd34d;`
      : baseBtnStyle;
    noteBtn.textContent = compactControls ? '✎' : (record.note ? '✎ Edit Note' : '✎ Note');
    noteBtn.title = record.note ? `Private Note: ${record.note}` : 'Edit Private Note';
    noteBtn.addEventListener('click', (e) => {
      stopNav(e);
      const cur = Store.getUser(userKey);
      const nextNote = window.prompt(`Private note for ${displayHandle || userKey}:`, cur.note || '');
      if (nextNote !== null) {
        persistMeta({ note: nextNote.trim() });
      }
    });

    bar.append(starBtn, stageSelect, genderSelect, passBtn, noteBtn);

    if (isProfileBar || viewMode === 'full') {
      if (record.lastContacted && record.status !== 'hidden') {
        const contacted = document.createElement('span');
        contacted.style.cssText = 'font-size:11px;color:#7dd3fc;padding:1px 6px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.28);border-radius:4px;';
        contacted.textContent = `Contacted ${record.lastContacted}`;
        bar.appendChild(contacted);
      } else if (record.lastSeen && record.status !== 'hidden') {
        const seen = document.createElement('span');
        seen.style.cssText = 'font-size:11px;color:#9ca3af;padding:1px 6px;border:1px solid #333;border-radius:4px;';
        seen.textContent = `Viewed ${record.lastSeen}`;
        bar.appendChild(seen);
      }

      if (record.note && (isProfileBar || settings.showNotesInline)) {
        const noteBox = document.createElement('div');
        noteBox.style.cssText = 'width:100%;margin-top:4px;padding:5px 9px;background:#16161a;border-left:2px solid #eab308;color:#e4e4e7;font-size:12px;white-space:pre-wrap;border-radius:4px;';
        noteBox.textContent = record.note;
        bar.appendChild(noteBox);
      }
    }

    return bar;
  }

  function appendMatchBadges(toolbar, cachedBio, demos, missingAbout, ageRejected, genderRejected, ruleHits, limitConflicts, excludedHits, viewMode) {
    const dotsCluster = createMatchDotsCluster(ruleHits, limitConflicts, excludedHits);
    if (dotsCluster) {
      toolbar.appendChild(dotsCluster);
    }

    if (viewMode !== 'full') return;

    const demoPill = createDemographicPill(demos?.age, demos?.gender, demos?.genderRole, demos?.location, demos?.isManualGender, demos?.genderCategory);
    if (demoPill) {
      toolbar.appendChild(demoPill);
    }

    if (demos?.relationships) {
      const relPill = document.createElement('span');
      relPill.style.cssText = 'font-size:11px;color:#d8b4fe;background:rgba(168,85,247,0.12);border:1px solid rgba(168,85,247,0.28);padding:1px 6px;border-radius:4px;';
      relPill.textContent = demos.relationships;
      toolbar.appendChild(relPill);
    }

    if (cachedBio) {
      const bioBadge = document.createElement('span');
      bioBadge.style.cssText = 'font-size:10px;color:#9ca3af;padding:1px 6px;border:1px solid #333;border-radius:4px;';
      const hasFetishes = Boolean((cachedBio.fetishesInto && cachedBio.fetishesInto.length > 0) || (cachedBio.fetishesLimits && cachedBio.fetishesLimits.length > 0));
      bioBadge.title = cachedBio.hasAbout
        ? `Locally cached profile — About (${cachedBio.aboutText.length} chars)${hasFetishes ? ' + Fetishes' : ''}`
        : 'Locally cached profile — no About section';
      bioBadge.textContent = `${cachedBio.hasAbout ? 'About ✓' : 'No About'}${hasFetishes ? ' • Fetishes ✓' : ''}`;
      toolbar.appendChild(bioBadge);
    }

    if (genderRejected) {
      const b = document.createElement('span');
      b.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.16);color:#fca5a5;border:1px solid #b91c1c;';
      b.textContent = `-Gender${demos?.gender ? ` (${demos.gender})` : ''}`;
      toolbar.appendChild(b);
    }

    if (missingAbout) {
      const b = document.createElement('span');
      b.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.16);color:#fca5a5;border:1px solid #b91c1c;';
      b.textContent = '-No About';
      toolbar.appendChild(b);
    }

    if (ageRejected) {
      const b = document.createElement('span');
      b.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.16);color:#fca5a5;border:1px solid #b91c1c;';
      b.textContent = `-Age (${demos.age})`;
      toolbar.appendChild(b);
    }

    ruleHits.forEach((hit) => {
      const badge = document.createElement('span');
      badge.style.cssText = `font-size:11px;padding:1px 6px;border-radius:4px;background:${hexToRgba(hit.color, 0.18)};color:${hit.color};border:1px solid ${hexToRgba(hit.color, 0.7)};font-weight:500;`;
      badge.textContent = `${hit.label}: ${hit.keyword}${hit.fromCache ? ' (cached)' : ''}`;
      toolbar.appendChild(badge);
    });

    limitConflicts.forEach((conf) => {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(245,158,11,0.18);color:#fcd34d;border:1px solid #d97706;font-weight:500;';
      badge.title = `Listed under Fetishes: Limits (${conf.label})`;
      badge.textContent = `⚠ Limit: ${conf.keyword}`;
      toolbar.appendChild(badge);
    });

    excludedHits.forEach((kw) => {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.16);color:#fca5a5;border:1px solid #b91c1c;';
      badge.title = 'Red kink found in Fetishes (Into) list';
      badge.textContent = `-${kw}`;
      toolbar.appendChild(badge);
    });
  }

  // =========================================================================
  // 8. KEYBOARD LIST NAVIGATOR & FLOATING TOAST
  // =========================================================================
  const CardNavigator = {
    activeIndex: -1,
    toastEl: null,
    toastTimer: null,

    getVisibleCards() {
      const all = Array.from(document.getElementsByClassName('flx-card-tracked'));
      return all.filter(el => el.isConnected && el.offsetParent !== null && el.style.display !== 'none');
    },

    clearFocusRing() {
      const prev = document.getElementsByClassName('flx-kbd-focused');
      for (const el of Array.from(prev)) {
        el.classList.remove('flx-kbd-focused');
        el.style.boxShadow = el.dataset.flxPrevShadow || '';
      }
    },

    focusCard(index) {
      const cards = this.getVisibleCards();
      if (cards.length === 0) {
        this.showToast('No visible cards to navigate');
        return null;
      }
      const clamped = ((index % cards.length) + cards.length) % cards.length;
      this.activeIndex = clamped;

      this.clearFocusRing();
      const target = cards[clamped];
      target.dataset.flxPrevShadow = target.style.boxShadow || '';
      target.classList.add('flx-kbd-focused');
      target.style.boxShadow = '0 0 0 2px #eab308, 0 8px 24px rgba(0,0,0,0.65)';
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const handle = target.dataset.flxHandle || target.dataset.flxUser || 'profile';
      const kb = Store.getSettings().keybinds;
      this.showToast(
        `Card ${clamped + 1}/${cards.length}: /${handle}  •  [${kb.toggleMinimal.toUpperCase()}] View  [${kb.shortlist.toUpperCase()}] Shortlist  [${kb.cycleGender.toUpperCase()}] Gender  [${kb.pass.toUpperCase()}] Pass  [${kb.openTab.toUpperCase()}] Open`
      );
      return target;
    },

    step(delta) {
      const cards = this.getVisibleCards();
      if (cards.length === 0) return;
      if (this.activeIndex < 0 || this.activeIndex >= cards.length) {
        this.focusCard(delta > 0 ? 0 : cards.length - 1);
      } else {
        this.focusCard(this.activeIndex + delta);
      }
    },

    getFocusedCard() {
      const cards = this.getVisibleCards();
      if (cards.length === 0) return null;
      if (this.activeIndex < 0 || this.activeIndex >= cards.length) {
        return this.focusCard(0);
      }
      return cards[this.activeIndex];
    },

    actOnFocused(action) {
      const card = this.getFocusedCard();
      if (!card) return;
      const userKey = card.dataset.flxUser;
      const handle = card.dataset.flxHandle || userKey;
      const url = card.dataset.flxProfileUrl || `${window.location.origin}/${handle}`;
      if (!userKey) return;

      if (action === 'toggleMinimal') {
        const globalMode = Store.getSettings().cardViewMode || 'full';
        const curEffective = card.dataset.flxEffectiveView || globalMode;
        const nextMode = curEffective === 'minimal' ? 'full' : 'minimal';
        cardViewOverrides.set(userKey, nextMode);
        runAll();
        this.focusCard(this.activeIndex);
        this.showToast(`/${handle} → ${nextMode === 'minimal' ? 'Minimal strip' : 'Full view'}`);
        return;
      }

      if (action === 'openTab') {
        openProfileInBackgroundTab(url);
        this.showToast(`Opened /${handle} in background tab`);
        return;
      }

      if (action === 'cycleGender') {
        const cur = Store.getUser(userKey);
        const cycleOrder = [null, 'female', 'male', 'other'];
        const curIdx = cycleOrder.indexOf(cur.manualGender || null);
        const nextManual = cycleOrder[(curIdx + 1) % cycleOrder.length];
        Store.setUser(userKey, { username: handle, manualGender: nextManual });
        runAll();
        const remaining = this.getVisibleCards();
        if (remaining.length > 0) {
          this.focusCard(Math.min(this.activeIndex, remaining.length - 1));
        }
        const labels = {
          female: `♀ Set /${handle} as Female`,
          male: `♂ Set /${handle} as Male`,
          other: `⚧ Set /${handle} as Other`
        };
        this.showToast(labels[nextManual] || `Reset /${handle} gender to Auto`);
        return;
      }

      if (action === 'shortlist') {
        const cur = Store.getUser(userKey);
        const nextStatus = cur.status === 'shortlist' ? null : 'shortlist';
        Store.setUser(userKey, { username: handle, status: nextStatus });
        runAll();
        this.focusCard(this.activeIndex);
        this.showToast(nextStatus ? `★ Shortlisted /${handle}` : `Cleared stage on /${handle}`);
        return;
      }

      if (action === 'pass') {
        const cur = Store.getUser(userKey);
        const nextStatus = cur.status === 'hidden' ? null : 'hidden';
        Store.setUser(userKey, { username: handle, status: nextStatus });
        runAll();
        const remaining = this.getVisibleCards();
        if (remaining.length > 0) {
          this.focusCard(Math.min(this.activeIndex, remaining.length - 1));
        }
        this.showToast(nextStatus ? `✕ Passed /${handle}` : `Restored /${handle}`);
        return;
      }

      if (action === 'note') {
        const cur = Store.getUser(userKey);
        const nextNote = window.prompt(`Private note for /${handle}:`, cur.note || '');
        if (nextNote !== null) {
          Store.setUser(userKey, { username: handle, note: nextNote.trim() });
          runAll();
          this.focusCard(this.activeIndex);
          this.showToast(`✎ Saved note for /${handle}`);
        }
      }
    },

    showToast(text) {
      if (!this.toastEl) {
        this.toastEl = document.createElement('div');
        this.toastEl.id = 'flx-kbd-toast';
        this.toastEl.style.cssText = 'position:fixed;top:var(--flx-sticky-top, 64px);left:50%;transform:translateX(-50%);z-index:2147483645;background:rgba(20,20,25,0.94);backdrop-filter:blur(8px);color:#f4f4f5;border:1px solid #3f3f48;border-radius:999px;padding:5px 14px;font-size:11px;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.65);pointer-events:none;transition:opacity 0.2s;';
        (document.documentElement || document.body).appendChild(this.toastEl);
      }
      this.toastEl.textContent = text;
      this.toastEl.style.opacity = '1';
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        if (this.toastEl) this.toastEl.style.opacity = '0';
      }, 2800);
    }
  };

  // =========================================================================
  // 9. PAGE ENHANCERS: CARDS/POSTS, STICKY PROFILE BAR & CHAT CONTEXT STRIP
  // =========================================================================
  function applyContainerState(container, identity, settings, force = false) {
    const userKey = identity.key;
    const record = Store.getUser(userKey);
    const cachedBio = Store.getCachedBio(userKey, settings.bioCacheTtlDays);
    const bioText = cachedBio ? cachedBio.text : '';
    const resolvedGender = resolveEffectiveGender(record, cachedBio, identity.demographics);

    const globalViewMode = settings.cardViewMode || 'full';
    const overrideMode = cardViewOverrides.get(userKey);
    const effectiveViewMode = globalViewMode === 'off'
      ? 'off'
      : (overrideMode || globalViewMode);

    const mergedDemos = {
      age: identity.demographics?.age ?? record.age ?? cachedBio?.age ?? null,
      gender: resolvedGender.gender,
      genderCategory: resolvedGender.genderCategory,
      isManualGender: resolvedGender.isManual,
      autoDetected: resolvedGender.autoDetected,
      genderRole: identity.demographics?.genderRole || record.genderRole || cachedBio?.genderRole || null,
      location: identity.demographics?.location || record.location || cachedBio?.location || null,
      relationships: identity.demographics?.relationships || record.relationships || cachedBio?.relationships || null,
      lookingFor: identity.demographics?.lookingFor || record.lookingFor || cachedBio?.lookingFor || null
    };

    const missingAbout = Boolean(settings.hideNoAbout && cachedBio && cachedBio.hasAbout === false);
    const ageRejected = isAgeOutOfRange(mergedDemos.age, settings);
    const genderRejected = isGenderRejected(mergedDemos.genderCategory, settings);

    if (!container.dataset.flxRawItemText) {
      const clone = container.cloneNode(true);
      clone.querySelectorAll('.flx-toolbar').forEach(el => el.remove());
      container.dataset.flxRawItemText = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }
    const itemText = container.dataset.flxRawItemText;

    // Red kinks / excludes ONLY check the Fetishes (Into) list—never About/profile/post text
    const fetishIntoText = getFetishIntoSearchText(cachedBio);
    const excludedHits = findSimpleMatches(fetishIntoText, settings.excludeKeywords);
    const ruleHits = findRuleMatches(itemText, bioText, settings.highlightRules);
    const limitConflicts = cachedBio ? findLimitConflicts(cachedBio.fetishesLimits, settings.highlightRules) : [];

    const sig = JSON.stringify({
      userKey,
      effectiveViewMode,
      status: record.status,
      manualGender: record.manualGender,
      note: record.note,
      lastSeen: record.lastSeen,
      lastContacted: record.lastContacted,
      mergedDemos,
      bioFetchedAt: cachedBio ? cachedBio.fetchedAt : null,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      showHidden: settings.showHidden,
      hideNoAbout: settings.hideNoAbout,
      genderFilter: settings.genderFilter,
      filterByAge: settings.filterByAge,
      minAge: settings.minAge,
      maxAge: settings.maxAge,
      hideMode: settings.hideMode,
      dimOpacity: settings.dimOpacity,
      cardToolbarPosition: settings.cardToolbarPosition,
      showNotesInline: settings.showNotesInline,
      excludedHits,
      ruleHits,
      limitConflicts
    });

    if (!force && container.dataset.flxSig === sig) return;

    container.classList.add('flx-card-tracked');
    container.dataset.flxUser = userKey;
    container.dataset.flxHandle = identity.username || record.username || userKey;
    container.dataset.flxProfileUrl = identity.profileUrl;
    container.dataset.flxEffectiveView = effectiveViewMode;
    container.dataset.flxSig = sig;

    const isFilteredOut = record.status === 'hidden' || excludedHits.length > 0 || missingAbout || ageRejected || genderRejected;
    applyCardAccentStyle(container, record.status, ruleHits, isFilteredOut, settings);

    setContainerNativeContentHidden(container, effectiveViewMode === 'minimal');

    const oldBar = container.querySelector('.flx-toolbar');
    if (oldBar) oldBar.remove();

    if (effectiveViewMode !== 'off') {
      const pos = settings.cardToolbarPosition || 'top-sticky';
      const isStickyTop = pos === 'top-sticky' && effectiveViewMode === 'full';

      const toolbar = buildToolbar(
        userKey,
        settings,
        () => {
          withObserverPaused(() => applyContainerState(container, identity, Store.getSettings(), true));
        },
        {
          viewMode: effectiveViewMode,
          isProfileBar: false,
          displayHandle: identity.username,
          profileUrl: identity.profileUrl,
          demos: mergedDemos,
          isStickyTop,
          onToggleCardView: () => {
            const nextOverride = effectiveViewMode === 'minimal' ? 'full' : 'minimal';
            cardViewOverrides.set(userKey, nextOverride);
            withObserverPaused(() => applyContainerState(container, identity, Store.getSettings(), true));
          }
        }
      );

      appendMatchBadges(
        toolbar,
        cachedBio,
        mergedDemos,
        missingAbout,
        ageRejected,
        genderRejected,
        ruleHits,
        limitConflicts,
        excludedHits,
        effectiveViewMode
      );

      if (pos === 'bottom' && effectiveViewMode === 'full') {
        container.appendChild(toolbar);
      } else {
        container.insertBefore(toolbar, container.firstChild);
      }
    }
  }

  function enhancePostsAndCards() {
    const settings = Store.getSettings();
    const root = document.getElementById('main-content') || document.body;
    const currentProfile = detectCurrentProfilePage();
    const currentProfileKey = currentProfile ? currentProfile.key : null;

    const links = root.getElementsByTagName('a');
    const seenContainers = new Set();

    for (const link of links) {
      if (link.closest('nav, header, footer, aside, .flx-toolbar, .flx-profile-bar, .flx-chat-context')) continue;
      const parsed = parseUserHref(link.getAttribute('href'));
      if (!parsed || parsed.key === currentProfileKey) continue;

      const container = findPostOrCardContainer(link, root);
      if (!container || seenContainers.has(container)) continue;
      seenContainers.add(container);
      container.dataset.flxLinkHref = link.getAttribute('href') || '';

      const identity = resolveAuthorFromPostOrCard(container, link, parsed);
      applyContainerState(container, identity, settings, false);
    }

    return seenContainers.size;
  }

  function enhanceProfilePage() {
    const profilePage = detectCurrentProfilePage();
    if (!profilePage) return null;

    const currentKey = profilePage.key;
    const displayHandle = profilePage.username || currentKey;
    const { selfUsername } = getSelfIdentity();

    const today = new Date().toISOString().slice(0, 10);
    const existing = Store.getUser(currentKey);
    if (existing.lastSeen !== today || (!existing.username && profilePage.username)) {
      Store.setUser(currentKey, {
        lastSeen: today,
        username: profilePage.username || existing.username || null
      });
    }

    const liveData = extractProfileData(profilePage.activeView);
    if (selfUsername && currentKey === selfUsername && liveData.groups.length > 0) {
      Store.setSelfGroups(liveData.groups);
    }

    let cachedBio = Store.getCachedBio(currentKey, Store.getSettings().bioCacheTtlDays);

    if (
      liveData.nonFetishFullText.length > 30 ||
      liveData.hasAbout === true ||
      liveData.fetishesText.length > 0 ||
      liveData.writingsText.length > 0 ||
      liveData.groups.length > 0
    ) {
      cachedBio = Store.mergeCachedProfile(currentKey, liveData, profilePage.username);
    }

    const profileNav = document.getElementById('profile-navigation');
    const navHeader = profileNav ? profileNav.closest('header') : null;
    const profileHeader = findProfileHeaderElement();
    const anchorBlock = navHeader || profileHeader || document.getElementById('main-content')?.firstElementChild;
    if (!anchorBlock) return profilePage;

    const latestUser = Store.getUser(currentKey);
    const currentSettings = Store.getSettings();
    const sig = JSON.stringify({
      currentKey,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      aboutLen: cachedBio ? cachedBio.aboutText.length : 0,
      textLen: cachedBio ? cachedBio.text.length : 0,
      fetishLen: cachedBio ? (cachedBio.fetishesInto.length + cachedBio.fetishesLimits.length) : 0,
      groupCount: cachedBio && cachedBio.groups ? cachedBio.groups.length : 0,
      status: latestUser.status,
      manualGender: latestUser.manualGender,
      note: latestUser.note,
      lastContacted: latestUser.lastContacted,
      genderCategory: latestUser.genderCategory,
      stickyProfileBar: currentSettings.stickyProfileBar,
      hideNoAbout: currentSettings.hideNoAbout,
      genderFilter: currentSettings.genderFilter,
      filterByAge: currentSettings.filterByAge,
      minAge: currentSettings.minAge,
      maxAge: currentSettings.maxAge,
      rules: currentSettings.highlightRules,
      excludes: currentSettings.excludeKeywords
    });

    const existingBars = document.getElementsByClassName('flx-profile-bar');
    for (const bar of existingBars) {
      if (bar.dataset.flxProfile === currentKey && bar.dataset.flxSig === sig) {
        return profilePage;
      }
    }

    const renderProfileBar = () => {
      const settings = Store.getSettings();
      const latestBio = Store.getCachedBio(currentKey, settings.bioCacheTtlDays);
      const u = Store.getUser(currentKey);
      const resolvedGender = resolveEffectiveGender(u, latestBio);
      const demos = {
        age: u.age ?? latestBio?.age ?? null,
        gender: resolvedGender.gender,
        genderCategory: resolvedGender.genderCategory,
        isManualGender: resolvedGender.isManual,
        autoDetected: resolvedGender.autoDetected,
        genderRole: u.genderRole || latestBio?.genderRole || null,
        location: u.location || latestBio?.location || null,
        relationships: u.relationships || latestBio?.relationships || null,
        lookingFor: u.lookingFor || latestBio?.lookingFor || null
      };

      Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());

      const isSticky = Boolean(settings.stickyProfileBar);
      const wrapper = document.createElement('div');
      wrapper.className = 'flx-profile-bar';
      wrapper.dataset.flxProfile = currentKey;
      wrapper.dataset.flxSig = sig;
      wrapper.style.cssText = isSticky
        ? 'max-width:1280px;margin:8px auto 0;padding:9px 14px;background:rgba(18,18,22,0.96);backdrop-filter:blur(10px);border:1px solid #383842;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;position:sticky;top:var(--flx-sticky-top, 62px);z-index:90;box-sizing:border-box;box-shadow:0 6px 22px rgba(0,0,0,0.65);'
        : 'max-width:1280px;margin:10px auto 0;padding:10px 14px;background:rgba(22,22,26,0.95);backdrop-filter:blur(8px);border:1px solid #33333a;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;position:relative;z-index:10;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,0.45);';

      const label = document.createElement('strong');
      label.style.cssText = 'font-size:12px;color:#f4f4f5;font-family:system-ui,sans-serif;';
      label.textContent = `/${displayHandle}`;

      const toolbar = buildToolbar(
        currentKey,
        settings,
        () => withObserverPaused(renderProfileBar),
        {
          viewMode: 'full',
          isProfileBar: true,
          displayHandle: profilePage.username,
          profileUrl: profilePage.url,
          demos,
          isStickyTop: false
        }
      );
      toolbar.style.marginTop = '0';
      toolbar.style.marginBottom = '0';
      toolbar.style.flex = '1';

      const scanText = latestBio ? latestBio.text : '';
      const fetishIntoText = getFetishIntoSearchText(latestBio);
      const excludedHits = findSimpleMatches(fetishIntoText, settings.excludeKeywords);
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const limitConflicts = latestBio ? findLimitConflicts(latestBio.fetishesLimits, settings.highlightRules) : [];
      const missingAbout = Boolean(settings.hideNoAbout && latestBio && latestBio.hasAbout === false);
      const ageRejected = isAgeOutOfRange(demos.age, settings);
      const genderRejected = isGenderRejected(demos.genderCategory, settings);

      appendMatchBadges(toolbar, latestBio, demos, missingAbout, ageRejected, genderRejected, ruleHits, limitConflicts, excludedHits, 'full');

      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.style.cssText = isSticky
        ? 'background:rgba(56,189,248,0.16);color:#7dd3fc;border:1px solid #0284c7;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;font-weight:600;margin-left:auto;'
        : 'background:#202024;color:#a1a1aa;border:1px solid #3f3f46;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;margin-left:auto;';
      pinBtn.textContent = isSticky ? '📌 Pinned' : '📌 Pin Bar';
      pinBtn.title = 'Keep this profile bar pinned at the top while scrolling';
      pinBtn.addEventListener('click', () => {
        Store.saveSettings({ stickyProfileBar: !Store.getSettings().stickyProfileBar });
        withObserverPaused(renderProfileBar);
      });

      if (ruleHits.length > 0) {
        wrapper.style.borderColor = ruleHits[0].color;
      } else if (excludedHits.length > 0 || missingAbout || ageRejected || genderRejected) {
        wrapper.style.borderColor = '#b91c1c';
      }

      wrapper.append(label, toolbar, pinBtn);
      anchorBlock.insertAdjacentElement('afterend', wrapper);
      scheduleStickySync();
    };

    renderProfileBar();
    return profilePage;
  }

  function insertTextIntoComposer(rootEl, textToInsert) {
    const textareas = rootEl.getElementsByTagName('textarea');
    for (const ta of textareas) {
      if (ta.offsetParent !== null) {
        const prefix = ta.value && !ta.value.endsWith('\n') ? `${ta.value}\n` : ta.value;
        ta.value = `${prefix}${textToInsert}`;
        ta.focus();
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    const editors = rootEl.getElementsByTagName('lexxy-editor');
    for (const ed of editors) {
      if (ed.offsetParent !== null) {
        ed.focus();
        document.execCommand('insertText', false, textToInsert);
        return true;
      }
    }
    return false;
  }

  function enhanceChatContext() {
    const settings = Store.getSettings();
    const { selfId, selfUsername } = getSelfIdentity();
    const targets = [];

    const dockThread = document.getElementById('chat_dock_thread');
    if (dockThread && dockThread.innerHTML.trim().length > 0) {
      targets.push({ root: dockThread, mode: 'dock' });
    }

    const path = window.location.pathname;
    if (path.startsWith('/inbox') || path.startsWith('/conversations')) {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        targets.push({ root: mainContent, mode: 'inbox' });
      }
    }

    for (const target of targets) {
      const anchors = target.root.getElementsByTagName('a');
      let partner = null;

      for (const a of anchors) {
        if (a.closest('.flx-chat-context, .flx-toolbar')) continue;
        const parsed = parseUserHref(a.getAttribute('href'));
        if (!parsed) continue;
        if (selfId && parsed.key === `users/${selfId}`) continue;
        if (selfUsername && parsed.key === selfUsername) continue;
        partner = parsed;
        break;
      }

      if (!partner) continue;

      const userKey = partner.key;
      const displayHandle = partner.username || userKey;
      const record = Store.getUser(userKey);
      const cachedBio = Store.getCachedBio(userKey, settings.bioCacheTtlDays);
      const resolvedGender = resolveEffectiveGender(record, cachedBio);

      const scanText = cachedBio ? cachedBio.text : '';
      const fetishIntoText = getFetishIntoSearchText(cachedBio);
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const limitConflicts = cachedBio ? findLimitConflicts(cachedBio.fetishesLimits, settings.highlightRules) : [];
      const excludedHits = findSimpleMatches(fetishIntoText, settings.excludeKeywords);
      const sharedGroups = getSharedOrNotableGroups(cachedBio?.groups || record.groups || []);

      const sig = JSON.stringify({
        userKey,
        status: record.status,
        manualGender: record.manualGender,
        note: record.note,
        lastContacted: record.lastContacted,
        hasCache: Boolean(cachedBio),
        templateCount: settings.messageTemplates.length,
        sharedGroups,
        ruleHits,
        limitConflicts,
        excludedHits
      });

      const existingStrip = target.root.querySelector('.flx-chat-context');
      if (existingStrip && existingStrip.dataset.flxSig === sig) continue;
      if (existingStrip) existingStrip.remove();

      const strip = document.createElement('div');
      strip.className = 'flx-chat-context';
      strip.dataset.flxSig = sig;
      strip.style.cssText = target.mode === 'dock'
        ? 'margin:6px 8px;padding:7px 9px;background:#16161a;border:1px solid #383842;border-radius:6px;font-size:11px;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:5px;z-index:20;position:relative;'
        : 'max-width:960px;margin:8px auto;padding:9px 12px;background:#16161a;border:1px solid #383842;border-radius:8px;font-size:12px;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;z-index:20;position:sticky;top:var(--flx-sticky-top, 62px);';

      if (ruleHits.length > 0) {
        strip.style.borderLeft = `3px solid ${ruleHits[0].color}`;
      } else if (record.status && STAGE_MAP[record.status]) {
        strip.style.borderLeft = `3px solid ${STAGE_MAP[record.status].color}`;
      }

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;';

      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

      const title = document.createElement('strong');
      title.style.color = '#93c5fd';
      title.textContent = `CRM: /${displayHandle}`;
      left.appendChild(title);

      const demoPill = createDemographicPill(
        record.age ?? cachedBio?.age ?? null,
        resolvedGender.gender,
        record.genderRole || cachedBio?.genderRole || null,
        record.location || cachedBio?.location || null,
        resolvedGender.isManual,
        resolvedGender.genderCategory
      );
      if (demoPill) left.appendChild(demoPill);

      const dots = createMatchDotsCluster(ruleHits, limitConflicts, excludedHits);
      if (dots) left.appendChild(dots);

      const tplSel = document.createElement('select');
      tplSel.style.cssText = 'background:#222228;color:#d4d4d8;border:1px solid #3f3f46;border-radius:4px;padding:1px 5px;font-size:11px;cursor:pointer;max-width:140px;';
      tplSel.title = 'Insert Outreach Template';
      const tplDefault = document.createElement('option');
      tplDefault.value = '';
      tplDefault.textContent = 'Template ▾';
      tplSel.appendChild(tplDefault);
      for (const tpl of settings.messageTemplates) {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        opt.textContent = tpl.title;
        tplSel.appendChild(opt);
      }

      const feedbackBadge = document.createElement('span');
      feedbackBadge.style.cssText = 'font-size:10px;color:#6ee7b7;display:none;';

      tplSel.addEventListener('change', (e) => {
        const chosenId = e.target.value;
        tplSel.value = '';
        if (!chosenId) return;
        const tpl = settings.messageTemplates.find(t => t.id === chosenId);
        if (!tpl) return;
        const rendered = tpl.body.replace(/\{username\}/gi, displayHandle);
        const inserted = insertTextIntoComposer(target.root, rendered);
        if (inserted) {
          feedbackBadge.textContent = '✓ Inserted';
          feedbackBadge.style.display = 'inline';
          setTimeout(() => { feedbackBadge.style.display = 'none'; }, 2000);
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(rendered).then(() => {
            feedbackBadge.textContent = '✓ Copied';
            feedbackBadge.style.display = 'inline';
            setTimeout(() => { feedbackBadge.style.display = 'none'; }, 2000);
          });
        }
      });

      const genderSel = buildGenderSelect(
        record,
        resolvedGender.autoDetected,
        (nextManualGender) => {
          Store.setUser(userKey, { username: displayHandle, manualGender: nextManualGender });
          withObserverPaused(enhanceChatContext);
        },
        target.mode === 'dock'
      );

      const stageSel = document.createElement('select');
      const stObj = record.status ? STAGE_MAP[record.status] : null;
      stageSel.style.cssText = stObj
        ? `background:${stObj.bg};color:${stObj.color};border:1px solid ${stObj.border};border-radius:4px;padding:1px 5px;font-size:11px;cursor:pointer;font-weight:600;`
        : 'background:#222;color:#aaa;border:1px solid #444;border-radius:4px;padding:1px 5px;font-size:11px;cursor:pointer;';
      const emptyOpt = document.createElement('option');
      emptyOpt.value = '';
      emptyOpt.textContent = 'Stage: None';
      stageSel.appendChild(emptyOpt);
      for (const s of PIPELINE_STAGES) {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.short;
        if (record.status === s.id) o.selected = true;
        stageSel.appendChild(o);
      }
      stageSel.addEventListener('change', (e) => {
        Store.setUser(userKey, { username: displayHandle, status: e.target.value || null });
        withObserverPaused(enhanceChatContext);
      });

      const noteEditBtn = document.createElement('button');
      noteEditBtn.type = 'button';
      noteEditBtn.style.cssText = 'background:#242429;color:#e4e4e7;border:1px solid #3f3f46;border-radius:4px;padding:1px 6px;font-size:11px;cursor:pointer;';
      noteEditBtn.textContent = record.note ? '✎ Edit Note' : '✎ Note';
      noteEditBtn.addEventListener('click', () => {
        const cur = Store.getUser(userKey);
        const nextNote = window.prompt(`Private note for /${displayHandle}:`, cur.note || '');
        if (nextNote !== null) {
          Store.setUser(userKey, { username: displayHandle, note: nextNote.trim() });
          withObserverPaused(enhanceChatContext);
        }
      });

      const right = document.createElement('div');
      right.style.cssText = 'display:flex;align-items:center;gap:5px;flex-wrap:wrap;';
      right.append(feedbackBadge, tplSel, genderSel, stageSel, noteEditBtn);
      topRow.append(left, right);
      strip.appendChild(topRow);

      if (ruleHits.length > 0 || limitConflicts.length > 0 || excludedHits.length > 0 || sharedGroups.length > 0) {
        const badgeRow = document.createElement('div');
        badgeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        for (const g of sharedGroups.slice(0, 3)) {
          const p = document.createElement('span');
          p.style.cssText = 'font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(52,211,153,0.14);color:#6ee7b7;border:1px solid rgba(52,211,153,0.4);';
          p.textContent = `🤝 ${g}`;
          badgeRow.appendChild(p);
        }
        for (const h of ruleHits) {
          const p = document.createElement('span');
          p.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;background:${hexToRgba(h.color, 0.18)};color:${h.color};border:1px solid ${hexToRgba(h.color, 0.65)};`;
          p.textContent = `${h.label}: ${h.keyword}`;
          badgeRow.appendChild(p);
        }
        for (const c of limitConflicts) {
          const p = document.createElement('span');
          p.style.cssText = 'font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(245,158,11,0.18);color:#fcd34d;border:1px solid #d97706;';
          p.textContent = `⚠ Limit: ${c.keyword}`;
          badgeRow.appendChild(p);
        }
        for (const kw of excludedHits) {
          const p = document.createElement('span');
          p.style.cssText = 'font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid #b91c1c;';
          p.title = 'Red kink found in Fetishes (Into) list';
          p.textContent = `-${kw}`;
          badgeRow.appendChild(p);
        }
        strip.appendChild(badgeRow);
      }

      if (record.note) {
        const noteLine = document.createElement('div');
        noteLine.style.cssText = 'padding:3px 7px;background:#1e1e24;border-left:2px solid #eab308;color:#fef08a;border-radius:3px;white-space:pre-wrap;';
        noteLine.textContent = record.note;
        strip.appendChild(noteLine);
      }

      if (cachedBio && cachedBio.aboutText) {
        const excerpt = document.createElement('div');
        excerpt.style.cssText = 'color:#a1a1aa;font-size:11px;line-height:1.35;';
        excerpt.textContent = `About: ${cachedBio.aboutText.slice(0, 180)}${cachedBio.aboutText.length > 180 ? '…' : ''}`;
        strip.appendChild(excerpt);
      }

      const headerEl = target.root.querySelector('header');
      if (headerEl) {
        headerEl.insertAdjacentElement('afterend', strip);
      } else {
        target.root.prepend(strip);
      }
    }
  }

  // =========================================================================
  // 10. LOCAL CRM DASHBOARD MODAL (SHADOW DOM ISOLATED)
  // =========================================================================
  const CrmModal = {
    host: null,
    shadow: null,
    isOpen: false,
    filterStatus: 'all',
    filterCategory: 'all',
    filterGender: 'all', // 'all' | 'female' | 'male' | 'other' | 'unknown'
    filterRel: 'all',
    hideExcludes: false,
    localOnly: false,
    followUpOnly: false,
    sortBy: 'matches',
    searchQuery: '',
    minAgeFilter: '',
    maxAgeFilter: '',
    lastRenderedEntries: [],

    buildEntries() {
      const settings = Store.getSettings();
      const users = Store.getAllUsers();
      const cache = Store.getBioCache();
      const allKeys = new Set([...Object.keys(users), ...Object.keys(cache)]);
      const entries = [];

      for (const key of allKeys) {
        const u = this.normalizeUser(users[key]);
        const c = cache[key] || null;
        const displayHandle = u.username || (c && c.username) || key;
        const profileUrl = key.startsWith('users/')
          ? `${window.location.origin}/${key}`
          : `${window.location.origin}/${displayHandle}`;

        const bioText = c && typeof c.text === 'string' ? c.text : '';
        const aboutText = c && typeof c.aboutText === 'string' ? c.aboutText : '';
        const fetishesText = c && c.sections && typeof c.sections.fetishes === 'string' ? c.sections.fetishes : '';
        const fetishesInto = c && Array.isArray(c.fetishesInto) ? c.fetishesInto : [];
        const fetishesLimits = c && Array.isArray(c.fetishesLimits) ? c.fetishesLimits : [];

        const hasCache = Boolean(c && bioText.length > 0);
        const hasAbout = Boolean(c && c.hasAbout === true);
        const noAbout = Boolean(c && c.hasAbout === false);
        const hasFetishes = Boolean(fetishesInto.length > 0 || fetishesLimits.length > 0 || fetishesText.length > 0);

        const resolvedGender = resolveEffectiveGender(u, c);
        const age = u.age ?? c?.age ?? null;
        const genderRole = u.genderRole || c?.genderRole || null;
        const location = u.location || c?.location || null;
        const relationships = u.relationships || c?.relationships || null;
        const lookingFor = u.lookingFor || c?.lookingFor || null;
        const groups = (c && Array.isArray(c.groups) && c.groups.length > 0) ? c.groups : (u.groups || []);
        const sharedGroups = getSharedOrNotableGroups(groups);

        const fetishIntoText = getFetishIntoSearchText(c);
        const ruleHits = findRuleMatches('', bioText, settings.highlightRules);
        const limitConflicts = findLimitConflicts(fetishesLimits, settings.highlightRules);
        const excludedHits = findSimpleMatches(fetishIntoText, settings.excludeKeywords);

        const daysSinceContact = daysSinceIsoDate(u.lastContacted);
        const followUpDue = Boolean(
          (u.status === 'messaged' || u.status === 'talking') &&
          typeof daysSinceContact === 'number' &&
          daysSinceContact >= 5
        );

        const cachedDate = c && c.fetchedAt ? new Date(c.fetchedAt).toISOString().slice(0, 10) : null;
        const recentStamp = Math.max(
          c && c.fetchedAt ? c.fetchedAt : 0,
          u.lastContacted ? Date.parse(u.lastContacted) || 0 : 0,
          u.lastSeen ? Date.parse(u.lastSeen) || 0 : 0
        );

        entries.push({
          key,
          displayHandle,
          profileUrl,
          status: u.status || null,
          note: u.note || '',
          lastSeen: u.lastSeen || null,
          lastContacted: u.lastContacted || null,
          daysSinceContact,
          followUpDue,
          cachedDate,
          recentStamp,
          age,
          gender: resolvedGender.gender,
          genderCategory: resolvedGender.genderCategory,
          isManualGender: resolvedGender.isManual,
          manualGender: u.manualGender || null,
          genderRole,
          location,
          relationships,
          lookingFor,
          groups,
          sharedGroups,
          isLocal: isLocalPdx({ location, fullText: bioText }),
          hasCache,
          hasAbout,
          noAbout,
          hasFetishes,
          aboutText,
          fetishesText,
          fetishesInto,
          fetishesLimits,
          fullText: bioText,
          ruleHits,
          limitConflicts,
          excludedHits
        });
      }

      return entries;
    },

    normalizeUser(raw) {
      return Object.assign({
        status: null,
        note: '',
        lastSeen: null,
        lastContacted: null,
        username: null,
        age: null,
        gender: null,
        genderCategory: null,
        manualGender: null,
        genderRole: null,
        location: null,
        relationships: null,
        lookingFor: null,
        groups: []
      }, raw || {});
    },

    generateMarkdownDossier(entries) {
      const today = new Date().toISOString().slice(0, 10);
      const lines = [
        `# FetLife Local CRM Dossier (${today})`,
        `Exported ${entries.length} profiles matching active filters.\n`
      ];

      for (const e of entries) {
        const stageLabel = e.status && STAGE_MAP[e.status] ? STAGE_MAP[e.status].label : 'Unstaged';
        const meta = [
          e.genderRole ? (e.isManualGender ? `${e.genderRole} [${e.gender}]` : e.genderRole) : e.gender,
          e.age && !e.genderRole ? `${e.age}` : '',
          e.location,
          e.relationships,
          e.lookingFor ? `Looking for: ${e.lookingFor}` : ''
        ].filter(Boolean).join(' • ');

        lines.push(`## [/${e.displayHandle}](${e.profileUrl}) — ${stageLabel}`);
        if (meta) lines.push(`* **Profile:** ${meta}`);
        if (e.lastContacted) lines.push(`* **Last Contacted:** ${e.lastContacted} (${e.daysSinceContact}d ago)`);
        else if (e.lastSeen) lines.push(`* **Last Viewed:** ${e.lastSeen}`);
        if (e.ruleHits.length > 0) {
          lines.push(`* **Matches:** ${e.ruleHits.map(h => `${h.label} (${h.keyword})`).join(', ')}`);
        }
        if (e.limitConflicts.length > 0) {
          lines.push(`* **Limit Conflicts:** ${e.limitConflicts.map(c => c.keyword).join(', ')}`);
        }
        if (e.excludedHits.length > 0) {
          lines.push(`* **Red Kinks (Fetishes):** ${e.excludedHits.join(', ')}`);
        }
        if (e.sharedGroups.length > 0) {
          lines.push(`* **Shared/Local Groups:** ${e.sharedGroups.join(', ')}`);
        }
        if (e.note) {
          lines.push(`> **Note:** ${e.note.replace(/\n/g, '\n> ')}`);
        }
        if (e.aboutText) {
          const snippet = e.aboutText.slice(0, 320).replace(/\n+/g, ' ');
          lines.push(`\n${snippet}${e.aboutText.length > 320 ? '…' : ''}`);
        }
        lines.push('\n---\n');
      }

      return lines.join('\n');
    },

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.filterGender = Store.getSettings().genderFilter || 'all';
      this.renderModal();
      document.addEventListener('keydown', this._onKeyDown);
    },

    close() {
      this.isOpen = false;
      document.removeEventListener('keydown', this._onKeyDown);
      if (this.host) {
        this.host.remove();
        this.host = null;
        this.shadow = null;
      }
      Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
      runAll();
    },

    _onKeyDown(e) {
      if (e.key === 'Escape') {
        CrmModal.close();
      }
    },

    renderModal() {
      withObserverPaused(() => {
        if (!this.host) {
          this.host = document.createElement('div');
          this.host.id = 'flx-crm-host';
          this.host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
          this.shadow = this.host.attachShadow({ mode: 'open' });
          (document.documentElement || document.body).appendChild(this.host);
        }

        const settings = Store.getSettings();
        this.shadow.innerHTML = `
          <style>
            :host { all: initial; font-family: system-ui, -apple-system, sans-serif; font-size: 13px; color: #e4e4e7; }
            * { box-sizing: border-box; }
            ::-webkit-scrollbar { width: 7px; height: 7px; }
            ::-webkit-scrollbar-track { background: #121215; }
            ::-webkit-scrollbar-thumb { background: #33333b; border-radius: 999px; }
            ::-webkit-scrollbar-thumb:hover { background: #4b4b57; }
            .backdrop {
              position: fixed; inset: 0; background: rgba(6, 6, 9, 0.82); backdrop-filter: blur(6px);
              display: flex; align-items: center; justify-content: center; padding: 16px;
            }
            .modal {
              background: #141418; border: 1px solid #303038; border-radius: 12px;
              width: min(1100px, 96vw); height: min(89vh, 920px);
              display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.9);
              overflow: hidden;
            }
            .header {
              padding: 13px 18px; background: linear-gradient(180deg, #1c1c22 0%, #16161b 100%);
              border-bottom: 1px solid #2b2b33;
              display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
            }
            .title-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
            .title { font-size: 16px; font-weight: 700; color: #fafafa; letter-spacing: -0.01em; }
            .subtitle { font-size: 12px; color: #a1a1aa; }
            .controls {
              padding: 11px 18px; background: #18181d; border-bottom: 1px solid #282830;
              display: flex; flex-direction: column; gap: 8px;
            }
            .control-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
            input[type="text"], input[type="number"], select, textarea {
              background: #202026; color: #f4f4f5; border: 1px solid #3a3a44; border-radius: 6px;
              padding: 5px 9px; font-size: 12px; font-family: inherit;
            }
            input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus {
              outline: none; border-color: #eab308;
            }
            .search-input { flex: 1; min-width: 200px; }
            .age-input { width: 72px; }
            .tabs { display: flex; gap: 5px; flex-wrap: wrap; }
            button {
              background: #222228; color: #d4d4d8; border: 1px solid #3a3a44; border-radius: 6px;
              padding: 5px 9px; cursor: pointer; font-size: 12px; font-family: inherit;
              transition: background 0.15s, border-color 0.15s, color 0.15s;
            }
            button:hover { background: #2d2d35; color: #fff; }
            button.active-tab { background: rgba(234, 179, 8, 0.16); border-color: #ca8a04; color: #fde047; font-weight: 600; }
            button.toggle-pill { font-size: 11px; padding: 4px 8px; }
            button.toggle-pill.on { background: rgba(56, 189, 248, 0.16); border-color: #0284c7; color: #7dd3fc; font-weight: 600; }
            button.danger-ghost { color: #fca5a5; border-color: #4c1d1d; }
            button.danger-ghost:hover { background: #3f1515; }
            .list {
              flex: 1; overflow-y: auto; padding: 14px 18px;
              display: flex; flex-direction: column; gap: 12px;
            }
            .empty {
              text-align: center; color: #71717a; padding: 54px 16px; font-size: 13px;
            }
            .card {
              background: #1a1a20; border: 1px solid #2d2d36; border-radius: 10px;
              padding: 13px 15px; display: flex; flex-direction: column; gap: 9px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.25);
            }
            .card-top {
              display: flex; align-items: center; justify-content: space-between;
              gap: 10px; flex-wrap: wrap;
            }
            .user-link {
              color: #93c5fd; font-weight: 700; font-size: 15px; text-decoration: none;
            }
            .user-link:hover { text-decoration: underline; color: #bfdbfe; }
            .badges { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .pill {
              font-size: 11px; padding: 2px 7px; border-radius: 5px;
              background: #24242b; color: #a1a1aa; border: 1px solid #363640;
            }
            .pill-ex { background: rgba(239,68,68,0.16); color: #fca5a5; border-color: #b91c1c; }
            .pill-warn { background: rgba(245,158,11,0.18); color: #fcd34d; border-color: #d97706; }
            .pill-group { background: rgba(52,211,153,0.12); color: #6ee7b7; border-color: rgba(52,211,153,0.35); }
            .stage-bar { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .stage-btn { padding: 3px 8px; font-size: 11px; border-radius: 5px; }
            .gender-seg { display: inline-flex; border: 1px solid #3a3a44; border-radius: 5px; overflow: hidden; }
            .gender-seg button { border: none; border-radius: 0; padding: 3px 7px; font-size: 11px; background: #1d1d24; }
            .gender-seg button.g-female { background: rgba(244,114,182,0.22); color: #f9a8d4; font-weight: 600; }
            .gender-seg button.g-male { background: rgba(59,130,246,0.22); color: #93c5fd; font-weight: 600; }
            .gender-seg button.g-other { background: rgba(168,85,247,0.22); color: #d8b4fe; font-weight: 600; }
            .gender-seg button.g-auto { background: #2c2c36; color: #e4e4e7; font-weight: 600; }
            .note-row { display: flex; gap: 8px; align-items: flex-start; }
            .note-area {
              flex: 1; min-height: 44px; resize: vertical; line-height: 1.45;
              background: #131317; border-color: #32323c;
            }
            .cache-panel {
              background: #131317; border: 1px solid #272730; border-radius: 7px;
              padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;
            }
            .cache-header {
              display: flex; align-items: center; justify-content: space-between;
              gap: 8px; flex-wrap: wrap; font-size: 11px; color: #8e8e9a;
            }
            .sub-tabs { display: flex; gap: 4px; }
            .sub-tab { padding: 2px 7px; font-size: 11px; border-radius: 4px; }
            .sub-tab.active { background: #2c2c36; color: #f4f4f5; border-color: #525260; }
            .bio-body {
              font-size: 12px; color: #d4d4d8; line-height: 1.5;
              white-space: pre-wrap; max-height: 150px; overflow-y: auto;
            }
            .fetish-group { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
            .ftag-into { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(16,185,129,0.14); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.35); }
            .ftag-limit { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(239,68,68,0.14); color: #fca5a5; border: 1px solid rgba(239,68,68,0.35); }
          </style>
          <div class="backdrop" id="crm-backdrop">
            <div class="modal" role="dialog" aria-modal="true" aria-label="Local FetLife CRM">
              <div class="header">
                <div class="title-wrap">
                  <span class="title">Local FetLife CRM</span>
                  <span class="subtitle" id="crm-summary"></span>
                </div>
                <div class="stage-bar">
                  <button type="button" id="crm-export-md" title="Copy formatted Markdown summary of filtered entries">Export Markdown</button>
                  <button type="button" id="crm-export" title="Copy raw JSON backup">Export JSON</button>
                  <button type="button" id="crm-close">✕ Close (Esc)</button>
                </div>
              </div>
              <div class="controls">
                <div class="control-row">
                  <input type="text" class="search-input" id="crm-search" placeholder="Search handle, location, groups, notes, About, or fetishes...">
                  <select id="crm-gender-filter" title="Filter by Gender">
                    <option value="all">All Genders</option>
                    <option value="female">♀ Female Only</option>
                    <option value="male">♂ Male Only</option>
                    <option value="other">⚧ NB / Trans / Other</option>
                    <option value="unknown">Gender Unknown</option>
                  </select>
                  <select id="crm-rel-filter" title="Filter by Relationship Status">
                    <option value="all">All Relationships</option>
                    <option value="single">Single / Available</option>
                    <option value="partnered">Partnered / Married / Poly</option>
                    <option value="unknown">Relationship Unknown</option>
                  </select>
                  <input type="number" class="age-input" id="crm-age-min" min="18" max="99" placeholder="Min age" title="Minimum Age">
                  <input type="number" class="age-input" id="crm-age-max" min="18" max="99" placeholder="Max age" title="Maximum Age">
                </div>
                <div class="control-row">
                  <select id="crm-cat-filter" title="Filter by Content Category">
                    <option value="all">All Categories</option>
                    ${settings.highlightRules.map(r => `<option value="rule:${r.id || r.label}">${r.label}</option>`).join('')}
                    <option value="excluded">Has Red Kink (Fetishes)</option>
                    <option value="conflict">Has Limit Conflict</option>
                  </select>
                  <select id="crm-sort" title="Sort order">
                    <option value="matches">Sort: Most Categories Matched</option>
                    <option value="priority">Sort: Pipeline Stage & Notes</option>
                    <option value="recent">Sort: Most Recent</option>
                    <option value="alpha">Sort: Username (A–Z)</option>
                  </select>
                  <button type="button" class="toggle-pill" id="crm-tgl-excludes">🚫 Hide Red Kinks</button>
                  <button type="button" class="toggle-pill" id="crm-tgl-local">📍 Local PDX Only</button>
                  <button type="button" class="toggle-pill" id="crm-tgl-followup">⏰ Follow-Up Due</button>
                </div>
                <div class="tabs" id="crm-tabs"></div>
              </div>
              <div class="list" id="crm-list"></div>
            </div>
          </div>
        `;

        const $ = (id) => this.shadow.getElementById(id);
        const searchInput = $('crm-search');
        const genderSelect = $('crm-gender-filter');
        const relSelect = $('crm-rel-filter');
        const minAgeInput = $('crm-age-min');
        const maxAgeInput = $('crm-age-max');
        const catSelect = $('crm-cat-filter');
        const sortSelect = $('crm-sort');
        const btnExcludes = $('crm-tgl-excludes');
        const btnLocal = $('crm-tgl-local');
        const btnFollowUp = $('crm-tgl-followup');

        searchInput.value = this.searchQuery;
        genderSelect.value = this.filterGender;
        relSelect.value = this.filterRel;
        minAgeInput.value = this.minAgeFilter;
        maxAgeInput.value = this.maxAgeFilter;
        catSelect.value = this.filterCategory;
        sortSelect.value = this.sortBy;

        const syncToggleButtons = () => {
          btnExcludes.classList.toggle('on', this.hideExcludes);
          btnLocal.classList.toggle('on', this.localOnly);
          btnFollowUp.classList.toggle('on', this.followUpOnly);
        };
        syncToggleButtons();

        $('crm-backdrop').addEventListener('click', (e) => {
          if (e.target === $('crm-backdrop')) this.close();
        });
        $('crm-close').addEventListener('click', () => this.close());

        $('crm-export').addEventListener('click', () => {
          const dump = Store.exportAll();
          if (navigator.clipboard) {
            navigator.clipboard.writeText(dump).then(() => {
              $('crm-summary').textContent = '✓ Copied full JSON backup to clipboard';
            }).catch(() => window.prompt('Copy JSON backup:', dump));
          } else {
            window.prompt('Copy JSON backup:', dump);
          }
        });

        $('crm-export-md').addEventListener('click', () => {
          const md = this.generateMarkdownDossier(this.lastRenderedEntries);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(md).then(() => {
              $('crm-summary').textContent = `✓ Copied Markdown dossier (${this.lastRenderedEntries.length} profiles) to clipboard`;
            }).catch(() => window.prompt('Copy Markdown dossier:', md));
          } else {
            window.prompt('Copy Markdown dossier:', md);
          }
        });

        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.refreshList();
        });
        genderSelect.addEventListener('change', (e) => {
          this.filterGender = e.target.value;
          this.refreshList();
        });
        relSelect.addEventListener('change', (e) => {
          this.filterRel = e.target.value;
          this.refreshList();
        });
        minAgeInput.addEventListener('input', (e) => {
          this.minAgeFilter = e.target.value;
          this.refreshList();
        });
        maxAgeInput.addEventListener('input', (e) => {
          this.maxAgeFilter = e.target.value;
          this.refreshList();
        });
        catSelect.addEventListener('change', (e) => {
          this.filterCategory = e.target.value;
          this.refreshList();
        });
        sortSelect.addEventListener('change', (e) => {
          this.sortBy = e.target.value;
          this.refreshList();
        });

        btnExcludes.addEventListener('click', () => {
          this.hideExcludes = !this.hideExcludes;
          syncToggleButtons();
          this.refreshList();
        });
        btnLocal.addEventListener('click', () => {
          this.localOnly = !this.localOnly;
          syncToggleButtons();
          this.refreshList();
        });
        btnFollowUp.addEventListener('click', () => {
          this.followUpOnly = !this.followUpOnly;
          syncToggleButtons();
          this.refreshList();
        });

        this.refreshList();
        setTimeout(() => searchInput.focus(), 20);
      });
    },

    refreshList() {
      if (!this.shadow) return;
      const $ = (id) => this.shadow.getElementById(id);
      const allEntries = this.buildEntries();

      const counts = {
        all: allEntries.length,
        shortlist: allEntries.filter(e => e.status === 'shortlist').length,
        messaged: allEntries.filter(e => e.status === 'messaged').length,
        talking: allEntries.filter(e => e.status === 'talking').length,
        met: allEntries.filter(e => e.status === 'met').length,
        notes: allEntries.filter(e => e.note.trim().length > 0).length,
        cached: allEntries.filter(e => e.hasCache).length,
        hasAbout: allEntries.filter(e => e.hasAbout).length,
        noAbout: allEntries.filter(e => e.noAbout).length,
        hidden: allEntries.filter(e => e.status === 'hidden').length
      };

      const tabDefs = [
        { id: 'all', label: `All (${counts.all})` },
        { id: 'shortlist', label: `★ Shortlist (${counts.shortlist})` },
        { id: 'messaged', label: `✉ Messaged (${counts.messaged})` },
        { id: 'talking', label: `💬 Talking (${counts.talking})` },
        { id: 'met', label: `☕ Met IRL (${counts.met})` },
        { id: 'notes', label: `✎ Noted (${counts.notes})` },
        { id: 'cached', label: `Cached (${counts.cached})` },
        { id: 'hasAbout', label: `About ✓ (${counts.hasAbout})` },
        { id: 'noAbout', label: `No About (${counts.noAbout})` },
        { id: 'hidden', label: `✕ Passed (${counts.hidden})` }
      ];

      const tabsEl = $('crm-tabs');
      tabsEl.innerHTML = '';
      for (const t of tabDefs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = this.filterStatus === t.id ? 'active-tab' : '';
        btn.textContent = t.label;
        btn.addEventListener('click', () => {
          this.filterStatus = t.id;
          this.refreshList();
        });
        tabsEl.appendChild(btn);
      }

      const q = this.searchQuery.trim().toLowerCase();
      const minA = this.minAgeFilter ? parseInt(this.minAgeFilter, 10) : null;
      const maxA = this.maxAgeFilter ? parseInt(this.maxAgeFilter, 10) : null;

      const filtered = allEntries.filter((entry) => {
        if (this.filterStatus === 'shortlist' && entry.status !== 'shortlist') return false;
        if (this.filterStatus === 'messaged' && entry.status !== 'messaged') return false;
        if (this.filterStatus === 'talking' && entry.status !== 'talking') return false;
        if (this.filterStatus === 'met' && entry.status !== 'met') return false;
        if (this.filterStatus === 'notes' && !entry.note.trim()) return false;
        if (this.filterStatus === 'cached' && !entry.hasCache) return false;
        if (this.filterStatus === 'hasAbout' && !entry.hasAbout) return false;
        if (this.filterStatus === 'noAbout' && !entry.noAbout) return false;
        if (this.filterStatus === 'hidden' && entry.status !== 'hidden') return false;

        if (this.filterGender === 'female' && entry.genderCategory !== 'female') return false;
        if (this.filterGender === 'male' && entry.genderCategory !== 'male') return false;
        if (this.filterGender === 'other' && entry.genderCategory !== 'other') return false;
        if (this.filterGender === 'unknown' && entry.genderCategory !== null) return false;

        if (this.filterRel === 'single') {
          if (!entry.relationships || !/single|solo|unpartnered|available/i.test(entry.relationships)) return false;
        } else if (this.filterRel === 'partnered') {
          if (!entry.relationships || /single|solo|unpartnered|available/i.test(entry.relationships)) return false;
        } else if (this.filterRel === 'unknown') {
          if (entry.relationships) return false;
        }

        if (minA !== null && typeof entry.age === 'number' && entry.age < minA) return false;
        if (maxA !== null && typeof entry.age === 'number' && entry.age > maxA) return false;
        if ((minA !== null || maxA !== null) && typeof entry.age !== 'number') return false;

        if (this.hideExcludes && entry.excludedHits.length > 0) return false;
        if (this.localOnly && !entry.isLocal) return false;
        if (this.followUpOnly && !entry.followUpDue) return false;

        if (this.filterCategory === 'excluded' && entry.excludedHits.length === 0) return false;
        if (this.filterCategory === 'conflict' && entry.limitConflicts.length === 0) return false;
        if (this.filterCategory.startsWith('rule:')) {
          const targetId = this.filterCategory.slice(5);
          if (!entry.ruleHits.some(h => String(h.id) === targetId)) return false;
        }

        if (q) {
          const haystack = [
            entry.displayHandle,
            entry.key,
            entry.gender || '',
            entry.genderRole || '',
            entry.location || '',
            entry.relationships || '',
            entry.lookingFor || '',
            entry.groups.join(' '),
            entry.note,
            entry.aboutText,
            entry.fetishesText,
            entry.fullText,
            ...entry.ruleHits.map(h => `${h.label} ${h.keyword}`),
            ...entry.excludedHits
          ].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      });

      const stageWeight = (st) => {
        if (st === 'met') return 140;
        if (st === 'talking') return 120;
        if (st === 'messaged') return 100;
        if (st === 'shortlist') return 80;
        if (st === 'hidden') return -60;
        return 0;
      };

      filtered.sort((a, b) => {
        if (this.sortBy === 'alpha') {
          return a.displayHandle.localeCompare(b.displayHandle);
        }
        if (this.sortBy === 'recent') {
          return (b.recentStamp - a.recentStamp) || a.displayHandle.localeCompare(b.displayHandle);
        }
        if (this.sortBy === 'matches') {
          const matchDiff = b.ruleHits.length - a.ruleHits.length;
          if (matchDiff !== 0) return matchDiff;
          const swDiff = stageWeight(b.status) - stageWeight(a.status);
          if (swDiff !== 0) return swDiff;
          return (b.recentStamp - a.recentStamp) || a.displayHandle.localeCompare(b.displayHandle);
        }
        const score = (x) => stageWeight(x.status) + (x.note.trim() ? 25 : 0) + (x.ruleHits.length * 5);
        const diff = score(b) - score(a);
        if (diff !== 0) return diff;
        if (b.recentStamp !== a.recentStamp) return b.recentStamp - a.recentStamp;
        return a.displayHandle.localeCompare(b.displayHandle);
      });

      this.lastRenderedEntries = filtered;
      $('crm-summary').textContent = `Showing ${filtered.length} of ${allEntries.length} tracked profiles`;

      const listEl = $('crm-list');
      listEl.innerHTML = '';

      if (filtered.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No stored or cached profiles match the current filters.';
        listEl.appendChild(empty);
        return;
      }

      for (const entry of filtered) {
        const card = document.createElement('div');
        card.className = 'card';

        const activeStage = entry.status ? STAGE_MAP[entry.status] : null;
        if (activeStage) {
          card.style.borderLeft = `4px solid ${activeStage.color}`;
        } else if (entry.ruleHits.length > 0) {
          card.style.borderLeft = `4px solid ${entry.ruleHits[0].color}`;
        } else if (entry.excludedHits.length > 0) {
          card.style.borderLeft = '4px solid #b91c1c';
        }

        const top = document.createElement('div');
        top.className = 'card-top';

        const leftInfo = document.createElement('div');
        leftInfo.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

        const link = document.createElement('a');
        link.className = 'user-link';
        link.href = entry.profileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `/${entry.displayHandle}`;
        leftInfo.appendChild(link);

        const demoPill = createDemographicPill(entry.age, entry.gender, entry.genderRole, entry.location, entry.isManualGender, entry.genderCategory);
        if (demoPill) leftInfo.appendChild(demoPill);

        const dots = createMatchDotsCluster(entry.ruleHits, entry.limitConflicts, entry.excludedHits);
        if (dots) leftInfo.appendChild(dots);

        const badges = document.createElement('div');
        badges.className = 'badges';

        if (entry.relationships) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = '#d8b4fe';
          b.style.borderColor = 'rgba(168,85,247,0.35)';
          b.textContent = entry.relationships;
          badges.appendChild(b);
        }

        if (entry.lastContacted) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = entry.followUpDue ? '#fde047' : '#7dd3fc';
          b.style.borderColor = entry.followUpDue ? '#ca8a04' : '#0369a1';
          b.textContent = entry.followUpDue
            ? `⏰ Contacted ${entry.lastContacted} (${entry.daysSinceContact}d ago)`
            : `Contacted ${entry.lastContacted}`;
          badges.appendChild(b);
        } else if (entry.lastSeen) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.textContent = `Viewed ${entry.lastSeen}`;
          badges.appendChild(b);
        }

        if (entry.hasCache) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.textContent = `${entry.hasAbout ? 'About ✓' : 'No About'}${entry.hasFetishes ? ' • Fetishes ✓' : ''}`;
          if (entry.noAbout) {
            b.style.color = '#fca5a5';
            b.style.borderColor = '#7f1d1d';
          }
          badges.appendChild(b);
        }

        for (const g of entry.sharedGroups.slice(0, 3)) {
          const b = document.createElement('span');
          b.className = 'pill pill-group';
          b.textContent = `🤝 ${g}`;
          badges.appendChild(b);
        }

        for (const hit of entry.ruleHits) {
          const b = document.createElement('span');
          b.style.cssText = `font-size:11px;padding:2px 6px;border-radius:4px;background:${hexToRgba(hit.color, 0.18)};color:${hit.color};border:1px solid ${hexToRgba(hit.color, 0.65)};font-weight:500;`;
          b.textContent = `${hit.label}: ${hit.keyword}`;
          badges.appendChild(b);
        }

        for (const c of entry.limitConflicts) {
          const b = document.createElement('span');
          b.className = 'pill pill-warn';
          b.textContent = `⚠ Limit: ${c.keyword}`;
          badges.appendChild(b);
        }

        for (const kw of entry.excludedHits) {
          const b = document.createElement('span');
          b.className = 'pill pill-ex';
          b.title = 'Red kink found in Fetishes (Into) list';
          b.textContent = `-${kw}`;
          badges.appendChild(b);
        }

        leftInfo.appendChild(badges);

        const stageBar = document.createElement('div');
        stageBar.className = 'stage-bar';

        const genderSeg = document.createElement('div');
        genderSeg.className = 'gender-seg';
        genderSeg.title = 'Set Gender Override';

        const genderOpts = [
          { val: null,     label: 'Auto',     activeCls: 'g-auto' },
          { val: 'female', label: '♀ Female', activeCls: 'g-female' },
          { val: 'male',   label: '♂ Male',   activeCls: 'g-male' },
          { val: 'other',  label: '⚧ Other',  activeCls: 'g-other' }
        ];
        for (const gOpt of genderOpts) {
          const gBtn = document.createElement('button');
          gBtn.type = 'button';
          gBtn.textContent = gOpt.label;
          if ((entry.manualGender || null) === gOpt.val) {
            gBtn.className = gOpt.activeCls;
          }
          gBtn.addEventListener('click', () => {
            Store.setUser(entry.key, {
              username: entry.displayHandle,
              manualGender: gOpt.val
            });
            this.refreshList();
          });
          genderSeg.appendChild(gBtn);
        }
        stageBar.appendChild(genderSeg);

        for (const st of PIPELINE_STAGES) {
          const sBtn = document.createElement('button');
          sBtn.type = 'button';
          sBtn.className = 'stage-btn';
          const isCurrent = entry.status === st.id;
          if (isCurrent) {
            sBtn.style.background = st.bg;
            sBtn.style.borderColor = st.border;
            sBtn.style.color = st.color;
            sBtn.style.fontWeight = '600';
          }
          sBtn.textContent = st.short;
          sBtn.addEventListener('click', () => {
            Store.setUser(entry.key, {
              username: entry.displayHandle,
              status: isCurrent ? null : st.id
            });
            this.refreshList();
          });
          stageBar.appendChild(sBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'stage-btn danger-ghost';
        delBtn.textContent = 'Delete';
        delBtn.title = 'Remove this user from local CRM & cache';
        delBtn.addEventListener('click', () => {
          Store.deleteUserAndCache(entry.key);
          this.refreshList();
        });
        stageBar.appendChild(delBtn);

        top.append(leftInfo, stageBar);
        card.appendChild(top);

        if (entry.lookingFor) {
          const lfLine = document.createElement('div');
          lfLine.style.cssText = 'font-size:11px;color:#9ca3af;';
          lfLine.textContent = `Looking for: ${entry.lookingFor}`;
          card.appendChild(lfLine);
        }

        const noteRow = document.createElement('div');
        noteRow.className = 'note-row';

        const noteArea = document.createElement('textarea');
        noteArea.className = 'note-area';
        noteArea.placeholder = `Private notes for /${entry.displayHandle}...`;
        noteArea.value = entry.note;

        const saveNoteBtn = document.createElement('button');
        saveNoteBtn.type = 'button';
        saveNoteBtn.textContent = 'Save Note';
        const persistNote = () => {
          const trimmed = noteArea.value.trim();
          if (trimmed !== entry.note) {
            Store.setUser(entry.key, {
              username: entry.displayHandle,
              note: trimmed
            });
            entry.note = trimmed;
            saveNoteBtn.textContent = 'Saved ✓';
            saveNoteBtn.className = 'active-tab';
            setTimeout(() => {
              saveNoteBtn.textContent = 'Save Note';
              saveNoteBtn.className = '';
            }, 1500);
          }
        };
        saveNoteBtn.addEventListener('click', persistNote);
        noteArea.addEventListener('blur', persistNote);

        noteRow.append(noteArea, saveNoteBtn);
        card.appendChild(noteRow);

        if (entry.hasCache) {
          const cachePanel = document.createElement('div');
          cachePanel.className = 'cache-panel';

          const cacheHeader = document.createElement('div');
          cacheHeader.className = 'cache-header';

          const subTabs = document.createElement('div');
          subTabs.className = 'sub-tabs';

          const bodyBox = document.createElement('div');
          bodyBox.className = 'bio-body';

          let activeSub = entry.aboutText ? 'about' : (entry.hasFetishes ? 'fetishes' : 'full');

          const renderCacheBody = () => {
            subTabs.querySelectorAll('.sub-tab').forEach(btn => {
              btn.classList.toggle('active', btn.dataset.tab === activeSub);
            });
            bodyBox.innerHTML = '';

            if (activeSub === 'about') {
              bodyBox.textContent = entry.aboutText || 'No About section written on this profile.';
            } else if (activeSub === 'fetishes') {
              if (entry.fetishesInto.length > 0) {
                const lbl = document.createElement('div');
                lbl.style.cssText = 'font-size:11px;color:#6ee7b7;font-weight:600;margin-bottom:3px;';
                lbl.textContent = `Into / Curious (${entry.fetishesInto.length}):`;
                const wrap = document.createElement('div');
                wrap.className = 'fetish-group';
                for (const item of entry.fetishesInto) {
                  const chip = document.createElement('span');
                  chip.className = 'ftag-into';
                  chip.textContent = item;
                  wrap.appendChild(chip);
                }
                bodyBox.append(lbl, wrap);
              }
              if (entry.fetishesLimits.length > 0) {
                const lbl = document.createElement('div');
                lbl.style.cssText = 'font-size:11px;color:#fca5a5;font-weight:600;margin:6px 0 3px;';
                lbl.textContent = `Limits (${entry.fetishesLimits.length}):`;
                const wrap = document.createElement('div');
                wrap.className = 'fetish-group';
                for (const item of entry.fetishesLimits) {
                  const chip = document.createElement('span');
                  chip.className = 'ftag-limit';
                  chip.textContent = item;
                  wrap.appendChild(chip);
                }
                bodyBox.append(lbl, wrap);
              }
              if (entry.fetishesInto.length === 0 && entry.fetishesLimits.length === 0) {
                bodyBox.textContent = entry.fetishesText || 'No structured fetishes cached yet.';
              }
            } else if (activeSub === 'groups') {
              bodyBox.textContent = entry.groups.length > 0
                ? entry.groups.join('  •  ')
                : 'No groups cached for this profile.';
            } else {
              bodyBox.textContent = entry.fullText;
            }
          };

          const tabOptions = [
            { id: 'about', label: 'About' },
            ...(entry.hasFetishes ? [{ id: 'fetishes', label: 'Fetishes & Limits' }] : []),
            ...(entry.groups.length > 0 ? [{ id: 'groups', label: `Groups (${entry.groups.length})` }] : []),
            { id: 'full', label: 'Full Cache' }
          ];

          for (const opt of tabOptions) {
            const tBtn = document.createElement('button');
            tBtn.type = 'button';
            tBtn.className = `sub-tab ${activeSub === opt.id ? 'active' : ''}`;
            tBtn.dataset.tab = opt.id;
            tBtn.textContent = opt.label;
            tBtn.addEventListener('click', () => {
              activeSub = opt.id;
              renderCacheBody();
            });
            subTabs.appendChild(tBtn);
          }

          const dateSpan = document.createElement('span');
          dateSpan.textContent = `Cached ${entry.cachedDate || 'locally'}`;

          cacheHeader.append(subTabs, dateSpan);
          renderCacheBody();
          cachePanel.append(cacheHeader, bodyBox);
          card.appendChild(cachePanel);
        }

        listEl.appendChild(card);
      }
    }
  };

  // =========================================================================
  // 11. SHADOW DOM FLOATING HUD (WITH QUICK CARD VIEW CYCLE BUTTON)
  // =========================================================================
  const Hud = {
    shadow: null,
    host: null,
    expanded: false,
    countSpan: null,
    cacheSpan: null,
    viewModeBtn: null,
    showHiddenBtn: null,
    pauseBtn: null,
    panel: null,
    draftKeybinds: null,
    capturingKeyAction: null,

    applyPosition(pos) {
      if (!this.host) return;
      this.host.style.top = '';
      this.host.style.bottom = '';
      this.host.style.left = '';
      this.host.style.right = '';

      if (pos === 'bottom-left') {
        this.host.style.bottom = '16px';
        this.host.style.left = '16px';
      } else if (pos === 'top-right') {
        this.host.style.top = '64px';
        this.host.style.right = '16px';
      } else if (pos === 'top-left') {
        this.host.style.top = '64px';
        this.host.style.left = '16px';
      } else {
        this.host.style.bottom = '16px';
        this.host.style.right = '76px';
      }
    },

    cycleGlobalCardView() {
      const s = Store.getSettings();
      const cur = s.cardViewMode || 'full';
      const idx = VIEW_MODES.indexOf(cur);
      const next = VIEW_MODES[(idx + 1) % VIEW_MODES.length];
      cardViewOverrides.clear();
      Store.saveSettings({ cardViewMode: next });
      this.syncQuickButtons();
      if (this.expanded && this.shadow) {
        const viewSel = this.shadow.getElementById('in-view-mode');
        if (viewSel) viewSel.value = next;
      }
      runAll();
      CardNavigator.showToast(`Cards → ${VIEW_MODE_LABELS[next] || next}`);
    },

    init() {
      const mountRoot = document.documentElement || document.body;
      if (!mountRoot) return;

      const existing = document.getElementById('flx-hud-host');
      if (existing) {
        if (existing.parentElement !== mountRoot) {
          mountRoot.appendChild(existing);
        }
        return;
      }

      const settings = Store.getSettings();
      this.draftKeybinds = Object.assign({}, settings.keybinds);
      this.host = document.createElement('div');
      this.host.id = 'flx-hud-host';
      this.host.style.cssText = 'position:fixed;z-index:2147483646;';
      this.applyPosition(settings.hudPosition);

      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `
        <style>
          :host { all: initial; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #e4e4e7; }
          * { box-sizing: border-box; }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #141418; }
          ::-webkit-scrollbar-thumb { background: #33333b; border-radius: 999px; }
          .box {
            background: rgba(20, 20, 24, 0.96); backdrop-filter: blur(10px);
            border: 1px solid #383842; border-radius: 10px; padding: 8px 10px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.75); width: min(440px, calc(100vw - 32px)); max-height: 82vh; overflow-y: auto;
          }
          .box.collapsed { width: auto; overflow: visible; }
          .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
          button {
            background: #232329; color: #e4e4e7; border: 1px solid #3f3f48; border-radius: 5px;
            padding: 4px 8px; cursor: pointer; font-size: 11px; transition: background 0.15s, border-color 0.15s;
          }
          button:hover { background: #303038; color: #fff; }
          button.star { background: rgba(234, 179, 8, 0.18); border-color: #ca8a04; color: #fde047; font-weight: 600; }
          button.sky { background: rgba(56, 189, 248, 0.16); border-color: #0284c7; color: #7dd3fc; font-weight: 600; }
          button.danger { background: rgba(239, 68, 68, 0.18); border-color: #dc2626; color: #fca5a5; }
          button.capturing { background: rgba(56, 189, 248, 0.22); border-color: #0284c7; color: #7dd3fc; font-weight: 600; }
          .scan-pill {
            font-size: 11px; color: #a1a1aa; padding: 2px 7px; background: #1c1c22;
            border: 1px solid #303038; border-radius: 5px; max-width: 195px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .panel { margin-top: 8px; padding-top: 8px; border-top: 1px solid #2c2c34; display: flex; flex-direction: column; gap: 9px; }
          .section-box {
            background: #17171c; border: 1px solid #2b2b34; border-radius: 7px;
            padding: 7px 9px; display: flex; flex-direction: column; gap: 6px;
          }
          label { display: flex; flex-direction: column; gap: 3px; color: #a1a1aa; font-size: 11px; }
          .inline-label { flex-direction: row; align-items: center; gap: 6px; cursor: pointer; color: #d4d4d8; }
          input[type="text"], input[type="number"], select, textarea {
            background: #1d1d23; color: #f4f4f5; border: 1px solid #3e3e48; border-radius: 5px;
            padding: 4px 6px; font-size: 11px; font-family: inherit; width: 100%;
          }
          input[type="color"] {
            width: 26px; height: 24px; padding: 0; border: 1px solid #52525b; border-radius: 5px;
            background: transparent; cursor: pointer; flex-shrink: 0;
          }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .grid3 { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 6px; align-items: end; }
          .rules-header { display: flex; justify-content: space-between; align-items: center; color: #d4d4d8; font-weight: 600; font-size: 11px; gap: 6px; }
          .rule-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
          .rule-label { width: 96px !important; flex-shrink: 0; }
          .rule-kws { flex: 1; }
          .rule-del { padding: 3px 6px; color: #fca5a5; flex-shrink: 0; }
          .tpl-card { background: #131317; border: 1px solid #2a2a33; border-radius: 5px; padding: 5px 6px; display: flex; flex-direction: column; gap: 4px; margin-top: 4px; }
          .kb-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: #cbd5e1; padding: 2px 0; }
          .kb-btn { min-width: 96px; text-align: center; font-family: ui-monospace, monospace; }
          .status { color: #6ee7b7; font-size: 11px; min-height: 14px; }
        </style>
        <div class="box collapsed" id="hud-box">
          <div class="row">
            <button type="button" id="btn-toggle">FL (<span id="card-count">0</span>) ▲</button>
            <button type="button" class="star" id="btn-crm">CRM</button>
            <button type="button" id="btn-view-mode" title="Cycle card view: Full / Compact / Minimal (V)">View: Full</button>
            <button type="button" id="btn-hidden"></button>
            <button type="button" id="btn-pause"></button>
            <span class="scan-pill" id="cache-status">Cached: 0</span>
          </div>
          <div class="panel" id="hud-panel" style="display:none;">
            <div class="section-box">
              <div class="grid2">
                <label>HUD Position
                  <select id="in-pos">
                    <option value="bottom-right">Bottom Right (Clear Dock)</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </label>
                <label>Card View Mode
                  <select id="in-view-mode">
                    <option value="full">Full Card + Pills</option>
                    <option value="compact">Compact (Dots Only)</option>
                    <option value="minimal">Minimal Strip (Dots Only)</option>
                    <option value="off">Hidden Toolbars</option>
                  </select>
                </label>
              </div>
              <div class="grid2">
                <label>Full Toolbar Placement
                  <select id="in-toolbar-pos">
                    <option value="top-sticky">Top of Card (Sticky)</option>
                    <option value="top">Top of Card</option>
                    <option value="bottom">Bottom of Card</option>
                  </select>
                </label>
                <label>Filter Action
                  <select id="in-mode">
                    <option value="dim">Dim Card</option>
                    <option value="collapse">Collapse Card</option>
                  </select>
                </label>
              </div>
              <div class="grid2">
                <label>Gender Filter
                  <select id="in-gender-filter">
                    <option value="all">All Genders (No Filter)</option>
                    <option value="female">♀ Female Only</option>
                    <option value="male">♂ Male Only</option>
                    <option value="other">⚧ NB / Trans / Other</option>
                  </select>
                </label>
                <label>Dim Opacity (<span id="opacity-val">18%</span>)
                  <input type="range" id="in-opacity" min="0.05" max="0.75" step="0.05">
                </label>
              </div>
              <div class="grid3">
                <label class="inline-label" style="padding-bottom:4px;">
                  <input type="checkbox" id="in-age-filter"> Age Window
                </label>
                <label>Min Age
                  <input type="number" id="in-min-age" min="18" max="99">
                </label>
                <label>Max Age
                  <input type="number" id="in-max-age" min="18" max="99">
                </label>
              </div>
              <label>Cache Retention (Days)
                <input type="number" id="in-ttl" min="1" max="90">
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-sticky-profile"> Pin profile bar to top while scrolling
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-notes"> Show private notes inline (Full mode)
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-noabout"> Hide cached profiles with no "About" section
              </label>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Content Color Categories</span>
                <div class="row">
                  <button type="button" id="btn-reset-rules" title="Load full profile-tuned categories & excludes">Reset Defaults</button>
                  <button type="button" id="btn-add-rule">+ Add</button>
                </div>
              </div>
              <div id="rules-list"></div>
              <label style="margin-top:4px;">Red Kinks / Excludes (Fetishes "Into" list only — ignores About & Limits)
                <input type="text" id="in-exclude">
              </label>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Outreach Templates ({username})</span>
                <div class="row">
                  <button type="button" id="btn-reset-tpls">Reset</button>
                  <button type="button" id="btn-add-tpl">+ Add</button>
                </div>
              </div>
              <div id="tpls-list"></div>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Remappable Keybinds</span>
                <button type="button" id="btn-reset-keys">Reset Keys</button>
              </div>
              <label class="inline-label">
                <input type="checkbox" id="in-kb-nav"> Enable list card keyboard navigation
              </label>
              <div id="keybinds-list"></div>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Local Storage & Backups</span>
                <span id="storage-size" style="font-weight:normal;color:#9ca3af;">0 KB</span>
              </div>
              <div class="row">
                <button type="button" class="star" id="btn-save" style="flex:1;">Save All Settings</button>
                <button type="button" id="btn-prune-cache" title="Delete expired cache entries for untracked profiles">Prune Expired</button>
                <button type="button" id="btn-clear-cache" title="Wipe entire local profile cache">Clear Cache</button>
                <button type="button" id="btn-export" title="Copy JSON backup">Export</button>
                <button type="button" id="btn-import" title="Paste JSON backup">Import</button>
              </div>
            </div>
            <div class="status" id="hud-status"></div>
          </div>
        </div>
      `;

      const $ = (id) => this.shadow.getElementById(id);
      const box = $('hud-box');
      const rulesList = $('rules-list');
      const tplsList = $('tpls-list');
      const keybindsList = $('keybinds-list');
      this.panel = $('hud-panel');
      this.countSpan = $('card-count');
      this.cacheSpan = $('cache-status');
      this.viewModeBtn = $('btn-view-mode');
      this.showHiddenBtn = $('btn-hidden');
      this.pauseBtn = $('btn-pause');

      const refreshStorageLabel = () => {
        const stats = Store.getStorageStats();
        $('storage-size').textContent = `${stats.kb} KB (${stats.cacheCount} cached, ${stats.userCount} CRM)`;
      };

      const addRuleRow = (rule = { label: 'New Tag', color: '#f472b6', keywords: [] }) => {
        const row = document.createElement('div');
        row.className = 'rule-row';
        row.dataset.ruleId = rule.id || `custom_${Date.now()}`;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = rule.color || '#38bdf8';
        colorInput.title = 'Pick category color';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'rule-label';
        labelInput.placeholder = 'Category';
        labelInput.value = rule.label || '';

        const kwInput = document.createElement('input');
        kwInput.type = 'text';
        kwInput.className = 'rule-kws';
        kwInput.placeholder = 'keyword1, keyword2';
        kwInput.value = Array.isArray(rule.keywords) ? rule.keywords.join(', ') : '';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'rule-del';
        delBtn.textContent = '×';
        delBtn.title = 'Remove category';
        delBtn.addEventListener('click', () => row.remove());

        row.append(colorInput, labelInput, kwInput, delBtn);
        rulesList.appendChild(row);
      };

      const addTemplateRow = (tpl = { id: `tpl_${Date.now()}`, title: 'New Template', body: '' }) => {
        const card = document.createElement('div');
        card.className = 'tpl-card';
        card.dataset.tplId = tpl.id || `tpl_${Date.now()}`;

        const top = document.createElement('div');
        top.className = 'row';

        const titleIn = document.createElement('input');
        titleIn.type = 'text';
        titleIn.placeholder = 'Template Name';
        titleIn.value = tpl.title || '';
        titleIn.style.flex = '1';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'rule-del';
        delBtn.textContent = '×';
        delBtn.title = 'Remove template';
        delBtn.addEventListener('click', () => card.remove());

        const bodyIn = document.createElement('textarea');
        bodyIn.rows = 2;
        bodyIn.placeholder = 'Message text (use {username} for handle)...';
        bodyIn.value = tpl.body || '';

        top.append(titleIn, delBtn);
        card.append(top, bodyIn);
        tplsList.appendChild(card);
      };

      const renderKeybindRows = () => {
        keybindsList.innerHTML = '';
        for (const item of KEYBIND_LABELS) {
          const row = document.createElement('div');
          row.className = 'kb-row';

          const lbl = document.createElement('span');
          lbl.textContent = item.label;

          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'kb-btn';
          const currentVal = this.draftKeybinds[item.key] || 'Unbound';
          btn.textContent = this.capturingKeyAction === item.key ? 'Press key…' : currentVal;
          if (this.capturingKeyAction === item.key) btn.classList.add('capturing');

          btn.addEventListener('click', () => {
            this.capturingKeyAction = this.capturingKeyAction === item.key ? null : item.key;
            renderKeybindRows();
          });

          row.append(lbl, btn);
          keybindsList.appendChild(row);
        }
      };

      this.shadow.addEventListener('keydown', (e) => {
        if (!this.capturingKeyAction) return;
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
          this.capturingKeyAction = null;
          renderKeybindRows();
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          this.draftKeybinds[this.capturingKeyAction] = '';
          this.capturingKeyAction = null;
          renderKeybindRows();
          return;
        }

        const combo = formatKeyComboFromEvent(e);
        if (!combo) return;
        this.draftKeybinds[this.capturingKeyAction] = combo;
        this.capturingKeyAction = null;
        renderKeybindRows();
      }, true);

      const syncFormFromStore = () => {
        const s = Store.getSettings();
        this.draftKeybinds = Object.assign({}, s.keybinds);
        this.capturingKeyAction = null;

        $('in-pos').value = s.hudPosition;
        $('in-view-mode').value = s.cardViewMode || 'full';
        $('in-toolbar-pos').value = s.cardToolbarPosition || 'top-sticky';
        $('in-mode').value = s.hideMode;
        $('in-gender-filter').value = s.genderFilter || 'all';
        $('in-opacity').value = s.dimOpacity;
        $('opacity-val').textContent = `${Math.round(s.dimOpacity * 100)}%`;
        $('in-age-filter').checked = Boolean(s.filterByAge);
        $('in-min-age').value = s.minAge;
        $('in-max-age').value = s.maxAge;
        $('in-sticky-profile').checked = Boolean(s.stickyProfileBar);
        $('in-ttl').value = s.bioCacheTtlDays;
        $('in-notes').checked = Boolean(s.showNotesInline);
        $('in-noabout').checked = Boolean(s.hideNoAbout);
        $('in-exclude').value = s.excludeKeywords.join(', ');
        $('in-kb-nav').checked = Boolean(s.keybinds.navEnabled);

        rulesList.innerHTML = '';
        s.highlightRules.forEach(rule => addRuleRow(rule));

        tplsList.innerHTML = '';
        s.messageTemplates.forEach(tpl => addTemplateRow(tpl));

        renderKeybindRows();
        refreshStorageLabel();
      };

      $('btn-crm').addEventListener('click', () => {
        if (CrmModal.isOpen) CrmModal.close();
        else CrmModal.open();
      });

      this.viewModeBtn.addEventListener('click', () => this.cycleGlobalCardView());

      $('btn-add-rule').addEventListener('click', () => addRuleRow());
      $('btn-add-tpl').addEventListener('click', () => addTemplateRow());

      $('btn-reset-rules').addEventListener('click', () => {
        Store.resetRulesToDefaults();
        syncFormFromStore();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        $('hud-status').textContent = '✓ Loaded profile-tuned categories & excludes';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('btn-reset-tpls').addEventListener('click', () => {
        Store.resetTemplatesToDefaults();
        syncFormFromStore();
        runAll();
        $('hud-status').textContent = '✓ Restored default outreach templates';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('btn-reset-keys').addEventListener('click', () => {
        Store.resetKeybindsToDefaults();
        syncFormFromStore();
        $('hud-status').textContent = '✓ Restored default keybinds';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('in-opacity').addEventListener('input', (e) => {
        $('opacity-val').textContent = `${Math.round(parseFloat(e.target.value) * 100)}%`;
      });

      $('btn-toggle').addEventListener('click', () => {
        this.expanded = !this.expanded;
        this.panel.style.display = this.expanded ? 'flex' : 'none';
        box.classList.toggle('collapsed', !this.expanded);
        $('btn-toggle').innerHTML = `FL (<span id="card-count">${this.countSpan.textContent}</span>) ${this.expanded ? '▼' : '▲'}`;
        this.countSpan = $('card-count');
        if (this.expanded) syncFormFromStore();
      });

      this.showHiddenBtn.addEventListener('click', () => {
        const s = Store.getSettings();
        Store.saveSettings({ showHidden: !s.showHidden });
        this.syncQuickButtons();
        runAll();
      });

      this.pauseBtn.addEventListener('click', () => {
        const s = Store.getSettings();
        Store.saveSettings({ paused: !s.paused });
        this.syncQuickButtons();
        runAll();
      });

      $('btn-save').addEventListener('click', () => {
        const collectedRules = [];
        rulesList.querySelectorAll('.rule-row').forEach((row, idx) => {
          const color = row.querySelector('input[type="color"]').value;
          const label = row.querySelector('.rule-label').value.trim() || `Tag ${idx + 1}`;
          const keywords = row.querySelector('.rule-kws').value
            .split(',')
            .map(x => x.trim())
            .filter(Boolean);
          if (keywords.length > 0) {
            collectedRules.push({
              id: row.dataset.ruleId || `rule_${idx}`,
              label,
              color,
              keywords
            });
          }
        });

        const collectedTpls = [];
        tplsList.querySelectorAll('.tpl-card').forEach((card, idx) => {
          const title = card.querySelector('input[type="text"]').value.trim() || `Template ${idx + 1}`;
          const body = card.querySelector('textarea').value.trim();
          if (body.length > 0) {
            collectedTpls.push({
              id: card.dataset.tplId || `tpl_${idx}`,
              title,
              body
            });
          }
        });

        const nextKeybinds = Object.assign({}, this.draftKeybinds, {
          navEnabled: $('in-kb-nav').checked
        });

        cardViewOverrides.clear();
        const next = Store.saveSettings({
          hudPosition: $('in-pos').value,
          cardViewMode: $('in-view-mode').value,
          cardToolbarPosition: $('in-toolbar-pos').value,
          hideMode: $('in-mode').value,
          genderFilter: $('in-gender-filter').value,
          dimOpacity: parseFloat($('in-opacity').value) || 0.18,
          filterByAge: $('in-age-filter').checked,
          minAge: Math.max(18, parseInt($('in-min-age').value, 10) || 30),
          maxAge: Math.min(99, parseInt($('in-max-age').value, 10) || 45),
          stickyProfileBar: $('in-sticky-profile').checked,
          bioCacheTtlDays: Math.max(1, parseInt($('in-ttl').value, 10) || 14),
          showNotesInline: $('in-notes').checked,
          hideNoAbout: $('in-noabout').checked,
          highlightRules: collectedRules,
          messageTemplates: collectedTpls,
          keybinds: nextKeybinds,
          excludeKeywords: $('in-exclude').value.split(',').map(x => x.trim()).filter(Boolean)
        });

        this.applyPosition(next.hudPosition);
        this.syncQuickButtons();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        refreshStorageLabel();
        $('hud-status').textContent = '✓ Saved UI, card view mode, filters & keybinds';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('btn-prune-cache').addEventListener('click', () => {
        const res = Store.pruneExpiredCache();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        refreshStorageLabel();
        $('hud-status').textContent = `✓ Pruned ${res.pruned} expired entries (${res.retainedTracked} tracked kept)`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-clear-cache').addEventListener('click', () => {
        Store.clearBioCache();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        refreshStorageLabel();
        $('hud-status').textContent = '✓ Local profile cache cleared';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('btn-export').addEventListener('click', () => {
        const dump = Store.exportAll();
        if (navigator.clipboard) {
          navigator.clipboard.writeText(dump).then(() => {
            $('hud-status').textContent = '✓ JSON backup copied to clipboard';
          }).catch(() => window.prompt('Copy your JSON backup:', dump));
        } else {
          window.prompt('Copy your JSON backup:', dump);
        }
      });

      $('btn-import').addEventListener('click', () => {
        const raw = window.prompt('Paste previously exported JSON backup:');
        if (!raw) return;
        try {
          Store.importAll(raw);
          syncFormFromStore();
          this.applyPosition(Store.getSettings().hudPosition);
          this.syncQuickButtons();
          Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
          runAll();
          $('hud-status').textContent = '✓ Backup restored';
        } catch (err) {
          $('hud-status').textContent = `✕ Invalid JSON: ${err.message}`;
        }
      });

      this.syncQuickButtons();
      mountRoot.appendChild(this.host);
    },

    syncQuickButtons() {
      const s = Store.getSettings();
      const mode = s.cardViewMode || 'full';

      if (this.viewModeBtn) {
        this.viewModeBtn.className = mode === 'minimal' ? 'sky' : (mode === 'compact' ? 'star' : '');
        this.viewModeBtn.textContent = VIEW_MODE_LABELS[mode] || 'View: Full';
        this.viewModeBtn.title = `Cycle global card view (${s.keybinds?.cycleView || 'v'})`;
      }

      this.showHiddenBtn.className = s.showHidden ? 'star' : '';
      this.showHiddenBtn.textContent = s.showHidden ? 'Showing Passed' : 'Passed Filtered';
      this.pauseBtn.className = s.paused ? 'danger' : '';
      this.pauseBtn.textContent = s.paused ? 'Paused' : 'Active';

      const toggleBtn = this.shadow?.getElementById('btn-toggle');
      if (toggleBtn && s.keybinds?.toggleCrm) {
        toggleBtn.title = `Toggle Settings (${s.keybinds.toggleCrm} opens CRM)`;
      }
      const crmBtn = this.shadow?.getElementById('btn-crm');
      if (crmBtn) {
        crmBtn.title = `Open Local CRM Dashboard (${s.keybinds?.toggleCrm || 'Alt+C'})`;
      }
    },

    updateCount(count) {
      if (this.countSpan) this.countSpan.textContent = String(count);
    },

    updateCacheStatus(profilePage) {
      if (!this.cacheSpan) return;
      const totalCached = Store.getBioCacheCount();
      if (profilePage) {
        this.cacheSpan.textContent = `/${profilePage.username || profilePage.key} (${totalCached} cached)`;
      } else {
        this.cacheSpan.textContent = `Cached: ${totalCached}`;
      }
    }
  };

  // =========================================================================
  // 12. SAFE OBSERVER, REMAPPABLE KEYBOARD LISTENER & NAVIGATION HOOKS
  // =========================================================================
  let debounceTimer = null;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.id === 'flx-hud-host' || node.id === 'flx-crm-host' || node.id === 'flx-kbd-toast') continue;
        const cls = typeof node.className === 'string' ? node.className : '';
        if (cls.includes('flx-')) continue;
        if (node.closest && node.closest('#flx-hud-host, #flx-crm-host, .flx-toolbar, .flx-profile-bar, .flx-chat-context')) continue;
        scheduleRun();
        return;
      }
    }
  });

  function startObserver() {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  function withObserverPaused(fn) {
    observer.disconnect();
    try {
      return fn();
    } finally {
      startObserver();
    }
  }

  function runAll() {
    withObserverPaused(() => {
      syncStickyViewportOffset();
      attachScrollListeners();
      Hud.init();
      Hud.syncQuickButtons();
      const settings = Store.getSettings();
      if (settings.paused) {
        Hud.updateCount(0);
        return;
      }
      const profilePage = enhanceProfilePage();
      const count = enhancePostsAndCards();
      enhanceChatContext();
      Hud.updateCount(count);
      Hud.updateCacheStatus(profilePage);
    });
  }

  function scheduleRun() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runAll, 300);
  }

  document.addEventListener('keydown', (e) => {
    if (Hud.capturingKeyAction) return;

    const settings = Store.getSettings();
    const kb = settings.keybinds || DEFAULT_KEYBINDS;

    if (kb.toggleCrm && matchesKeyCombo(e, kb.toggleCrm)) {
      const hasModifier = e.altKey || e.ctrlKey || e.metaKey;
      if (hasModifier || !isEditableTarget(e)) {
        e.preventDefault();
        if (CrmModal.isOpen) CrmModal.close();
        else CrmModal.open();
        return;
      }
    }

    if (settings.paused || CrmModal.isOpen || isEditableTarget(e)) return;

    if (kb.cycleView && matchesKeyCombo(e, kb.cycleView)) {
      e.preventDefault();
      Hud.cycleGlobalCardView();
      return;
    }

    if (!kb.navEnabled) return;

    if (matchesKeyCombo(e, kb.nextCard)) {
      e.preventDefault();
      CardNavigator.step(1);
    } else if (matchesKeyCombo(e, kb.prevCard)) {
      e.preventDefault();
      CardNavigator.step(-1);
    } else if (matchesKeyCombo(e, kb.toggleMinimal)) {
      e.preventDefault();
      CardNavigator.actOnFocused('toggleMinimal');
    } else if (matchesKeyCombo(e, kb.shortlist)) {
      e.preventDefault();
      CardNavigator.actOnFocused('shortlist');
    } else if (matchesKeyCombo(e, kb.pass)) {
      e.preventDefault();
      CardNavigator.actOnFocused('pass');
    } else if (matchesKeyCombo(e, kb.cycleGender)) {
      e.preventDefault();
      CardNavigator.actOnFocused('cycleGender');
    } else if (matchesKeyCombo(e, kb.note)) {
      e.preventDefault();
      CardNavigator.actOnFocused('note');
    } else if (matchesKeyCombo(e, kb.openTab)) {
      e.preventDefault();
      CardNavigator.actOnFocused('openTab');
    }
  });

  runAll();
  document.addEventListener('turbo:load', scheduleRun);
  document.addEventListener('turbo:render', scheduleRun);
  window.addEventListener('popstate', scheduleRun);
})();
