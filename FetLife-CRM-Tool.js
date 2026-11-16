// ==UserScript==
// @name         FetLife Local Cache Filter & CRM
// @namespace    local.fl.enhancer
// @version      1.5.0
// @description  Zero-fetch passive profile & fetish caching, female-only & age filtering, 5-stage vetting pipeline, Inbox/Chat Dock context strip, and searchable CRM modal
// @match        https://fetlife.com/*
// @match        https://*.fetlife.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  // =========================================================================
  // 1. PROFILE-TUNED DEFAULTS, PIPELINE STAGES & CONSTANTS
  // =========================================================================
  const PIPELINE_STAGES = [
    { id: 'shortlist', label: 'Shortlisted', short: '★ Shortlist', icon: '★', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.16)', border: '#b45309' },
    { id: 'messaged',  label: 'Messaged',    short: '✉ Messaged',  icon: '✉', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.16)', border: '#0369a1' },
    { id: 'talking',   label: 'Talking',     short: '💬 Talking',   icon: '💬', color: '#34d399', bg: 'rgba(52, 211, 153, 0.16)', border: '#047857' },
    { id: 'met',       label: 'Met IRL',     short: '☕ Met IRL',   icon: '☕', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.16)', border: '#7e22ce' },
    { id: 'hidden',    label: 'Passed',      short: '✕ Pass',      icon: '✕', color: '#f87171', bg: 'rgba(248, 113, 113, 0.16)', border: '#b91c1c' }
  ];

  const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, s]));

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

  const DEFAULT_SETTINGS = {
    excludeKeywords: DEFAULT_EXCLUDE_KEYWORDS,
    highlightRules: DEFAULT_HIGHLIGHT_RULES,
    hideMode: 'dim',             // 'dim' | 'collapse'
    dimOpacity: 0.18,            // 0.05 to 0.75
    showHidden: false,
    hideNoAbout: false,
    filterFemaleOnly: true,
    filterByAge: false,
    minAge: 30,
    maxAge: 45,
    paused: false,
    hudPosition: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right'
    cardToolbarMode: 'full',     // 'full' | 'compact' | 'off'
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

  const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,36}$/;

  // Matches headline tokens like "34F", "34F Sensation Switch", "29MtF", "40NB", "31Trans Woman"
  const HEADLINE_DEMO_RE = /^([1-9]\d)\s*(Cis\s*Female|Cis\s*Woman|Trans\s*Woman|Trans\s*Female|Trans\s*Man|Trans\s*Male|Non-binary|Nonbinary|Genderfluid|Genderqueer|Crossdresser|Transvestite|Intersex|Agender|Female|Woman|Male|Man|MtF|FtM|NB|GF|GQ|IS|AG|TG|TS|CD|TV|M|F)(?:\s+([A-Za-z][A-Za-z /-]{1,32}))?$/i;

  const NON_FEMALE_GENDER_RE = /\b(m|male|cis\s*male|man|cis\s*man|nb|non-?binary|mtf|ftm|trans\s*woman|trans\s*female|trans\s*man|trans\s*male|transgender|transsexual|gf|genderfluid|gq|genderqueer|ag|agender|is|intersex|cd|crossdresser|tv|transvestite|two-?spirit|amab)\b/i;
  const FEMALE_GENDER_RE = /^(f|female|cis\s*f|cis\s*female|cisgender\s*female|woman|cis\s*woman|cisgender\s*woman)$/i;

  // =========================================================================
  // 2. GENDER CLASSIFICATION & PERSISTENT LOCAL STORAGE
  // =========================================================================
  function classifyGenderToken(rawToken, explicitRowText = '') {
    const combined = `${rawToken || ''} ${explicitRowText || ''}`.replace(/\s+/g, ' ').trim();
    if (!combined) return { gender: null, isFemale: null };

    const cleanToken = (rawToken || '').replace(/\s+/g, ' ').trim();
    const cleanRow = (explicitRowText || '').replace(/\s+/g, ' ').trim();

    if (NON_FEMALE_GENDER_RE.test(cleanToken) || NON_FEMALE_GENDER_RE.test(cleanRow)) {
      return {
        gender: cleanRow || cleanToken,
        isFemale: false
      };
    }

    if (FEMALE_GENDER_RE.test(cleanToken) || FEMALE_GENDER_RE.test(cleanRow)) {
      return {
        gender: cleanRow || cleanToken.toUpperCase(),
        isFemale: true
      };
    }

    return {
      gender: cleanRow || cleanToken || null,
      isFemale: null
    };
  }

  function inferGenderFromStored(record, cachedBio) {
    if (typeof record?.isFemale === 'boolean') {
      return { gender: record.gender || null, isFemale: record.isFemale };
    }
    if (typeof cachedBio?.isFemale === 'boolean') {
      return { gender: cachedBio.gender || null, isFemale: cachedBio.isFemale };
    }
    const roleStr = record?.genderRole || cachedBio?.genderRole || '';
    const m = roleStr.match(HEADLINE_DEMO_RE);
    if (m) {
      return classifyGenderToken(m[2], record?.gender || cachedBio?.gender || '');
    }
    if (record?.gender || cachedBio?.gender) {
      return classifyGenderToken(record?.gender || cachedBio?.gender);
    }
    return { gender: null, isFemale: null };
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
        isFemale: null,
        genderRole: null,
        location: null
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
    getCachedBio(key, ttlDays) {
      const cache = this.getBioCache();
      const entry = cache[key];
      if (!entry || typeof entry.text !== 'string') return null;
      const maxAgeMs = Math.max(1, Number(ttlDays) || 14) * 86400000;
      if (Date.now() - (entry.fetchedAt || 0) > maxAgeMs) return null;
      return entry;
    },
    mergeCachedProfile(key, incoming, username = null) {
      const cache = this.getBioCache();
      const prev = cache[key] || {};
      const prevSections = prev.sections || {};

      const nextSections = {
        about: incoming.aboutText || prevSections.about || prev.aboutText || '',
        fetishes: incoming.fetishesText || prevSections.fetishes || '',
        writings: incoming.writingsText || prevSections.writings || '',
        header: incoming.headerText || prevSections.header || ''
      };

      const hasAbout = typeof incoming.hasAbout === 'boolean'
        ? (incoming.hasAbout || Boolean(nextSections.about))
        : Boolean(prev.hasAbout || nextSections.about);

      const mergedParts = [
        nextSections.header,
        nextSections.about,
        nextSections.fetishes,
        nextSections.writings,
        incoming.fullText || prev.text || ''
      ].filter(Boolean);

      const combinedText = Array.from(new Set(mergedParts)).join(' \n ').slice(0, 24000);

      const nextIsFemale = typeof incoming.isFemale === 'boolean'
        ? incoming.isFemale
        : (typeof prev.isFemale === 'boolean' ? prev.isFemale : null);

      const nextEntry = {
        username: username || prev.username || null,
        text: combinedText,
        aboutText: nextSections.about.slice(0, 8000),
        hasAbout,
        fetishesInto: (incoming.fetishesInto && incoming.fetishesInto.length > 0)
          ? incoming.fetishesInto
          : (prev.fetishesInto || []),
        fetishesLimits: (incoming.fetishesLimits && incoming.fetishesLimits.length > 0)
          ? incoming.fetishesLimits
          : (prev.fetishesLimits || []),
        sections: nextSections,
        age: incoming.age ?? prev.age ?? null,
        gender: incoming.gender || prev.gender || null,
        isFemale: nextIsFemale,
        genderRole: incoming.genderRole || prev.genderRole || null,
        location: incoming.location || prev.location || null,
        fetchedAt: Date.now()
      };

      cache[key] = nextEntry;
      this._write('fl_bio_cache', cache);

      if (nextEntry.age || nextEntry.gender || typeof nextEntry.isFemale === 'boolean' || nextEntry.genderRole || nextEntry.location || username) {
        const u = this.getUser(key);
        this.setUser(key, {
          username: username || u.username || null,
          age: nextEntry.age ?? u.age ?? null,
          gender: nextEntry.gender || u.gender || null,
          isFemale: typeof nextEntry.isFemale === 'boolean' ? nextEntry.isFemale : u.isFemale,
          genderRole: nextEntry.genderRole || u.genderRole || null,
          location: nextEntry.location || u.location || null
        });
      }

      return nextEntry;
    },
    clearBioCache() {
      this._write('fl_bio_cache', {});
    },
    exportAll() {
      return JSON.stringify({
        settings: this.getSettings(),
        users: this.getAllUsers(),
        bioCache: this.getBioCache()
      }, null, 2);
    },
    importAll(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (parsed.settings) this._write('fl_settings', Object.assign({}, DEFAULT_SETTINGS, parsed.settings));
      if (parsed.users) this._write('fl_users', parsed.users);
      if (parsed.bioCache) this._write('fl_bio_cache', parsed.bioCache);
    }
  };

  // =========================================================================
  // 3. COLOR, URL, DEMOGRAPHIC & FETLIFE DOM PARSERS (NO BRACKET SELECTORS)
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
      if (h.querySelector('h1') && h.querySelector('a[href^="/p/"]')) return h;
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
    const locationParts = [];

    // 1. Extract location from /p/... links
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

    // 2. Check for an explicit "Gender" metadata label row inside profile headers
    const divs = container.getElementsByTagName('div');
    for (const d of divs) {
      if (d.children.length === 0) {
        const label = (d.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^gender$/i.test(label) && d.nextElementSibling) {
          explicitGenderRow = (d.nextElementSibling.textContent || '').replace(/\s+/g, ' ').trim();
          break;
        }
      }
    }

    // 3. Scan short text segments for headline demographic line (e.g. "34F Sensation Switch")
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
      isFemale: classified.isFemale,
      genderRole,
      location: locationParts.length > 0 ? locationParts.slice(0, 2).join(', ') : null
    };
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
  // 4. PROFILE, ABOUT & FETISH SECTION PARSER (NO BRACKET SELECTORS)
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
      if (/^H[1-6]$/.test(tag) || tag === 'STRONG' || tag === 'DT') {
        const label = (node.textContent || '').trim().toLowerCase();
        if (/limit|hard\s*no|won['’]?t|dislikes?/i.test(label)) {
          currentBucket = 'limits';
        } else if (/into|curious|giving|receiving|likes?|favou?rites?/i.test(label)) {
          currentBucket = 'into';
        }
      } else if (tag === 'A') {
        const href = node.getAttribute('href') || '';
        if (href.startsWith('/fetishes/') || href.startsWith('/kinks/') || href.startsWith('/tags/')) {
          const item = (node.textContent || '').replace(/\s+/g, ' ').trim();
          if (item && item.length < 60) {
            if (currentBucket === 'limits') {
              if (!limits.includes(item)) limits.push(item);
            } else {
              if (!into.includes(item)) into.push(item);
            }
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

  function sanitizeProfileClone(rootEl) {
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
        fullText: '',
        aboutText: '',
        hasAbout: null,
        fetishesText: '',
        fetishesInto: [],
        fetishesLimits: [],
        writingsText: '',
        headerText: '',
        age: null,
        gender: null,
        isFemale: null,
        genderRole: null,
        location: null
      };
    }

    const profileHeader = findProfileHeaderElement();
    const demos = profileHeader
      ? parseDemographicsFromContainer(profileHeader)
      : { age: null, gender: null, isFemale: null, genderRole: null, location: null };

    let headerText = '';
    if (profileHeader) {
      const hClone = sanitizeProfileClone(profileHeader);
      headerText = (hClone.textContent || '').replace(/\s+/g, ' ').trim();
    }

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
      const wClone = sanitizeProfileClone(scope);
      writingsText = (wClone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    const cleanScope = sanitizeProfileClone(scope);
    const fullText = (cleanScope.textContent || '').replace(/\s+/g, ' ').trim();

    return {
      fullText,
      aboutText,
      hasAbout,
      fetishesText: parsedFetishes.fetishesText,
      fetishesInto: parsedFetishes.fetishesInto,
      fetishesLimits: parsedFetishes.fetishesLimits,
      writingsText,
      headerText,
      age: demos.age,
      gender: demos.gender,
      isFemale: demos.isFemale,
      genderRole: demos.genderRole,
      location: demos.location
    };
  }

  // =========================================================================
  // 5. RULE MATCHING & DEMOGRAPHIC FILTERING
  // =========================================================================
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

  function findRuleMatches(cardText, cachedBioText, rules) {
    const lowerCard = (cardText || '').toLowerCase();
    const lowerBio = (cachedBioText || '').toLowerCase();
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

  function isAgeOutOfRange(age, settings) {
    if (!settings.filterByAge || typeof age !== 'number') return false;
    const min = Number(settings.minAge) || 18;
    const max = Number(settings.maxAge) || 99;
    return age < min || age > max;
  }

  function isGenderRejected(isFemale, settings) {
    if (!settings.filterFemaleOnly) return false;
    return isFemale === false;
  }

  // =========================================================================
  // 6. SHARED UI COMPONENTS (MULTI-CATEGORY DOTS, STAGE CONTROLS, BADGES)
  // =========================================================================
  function createMatchDotsCluster(ruleHits) {
    if (!ruleHits || ruleHits.length === 0) return null;
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);';
    wrap.title = ruleHits.map(h => `${h.label}: ${h.keyword}`).join(' • ');

    for (const hit of ruleHits) {
      const dot = document.createElement('span');
      dot.style.cssText = `width:7px;height:7px;border-radius:50%;background:${hit.color};box-shadow:0 0 6px ${hit.color};display:inline-block;`;
      dot.title = `${hit.label}: ${hit.keyword}`;
      wrap.appendChild(dot);
    }
    return wrap;
  }

  function createDemographicPill(age, gender, genderRole, location) {
    const parts = [];
    if (genderRole) {
      parts.push(genderRole);
    } else {
      const head = [age ? String(age) : '', gender || ''].filter(Boolean).join('');
      if (head) parts.push(head);
    }
    if (location) parts.push(location);
    if (parts.length === 0) return null;

    const pill = document.createElement('span');
    pill.style.cssText = 'font-size:11px;color:#cbd5e1;background:rgba(148,163,184,0.12);border:1px solid rgba(148,163,184,0.25);padding:1px 6px;border-radius:4px;font-weight:500;';
    pill.textContent = parts.join(' • ');
    return pill;
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

  function buildToolbar(userKey, settings, onUpdate, forceFull = false, displayHandle = null, demos = null) {
    const record = Store.getUser(userKey);
    const compact = !forceFull && settings.cardToolbarMode === 'compact';

    const bar = document.createElement('div');
    bar.className = 'flx-toolbar';
    bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin-top:6px;position:relative;z-index:5;font-family:system-ui,-apple-system,sans-serif;';

    const stopNav = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const persistMeta = (patch) => {
      const cur = Store.getUser(userKey);
      Store.setUser(userKey, Object.assign({
        username: displayHandle || cur.username || null,
        age: (demos && demos.age) ?? cur.age ?? null,
        gender: (demos && demos.gender) || cur.gender || null,
        isFemale: typeof demos?.isFemale === 'boolean' ? demos.isFemale : cur.isFemale,
        genderRole: (demos && demos.genderRole) || cur.genderRole || null,
        location: (demos && demos.location) || cur.location || null
      }, patch));
      onUpdate();
    };

    const baseBtnStyle = 'background:#202024;color:#d4d4d8;border:1px solid #3f3f46;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;line-height:1.45;transition:background 0.15s,border-color 0.15s;';

    const isStarred = record.status === 'shortlist';
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.style.cssText = isStarred
      ? `${baseBtnStyle}background:rgba(251,191,36,0.18);border-color:#d97706;color:#fde047;font-weight:600;`
      : baseBtnStyle;
    starBtn.textContent = compact ? (isStarred ? '★' : '☆') : (isStarred ? '★ Shortlisted' : '☆ Shortlist');
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
    noneOpt.textContent = compact ? 'Stage…' : 'Stage: None';
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

    const isPassed = record.status === 'hidden';
    const passBtn = document.createElement('button');
    passBtn.type = 'button';
    passBtn.style.cssText = isPassed
      ? `${baseBtnStyle}background:rgba(248,113,113,0.18);border-color:#dc2626;color:#fca5a5;font-weight:600;`
      : baseBtnStyle;
    passBtn.textContent = compact ? '✕' : (isPassed ? '✕ Passed' : '✕ Pass');
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
    noteBtn.textContent = compact ? '✎' : (record.note ? '✎ Edit Note' : '✎ Note');
    noteBtn.title = 'Edit Private Note';
    noteBtn.addEventListener('click', (e) => {
      stopNav(e);
      const cur = Store.getUser(userKey);
      const nextNote = window.prompt(`Private note for ${displayHandle || userKey}:`, cur.note || '');
      if (nextNote !== null) {
        persistMeta({ note: nextNote.trim() });
      }
    });

    bar.append(starBtn, stageSelect, passBtn, noteBtn);

    if (!compact && record.lastContacted && record.status !== 'hidden') {
      const contacted = document.createElement('span');
      contacted.style.cssText = 'font-size:11px;color:#7dd3fc;padding:1px 6px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.28);border-radius:4px;';
      contacted.textContent = `Contacted ${record.lastContacted}`;
      bar.appendChild(contacted);
    } else if (!compact && record.lastSeen && record.status !== 'hidden') {
      const seen = document.createElement('span');
      seen.style.cssText = 'font-size:11px;color:#9ca3af;padding:1px 6px;border:1px solid #333;border-radius:4px;';
      seen.textContent = `Viewed ${record.lastSeen}`;
      bar.appendChild(seen);
    }

    if (record.note && (forceFull || settings.showNotesInline)) {
      const noteBox = document.createElement('div');
      noteBox.style.cssText = 'width:100%;margin-top:4px;padding:5px 9px;background:#16161a;border-left:2px solid #eab308;color:#e4e4e7;font-size:12px;white-space:pre-wrap;border-radius:4px;';
      noteBox.textContent = record.note;
      bar.appendChild(noteBox);
    }

    return bar;
  }

  function appendMatchBadges(toolbar, cachedBio, demos, missingAbout, ageRejected, genderRejected, ruleHits, excludedHits, showFullMeta) {
    const demoPill = createDemographicPill(demos?.age, demos?.gender, demos?.genderRole, demos?.location);
    if (demoPill && showFullMeta) {
      toolbar.appendChild(demoPill);
    }

    const dotsCluster = createMatchDotsCluster(ruleHits);
    if (dotsCluster) {
      toolbar.appendChild(dotsCluster);
    }

    if (cachedBio && showFullMeta) {
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

    excludedHits.forEach((kw) => {
      const badge = document.createElement('span');
      badge.style.cssText = 'font-size:11px;padding:1px 6px;border-radius:4px;background:rgba(239,68,68,0.16);color:#fca5a5;border:1px solid #b91c1c;';
      badge.textContent = `-${kw}`;
      toolbar.appendChild(badge);
    });
  }

  // =========================================================================
  // 7. PAGE ENHANCERS: CARDS/POSTS, LIVE PROFILES & INBOX/CHAT DOCK STRIP
  // =========================================================================
  function applyContainerState(container, identity, settings, force = false) {
    const userKey = identity.key;
    const record = Store.getUser(userKey);
    const cachedBio = Store.getCachedBio(userKey, settings.bioCacheTtlDays);
    const bioText = cachedBio ? cachedBio.text : '';
    const inferredGender = inferGenderFromStored(record, cachedBio);

    const mergedDemos = {
      age: identity.demographics?.age ?? record.age ?? cachedBio?.age ?? null,
      gender: identity.demographics?.gender || inferredGender.gender || null,
      isFemale: typeof identity.demographics?.isFemale === 'boolean'
        ? identity.demographics.isFemale
        : inferredGender.isFemale,
      genderRole: identity.demographics?.genderRole || record.genderRole || cachedBio?.genderRole || null,
      location: identity.demographics?.location || record.location || cachedBio?.location || null
    };

    const missingAbout = Boolean(settings.hideNoAbout && cachedBio && cachedBio.hasAbout === false);
    const ageRejected = isAgeOutOfRange(mergedDemos.age, settings);
    const genderRejected = isGenderRejected(mergedDemos.isFemale, settings);

    const clone = container.cloneNode(true);
    clone.querySelectorAll('.flx-toolbar').forEach(el => el.remove());
    const itemText = clone.innerText || '';
    const combinedText = bioText ? `${itemText}\n${bioText}` : itemText;

    const excludedHits = findSimpleMatches(combinedText, settings.excludeKeywords);
    const ruleHits = findRuleMatches(itemText, bioText, settings.highlightRules);

    const sig = JSON.stringify({
      userKey,
      status: record.status,
      note: record.note,
      lastSeen: record.lastSeen,
      lastContacted: record.lastContacted,
      mergedDemos,
      bioFetchedAt: cachedBio ? cachedBio.fetchedAt : null,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      showHidden: settings.showHidden,
      hideNoAbout: settings.hideNoAbout,
      filterFemaleOnly: settings.filterFemaleOnly,
      filterByAge: settings.filterByAge,
      minAge: settings.minAge,
      maxAge: settings.maxAge,
      hideMode: settings.hideMode,
      dimOpacity: settings.dimOpacity,
      cardToolbarMode: settings.cardToolbarMode,
      showNotesInline: settings.showNotesInline,
      excludedHits,
      ruleHits
    });

    if (!force && container.dataset.flxSig === sig) return;

    container.dataset.flxUser = userKey;
    container.dataset.flxSig = sig;

    const isFilteredOut = record.status === 'hidden' || excludedHits.length > 0 || missingAbout || ageRejected || genderRejected;
    applyCardAccentStyle(container, record.status, ruleHits, isFilteredOut, settings);

    const oldBar = container.querySelector('.flx-toolbar');
    if (oldBar) oldBar.remove();

    if (settings.cardToolbarMode !== 'off') {
      const toolbar = buildToolbar(userKey, settings, () => {
        withObserverPaused(() => applyContainerState(container, identity, Store.getSettings(), true));
      }, false, identity.username, mergedDemos);

      appendMatchBadges(
        toolbar,
        cachedBio,
        mergedDemos,
        missingAbout,
        ageRejected,
        genderRejected,
        ruleHits,
        excludedHits,
        settings.cardToolbarMode === 'full'
      );

      container.appendChild(toolbar);
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

    const today = new Date().toISOString().slice(0, 10);
    const existing = Store.getUser(currentKey);
    if (existing.lastSeen !== today || (!existing.username && profilePage.username)) {
      Store.setUser(currentKey, {
        lastSeen: today,
        username: profilePage.username || existing.username || null
      });
    }

    const liveData = extractProfileData(document);
    let cachedBio = Store.getCachedBio(currentKey, Store.getSettings().bioCacheTtlDays);

    if (
      liveData.fullText.length > 30 ||
      liveData.hasAbout === true ||
      liveData.fetishesText.length > 0 ||
      liveData.writingsText.length > 0
    ) {
      cachedBio = Store.mergeCachedProfile(currentKey, liveData, profilePage.username);
    }

    const profileNav = document.getElementById('profile-navigation');
    const navHeader = profileNav ? profileNav.closest('header') : null;
    const profileHeader = findProfileHeaderElement();
    const anchorBlock = navHeader || profileHeader || document.getElementById('main-content')?.firstElementChild;
    if (!anchorBlock) return profilePage;

    const latestUser = Store.getUser(currentKey);
    const sig = JSON.stringify({
      currentKey,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      aboutLen: cachedBio ? cachedBio.aboutText.length : 0,
      textLen: cachedBio ? cachedBio.text.length : 0,
      fetishLen: cachedBio ? (cachedBio.fetishesInto.length + cachedBio.fetishesLimits.length) : 0,
      status: latestUser.status,
      note: latestUser.note,
      lastContacted: latestUser.lastContacted,
      isFemale: latestUser.isFemale,
      hideNoAbout: Store.getSettings().hideNoAbout,
      filterFemaleOnly: Store.getSettings().filterFemaleOnly,
      filterByAge: Store.getSettings().filterByAge,
      minAge: Store.getSettings().minAge,
      maxAge: Store.getSettings().maxAge,
      rules: Store.getSettings().highlightRules,
      excludes: Store.getSettings().excludeKeywords
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
      const inferredGender = inferGenderFromStored(u, latestBio);
      const demos = {
        age: u.age ?? latestBio?.age ?? null,
        gender: u.gender || inferredGender.gender || null,
        isFemale: typeof u.isFemale === 'boolean' ? u.isFemale : inferredGender.isFemale,
        genderRole: u.genderRole || latestBio?.genderRole || null,
        location: u.location || latestBio?.location || null
      };

      Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());

      const wrapper = document.createElement('div');
      wrapper.className = 'flx-profile-bar';
      wrapper.dataset.flxProfile = currentKey;
      wrapper.dataset.flxSig = sig;
      wrapper.style.cssText = 'max-width:1280px;margin:10px auto 0;padding:10px 14px;background:rgba(22,22,26,0.95);backdrop-filter:blur(8px);border:1px solid #33333a;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;position:relative;z-index:10;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,0.45);';

      const label = document.createElement('strong');
      label.style.cssText = 'font-size:12px;color:#f4f4f5;font-family:system-ui,sans-serif;';
      label.textContent = `/${displayHandle}`;

      const toolbar = buildToolbar(currentKey, settings, () => withObserverPaused(renderProfileBar), true, profilePage.username, demos);
      const scanText = latestBio ? latestBio.text : '';
      const excludedHits = findSimpleMatches(scanText, settings.excludeKeywords);
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const missingAbout = Boolean(settings.hideNoAbout && latestBio && latestBio.hasAbout === false);
      const ageRejected = isAgeOutOfRange(demos.age, settings);
      const genderRejected = isGenderRejected(demos.isFemale, settings);

      appendMatchBadges(toolbar, latestBio, demos, missingAbout, ageRejected, genderRejected, ruleHits, excludedHits, true);

      if (ruleHits.length > 0) {
        wrapper.style.borderColor = ruleHits[0].color;
      } else if (excludedHits.length > 0 || missingAbout || ageRejected || genderRejected) {
        wrapper.style.borderColor = '#b91c1c';
      }

      wrapper.append(label, toolbar);
      anchorBlock.insertAdjacentElement('afterend', wrapper);
    };

    renderProfileBar();
    return profilePage;
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
      const inferredGender = inferGenderFromStored(record, cachedBio);

      const scanText = cachedBio ? cachedBio.text : '';
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const excludedHits = findSimpleMatches(scanText, settings.excludeKeywords);

      const sig = JSON.stringify({
        userKey,
        status: record.status,
        note: record.note,
        lastContacted: record.lastContacted,
        hasCache: Boolean(cachedBio),
        ruleHits,
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
        : 'max-width:960px;margin:8px auto;padding:9px 12px;background:#16161a;border:1px solid #383842;border-radius:8px;font-size:12px;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:6px;z-index:20;position:relative;';

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
        record.gender || inferredGender.gender || null,
        record.genderRole || cachedBio?.genderRole || null,
        record.location || cachedBio?.location || null
      );
      if (demoPill) left.appendChild(demoPill);

      const dots = createMatchDotsCluster(ruleHits);
      if (dots) left.appendChild(dots);

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
      right.style.cssText = 'display:flex;align-items:center;gap:5px;';
      right.append(stageSel, noteEditBtn);
      topRow.append(left, right);
      strip.appendChild(topRow);

      if (ruleHits.length > 0 || excludedHits.length > 0) {
        const badgeRow = document.createElement('div');
        badgeRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        for (const h of ruleHits) {
          const p = document.createElement('span');
          p.style.cssText = `font-size:10px;padding:1px 5px;border-radius:3px;background:${hexToRgba(h.color, 0.18)};color:${h.color};border:1px solid ${hexToRgba(h.color, 0.65)};`;
          p.textContent = `${h.label}: ${h.keyword}`;
          badgeRow.appendChild(p);
        }
        for (const kw of excludedHits) {
          const p = document.createElement('span');
          p.style.cssText = 'font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(239,68,68,0.18);color:#fca5a5;border:1px solid #b91c1c;';
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
  // 8. LOCAL CRM DASHBOARD MODAL (SHADOW DOM ISOLATED)
  // =========================================================================
  const CrmModal = {
    host: null,
    shadow: null,
    isOpen: false,
    filterStatus: 'all',
    filterCategory: 'all',
    filterGender: 'female', // 'female' | 'all' | 'unknown' | 'other'
    sortBy: 'matches',
    searchQuery: '',
    minAgeFilter: '',
    maxAgeFilter: '',

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

        const inferredGender = inferGenderFromStored(u, c);
        const age = u.age ?? c?.age ?? null;
        const gender = u.gender || inferredGender.gender || null;
        const isFemale = typeof u.isFemale === 'boolean' ? u.isFemale : inferredGender.isFemale;
        const genderRole = u.genderRole || c?.genderRole || null;
        const location = u.location || c?.location || null;

        const ruleHits = findRuleMatches('', bioText, settings.highlightRules);
        const excludedHits = findSimpleMatches(bioText, settings.excludeKeywords);

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
          cachedDate,
          recentStamp,
          age,
          gender,
          isFemale,
          genderRole,
          location,
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
        isFemale: null,
        genderRole: null,
        location: null
      }, raw || {});
    },

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.filterGender = Store.getSettings().filterFemaleOnly ? 'female' : 'all';
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
          document.body.appendChild(this.host);
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
              width: min(1040px, 96vw); height: min(88vh, 900px);
              display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.9);
              overflow: hidden;
            }
            .header {
              padding: 14px 18px; background: linear-gradient(180deg, #1c1c22 0%, #16161b 100%);
              border-bottom: 1px solid #2b2b33;
              display: flex; align-items: center; justify-content: space-between; gap: 12px;
            }
            .title-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
            .title { font-size: 16px; font-weight: 700; color: #fafafa; letter-spacing: -0.01em; }
            .subtitle { font-size: 12px; color: #a1a1aa; }
            .controls {
              padding: 12px 18px; background: #18181d; border-bottom: 1px solid #282830;
              display: flex; flex-direction: column; gap: 9px;
            }
            .control-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
            input[type="text"], input[type="number"], select, textarea {
              background: #202026; color: #f4f4f5; border: 1px solid #3a3a44; border-radius: 6px;
              padding: 6px 10px; font-size: 12px; font-family: inherit;
            }
            input[type="text"]:focus, input[type="number"]:focus, select:focus, textarea:focus {
              outline: none; border-color: #eab308;
            }
            .search-input { flex: 1; min-width: 200px; }
            .age-input { width: 76px; }
            .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
            button {
              background: #222228; color: #d4d4d8; border: 1px solid #3a3a44; border-radius: 6px;
              padding: 5px 10px; cursor: pointer; font-size: 12px; font-family: inherit;
              transition: background 0.15s, border-color 0.15s, color 0.15s;
            }
            button:hover { background: #2d2d35; color: #fff; }
            button.active-tab { background: rgba(234, 179, 8, 0.16); border-color: #ca8a04; color: #fde047; font-weight: 600; }
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
              padding: 13px 15px; display: flex; flex-direction: column; gap: 10px;
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
            .badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
            .pill {
              font-size: 11px; padding: 2px 7px; border-radius: 5px;
              background: #24242b; color: #a1a1aa; border: 1px solid #363640;
            }
            .pill-ex { background: rgba(239,68,68,0.16); color: #fca5a5; border-color: #b91c1c; }
            .stage-bar { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .stage-btn { padding: 3px 8px; font-size: 11px; border-radius: 5px; }
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
                  <button type="button" id="crm-export">Export JSON</button>
                  <button type="button" id="crm-close">✕ Close (Esc)</button>
                </div>
              </div>
              <div class="controls">
                <div class="control-row">
                  <input type="text" class="search-input" id="crm-search" placeholder="Search username, location, notes, cached About, or fetishes...">
                  <select id="crm-gender-filter" title="Filter by Gender">
                    <option value="female">♀ Female Only</option>
                    <option value="all">All Genders</option>
                    <option value="unknown">Gender Unknown</option>
                    <option value="other">Other / Non-Female</option>
                  </select>
                  <input type="number" class="age-input" id="crm-age-min" min="18" max="99" placeholder="Min age" title="Minimum Age">
                  <input type="number" class="age-input" id="crm-age-max" min="18" max="99" placeholder="Max age" title="Maximum Age">
                  <select id="crm-cat-filter" title="Filter by Content Category">
                    <option value="all">All Categories</option>
                    ${settings.highlightRules.map(r => `<option value="rule:${r.id || r.label}">${r.label}</option>`).join('')}
                    <option value="excluded">Has Exclude Match</option>
                  </select>
                  <select id="crm-sort" title="Sort order">
                    <option value="matches">Sort: Most Categories Matched</option>
                    <option value="priority">Sort: Pipeline Stage & Notes</option>
                    <option value="recent">Sort: Most Recent</option>
                    <option value="alpha">Sort: Username (A–Z)</option>
                  </select>
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
        const minAgeInput = $('crm-age-min');
        const maxAgeInput = $('crm-age-max');
        const catSelect = $('crm-cat-filter');
        const sortSelect = $('crm-sort');

        searchInput.value = this.searchQuery;
        genderSelect.value = this.filterGender;
        minAgeInput.value = this.minAgeFilter;
        maxAgeInput.value = this.maxAgeFilter;
        catSelect.value = this.filterCategory;
        sortSelect.value = this.sortBy;

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

        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value;
          this.refreshList();
        });
        genderSelect.addEventListener('change', (e) => {
          this.filterGender = e.target.value;
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

        if (this.filterGender === 'female' && entry.isFemale !== true) return false;
        if (this.filterGender === 'unknown' && entry.isFemale !== null) return false;
        if (this.filterGender === 'other' && entry.isFemale !== false) return false;

        if (minA !== null && typeof entry.age === 'number' && entry.age < minA) return false;
        if (maxA !== null && typeof entry.age === 'number' && entry.age > maxA) return false;
        if ((minA !== null || maxA !== null) && typeof entry.age !== 'number') return false;

        if (this.filterCategory === 'excluded' && entry.excludedHits.length === 0) return false;
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

        const demoPill = createDemographicPill(entry.age, entry.gender, entry.genderRole, entry.location);
        if (demoPill) leftInfo.appendChild(demoPill);

        const dots = createMatchDotsCluster(entry.ruleHits);
        if (dots) leftInfo.appendChild(dots);

        const badges = document.createElement('div');
        badges.className = 'badges';

        if (entry.lastContacted) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = '#7dd3fc';
          b.style.borderColor = '#0369a1';
          b.textContent = `Contacted ${entry.lastContacted}`;
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

        for (const hit of entry.ruleHits) {
          const b = document.createElement('span');
          b.style.cssText = `font-size:11px;padding:2px 6px;border-radius:4px;background:${hexToRgba(hit.color, 0.18)};color:${hit.color};border:1px solid ${hexToRgba(hit.color, 0.65)};font-weight:500;`;
          b.textContent = `${hit.label}: ${hit.keyword}`;
          badges.appendChild(b);
        }

        for (const kw of entry.excludedHits) {
          const b = document.createElement('span');
          b.className = 'pill pill-ex';
          b.textContent = `-${kw}`;
          badges.appendChild(b);
        }

        leftInfo.appendChild(badges);

        const stageBar = document.createElement('div');
        stageBar.className = 'stage-bar';

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
            } else {
              bodyBox.textContent = entry.fullText;
            }
          };

          const tabOptions = [
            { id: 'about', label: 'About' },
            ...(entry.hasFetishes ? [{ id: 'fetishes', label: 'Fetishes & Limits' }] : []),
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
  // 9. SHADOW DOM FLOATING HUD
  // =========================================================================
  const Hud = {
    shadow: null,
    host: null,
    expanded: false,
    countSpan: null,
    cacheSpan: null,
    showHiddenBtn: null,
    pauseBtn: null,
    panel: null,

    applyPosition(pos) {
      if (!this.host) return;
      this.host.style.top = '';
      this.host.style.bottom = '';
      this.host.style.left = '';
      this.host.style.right = '';

      if (pos === 'bottom-left') {
        this.host.style.bottom = '14px';
        this.host.style.left = '14px';
      } else if (pos === 'top-right') {
        this.host.style.top = '64px';
        this.host.style.right = '14px';
      } else {
        this.host.style.bottom = '14px';
        this.host.style.right = '14px';
      }
    },

    init() {
      if (document.getElementById('flx-hud-host')) return;

      const settings = Store.getSettings();
      this.host = document.createElement('div');
      this.host.id = 'flx-hud-host';
      this.host.style.cssText = 'position:fixed;z-index:2147483646;';
      this.applyPosition(settings.hudPosition);

      this.shadow = this.host.attachShadow({ mode: 'open' });
      this.shadow.innerHTML = `
        <style>
          :host { all: initial; font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #e4e4e7; }
          * { box-sizing: border-box; }
          .box {
            background: rgba(20, 20, 24, 0.96); backdrop-filter: blur(10px);
            border: 1px solid #383842; border-radius: 10px; padding: 8px 10px;
            box-shadow: 0 8px 28px rgba(0,0,0,0.75); width: 410px; max-height: 85vh; overflow-y: auto;
          }
          .box.collapsed { width: auto; overflow: visible; }
          .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
          button {
            background: #232329; color: #e4e4e7; border: 1px solid #3f3f48; border-radius: 5px;
            padding: 4px 8px; cursor: pointer; font-size: 11px; transition: background 0.15s;
          }
          button:hover { background: #303038; color: #fff; }
          button.star { background: rgba(234, 179, 8, 0.18); border-color: #ca8a04; color: #fde047; font-weight: 600; }
          button.danger { background: rgba(239, 68, 68, 0.18); border-color: #dc2626; color: #fca5a5; }
          .scan-pill {
            font-size: 11px; color: #a1a1aa; padding: 2px 7px; background: #1c1c22;
            border: 1px solid #303038; border-radius: 5px; max-width: 195px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          }
          .panel { margin-top: 8px; padding-top: 8px; border-top: 1px solid #2c2c34; display: flex; flex-direction: column; gap: 8px; }
          label { display: flex; flex-direction: column; gap: 3px; color: #a1a1aa; font-size: 11px; }
          .inline-label { flex-direction: row; align-items: center; gap: 6px; cursor: pointer; color: #d4d4d8; }
          input[type="text"], input[type="number"], select {
            background: #1d1d23; color: #f4f4f5; border: 1px solid #3e3e48; border-radius: 5px;
            padding: 4px 6px; font-size: 11px; font-family: inherit; width: 100%;
          }
          input[type="color"] {
            width: 26px; height: 24px; padding: 0; border: 1px solid #52525b; border-radius: 5px;
            background: transparent; cursor: pointer; flex-shrink: 0;
          }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .grid3 { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 6px; align-items: end; }
          .rules-header { display: flex; justify-content: space-between; align-items: center; color: #a1a1aa; font-size: 11px; gap: 6px; }
          .rule-row { display: flex; align-items: center; gap: 4px; margin-top: 4px; }
          .rule-label { width: 96px !important; flex-shrink: 0; }
          .rule-kws { flex: 1; }
          .rule-del { padding: 3px 6px; color: #fca5a5; flex-shrink: 0; }
          .status { color: #6ee7b7; font-size: 11px; min-height: 14px; }
        </style>
        <div class="box collapsed" id="hud-box">
          <div class="row">
            <button type="button" id="btn-toggle">FL (<span id="card-count">0</span>) ▲</button>
            <button type="button" class="star" id="btn-crm" title="Open Local CRM Dashboard (Alt+C)">CRM</button>
            <button type="button" id="btn-hidden"></button>
            <button type="button" id="btn-pause"></button>
            <span class="scan-pill" id="cache-status">Cached: 0</span>
          </div>
          <div class="panel" id="hud-panel" style="display:none;">
            <div class="grid2">
              <label>HUD Position
                <select id="in-pos">
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                </select>
              </label>
              <label>Card Buttons
                <select id="in-toolbar">
                  <option value="full">Full Labels</option>
                  <option value="compact">Compact Icons</option>
                  <option value="off">Hidden on Cards</option>
                </select>
              </label>
            </div>
            <div class="grid2">
              <label>Filter Action
                <select id="in-mode">
                  <option value="dim">Dim Card</option>
                  <option value="collapse">Collapse Card</option>
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
            <div class="grid2">
              <label class="inline-label" style="padding-top:12px;">
                <input type="checkbox" id="in-female-only"> Female only (actual females)
              </label>
              <label>Cache Retention (Days)
                <input type="number" id="in-ttl" min="1" max="90">
              </label>
            </div>
            <label class="inline-label">
              <input type="checkbox" id="in-notes"> Show private notes inline on cards
            </label>
            <label class="inline-label">
              <input type="checkbox" id="in-noabout"> Hide cached profiles with no "About" section
            </label>

            <div>
              <div class="rules-header">
                <span>Content Color Categories</span>
                <div class="row">
                  <button type="button" id="btn-reset-rules" title="Load full profile-tuned categories & excludes">Reset Defaults</button>
                  <button type="button" id="btn-add-rule">+ Add</button>
                </div>
              </div>
              <div id="rules-list"></div>
            </div>

            <label>Exclude Keywords (comma-separated)
              <input type="text" id="in-exclude">
            </label>

            <div class="row">
              <button type="button" class="star" id="btn-save" style="flex:1;">Save UI & Filters</button>
              <button type="button" id="btn-clear-cache" title="Clear locally cached profiles">Clear Cache</button>
              <button type="button" id="btn-export" title="Copy JSON backup">Export</button>
              <button type="button" id="btn-import" title="Paste JSON backup">Import</button>
            </div>
            <div class="status" id="hud-status"></div>
          </div>
        </div>
      `;

      const $ = (id) => this.shadow.getElementById(id);
      const box = $('hud-box');
      const rulesList = $('rules-list');
      this.panel = $('hud-panel');
      this.countSpan = $('card-count');
      this.cacheSpan = $('cache-status');
      this.showHiddenBtn = $('btn-hidden');
      this.pauseBtn = $('btn-pause');

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

      const syncFormFromStore = () => {
        const s = Store.getSettings();
        $('in-pos').value = s.hudPosition;
        $('in-toolbar').value = s.cardToolbarMode;
        $('in-mode').value = s.hideMode;
        $('in-opacity').value = s.dimOpacity;
        $('opacity-val').textContent = `${Math.round(s.dimOpacity * 100)}%`;
        $('in-age-filter').checked = Boolean(s.filterByAge);
        $('in-min-age').value = s.minAge;
        $('in-max-age').value = s.maxAge;
        $('in-female-only').checked = Boolean(s.filterFemaleOnly);
        $('in-ttl').value = s.bioCacheTtlDays;
        $('in-notes').checked = Boolean(s.showNotesInline);
        $('in-noabout').checked = Boolean(s.hideNoAbout);
        $('in-exclude').value = s.excludeKeywords.join(', ');

        rulesList.innerHTML = '';
        s.highlightRules.forEach(rule => addRuleRow(rule));
      };

      $('btn-crm').addEventListener('click', () => {
        if (CrmModal.isOpen) CrmModal.close();
        else CrmModal.open();
      });

      $('btn-add-rule').addEventListener('click', () => addRuleRow());

      $('btn-reset-rules').addEventListener('click', () => {
        Store.resetRulesToDefaults();
        syncFormFromStore();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        $('hud-status').textContent = '✓ Loaded profile-tuned categories & excludes';
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

        const next = Store.saveSettings({
          hudPosition: $('in-pos').value,
          cardToolbarMode: $('in-toolbar').value,
          hideMode: $('in-mode').value,
          dimOpacity: parseFloat($('in-opacity').value) || 0.18,
          filterByAge: $('in-age-filter').checked,
          minAge: Math.max(18, parseInt($('in-min-age').value, 10) || 30),
          maxAge: Math.min(99, parseInt($('in-max-age').value, 10) || 45),
          filterFemaleOnly: $('in-female-only').checked,
          bioCacheTtlDays: Math.max(1, parseInt($('in-ttl').value, 10) || 14),
          showNotesInline: $('in-notes').checked,
          hideNoAbout: $('in-noabout').checked,
          highlightRules: collectedRules,
          excludeKeywords: $('in-exclude').value.split(',').map(x => x.trim()).filter(Boolean)
        });

        this.applyPosition(next.hudPosition);
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        $('hud-status').textContent = '✓ Saved UI & local filter settings';
        setTimeout(() => { $('hud-status').textContent = ''; }, 2500);
      });

      $('btn-clear-cache').addEventListener('click', () => {
        Store.clearBioCache();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
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
      document.body.appendChild(this.host);
    },

    syncQuickButtons() {
      const s = Store.getSettings();
      this.showHiddenBtn.className = s.showHidden ? 'star' : '';
      this.showHiddenBtn.textContent = s.showHidden ? 'Showing Passed' : 'Passed Filtered';
      this.pauseBtn.className = s.paused ? 'danger' : '';
      this.pauseBtn.textContent = s.paused ? 'Paused' : 'Active';
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
  // 10. SAFE OBSERVER, KEYBOARD SHORTCUT & NAVIGATION HOOKS
  // =========================================================================
  let debounceTimer = null;

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.id === 'flx-hud-host' || node.id === 'flx-crm-host') continue;
        const cls = typeof node.className === 'string' ? node.className : '';
        if (cls.includes('flx-')) continue;
        if (node.closest && node.closest('#flx-hud-host, #flx-crm-host, .flx-toolbar, .flx-profile-bar, .flx-chat-context')) continue;
        scheduleRun();
        return;
      }
    }
  });

  function startObserver() {
    observer.observe(document.body, { childList: true, subtree: true });
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
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (CrmModal.isOpen) CrmModal.close();
      else CrmModal.open();
    }
  });

  runAll();
  document.addEventListener('turbo:load', scheduleRun);
  window.addEventListener('popstate', scheduleRun);
})();
