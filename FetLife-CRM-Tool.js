// ==UserScript==
// @name         FetLife Local Cache Filter & CRM
// @namespace    local.fl.enhancer
// @version      1.17.2
// @description  High-performance passive profile caching, infinite-scroll loop protection, neutral-by-default multi-select gender/location/relationship filters, built-in fetish/lifestyle lexicon, 2-word max term filter, duplicate entry detector, preset pack save/load/import/export, smart self-profile preference learner, Friends/Follows/CRM visibility protection, throttled batch tab opener, and searchable CRM modal
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
  // 0. UTILITIES & EARTH-TONE PALETTE
  // =========================================================================
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const PALETTE = {
    stage: {
      shortlist: { color: '#d4a843', bg: 'rgba(212, 168, 67, 0.12)', border: '#9a7b2e' },
      messaged:  { color: '#7aa3b8', bg: 'rgba(122, 163, 184, 0.12)', border: '#4a6b7d' },
      talking:   { color: '#8ab896', bg: 'rgba(138, 184, 150, 0.12)', border: '#5a7d62' },
      met:       { color: '#b89cc8', bg: 'rgba(184, 156, 200, 0.12)', border: '#7d6a8a' },
      hidden:    { color: '#c97a6b', bg: 'rgba(201, 122, 107, 0.12)', border: '#8b4f44' }
    },
    ui: {
      accent: '#7aa3b8',
      warm: '#d4a843',
      cool: '#8ab896',
      muted: '#a89d8f',
      friend: '#8ab896',
      follow: '#7aa3b8',
      note: '#d4a843',
      warn: '#c97a6b',
      danger: '#c97a6b',
      text: { primary: '#e8e4dc', secondary: '#b8b0a0', muted: '#888070' },
      surface: { bg: '#1a1a18', border: '#3a3a34', hover: '#2a2a26', input: '#232321' }
    }
  };

  // =========================================================================
  // 1. NEUTRAL-FIRST DEFAULTS, LEXICON, PRESET PACKS, STAGES & KEYBINDS
  // =========================================================================
  const PIPELINE_STAGES = [
    { id: 'shortlist', label: 'Shortlisted', short: '★ Shortlist', icon: '★', ...PALETTE.stage.shortlist },
    { id: 'messaged',  label: 'Messaged',    short: '✉ Messaged',  icon: '✉', ...PALETTE.stage.messaged },
    { id: 'talking',   label: 'Talking',     short: '💬 Talking',   icon: '💬', ...PALETTE.stage.talking },
    { id: 'met',       label: 'Met IRL',     short: '☕ Met IRL',   icon: '☕', ...PALETTE.stage.met },
    { id: 'hidden',    label: 'Passed',      short: '✕ Pass',      icon: '✕', ...PALETTE.stage.hidden }
  ];

  const STAGE_MAP = Object.fromEntries(PIPELINE_STAGES.map(s => [s.id, s]));

  const VIEW_MODES = ['full', 'compact', 'minimal'];
  const VIEW_MODE_LABELS = {
    full: 'View: Full',
    compact: 'View: Compact',
    minimal: 'View: Minimal',
    off: 'View: Off'
  };

  // Built-in lexicon of recognized fetish, sensory, dynamic, and lifestyle terms (all <= 2 words)
  const KNOWN_FETISH_LEXICON = {
    sensory: [
      'sensation', 'edging', 'violet wand', 'estim', 'e-stim', 'leather',
      'voyeur', 'switch', 'squirting', 'massage', 'tickling', 'sensory play',
      'wax play', 'roleplay', 'costumes', 'lingerie'
    ],
    impactAndRestraint: [
      'restraint', 'ropes', 'shibari', 'bondage', 'cuffs', 'blindfold',
      'impact play', 'spanking', 'flogger', 'paddle', 'crop', 'caning',
      'masochism', 'sadism', 'watersports', 'scat', 'ddlg', 'tpe',
      'protocols', 'findom', 'paypig', 'tribute', 'hotwife', 'cuckold', 'stag'
    ],
    relationshipsAndLifestyle: [
      'polyamory', 'polyamorous', 'polyfidelity', 'closed vee', 'co-parenting',
      'nesting', 'solo poly', 'monogamy', 'sober', 'straight edge',
      'alcohol-free', 'drug-free', 'nudist', 'clothing-optional', 'nude yoga',
      'neurodivergent', 'autism', 'low-masking', 'intj', 'direct', 'tinkerer'
    ]
  };

  // Optional preset packs (never active unless explicitly loaded or imported by the user)
  const PRESET_PACKS = {
    sensory_play: {
      id: 'sensory_play',
      name: 'Sensory & Sensation Pack',
      description: 'Highlights tactile/sensory terms and flags high-intensity restraint/impact/fluid terms.',
      highlightRules: [
        {
          id: 'pack_sensory',
          label: 'Sensory Play',
          color: PALETTE.ui.cool,
          keywords: ['sensation', 'edging', 'violet wand', 'estim', 'e-stim', 'leather', 'voyeur', 'switch']
        }
      ],
      excludeKeywords: [
        'restraint', 'ropes', 'shibari', 'blindfold', 'impact play',
        'flogger', 'paddle', 'masochism', 'watersports', 'scat', 'findom', 'paypig'
      ]
    },
    poly_lifestyle: {
      id: 'poly_lifestyle',
      name: 'Poly, Sober & Neurodivergent Pack',
      description: 'Highlights relationship structure, sobriety, and direct communication terms.',
      highlightRules: [
        {
          id: 'pack_rel',
          label: 'Relationship / Family',
          color: PALETTE.ui.warm,
          keywords: ['polyamorous', 'polyfidelity', 'closed vee', 'co-parenting', 'nesting', 'solo poly']
        },
        {
          id: 'pack_sober_nd',
          label: 'Sober / Neurotype',
          color: PALETTE.ui.cool,
          keywords: ['sober', 'straight edge', 'alcohol-free', 'nudist', 'nude yoga', 'neurodivergent', 'low-masking', 'direct']
        }
      ],
      excludeKeywords: ['hotwife', 'cuckold', 'stag', 'tribute', '420', 'stoner']
    },
    strict_vanilla_filter: {
      id: 'strict_vanilla_filter',
      name: 'Exclude Heavy BDSM & Swap Dynamics',
      description: 'Adds common heavy impact, restraint, D/s, and hotwife/cuckold terms to Excludes.',
      highlightRules: [],
      excludeKeywords: [
        'restraint', 'ropes', 'shibari', 'blindfold', 'impact play', 'flogger',
        'paddle', 'masochism', 'watersports', 'scat', 'ddlg', 'tpe', 'protocols',
        'hotwife', 'cuckold', 'stag', 'findom', 'paypig', 'tribute'
      ]
    }
  };

  const DEFAULT_MESSAGE_TEMPLATES = [
    {
      id: 'tpl_hello',
      title: 'Friendly Local Hello',
      body: "Hey {username} — saw your profile and noticed we're in the same area. Would love to say hi if you're ever up for a low-stakes chat or coffee sometime. No pressure at all!"
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
    { key: 'cycleView',     label: 'Cycle Global Overlay View' },
    { key: 'nextCard',      label: 'Next Card in List' },
    { key: 'prevCard',      label: 'Previous Card in List' },
    { key: 'toggleMinimal', label: 'Toggle Focused Overlay Minimal' },
    { key: 'shortlist',     label: 'Shortlist Focused Card' },
    { key: 'pass',          label: 'Pass / Hide Focused Card' },
    { key: 'cycleGender',   label: 'Cycle Gender (♀/♂//auto)' },
    { key: 'note',          label: 'Edit Note on Card' },
    { key: 'openTab',       label: 'Open Profile in New Tab' }
  ];

  // Neutral out-of-the-box defaults for any FetLife user; personalized via Self-Profile Learner, Preset Packs, or HUD toggles
  const DEFAULT_SETTINGS = {
    excludeKeywords: [],
    highlightRules: [],
    customPacks: [],
    messageTemplates: DEFAULT_MESSAGE_TEMPLATES,
    keybinds: DEFAULT_KEYBINDS,
    hideMode: 'remove',               // 'remove' (zero-height layout-safe hide) | 'dim'
    dimOpacity: 0.18,
    showHidden: false,
    hideNoAbout: false,
    localOnlyFilter: false,
    localRegions: [],
    allowUnknownLocationOnExplore: true,
    exemptInteractedAndSocial: true,
    relationshipFilter: 'all',        // 'all' | 'single' | 'partnered'
    allowedGenders: {
      female: true,
      male: true,
      other: true,
      unknown: true
    },
    cacheMatchDisplayFilters: true,
    cacheSkipPartnered: false,
    batchRequireLocal: false,
    enableChatStrip: true,
    filterByAge: false,
    minAge: 21,
    maxAge: 65,
    autoLearnFromSelf: true,
    paused: false,
    hudPosition: 'bottom-right',
    cardViewMode: 'full',
    stickyProfileBar: true,
    showNotesInline: true,
    bioCacheTtlDays: 14
  };

  // =========================================================================
  // 2. TERM SANITIZER: 2-WORD MAX FILTER & DUPLICATE DETECTOR
  // =========================================================================
  function normalizeTermKey(term) {
    return String(term || '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9\s/-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function sanitizeTwoWordTerm(rawItem) {
    if (!rawItem || typeof rawItem !== 'string') return null;

    let cleaned = rawItem
      .replace(/\([^)]*\)/g, ' ')
      .replace(/["“”][^"“”]*["“”]/g, ' ')
      .replace(/[—–;].*$/, '')
      .replace(/^[-•*▪▫‣⁃>\s]+/, '')
      .replace(/^(?:and|or|also|plus|strictly|absolutely|definitely|zero\s+on|zero|no|any|being)\s+/i, '')
      .replace(/^(?:no|zero)\s+/i, '')
      .replace(/[.!?:,]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned || cleaned.length < 2 || cleaned.length > 32) return null;

    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 2) return null;

    if (/\b(?:i|me|my|we|our|you|your|it|is|are|was|were|be|been|have|has|had|do|does|did|need|want|like|love|great|good|bad|okay|ok|until|unless|because|since|when|while|if|that|which|who|for|to|from|into|with|without|requires?|gated|intact|mean|means|though|even)\b/i.test(cleaned)) {
      return null;
    }

    if (/^(?:into|curious|likes?|yes|loves?|favou?rites?|about(?:\s+me)?|looking\s+for|soft\s+limits?|hard\s+limits?|limits?|safety|red\s+lines?)$/i.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  function deduplicateTerms(incomingTerms, existingSet = new Set()) {
    const seen = new Set(existingSet);
    const unique = [];
    const duplicates = [];

    for (const raw of (incomingTerms || [])) {
      const term = sanitizeTwoWordTerm(raw);
      if (!term) continue;
      const key = normalizeTermKey(term);
      if (!key) continue;
      if (seen.has(key)) {
        duplicates.push(term);
      } else {
        seen.add(key);
        unique.push(term);
      }
    }

    return { unique, duplicates };
  }

  const RESERVED_PATHS = new Set([
    'search', 'groups', 'events', 'places', 'writings', 'pictures', 'videos',
    'conversations', 'notifications', 'settings', 'users', 'explore', 'feed',
    'ads', 'support', 'privacy', 'terms', 'p', 'kinks', 'requests', 'bookmarks',
    'activity', 'home', 'login', 'signup', 'tags', 'festivals', 'about', 'help',
    'guidelines', 'safety', 'merch', 'gift_certificates', 'supporters', 'glossary',
    'chat', 'live', 'contact', 'logout', 'api', 'assets', 'notifications_settings',
    'inbox', 'verify', 'languages', 'legal', 'kinktionary', 'tiles', 'communities',
    'mutes', 'likes', 'stories', 'feed_events', 'nav', 'sidebar', 'ama', 'stuff-you-love'
  ]);

  const PROFILE_SUBTABS = new Set([
    'posts', 'writings', 'l', 'lists', 'pictures', 'videos', 'kinks', 'fetishes',
    'friends', 'followers', 'following', 'activity', 'groups', 'events', 'wall',
    'collections', 'statuses', 'audios', 'profile', 'about'
  ]);

  const METRO_EXPANSIONS = {
    'portland': ['portland', 'pdx', 'oregon', 'beaverton', 'hillsboro', 'lake oswego', 'tigard', 'milwaukie', 'gresham', 'vancouver, wa', 'vancouver, washington', 'oregon city', 'west linn', 'clackamas', 'tualatin', 'sherwood', 'troutdale', 'camas', 'washougal'],
    'seattle': ['seattle', 'washington', 'bellevue', 'tacoma', 'redmond', 'kirkland', 'everett', 'renton', 'kent', 'olympia'],
    'san francisco': ['san francisco', 'bay area', 'oakland', 'berkeley', 'san jose', 'california'],
    'los angeles': ['los angeles', 'la', 'hollywood', 'santa monica', 'burbank', 'pasadena', 'long beach', 'california'],
    'new york': ['new york', 'nyc', 'brooklyn', 'manhattan', 'queens', 'bronx', 'new jersey'],
    'chicago': ['chicago', 'illinois', 'evanston', 'oak park'],
    'austin': ['austin', 'texas', 'round rock', 'cedar park'],
    'denver': ['denver', 'colorado', 'boulder', 'aurora', 'lakewood'],
    'vancouver, bc': ['vancouver, bc', 'vancouver, british columbia', 'british columbia', 'burnaby', 'surrey', 'richmond']
  };

  const GENERIC_LOCATION_TEXT_RE = /\b([A-Z][a-zA-Z .'-]{1,28},\s*(?:[A-Z]{2}|[A-Z][a-zA-Z .'-]{2,26}))\b/;
  const SINGLE_REL_RE = /\b(single|solo|unpartnered|available|divorced|widowed)\b/i;
  const PARTNERED_REL_RE = /\b(married|partnered|engaged|in\s+a\s+relationship|polyamorous|poly|swinger|open\s+relationship|monogamous|nested|nesting|spouse|husband|wife|boyfriend|girlfriend|fianc[eé]e?|coupled)\b/i;
  const USERNAME_RE = /^[a-zA-Z0-9_.-]{2,36}$/;

  // Gender token pattern (used only for testing, not in a giant alternation regex)
  const GENDER_TOKEN_PATTERN = [
    'Cisgender\\s*Female', 'Cisgender\\s*Woman', 'Cisgender\\s*Male', 'Cisgender\\s*Man',
    'Cis\\s*Female', 'Cis\\s*Woman', 'Cis\\s*Male', 'Cis\\s*Man', 'Cis\\s*F', 'Cis\\s*M',
    'Trans\\s*Female', 'Trans\\s*Woman', 'Trans\\s*Male', 'Trans\\s*Man',
    'Transfeminine', 'Transmasculine', 'Transgender', 'Transsexual',
    'Non-?binary', 'Genderfluid', 'Genderqueer', 'Crossdresser', 'Transvestite',
    'Two-?Spirit', 'Intersex', 'Agender', 'Demigirl', 'Demiboy', 'Bigender',
    'Pangender', 'Genderflux', 'Questioning', 'Butch', 'Femme', 'Androgyne',
    'Female', 'Woman', 'Male', 'Man',
    'MtF', 'FtM', 'MTF', 'FTM', 'AFAB', 'AMAB',
    'NB', 'GF', 'GQ', 'IS', 'AG', 'TG', 'TS', 'CD', 'TV', '2S', 'GN', 'Q',
    'W', 'F', 'M'
  ].join('|');

  // Split into two passes to avoid catastrophic backtracking on long alternation
  const GENDER_TOKEN_RE = new RegExp(`(${GENDER_TOKEN_PATTERN})`, 'i');
  const AGE_GENDER_BADGE_RE = /^\s*([1-9]\d)\s+([^·•|\r\n]{1,48})\s*$/;
  const AGE_GENDER_INLINE_RE = /(?:^|[\s·•|(]|[a-z_.-])([1-9]\d)\s+([A-Za-z][A-Za-z0-9 /&'’-]{0,38})/;

  const OTHER_GENDER_RE = /\b(nb|non-?binary|mtf|ftm|trans\s*woman|trans\s*female|trans\s*girl|trans\s*man|trans\s*male|transfeminine|transmasculine|transgender|transsexual|trans\b|gf|genderfluid|gq|genderqueer|ag|agender|is|intersex|cd|crossdresser|tv|transvestite|two-?spirit|2s|demigirl|demiboy|bigender|pangender|genderflux|androgyne|gn|amab|afab)\b/i;
  const BIO_NON_CIS_FEMALE_RE = /\b(mtf|trans\s*woman|trans\s*female|transfeminine|transgender\s*woman|amab|non-?binary|genderfluid)\b/i;
  const FEMALE_GENDER_RE = /^(f|w|female|cis\s*f|cis\s*female|cisgender\s*female|woman|cis\s*woman|cisgender\s*woman|femme)$/i;
  const MALE_GENDER_RE = /^(m|male|cis\s*m|cis\s*male|cisgender\s*male|man|cis\s*man|cisgender\s*man)$/i;

  const cardViewOverrides = new Map();

  // =========================================================================
  // 3. STICKY VIEWPORT TRACKER & SCROLL GUARD
  // =========================================================================
  let stickyRafPending = false;
  let boundScrollEl = null;
  let isUserScrolling = false;
  let scrollIdleTimer = null;

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

  function handleScrollActivity() {
    isUserScrolling = true;
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => {
      isUserScrolling = false;
    }, 300);

    if (!stickyRafPending) {
      stickyRafPending = true;
      requestAnimationFrame(syncStickyViewportOffset);
    }
  }

  function attachScrollListeners() {
    const mainContent = document.getElementById('main-content');
    if (mainContent && boundScrollEl !== mainContent) {
      boundScrollEl = mainContent;
      mainContent.addEventListener('scroll', handleScrollActivity, { passive: true });
    }
  }

  window.addEventListener('scroll', handleScrollActivity, { passive: true });
  window.addEventListener('resize', handleScrollActivity, { passive: true });

  // =========================================================================
  // 4. GENDER, AGE, LOCATION & RELATIONSHIP CLASSIFICATION
  // =========================================================================
  function normalizeValidAge(val) {
    if (val === null || val === undefined || val === '') return null;
    const n = typeof val === 'number' ? Math.floor(val) : parseInt(String(val).trim(), 10);
    if (Number.isNaN(n) || n < 18 || n > 99) return null;
    return n;
  }

  function extractAgeGenderFromText(text) {
    if (!text) return { age: null, genderToken: null, genderRole: null };
    const lines = text.split(/[·•|\r\n]/).map(s => s.trim()).filter(Boolean);
    for (const line of lines) {
      const badgeMatch = line.match(AGE_GENDER_BADGE_RE);
      if (badgeMatch) {
        const age = normalizeValidAge(badgeMatch[1]);
        const genderToken = badgeMatch[2].trim();
        if (age && GENDER_TOKEN_RE.test(genderToken)) {
          return { age, genderToken, genderRole: line };
        }
      }
      const inlineMatch = line.match(AGE_GENDER_INLINE_RE);
      if (inlineMatch) {
        const age = normalizeValidAge(inlineMatch[1]);
        const genderToken = inlineMatch[2].trim();
        if (age && GENDER_TOKEN_RE.test(genderToken)) {
          return { age, genderToken, genderRole: `${age} ${genderToken}` };
        }
      }
    }
    return { age: null, genderToken: null, genderRole: null };
  }

  function resolveEffectiveAge(record, cachedBio, liveDemos = null) {
    return normalizeValidAge(record?.manualAge) ??
      normalizeValidAge(liveDemos?.age) ??
      normalizeValidAge(cachedBio?.age) ??
      normalizeValidAge(record?.age) ??
      extractAgeGenderFromText(liveDemos?.genderRole || cachedBio?.genderRole || record?.genderRole || '').age;
  }

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
    const headerOrAbout = `${cachedBio?.headerText || ''} ${cachedBio?.aboutText || ''}`.trim();
    if (headerOrAbout && BIO_NON_CIS_FEMALE_RE.test(headerOrAbout)) {
      const m = headerOrAbout.match(BIO_NON_CIS_FEMALE_RE);
      return { gender: m ? m[0] : 'Trans/NB', genderCategory: 'other' };
    }

    if (liveDemos?.genderCategory) {
      return { gender: liveDemos.gender || null, genderCategory: liveDemos.genderCategory };
    }
    if (cachedBio?.genderCategory) {
      return { gender: cachedBio.gender || null, genderCategory: cachedBio.genderCategory };
    }
    if (!record?.manualGender && record?.genderCategory) {
      return { gender: record.gender || null, genderCategory: record.genderCategory };
    }

    const roleStr = liveDemos?.genderRole || cachedBio?.genderRole || record?.genderRole || '';
    const extracted = extractAgeGenderFromText(roleStr);
    if (extracted.genderToken) {
      return classifyGenderToken(extracted.genderToken, liveDemos?.gender || cachedBio?.gender || '');
    }

    const rawG = liveDemos?.gender || cachedBio?.gender || (!record?.manualGender ? record?.gender : '');
    if (rawG) {
      const classified = classifyGenderToken(rawG);
      if (classified.genderCategory) return classified;
    }

    return { gender: null, genderCategory: null };
  }

  function resolveEffectiveGender(record, cachedBio, liveDemos = null) {
    const auto = inferAutoGender(record, cachedBio, liveDemos);
    if (record?.manualGender === 'female') {
      return { gender: '♀ Female (Manual)', genderCategory: 'female', isManual: true, manualGender: 'female', autoDetected: auto };
    }
    if (record?.manualGender === 'male') {
      return { gender: '♂ Male (Manual)', genderCategory: 'male', isManual: true, manualGender: 'male', autoDetected: auto };
    }
    if (record?.manualGender === 'other') {
      return { gender: ' transgender Other (Manual)', genderCategory: 'other', isManual: true, manualGender: 'other', autoDetected: auto };
    }
    return { gender: auto.gender, genderCategory: auto.genderCategory, isManual: false, manualGender: null, autoDetected: auto };
  }

  function classifyRelationshipStatus(relStr) {
    if (!relStr || typeof relStr !== 'string') return null;
    const clean = relStr.replace(/\s+/g, ' ').trim();
    if (!clean) return null;
    if (PARTNERED_REL_RE.test(clean)) return 'partnered';
    if (SINGLE_REL_RE.test(clean)) return 'single';
    return null;
  }

  function isLocationLocal(location, settings) {
    const loc = (location || '').trim().toLowerCase();
    if (!loc) return false;
    const regions = Array.isArray(settings.localRegions) ? settings.localRegions : [];
    if (regions.length === 0) return true;

    if (loc.includes('vancouver')) {
      const wantsWa = regions.some(r => r.includes('vancouver, wa') || r.includes('vancouver, washington') || r === 'oregon' || r === 'portland' || r === 'pdx');
      const wantsBc = regions.some(r => r.includes('vancouver, bc') || r.includes('british columbia'));
      if (loc.includes('british columbia') || /\bvancouver,\s*bc\b/.test(loc)) {
        return wantsBc;
      }
      if (loc.includes('washington') || /\bvancouver,\s*wa\b/.test(loc)) {
        return wantsWa;
      }
      // If user has both WA and BC regions, and location is just "vancouver" without state,
      // default to BC (more specific) - or return true if either matches
      return wantsWa || wantsBc;
    }

    return regions.some(term => {
      const cleanTerm = term.trim().toLowerCase();
      if (!cleanTerm) return false;
      return loc.includes(cleanTerm);
    });
  }

  function isConfirmedNonLocal(location, settings) {
    const cleanLoc = (location || '').trim();
    if (!cleanLoc) return false;
    return !isLocationLocal(cleanLoc, settings);
  }

  function isConfirmedPartnered(relationships) {
    return classifyRelationshipStatus(relationships) === 'partnered';
  }

  function hasProtectedInteractionOrSocial(record, liveSocial = null) {
    if (!record && !liveSocial) return false;
    if (record?.status === 'hidden') return false;
    if (record?.status && ['shortlist', 'messaged', 'talking', 'met'].includes(record.status)) return true;
    if (record?.note && record.note.trim().length > 0) return true;
    if (record?.lastContacted) return true;
    if (record?.isFriend || record?.isFollowing) return true;
    if (liveSocial?.isFriend || liveSocial?.isFollowing) return true;
    return false;
  }

  function detectLiveSocialRelation(container) {
    if (!container || container.nodeType !== 1) return { isFriend: false, isFollowing: false };
    let isFriend = false;
    let isFollowing = false;

    const forms = container.getElementsByTagName('form');
    for (const f of forms) {
      const action = (f.getAttribute('action') || '').toLowerCase();
      if (action.includes('/unfollow')) isFollowing = true;
      if (action.includes('/unfriend')) isFriend = true;
    }

    const candidates = container.querySelectorAll('button, a, span, div');
    for (const el of candidates) {
      if (el.closest('.flx-toolbar, .flx-profile-bar, .flx-chat-context')) continue;
      if (el.children.length > 2) continue;
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!txt || txt.length > 28) continue;
      if (/^(?:friends?|unfriend)$/i.test(txt)) isFriend = true;
      else if (/^(?:following|unfollow)$/i.test(txt)) isFollowing = true;
    }

    return { isFriend, isFollowing };
  }

  function isGenderAllowedBySettings(genderCategory, settings) {
    const allowed = settings.allowedGenders || { female: true, male: true, other: true, unknown: true };
    if (!genderCategory) return allowed.unknown !== false;
    return allowed[genderCategory] !== false;
  }

  function isProfileEligibleForAutoCache(candidate, settings) {
    if (!settings.cacheMatchDisplayFilters) return true;
    if (!isGenderAllowedBySettings(candidate.genderCategory || null, settings)) return false;

    if (settings.localOnlyFilter && isConfirmedNonLocal(candidate.location || '', settings)) {
      return false;
    }

    if (settings.cacheSkipPartnered && isConfirmedPartnered(candidate.relationships || '')) {
      return false;
    }

    return true;
  }

  function buildCompositeSearchText(entry) {
    if (!entry) return '';
    const intoArr = Array.isArray(entry.fetishesInto) ? entry.fetishesInto : [];
    const intoStr = intoArr.length > 0 ? `Into: ${intoArr.join(', ')}` : '';
    const unsplitFetishes = intoArr.length === 0 ? (entry.fetishesRaw || entry.sections?.fetishes || '') : '';
    const parts = [
      entry.headerText || entry.sections?.header || '',
      entry.aboutText || entry.sections?.about || '',
      intoStr,
      unsplitFetishes,
      entry.writingsText || entry.sections?.writings || '',
      entry.fallbackText || entry.text || ''
    ].filter(Boolean);
    return Array.from(new Set(parts)).join(' \n ');
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

  function isElementEditableNode(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'LEXXY-EDITOR') return true;
    if (el.isContentEditable) return true;
    const role = el.getAttribute && el.getAttribute('role');
    if (role === 'textbox' || role === 'searchbox' || role === 'combobox') return true;
    return false;
  }

  function isEditableTarget(e) {
    const path = (e && typeof e.composedPath === 'function') ? e.composedPath() : (e && e.target ? [e.target] : []);
    for (const el of path) {
      if (isElementEditableNode(el)) return true;
    }

    let active = document.activeElement;
    while (active) {
      if (isElementEditableNode(active)) return true;
      if (active.shadowRoot && active.shadowRoot.activeElement) {
        active = active.shadowRoot.activeElement;
      } else {
        break;
      }
    }

    if (CrmModal.shadow && isElementEditableNode(CrmModal.shadow.activeElement)) return true;
    if (Hud.shadow && isElementEditableNode(Hud.shadow.activeElement)) return true;

    return false;
  }

  function shieldShadowInputs(shadowRoot, onEscape = null) {
    if (!shadowRoot) return;
    for (const evtType of ['keydown', 'keypress', 'keyup']) {
      shadowRoot.addEventListener(evtType, (e) => {
        if (evtType === 'keydown' && e.key === 'Escape' && typeof onEscape === 'function') {
          e.stopPropagation();
          onEscape(e);
          return;
        }
        const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
        for (const el of path) {
          if (isElementEditableNode(el)) {
            if (evtType === 'keydown' && (e.altKey || e.ctrlKey || e.metaKey)) {
              const kb = Store.getSettings().keybinds || DEFAULT_KEYBINDS;
              if (kb.toggleCrm && matchesKeyCombo(e, kb.toggleCrm)) {
                e.preventDefault();
                e.stopPropagation();
                if (CrmModal.isOpen) CrmModal.close();
                else CrmModal.open();
                return;
              }
            }
            e.stopPropagation();
            return;
          }
        }
      }, false);
    }
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
    _hasGmStorage() {
      return typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
    },
    _read(key, fallback) {
      if (this._hasGmStorage()) {
        try {
          const val = GM_getValue(key, null);
          if (val !== null && val !== undefined) return val;
        } catch (e) {
          console.warn('[FLX] GM_getValue fallback:', e);
        }
      }
      try {
        const raw = localStorage.getItem(`flx_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (this._hasGmStorage()) {
            try {
              GM_setValue(key, parsed);
              localStorage.removeItem(`flx_${key}`);
            } catch {}
          }
          return parsed;
        }
      } catch {}
      return fallback;
    },
    _write(key, value) {
      if (this._hasGmStorage()) {
        try {
          GM_setValue(key, value);
          try { localStorage.removeItem(`flx_${key}`); } catch {}
          return;
        } catch (e) {
          console.warn('[FLX] GM_setValue fallback:', e);
        }
      }
      try {
        localStorage.setItem(`flx_${key}`, JSON.stringify(value));
      } catch (e) {
        console.error('[FLX] Storage write failed:', e);
      }
    },
    getAllAvailablePacks() {
      const s = this.getSettings();
      const all = Object.assign({}, PRESET_PACKS);
      for (const cp of (s.customPacks || [])) {
        if (cp && cp.id) all[cp.id] = cp;
      }
      return all;
    },
    buildPackFromCurrentSettings(packName) {
      const s = this.getSettings();
      const existingSet = new Set();
      const cleanRules = [];

      for (const r of (s.highlightRules || [])) {
        const { unique } = deduplicateTerms(r.keywords || [], existingSet);
        if (unique.length > 0) {
          cleanRules.push({
            id: r.id || `rule_${Date.now()}`,
            label: (r.label || 'Tag').trim(),
            color: r.color || PALETTE.ui.accent,
            keywords: unique
          });
        }
      }

      const { unique: cleanExcludes } = deduplicateTerms(s.excludeKeywords || [], existingSet);
      return {
        id: `custom_${Date.now()}`,
        name: (packName || 'Custom Pack').trim(),
        description: `Pack (${cleanRules.length} categories, ${cleanExcludes.length} excludes, ≤2 words, deduplicated).`,
        highlightRules: cleanRules,
        excludeKeywords: cleanExcludes
      };
    },
    sanitizeAndStoreImportedPack(rawJson) {
      const parsed = JSON.parse(rawJson);
      const source = parsed.pack || parsed;
      const seenTerms = new Set();
      const cleanRules = [];

      for (const r of (source.highlightRules || [])) {
        const { unique } = deduplicateTerms(r.keywords || [], seenTerms);
        if (unique.length > 0) {
          cleanRules.push({
            id: r.id || `imp_${Date.now()}_${cleanRules.length}`,
            label: (r.label || 'Tag').trim(),
            color: r.color || PALETTE.ui.accent,
            keywords: unique
          });
        }
      }

      const { unique: cleanExcludes } = deduplicateTerms(source.excludeKeywords || [], seenTerms);
      const packObj = {
        id: source.id || `imported_${Date.now()}`,
        name: (source.name || 'Imported Pack').trim(),
        description: source.description || `Imported pack (${cleanRules.length} categories, ${cleanExcludes.length} excludes).`,
        highlightRules: cleanRules,
        excludeKeywords: cleanExcludes
      };

      const s = this.getSettings();
      const others = (s.customPacks || []).filter(p => p.id !== packObj.id);
      this.saveSettings({ customPacks: [...others, packObj] });
      return packObj;
    },
    applyPresetPack(packId) {
      const pack = this.getAllAvailablePacks()[packId];
      if (!pack) return { rulesAdded: 0, excludesAdded: 0, duplicatesSkipped: 0 };

      const s = this.getSettings();
      const seenTerms = new Set();
      let duplicatesSkipped = 0;

      for (const ex of (s.excludeKeywords || [])) {
        const k = normalizeTermKey(ex);
        if (k) seenTerms.add(k);
      }

      const nextRules = (s.highlightRules || []).map(r => {
        const cleanKws = [];
        for (const kw of (r.keywords || [])) {
          const valid = sanitizeTwoWordTerm(kw);
          if (!valid) continue;
          const k = normalizeTermKey(valid);
          if (seenTerms.has(k)) duplicatesSkipped++;
          else { seenTerms.add(k); cleanKws.push(valid); }
        }
        return Object.assign({}, r, { keywords: cleanKws });
      });

      let rulesAdded = 0;
      for (const pRule of (pack.highlightRules || [])) {
        const { unique, duplicates } = deduplicateTerms(pRule.keywords || [], seenTerms);
        duplicatesSkipped += duplicates.length;
        if (unique.length > 0) {
          const existingIdx = nextRules.findIndex(r => normalizeTermKey(r.label) === normalizeTermKey(pRule.label));
          if (existingIdx >= 0) nextRules[existingIdx].keywords = [...nextRules[existingIdx].keywords, ...unique];
          else nextRules.push({ id: pRule.id || `pack_${Date.now()}_${rulesAdded}`, label: pRule.label, color: pRule.color || PALETTE.ui.accent, keywords: unique });
          rulesAdded += unique.length;
        }
      }

      const { unique: newExcludes, duplicates: exDupes } = deduplicateTerms(pack.excludeKeywords || [], seenTerms);
      duplicatesSkipped += exDupes.length;
      this.saveSettings({ highlightRules: nextRules, excludeKeywords: [...(s.excludeKeywords || []), ...newExcludes] });

      return { rulesAdded, excludesAdded: newExcludes.length, duplicatesSkipped };
    },
    compactBioCacheEntry(key, rawEntry, isPassed = false) {
      if (!rawEntry || typeof rawEntry !== 'object') return null;
      const aboutText = (rawEntry.aboutText || rawEntry.sections?.about || '').trim();
      const writingsText = (rawEntry.writingsText || rawEntry.sections?.writings || '').trim();
      const headerText = (rawEntry.headerText || rawEntry.sections?.header || '').trim();
      const fetishesInto = Array.isArray(rawEntry.fetishesInto) ? rawEntry.fetishesInto : [];
      const fetishesLimits = Array.isArray(rawEntry.fetishesLimits) ? rawEntry.fetishesLimits : [];
      const fetishesRaw = fetishesInto.length === 0
        ? (rawEntry.fetishesRaw || rawEntry.sections?.fetishes || '').trim()
        : '';

      const fallbackText = (!aboutText && !writingsText && typeof rawEntry.text === 'string')
        ? rawEntry.text.trim()
        : '';

      const hasAbout = typeof rawEntry.hasAbout === 'boolean'
        ? (rawEntry.hasAbout || Boolean(aboutText))
        : Boolean(aboutText);

      if (isPassed) {
        return {
          username: rawEntry.username || null,
          aboutText: '',
          writingsText: '',
          headerText: '',
          fallbackText: '',
          hasAbout,
          fetishesInto: [],
          fetishesLimits,
          fetishesRaw: '',
          age: normalizeValidAge(rawEntry.age),
          gender: rawEntry.gender || null,
          genderCategory: rawEntry.genderCategory || null,
          genderRole: rawEntry.genderRole || null,
          location: rawEntry.location || null,
          relationships: rawEntry.relationships || null,
          lookingFor: rawEntry.lookingFor || null,
          groups: Array.isArray(rawEntry.groups) ? rawEntry.groups : [],
          fetchedAt: rawEntry.fetchedAt || Date.now(),
          slimmedPassed: true
        };
      }

      return {
        username: rawEntry.username || null,
        aboutText,
        writingsText,
        headerText,
        fallbackText,
        hasAbout,
        fetishesInto,
        fetishesLimits,
        fetishesRaw,
        age: normalizeValidAge(rawEntry.age),
        gender: rawEntry.gender || null,
        genderCategory: rawEntry.genderCategory || null,
        genderRole: rawEntry.genderRole || null,
        location: rawEntry.location || null,
        relationships: rawEntry.relationships || null,
        lookingFor: rawEntry.lookingFor || null,
        groups: Array.isArray(rawEntry.groups) ? rawEntry.groups : [],
        fetchedAt: rawEntry.fetchedAt || Date.now()
      };
    },
    compactAllStorage() {
      const users = this.getAllUsers();
      const cache = this.getBioCache();
      let compactedCount = 0;

      for (const [key, entry] of Object.entries(cache)) {
        const isPassed = users[key]?.status === 'hidden';
        const slim = this.compactBioCacheEntry(key, entry, isPassed);
        if (slim) {
          cache[key] = slim;
          compactedCount++;
        }
      }

      this._write('fl_bio_cache', cache);
      this._write('fl_users', users);
      this._write('fl_settings', this.getSettings());
      return compactedCount;
    },
    purgeExcludedFromCache() {
      const settings = this.getSettings();
      const users = this.getAllUsers();
      const cache = this.getBioCache();
      let removedCache = 0;
      let removedUsers = 0;

      const allKeys = new Set([...Object.keys(users), ...Object.keys(cache)]);
      for (const key of allKeys) {
        const u = users[key] || {};
        const c = cache[key] || null;
        const hasManualWork = Boolean(
          u.status || u.manualGender || u.manualAge || u.isFriend || u.isFollowing || (u.note && u.note.trim().length > 0)
        );
        if (hasManualWork) continue;

        const effectiveG = resolveEffectiveGender(u, c).genderCategory;
        const loc = u.location || c?.location || '';
        const rel = u.relationships || c?.relationships || '';
        const fullTxt = c ? buildCompositeSearchText(c) : '';

        const eligible = isProfileEligibleForAutoCache({
          genderCategory: effectiveG,
          location: loc,
          relationships: rel,
          fullText: fullTxt
        }, settings);

        if (!eligible) {
          if (cache[key]) {
            delete cache[key];
            removedCache++;
          }
          if (users[key]) {
            delete users[key];
            removedUsers++;
          }
        }
      }

      if (removedCache > 0) this._write('fl_bio_cache', cache);
      if (removedUsers > 0) this._write('fl_users', users);
      return { removedCache, removedUsers };
    },
    runOneTimeSanitization() {
      if (!this._read('fl_v1150_migrated', false)) {
        const saved = this._read('fl_settings', {});
        const patch = {
          hideMode: 'remove',
          allowUnknownLocationOnExplore: true
        };
        if (!saved.allowedGenders && saved.genderFilter) {
          if (saved.genderFilter === 'female') {
            patch.allowedGenders = { female: true, male: false, other: false, unknown: true };
          } else if (saved.genderFilter === 'male') {
            patch.allowedGenders = { female: false, male: true, other: false, unknown: true };
          } else if (saved.genderFilter === 'other') {
            patch.allowedGenders = { female: false, male: false, other: true, unknown: true };
          }
        }
        if (saved.localOnlyFilter && (!Array.isArray(saved.localRegions) || saved.localRegions.length === 0)) {
          patch.localRegions = METRO_EXPANSIONS['portland'];
        }
        this.saveSettings(patch);
        this.compactAllStorage();
        this._write('fl_v1150_migrated', true);
      }
    },
    getSettings() {
      const saved = this._read('fl_settings', {});
      const merged = Object.assign({}, DEFAULT_SETTINGS, saved);

      if (merged.hideMode === 'collapse') {
        merged.hideMode = 'remove';
      }

      merged.allowedGenders = Object.assign(
        { female: true, male: true, other: true, unknown: true },
        saved.allowedGenders || {}
      );

      merged.localRegions = Array.isArray(merged.localRegions) ? merged.localRegions : [];
      merged.customPacks = Array.isArray(merged.customPacks) ? merged.customPacks : [];
      merged.localOnlyFilter = Boolean(merged.localOnlyFilter);
      merged.allowUnknownLocationOnExplore = merged.allowUnknownLocationOnExplore !== false;
      merged.exemptInteractedAndSocial = merged.exemptInteractedAndSocial !== false;
      merged.cacheMatchDisplayFilters = merged.cacheMatchDisplayFilters !== false;
      merged.enableChatStrip = saved.enableChatStrip !== false;
      merged.filterByAge = Boolean(merged.filterByAge);
      merged.minAge = normalizeValidAge(merged.minAge) ?? 21;
      merged.maxAge = normalizeValidAge(merged.maxAge) ?? 65;
      if (merged.minAge > merged.maxAge) {
        const tmp = merged.minAge;
        merged.minAge = merged.maxAge;
        merged.maxAge = tmp;
      }

      if (!Array.isArray(merged.highlightRules)) merged.highlightRules = [];
      if (!Array.isArray(merged.excludeKeywords)) merged.excludeKeywords = [];
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
    resetKeybindsToDefaults() {
      return this.saveSettings({ keybinds: Object.assign({}, DEFAULT_KEYBINDS) });
    },
    getSelfProfile() {
      return this._read('fl_self_profile', {
        id: null,
        key: null,
        username: null,
        genderCategory: null,
        orientation: null,
        lookingFor: null,
        location: null,
        fetishesInto: [],
        fetishesLimits: [],
        groups: [],
        syncedAt: null
      });
    },
    saveSelfProfile(patch) {
      const cur = this.getSelfProfile();
      const next = Object.assign({}, cur, patch);
      this._write('fl_self_profile', next);
      if (Array.isArray(next.groups) && next.groups.length > 0) {
        this._write('fl_self_groups', next.groups);
      }
      return next;
    },
    learnPreferencesFromSelf(selfData, applyGenderAndLocation = false) {
      const settings = this.getSettings();
      const rules = Array.isArray(settings.highlightRules) ? [...settings.highlightRules] : [];
      const patch = {};
      const seenTerms = new Set();

      const intoList = Array.isArray(selfData?.fetishesInto) ? selfData.fetishesInto : [];
      const { unique: cleanKinks } = deduplicateTerms(intoList, seenTerms);
      let intoAdded = 0;
      if (cleanKinks.length > 0) {
        const idx = rules.findIndex(r => r.id === 'self_kinks');
        const selfRule = { id: 'self_kinks', label: 'Shared Kink', color: PALETTE.ui.warm, keywords: cleanKinks };
        if (idx >= 0) rules[idx] = selfRule;
        else rules.push(selfRule);
        intoAdded = cleanKinks.length;
      }

      const limitsList = Array.isArray(selfData?.fetishesLimits) ? selfData.fetishesLimits : [];
      const existingExSet = new Set((settings.excludeKeywords || []).map(k => normalizeTermKey(k)).filter(Boolean));
      const { unique: newExcludes } = deduplicateTerms(limitsList, existingExSet);
      const nextExcludes = [...(settings.excludeKeywords || []), ...newExcludes];

      patch.highlightRules = rules;
      patch.excludeKeywords = nextExcludes;

      if (applyGenderAndLocation) {
        const ori = (selfData?.orientation || '').toLowerCase();
        const selfG = selfData?.genderCategory || null;
        if (ori && selfG) {
          if (/\b(straight|heterosexual|heteroflexible)\b/.test(ori)) {
            if (selfG === 'male') {
              patch.allowedGenders = { female: true, male: false, other: false, unknown: true };
            } else if (selfG === 'female') {
              patch.allowedGenders = { female: false, male: true, other: false, unknown: true };
            }
          } else if (/\b(gay|lesbian|homosexual)\b/.test(ori)) {
            if (selfG === 'male') {
              patch.allowedGenders = { female: false, male: true, other: false, unknown: true };
            } else if (selfG === 'female') {
              patch.allowedGenders = { female: true, male: false, other: false, unknown: true };
            }
          } else if (/\b(bi|bisexual|pansexual|queer|omnisexual|skoliosexual)\b/.test(ori)) {
            patch.allowedGenders = { female: true, male: true, other: true, unknown: true };
          }
        }

        const loc = (selfData?.location || '').trim();
        if (loc) {
          const parts = loc.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
          const city = parts[0] || '';
          const stateOrCountry = parts[1] || '';
          let expanded = METRO_EXPANSIONS[city] || METRO_EXPANSIONS[`${city}, ${stateOrCountry}`] || null;
          if (!expanded) {
            expanded = Array.from(new Set([city, stateOrCountry].filter(x => x.length >= 2)));
          }
          if (expanded.length > 0) {
            patch.localRegions = expanded;
            patch.localOnlyFilter = true;
          }
        }
      }

      this.saveSettings(patch);
      this.saveSelfProfile({ syncedAt: Date.now() });
      return { intoAdded, limitsAdded: newExcludes.length };
    },
    getSelfGroups() {
      const selfProf = this.getSelfProfile();
      if (Array.isArray(selfProf.groups) && selfProf.groups.length > 0) return selfProf.groups;
      const arr = this._read('fl_self_groups', []);
      return Array.isArray(arr) ? arr : [];
    },
    setSelfGroups(groups) {
      if (Array.isArray(groups) && groups.length > 0) {
        this._write('fl_self_groups', groups);
        this.saveSelfProfile({ groups });
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
        isFriend: false,
        isFollowing: false,
        username: null,
        age: null,
        manualAge: null,
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

      if (Object.prototype.hasOwnProperty.call(patch, 'manualAge')) {
        next.manualAge = normalizeValidAge(patch.manualAge);
        if (next.manualAge !== null) next.age = next.manualAge;
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'age')) {
        next.age = next.manualAge ?? normalizeValidAge(patch.age);
      } else {
        next.age = next.manualAge ?? normalizeValidAge(next.age);
      }

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
          next.gender = ' transgender Other (Manual)';
        } else {
          // Explicit null or undefined → reset to auto-detect
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
        next.gender = ' transgender Other (Manual)';
      }

      db[key] = next;
      this._write('fl_users', db);

      if (patch.status === 'hidden' && prev.status !== 'hidden') {
        const cache = this.getBioCache();
        if (cache[key]) {
          cache[key] = this.compactBioCacheEntry(key, cache[key], true);
          this._write('fl_bio_cache', cache);
        }
      }

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
      const cache = this.getBioCache();
      const cacheStr = JSON.stringify(cache);
      const totalBytes = settingsStr.length + usersStr.length + cacheStr.length;
      return {
        kb: (totalBytes / 1024).toFixed(1),
        cacheCount: Object.keys(cache).length,
        userCount: Object.keys(this.getAllUsers()).length,
        backend: this._hasGmStorage() ? 'GM' : 'localStorage'
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
        const isTracked = Boolean(u && (u.status || u.manualGender || u.manualAge || u.isFriend || u.isFollowing || (u.note && u.note.trim().length > 0)));
        if (isTracked && u.status !== 'hidden') {
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
      const raw = cache[key];
      if (!raw) return null;

      const u = this.getUser(key);
      const isTracked = Boolean(u.status || u.manualGender || u.manualAge || u.isFriend || u.isFollowing || (u.note && u.note.trim().length > 0));
      if (!isTracked) {
        const maxAgeMs = Math.max(1, Number(ttlDays) || 14) * 86400000;
        if (Date.now() - (raw.fetchedAt || 0) > maxAgeMs) return null;
      }

      const hydrated = Object.assign({}, raw);
      hydrated.aboutText = raw.aboutText || raw.sections?.about || '';
      hydrated.writingsText = raw.writingsText || raw.sections?.writings || '';
      hydrated.text = buildCompositeSearchText(raw);
      return hydrated;
    },
    mergeCachedProfile(key, incoming, username = null) {
      const settings = this.getSettings();
      const cache = this.getBioCache();
      const prev = cache[key] || {};
      const u = this.getUser(key);
      const isPassed = u.status === 'hidden';

      const prevAbout = prev.aboutText || prev.sections?.about || '';
      const prevWritings = prev.writingsText || prev.sections?.writings || '';
      const prevHeader = prev.headerText || prev.sections?.header || '';

      const nextAbout = isPassed ? '' : (incoming.aboutText || prevAbout);
      const nextWritings = isPassed ? '' : (incoming.writingsText || prevWritings);
      const nextHeader = isPassed ? '' : (incoming.headerText || prevHeader);

      let nextGenderCategory = incoming.genderCategory || prev.genderCategory || null;
      let nextGender = incoming.gender || prev.gender || null;
      const combinedBioCheck = `${nextHeader} ${nextAbout}`;
      if (combinedBioCheck && BIO_NON_CIS_FEMALE_RE.test(combinedBioCheck)) {
        const m = combinedBioCheck.match(BIO_NON_CIS_FEMALE_RE);
        nextGenderCategory = 'other';
        nextGender = m ? m[0] : 'Trans/NB';
      }

      const effectiveGenderCat = u.manualGender || nextGenderCategory;
      const resolvedLocation = incoming.location || prev.location || u.location || null;
      const resolvedRelationships = incoming.relationships || prev.relationships || u.relationships || null;
      const hasManualWork = Boolean(
        u.status || u.manualGender || u.manualAge || u.isFriend || u.isFollowing || (u.note && u.note.trim().length > 0)
      );

      if (!hasManualWork && !isProfileEligibleForAutoCache({
        genderCategory: effectiveGenderCat,
        location: resolvedLocation,
        relationships: resolvedRelationships,
        fullText: `${nextHeader} ${nextAbout}`
      }, settings)) {
        return null;
      }

      const nextInto = (incoming.fetishesInto && incoming.fetishesInto.length > 0)
        ? incoming.fetishesInto
        : (prev.fetishesInto || []);
      const nextLimits = (incoming.fetishesLimits && incoming.fetishesLimits.length > 0)
        ? incoming.fetishesLimits
        : (prev.fetishesLimits || []);
      const nextGroups = (incoming.groups && incoming.groups.length > 0)
        ? incoming.groups
        : (prev.groups || []);

      const nextFetishesRaw = (!isPassed && nextInto.length === 0)
        ? (incoming.fetishesText || prev.fetishesRaw || prev.sections?.fetishes || '')
        : '';

      const hasAbout = typeof incoming.hasAbout === 'boolean'
        ? (incoming.hasAbout || Boolean(nextAbout || prevAbout))
        : Boolean(prev.hasAbout || nextAbout);

      const resolvedAge = normalizeValidAge(incoming.age) ?? normalizeValidAge(prev.age) ?? null;

      const storedEntry = {
        username: username || prev.username || null,
        aboutText: nextAbout,
        writingsText: nextWritings,
        headerText: nextHeader,
        fallbackText: (!nextAbout && !nextWritings) ? (incoming.nonFetishFullText || prev.fallbackText || '') : '',
        hasAbout,
        fetishesInto: isPassed ? [] : nextInto,
        fetishesLimits: nextLimits,
        fetishesRaw: nextFetishesRaw,
        age: resolvedAge,
        gender: nextGender,
        genderCategory: nextGenderCategory,
        genderRole: incoming.genderRole || prev.genderRole || null,
        location: resolvedLocation,
        relationships: resolvedRelationships,
        lookingFor: incoming.lookingFor || prev.lookingFor || null,
        groups: nextGroups,
        fetchedAt: Date.now()
      };

      cache[key] = storedEntry;
      this._write('fl_bio_cache', cache);

      const userPatch = {
        username: username || u.username || null,
        age: u.manualAge ?? resolvedAge ?? normalizeValidAge(u.age) ?? null,
        genderRole: storedEntry.genderRole || u.genderRole || null,
        location: storedEntry.location || u.location || null,
        relationships: storedEntry.relationships || u.relationships || null,
        lookingFor: storedEntry.lookingFor || u.lookingFor || null,
        groups: nextGroups.length > 0 ? nextGroups : (u.groups || [])
      };

      if (!u.manualGender) {
        userPatch.gender = storedEntry.gender || u.gender || null;
        userPatch.genderCategory = storedEntry.genderCategory || u.genderCategory || null;
      }

      this.setUser(key, userPatch);

      const hydrated = Object.assign({}, storedEntry);
      hydrated.text = buildCompositeSearchText(storedEntry);
      return hydrated;
    },
    clearBioCache() {
      this._write('fl_bio_cache', {});
    },
    exportAll() {
      return JSON.stringify({
        version: '1.17.2',
        exportedAt: new Date().toISOString(),
        settings: this.getSettings(),
        users: this.getAllUsers(),
        bioCache: this.getBioCache(),
        selfGroups: this.getSelfGroups(),
        selfProfile: this.getSelfProfile()
      }, null, 2);
    },
    importAll(jsonText) {
      const parsed = JSON.parse(jsonText);
      if (parsed.settings) this._write('fl_settings', Object.assign({}, DEFAULT_SETTINGS, parsed.settings));
      if (parsed.users) this._write('fl_users', parsed.users);
      if (parsed.bioCache) {
        this._write('fl_bio_cache', parsed.bioCache);
        this.compactAllStorage();
      }
      if (Array.isArray(parsed.selfGroups)) this._write('fl_self_groups', parsed.selfGroups);
      if (parsed.selfProfile) this._write('fl_self_profile', parsed.selfProfile);
    }
  };

  // =========================================================================
  // 5. SELF-IDENTITY DETECTOR, SCOPED DEMOGRAPHIC PARSER & DOM HELPERS
  // =========================================================================
  function hexToRgba(hex, alpha) {
    const clean = (hex || PALETTE.ui.accent).replace('#', '').trim();
    const full = clean.length === 3
      ? clean.split('').map(c => c + c).join('')
      : clean.padEnd(6, '0').slice(0, 6);
    const num = parseInt(full, 16);
    if (Number.isNaN(num)) return `rgba(122, 163, 184, ${alpha})`;
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

  function getSelfIdentity() {
    const storedSelf = Store.getSelfProfile();
    const flUser = window.FL && window.FL.user;
    const bodyAccountId = document.body?.dataset?.displayTimeZoneAccountIdValue;
    const selfId = (flUser && flUser.id ? String(flUser.id) : null) || bodyAccountId || storedSelf.id || null;

    let selfUsername = storedSelf.key || null;
    let displayUsername = storedSelf.username || null;

    const composerLink = document.querySelector('#feed-status-form a[href^="/"]');
    if (composerLink) {
      const p = parseUserHref(composerLink.getAttribute('href'));
      if (p && p.username) {
        selfUsername = p.key;
        displayUsername = p.username;
      }
    }

    if (!selfUsername && selfId) {
      const ownArticle = document.querySelector(`article[data-story-actor-id="${selfId}"][data-dwell-author-path]`);
      if (ownArticle) {
        const p = parseUserHref(ownArticle.dataset.dwellAuthorPath);
        if (p && p.username) {
          selfUsername = p.key;
          displayUsername = p.username;
        }
      }
    }

    if (!selfUsername) {
      const sidebar = document.getElementById('account-sidebar');
      if (sidebar) {
        const anchors = sidebar.getElementsByTagName('a');
        for (const a of anchors) {
          const parsed = parseUserHref(a.getAttribute('href'));
          if (parsed && parsed.username) {
            selfUsername = parsed.key;
            displayUsername = parsed.username;
            break;
          }
        }
      }
    }

    if ((selfId && selfId !== storedSelf.id) || (selfUsername && selfUsername !== storedSelf.key)) {
      Store.saveSelfProfile({
        id: selfId,
        key: selfUsername,
        username: displayUsername || selfUsername
      });
    }

    return { selfId, selfUsername, displayUsername };
  }

  function isCurrentProfileSelf(profilePage) {
    if (!profilePage) return false;
    const { selfId, selfUsername } = getSelfIdentity();
    if (selfUsername && profilePage.key === selfUsername) return true;
    if (selfId && profilePage.key === `users/${selfId}`) return true;

    const profileHeader = findProfileHeaderElement();
    if (profileHeader) {
      const links = profileHeader.getElementsByTagName('a');
      for (const a of links) {
        const href = (a.getAttribute('href') || '').trim();
        const text = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (href === '/settings/profile' || /^edit\s+profile$/i.test(text)) {
          Store.saveSelfProfile({
            key: profilePage.key,
            username: profilePage.username || profilePage.key
          });
          return true;
        }
      }
    }
    return false;
  }

  function isLikelyDemoBadgeString(str) {
    if (!str) return false;
    if (/^\d+\s*(s|m|h|d|w|mo|y|sec|min|hr|day|wk|yr|going|interested|loves?|comments?|friends?|followers?|pictures?|videos?|writings?)\b/i.test(str)) {
      return false;
    }
    return true;
  }

  function parseDemographicsFromContainer(container) {
    let age = null;
    let rawGenderToken = null;
    let genderRole = null;
    let explicitGenderRow = '';
    let explicitAgeRow = null;
    let relationships = null;
    let orientation = null;
    let lookingFor = null;
    const locationParts = [];

    const isArticle = container.tagName === 'ARTICLE';
    const scanRoot = (isArticle && container.querySelector('header'))
      ? container.querySelector('header')
      : container;

    const isInsideExcludedSubtree = (node) => {
      const el = node.nodeType === 1 ? node : node.parentElement;
      if (!el) return true;
      if (el.closest('.flx-toolbar, .flx-profile-bar, .flx-chat-context, script, style, time, blockquote, pre, code')) {
        return true;
      }
      if (isArticle && el.closest('ul, ol, li, .story__copy, [data-controller="continue-reading"], footer')) {
        return true;
      }
      return false;
    };

    const anchors = scanRoot.getElementsByTagName('a');
    for (const a of anchors) {
      if (isInsideExcludedSubtree(a)) continue;
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/p/')) {
        const locLabel = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (locLabel && !locationParts.includes(locLabel)) {
          locationParts.push(locLabel);
        }
      }
    }

    const divs = scanRoot.getElementsByTagName('div');
    for (const d of divs) {
      if (isInsideExcludedSubtree(d)) continue;
      if (d.children.length === 0 && d.nextElementSibling) {
        const label = (d.textContent || '').replace(/\s+/g, ' ').trim();
        const val = (d.nextElementSibling.textContent || '').replace(/\s+/g, ' ').trim();
        if (!val) continue;

        if (/^gender$/i.test(label)) {
          explicitGenderRow = val;
        } else if (/^age$/i.test(label)) {
          explicitAgeRow = normalizeValidAge(val);
        } else if (/^relationships?$/i.test(label)) {
          relationships = val;
        } else if (/^orientation$/i.test(label)) {
          orientation = val;
        } else if (/^looking\s+for$/i.test(label)) {
          lookingFor = val;
        }
      }
    }

    const candidateStrings = [];
    const walker = document.createTreeWalker(scanRoot, NodeFilter.SHOW_TEXT, null);
    let txtNode;
    while ((txtNode = walker.nextNode())) {
      if (isInsideExcludedSubtree(txtNode)) continue;
      const parentEl = txtNode.parentElement;
      if (parentEl && parentEl.closest('a[href^="/p/"]')) continue;
      const val = (txtNode.nodeValue || '').replace(/\s+/g, ' ').trim();
      if (val.length >= 2 && val.length <= 80) {
        candidateStrings.push(val);
      }
    }

    const spans = scanRoot.querySelectorAll('span, div, p, small, header, a');
    for (const sp of spans) {
      if (isInsideExcludedSubtree(sp)) continue;
      const titleAttr = sp.getAttribute && (sp.getAttribute('title') || sp.getAttribute('aria-label'));
      if (titleAttr && titleAttr.length >= 2 && titleAttr.length <= 80) {
        candidateStrings.push(titleAttr.trim());
      }
      if (sp.children.length <= 5) {
        const spacedText = Array.from(sp.childNodes)
          .map(n => (n.textContent || '').trim())
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (spacedText.length >= 2 && spacedText.length <= 100) {
          candidateStrings.push(spacedText);
        }
      }
    }

    for (const rawSeg of candidateStrings) {
      const subParts = rawSeg.split(/\r?\n|·|•|\|/).map(s => s.trim()).filter(Boolean);
      for (const seg of subParts) {
        if (!isLikelyDemoBadgeString(seg)) continue;
        const extracted = extractAgeGenderFromText(seg);
        if (extracted.age !== null && extracted.genderToken) {
          age = extracted.age;
          rawGenderToken = extracted.genderToken;
          genderRole = extracted.genderRole;
        }
        if (locationParts.length === 0) {
          const locMatch = seg.match(GENERIC_LOCATION_TEXT_RE);
          if (locMatch && locMatch[1]) {
            locationParts.push(locMatch[1].trim());
          }
        }
      }
    }

    if (age === null && explicitAgeRow !== null) {
      age = explicitAgeRow;
    }

    const classified = classifyGenderToken(rawGenderToken, explicitGenderRow);

    return {
      age,
      gender: classified.gender,
      genderCategory: classified.genderCategory,
      genderRole,
      location: locationParts.length > 0 ? locationParts.slice(0, 2).join(', ') : null,
      relationships,
      orientation,
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
        if (child.nodeType === 3) title += child.nodeValue;
      }
      title = title.replace(/\s+/g, ' ').trim();
      if (!title) {
        const clone = a.cloneNode(true);
        clone.querySelectorAll('div, span').forEach(n => n.remove());
        title = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      }
      if (title && !groups.includes(title)) groups.push(title);
    }
    return groups;
  }

  function getSharedOrNotableGroups(userGroups) {
    if (!Array.isArray(userGroups) || userGroups.length === 0) return [];
    const selfGroups = new Set(Store.getSelfGroups().map(g => g.toLowerCase()));
    return userGroups.filter(g => g.toLowerCase() !== 'fetlife announcements' && selfGroups.has(g.toLowerCase()));
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
          if (tabHrefParsed) activeView = tabHrefParsed.subtab || 'about';
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
    if (container.tagName === 'ARTICLE' && container.dataset && container.dataset.dwellAuthorPath) {
      const dwellParsed = parseUserHref(container.dataset.dwellAuthorPath);
      if (dwellParsed && dwellParsed.username) {
        const demos = parseDemographicsFromContainer(container);
        return { key: dwellParsed.key, username: dwellParsed.username, profileUrl: dwellParsed.url, demographics: demos };
      }
    }

    let username = initialParsed.username || cleanHandleCandidate(link.textContent);

    const headerScope = container.tagName === 'ARTICLE'
      ? (container.querySelector('header') || link.parentElement || container)
      : (link.parentElement || container);

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
      return { key: username.toLowerCase(), username, profileUrl: `${window.location.origin}/${username}`, demographics: demos };
    }
    return { key: initialParsed.key, username: null, profileUrl: initialParsed.url, demographics: demos };
  }

  function containsEditableComposer(el) {
    if (!el || el.nodeType !== 1) return false;
    return Boolean(el.querySelector('textarea, lexxy-editor, [contenteditable="true"], input[type="text"], input[type="search"]'));
  }

  function findPostOrCardContainer(link, root) {
    if (link.closest('p, blockquote, pre, code, form, label, dialog, #feed-status-form')) return null;

    const listItem = link.closest('li');
    if (listItem && root.contains(listItem)) {
      if (containsEditableComposer(listItem)) return null;
      const liAnchors = listItem.getElementsByTagName('a');
      for (const a of liAnchors) {
        if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote, form')) continue;
        if (parseUserHref(a.getAttribute('href'))) {
          return a === link ? listItem : null;
        }
      }
      return null;
    }

    const article = link.closest('article');
    if (article && root.contains(article)) {
      if (containsEditableComposer(article)) return null;
      const allAnchors = article.getElementsByTagName('a');
      for (const a of allAnchors) {
        if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote, form, li')) continue;
        if (parseUserHref(a.getAttribute('href'))) {
          return a === link ? article : null;
        }
      }
      return null;
    }

    const masonry = link.closest('fl-masonry');
    if (masonry && root.contains(masonry)) {
      let tile = link.parentElement;
      while (tile && tile.parentElement && tile.parentElement !== masonry && tile.parentElement.parentElement !== masonry) {
        tile = tile.parentElement;
      }
      if (tile && tile !== masonry && !containsEditableComposer(tile)) {
        const anchors = tile.getElementsByTagName('a');
        for (const a of anchors) {
          if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote, form')) continue;
          if (parseUserHref(a.getAttribute('href'))) {
            return a === link ? tile : null;
          }
        }
      }
    }

    let el = link.parentElement;
    let bestSingleCard = null;
    let depth = 0;

    while (el && el !== root && el !== document.body && depth < 7) {
      if (containsEditableComposer(el)) break;
      if (el.dataset && el.dataset.flxUser) {
        return el.dataset.flxLinkHref === link.getAttribute('href') ? el : null;
      }

      const distinctKeys = new Set();
      let firstUserAnchor = null;
      const anchors = el.getElementsByTagName('a');

      for (const a of anchors) {
        if (a.closest('.flx-toolbar, .flx-profile-bar, p, blockquote, form')) continue;
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
        if (textLen > 1 && el.tagName !== 'A') bestSingleCard = el;
      } else if (effectiveUsers > 1) {
        if (bestSingleCard) return bestSingleCard;
        const isTopLevelList = el.parentElement === root || el.children.length > 8;
        if (!isTopLevelList && firstUserAnchor === link) return el;
        break;
      }

      el = el.parentElement;
      depth++;
    }

    return bestSingleCard;
  }

  // =========================================================================
  // 6. PROFILE, ABOUT (WITH NEWLINES), ATOMIC LIMITS & FETISH PARSER
  // =========================================================================
  function cleanSectionText(raw) {
    return (raw || '')
      .replace(/\s+/g, ' ')
      .replace(/^(nothing written yet\.?|hasn['’]t written anything yet\.?|no bio\.?)$/i, '')
      .trim();
  }

  function extractCopyBlockTextWithLines(el) {
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

    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
    clone.querySelectorAll('p, div, li, h1, h2, h3, h4, h5, h6, tr, blockquote').forEach(block => {
      block.prepend('\n');
      block.append('\n');
    });

    return (clone.textContent || '')
      .replace(/\r/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^(nothing written yet\.?|hasn['’]t written anything yet\.?|no bio\.?)$/i, '')
      .trim();
  }

  function extractLimitsFromProfileText(aboutText, fallbackProfileText = '') {
    const source = [aboutText || '', fallbackProfileText || ''].filter(Boolean).join('\n');
    if (!source) return [];

    const results = [];
    const seen = new Set();

    const addCandidate = (rawItem) => {
      const valid = sanitizeTwoWordTerm(rawItem);
      if (!valid) return;
      const key = normalizeTermKey(valid);
      if (!seen.has(key)) {
        seen.add(key);
        results.push(valid);
      }
    };

    const splitAndAddClause = (clause) => {
      if (!clause) return;
      const stripped = clause
        .replace(/\([^)]*\)/g, ' ')
        .replace(/["“”][^"“”]*["“”]/g, ' ')
        .split(/[.;—–]/)[0] || '';

      const tokens = stripped.split(/,|\/|\||•|\band\b|\bor\b|\bnor\b/i);
      for (const tok of tokens) addCandidate(tok);
    };

    const lines = source.split(/\n+/).map(l => l.trim()).filter(Boolean);

    const INLINE_LABEL_RE = /^(?:my\s+)?(?:hard\s+and\s+soft\s+limits?|hard\s+limits?|soft\s+limits?|limits?|hard\s+nos?|hard\s+passes|not\s+into|things?\s+i['’]?m\s+not\s+into|deal\s*breakers?|turn\s*offs?|will\s+not\s+do|won['’]?t\s+do|off\s+the\s+table)(?:\s*(?:\([^)]{1,48}\)|&[^:–—-]{1,32}))?\s*(?:include|are|:|-|–|—)\s*(.+)$/i;
    const STANDALONE_HEADING_RE = /^(?:my\s+)?(?:hard\s+and\s+soft\s+limits?|hard\s+limits?|soft\s+limits?|limits?|hard\s+nos?|hard\s+passes|not\s+into|deal\s*breakers?|turn\s*offs?)(?:\s*(?:\([^)]{1,48}\)|&[^:]{1,32}))?\s*:?$/i;
    const NEXT_SECTION_HEADING_RE = /^(?:about(?:\s+me)?|into|curious|likes?|loves?|favou?rites?|yes(?:es)?|looking\s+for|seeking|turn\s*ons?|kinks?|fetishes|fantasies|bio|summary|rules|expectations|message\s+me|connecting|in\s+the\s+bedroom|sti\s+status)\b/i;

    let inLimitListBlock = false;
    let listLinesCaptured = 0;

    for (const line of lines) {
      const inlineMatch = line.match(INLINE_LABEL_RE);
      if (inlineMatch) {
        splitAndAddClause(inlineMatch[1]);
        inLimitListBlock = false;
        continue;
      }

      if (STANDALONE_HEADING_RE.test(line)) {
        inLimitListBlock = true;
        listLinesCaptured = 0;
        continue;
      }

      if (inLimitListBlock) {
        if (
          NEXT_SECTION_HEADING_RE.test(line) ||
          (line.endsWith(':') && line.length < 36) ||
          listLinesCaptured >= 12
        ) {
          inLimitListBlock = false;
          continue;
        }

        const colonIdx = line.indexOf(':');
        if (colonIdx > 2 && colonIdx < 40) {
          const leftLabel = line.slice(0, colonIdx).trim();
          const rightItems = line.slice(colonIdx + 1).trim();
          addCandidate(leftLabel);

          const semiParts = rightItems.split(';');
          splitAndAddClause(semiParts[0]);
          for (let i = 1; i < semiParts.length; i++) {
            if (/\b(?:no|zero)\b/i.test(semiParts[i])) splitAndAddClause(semiParts[i]);
          }
          listLinesCaptured++;
          continue;
        }

        const isBulletOrShortItem = /^[-•*▪▫‧‒>]/.test(line) || line.length <= 85;
        if (isBulletOrShortItem) {
          splitAndAddClause(line);
          listLinesCaptured++;
        } else {
          inLimitListBlock = false;
        }
      }
    }

    return results.slice(0, 40);
  }

  function stripLimitsFromProseForExcludeScan(aboutText) {
    if (!aboutText) return '';
    const INLINE_LABEL_RE = /^(?:my\s+)?(?:hard\s+and\s+soft\s+limits?|hard\s+limits?|soft\s+limits?|limits?|hard\s+nos?|hard\s+passes|not\s+into|things?\s+i['’]?m\s+not\s+into|deal\s*breakers?|turn\s*offs?|will\s+not\s+do|won['’]?t\s+do|off\s+the\s+table)(?:\s*(?:\([^)]{1,48}\)|&[^:–—-]{1,32}))?\s*(?:include|are|:|-|–|—)/i;
    const STANDALONE_HEADING_RE = /^(?:my\s+)?(?:hard\s+and\s+soft\s+limits?|hard\s+limits?|soft\s+limits?|limits?|hard\s+nos?|hard\s+passes|not\s+into|deal\s*breakers?|turn\s*offs?)(?:\s*(?:\([^)]{1,48}\)|&[^:]{1,32}))?\s*:?$/i;
    const NEXT_SECTION_HEADING_RE = /^(?:about(?:\s+me)?|into|curious|likes?|loves?|favou?rites?|yes(?:es)?|looking\s+for|seeking|turn\s*ons?|kinks?|fetishes|fantasies|bio|summary|rules|expectations|message\s+me|connecting|in\s+the\s+bedroom|sti\s+status)\b/i;

    const kept = [];
    let inLimitBlock = false;
    for (const rawLine of aboutText.split(/\n+/)) {
      const line = rawLine.trim();
      if (!line) continue;
      if (INLINE_LABEL_RE.test(line)) {
        inLimitBlock = false;
        continue;
      }
      if (STANDALONE_HEADING_RE.test(line)) {
        inLimitBlock = true;
        continue;
      }
      if (inLimitBlock) {
        if (NEXT_SECTION_HEADING_RE.test(line) || (line.endsWith(':') && line.length < 36)) {
          inLimitBlock = false;
        } else {
          continue;
        }
      }
      const scrubbed = line.replace(/\b(?:no|not\s+into|hard\s+pass\s+on|strictly\s+no|absolutely\s+no)\s+[^.!?\n]{2,90}/gi, '');
      kept.push(scrubbed);
    }
    return kept.join(' ');
  }

  function parseFetishesContainer(rootEl) {
    const into = [];
    const limits = [];
    if (!rootEl) return { fetishesInto: into, fetishesLimits: limits, fetishesText: '' };

    const rawText = (rootEl.textContent || '').replace(/\s+/g, ' ').trim();
    if (!rawText || rawText.length < 4) return { fetishesInto: into, fetishesLimits: limits, fetishesText: '' };

    const anchors = rootEl.getElementsByTagName('a');
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      if (href.startsWith('/fetishes/') || href.startsWith('/kinks/') || href.startsWith('/tags/')) {
        const item = (a.textContent || '').replace(/\s+/g, ' ').trim();
        if (item && item.length < 60 && !/^(edit|learn more|see all|show more)$/i.test(item)) {
          if (!into.includes(item)) into.push(item);
        }
      }
    }

    return { fetishesInto: into, fetishesLimits: limits, fetishesText: rawText };
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
        cls.includes('flx-chat-context') ||
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
        nonFetishFullText: '', aboutText: '', hasAbout: null, fetishesText: '',
        fetishesInto: [], fetishesLimits: [], writingsText: '', headerText: '',
        age: null, gender: null, genderCategory: null, genderRole: null,
        location: null, relationships: null, orientation: null, lookingFor: null, groups: []
      };
    }

    const profileHeader = findProfileHeaderElement();
    const demos = profileHeader
      ? parseDemographicsFromContainer(profileHeader)
      : parseDemographicsFromContainer(scope);

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
          const candidate = extractCopyBlockTextWithLines(sib);
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
          const candidate = extractCopyBlockTextWithLines(h2.nextElementSibling);
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
      writingsText = extractCopyBlockTextWithLines(wClone);
    }

    const cleanScope = sanitizeProfileClone(scope, true);
    const nonFetishFullText = extractCopyBlockTextWithLines(cleanScope);

    const limitSourceFallback = (activeView === 'about' && !aboutText) ? nonFetishFullText : '';
    const extractedProfileLimits = extractLimitsFromProfileText(aboutText, limitSourceFallback);
    const combinedLimits = Array.from(new Set([...parsedFetishes.fetishesLimits, ...extractedProfileLimits]));

    return {
      nonFetishFullText: cleanSectionText(nonFetishFullText),
      aboutText,
      hasAbout,
      fetishesText: parsedFetishes.fetishesText,
      fetishesInto: parsedFetishes.fetishesInto,
      fetishesLimits: combinedLimits,
      writingsText,
      headerText,
      age: demos.age,
      gender: demos.gender,
      genderCategory: demos.genderCategory,
      genderRole: demos.genderRole,
      location: demos.location,
      relationships: demos.relationships,
      orientation: demos.orientation,
      lookingFor: demos.lookingFor,
      groups
    };
  }

  // =========================================================================
  // 7. RULE MATCHING, LIMIT CONFLICTS & DEMOGRAPHIC / LOCATION / REL FILTERING
  // =========================================================================
  function getExcludeSearchText(cachedBio, cardText = '') {
    const parts = [];
    if (cardText) parts.push(cardText);
    if (cachedBio) {
      if (Array.isArray(cachedBio.fetishesInto) && cachedBio.fetishesInto.length > 0) {
        parts.push(cachedBio.fetishesInto.join(' | '));
      } else if (cachedBio.sections && typeof cachedBio.sections.fetishesInto === 'string') {
        parts.push(cachedBio.sections.fetishesInto);
      }
      if (cachedBio.headerText) parts.push(cachedBio.headerText);
      if (cachedBio.aboutText) parts.push(stripLimitsFromProseForExcludeScan(cachedBio.aboutText));
    }
    return parts.join(' \n ');
  }

  function findSimpleMatches(text, keywords) {
    if (!keywords || keywords.length === 0) return [];
    const lower = (text || '').toLowerCase();
    const seen = new Set();
    const hits = [];
    for (const kw of keywords) {
      if (!kw) continue;
      const norm = normalizeTermKey(kw);
      if (norm && !seen.has(norm) && lower.includes(kw.toLowerCase())) {
        seen.add(norm);
        hits.push(kw);
      }
    }
    return hits;
  }

  function findRuleMatches(cardText, cachedPositiveText, rules) {
    if (!rules || rules.length === 0) return [];
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
          color: rule.color || PALETTE.ui.accent,
          keyword: matchedKw,
          fromCache
        });
      }
    }
    return hits;
  }

  function findLimitConflicts(limitsList, rules) {
    if (!Array.isArray(limitsList) || limitsList.length === 0 || !rules || rules.length === 0) return [];
    const lowerLimits = limitsList.join(' | ').toLowerCase();
    const conflicts = [];
    const seenTypes = new Set();

    for (const rule of rules) {
      if (!rule || !Array.isArray(rule.keywords)) continue;
      const typeKey = (rule.id || rule.label || '').toLowerCase();
      if (typeKey && seenTypes.has(typeKey)) continue;

      for (const kw of rule.keywords) {
        if (!kw || kw.length < 2) continue;
        if (lowerLimits.includes(kw.toLowerCase())) {
          if (typeKey) seenTypes.add(typeKey);
          conflicts.push({ label: rule.label || 'Limit', keyword: kw });
          break;
        }
      }
    }
    return conflicts;
  }

  function isAgeOutOfRange(age, settings) {
    if (!settings.filterByAge) return false;
    const numericAge = normalizeValidAge(age);
    if (numericAge === null) return false;
    const min = normalizeValidAge(settings.minAge) ?? 18;
    const max = normalizeValidAge(settings.maxAge) ?? 99;
    return numericAge < min || numericAge > max;
  }

  function isGenderRejected(genderCategory, settings) {
    return !isGenderAllowedBySettings(genderCategory, settings);
  }

  function isNonLocalRejected(location, settings, isExploreTile = false) {
    if (!settings.localOnlyFilter) return false;
    const cleanLoc = (location || '').trim();
    if (cleanLoc) {
      return !isLocationLocal(cleanLoc, settings);
    }
    if (isExploreTile && settings.allowUnknownLocationOnExplore) {
      return false;
    }
    return false;
  }

  function isRelationshipRejected(relationships, settings) {
    const target = settings.relationshipFilter || 'all';
    if (target === 'all') return false;
    const relClass = classifyRelationshipStatus(relationships);
    if (!relClass) return false;
    return relClass !== target;
  }

  // =========================================================================
  // 8. SHARED UI COMPONENTS & OVERLAY ENGINE
  // =========================================================================
  function createMatchDotsCluster(ruleHits, limitConflicts = [], excludedHits = []) {
    if (!ruleHits || ruleHits.length === 0) return null;
    const wrap = document.createElement('span');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);';

    const tooltipLines = ruleHits.map(h => `${h.label}: ${h.keyword}`);
    if (limitConflicts.length > 0) tooltipLines.push(`⚠ Limits: ${limitConflicts.map(c => c.keyword).join(', ')}`);
    if (excludedHits.length > 0) tooltipLines.push(`Excludes: -${excludedHits.join(', -')}`);
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
    const validAge = normalizeValidAge(age);
    if (genderRole) {
      const hasLeadingAge = /^\d{2}\b/.test(genderRole.trim());
      const roleWithAge = (!hasLeadingAge && validAge !== null) ? `${validAge} ${genderRole}` : genderRole;
      parts.push(isManualGender ? `${roleWithAge} (${gender})` : roleWithAge);
    } else {
      const head = [validAge !== null ? String(validAge) : '', gender || ''].filter(Boolean).join(' • ');
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
        pill.style.cssText = `font-size:11px;color:${PALETTE.ui.accent};background:rgba(122, 163, 184, 0.16);border:1px solid rgba(122, 163, 184, 0.38);padding:1px 6px;border-radius:4px;font-weight:500;`;
      } else if (genderCategory === 'other') {
        pill.style.cssText = `font-size:11px;color:${PALETTE.ui.cool};background:rgba(138, 184, 150, 0.16);border:1px solid rgba(138, 184, 150, 0.38);padding:1px 6px;border-radius:4px;font-weight:500;`;
      } else {
        pill.style.cssText = `font-size:11px;color:${PALETTE.ui.warm};background:rgba(212, 168, 67, 0.14);border:1px solid rgba(212, 168, 67, 0.35);padding:1px 6px;border-radius:4px;font-weight:500;`;
      }
    } else {
      pill.style.cssText = `font-size:11px;color:${PALETTE.ui.text.secondary};background:rgba(148, 163, 184, 0.12);border:1px solid rgba(148, 163, 184, 0.25);padding:1px 6px;border-radius:4px;font-weight:500;`;
    }
    pill.textContent = summary;
    return pill;
  }

  function buildGenderSelect(record, autoGenderObj, onSelectChange, compact = false) {
    const sel = document.createElement('select');
    const mg = record.manualGender || '';

    if (mg === 'female') {
      sel.style.cssText = `background:rgba(212, 168, 67, 0.18);color:${PALETTE.ui.warm};border:1px solid #9a7b2e;border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;font-weight:600;`;
    } else if (mg === 'male') {
      sel.style.cssText = `background:rgba(122, 163, 184, 0.18);color:${PALETTE.ui.accent};border:1px solid #4a6b7d;border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;font-weight:600;`;
    } else if (mg === 'other') {
      sel.style.cssText = `background:rgba(138, 184, 150, 0.18);color:${PALETTE.ui.cool};border:1px solid #5a7d62;border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;font-weight:600;`;
    } else {
      sel.style.cssText = `background:#202024;color:${PALETTE.ui.text.muted};border:1px solid #3f3f46;border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;`;
    }

    sel.title = 'Override Gender';

    const cat = autoGenderObj?.genderCategory;
    const autoHint = cat === 'female' ? '♀' : (cat === 'male' ? '♂' : (cat === 'other' ? ' transgender' : '?'));

    const opts = [
      { val: '',       text: compact ? `G:${autoHint}` : `Gender: Auto (${autoHint})`, color: PALETTE.ui.text.primary },
      { val: 'female', text: compact ? '♀ F' : '♀ Female',                             color: PALETTE.ui.warm },
      { val: 'male',   text: compact ? '♂ M' : '♂ Male',                               color: PALETTE.ui.accent },
      { val: 'other',  text: compact ? ' transgender Oth' : ' transgender Other',                            color: PALETTE.ui.cool }
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

    sel.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); });
    sel.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectChange(e.target.value || null);
    });

    return sel;
  }

  function applyCardAccentStyle(el, status, ruleHits, isFilteredOut, settings) {
    const targetBox = (el.tagName === 'ARTICLE' && el.firstElementChild && el.firstElementChild.tagName === 'DIV')
      ? el.firstElementChild
      : el;

    el.style.opacity = '';
    el.style.height = '';
    el.style.minHeight = '';
    el.style.maxHeight = '';
    el.style.overflow = '';
    el.style.margin = '';
    el.style.padding = '';
    el.style.border = '';
    el.style.pointerEvents = '';
    el.style.visibility = '';
    targetBox.style.outline = '';
    targetBox.style.borderLeft = '';
    targetBox.style.backgroundColor = '';
    targetBox.style.boxShadow = '';

    if (isFilteredOut && !settings.showHidden) {
      if (settings.hideMode === 'remove') {
        el.style.height = '0px';
        el.style.minHeight = '0px';
        el.style.maxHeight = '0px';
        el.style.overflow = 'hidden';
        el.style.margin = '0px';
        el.style.padding = '0px';
        el.style.border = 'none';
        el.style.opacity = '0';
        el.style.visibility = 'hidden';
        el.style.pointerEvents = 'none';
      } else {
        el.style.opacity = String(settings.dimOpacity);
      }
      return;
    }

    if (ruleHits.length > 0) {
      const primary = ruleHits[0];
      targetBox.style.outline = `1px solid ${hexToRgba(primary.color, 0.75)}`;
      if (ruleHits.length >= 2) {
        const secondary = ruleHits[1];
        targetBox.style.boxShadow = `inset 0 2px 0 0 ${primary.color}, inset 0 -2px 0 0 ${secondary.color}`;
      }
    }

    const stageDef = status ? STAGE_MAP[status] : null;
    if (stageDef && status !== 'hidden') {
      targetBox.style.borderLeft = `4px solid ${stageDef.color}`;
      if (ruleHits.length === 0) targetBox.style.outline = `1px solid ${stageDef.border}`;
    }
  }

  function isInlineFlexRowItem(container) {
    if (!container || container.nodeType !== 1) return false;
    const cs = window.getComputedStyle(container);
    return (cs.display === 'flex' || cs.display === 'inline-flex') &&
      (cs.flexDirection === 'row' || cs.flexDirection === 'row-reverse');
  }

  function buildToolbar(userKey, settings, onUpdate, options = {}) {
    const {
      viewMode = 'full',
      isProfileBar = false,
      displayHandle = null,
      demos = null,
      isInlineRow = false,
      onToggleCardView = null
    } = options;

    const record = Store.getUser(userKey);
    const isMinimal = !isProfileBar && (viewMode === 'minimal' || isInlineRow);
    const isCompact = !isProfileBar && viewMode === 'compact';
    const compactControls = !isProfileBar && (isCompact || isMinimal);

    const bar = document.createElement('div');
    bar.className = 'flx-toolbar';

    if (isProfileBar) bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:0;flex:1 1 auto;background:transparent;border:none;padding:0;font-family:system-ui,-apple-system,sans-serif;';
    else if (isInlineRow) bar.style.cssText = 'display:inline-flex;flex-wrap:nowrap;align-items:center;gap:4px;margin-left:auto;padding:1px 6px;flex:0 0 auto;background:rgba(20,20,25,0.88);border:1px solid #2e2e38;border-radius:5px;font-family:system-ui,-apple-system,sans-serif;z-index:5;';
    else if (isMinimal) bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:2px 0 6px 0;padding:2px 6px;width:100%;box-sizing:border-box;background:rgba(20,20,25,0.82);border:1px solid rgba(63,63,70,0.6);border-radius:5px;font-family:system-ui,-apple-system,sans-serif;';
    else if (isCompact) bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:2px 0 6px 0;padding:3px 7px;width:100%;box-sizing:border-box;background:rgba(22,22,27,0.88);border:1px solid #2e2e38;border-radius:6px;font-family:system-ui,-apple-system,sans-serif;';
    else bar.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:2px 0 8px 0;padding:4px 8px;width:100%;box-sizing:border-box;background:rgba(20,20,25,0.92);border:1px solid #2e2e38;border-radius:6px;font-family:system-ui,-apple-system,sans-serif;';

    const stopNav = (e) => { e.preventDefault(); e.stopPropagation(); };

    const persistMeta = (patch) => {
      const cur = Store.getUser(userKey);
      const baseMeta = {
        username: displayHandle || cur.username || null,
        age: cur.manualAge ?? normalizeValidAge(demos?.age) ?? normalizeValidAge(cur.age) ?? null,
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

    const baseBtnStyle = isMinimal
      ? `background:#202024;color:${PALETTE.ui.text.secondary};border:1px solid #3f3f46;border-radius:4px;padding:1px 5px;cursor:pointer;font-size:10px;line-height:1.35;`
      : `background:#202024;color:${PALETTE.ui.text.secondary};border:1px solid #3f3f46;border-radius:5px;padding:1px 6px;cursor:pointer;font-size:11px;line-height:1.4;`;

    if (!isProfileBar && !isInlineRow && typeof onToggleCardView === 'function') {
      const viewToggleBtn = document.createElement('button');
      viewToggleBtn.type = 'button';
      viewToggleBtn.style.cssText = isMinimal
        ? `${baseBtnStyle}background:rgba(122, 163, 184, 0.14);border-color:#4a6b7d;color:${PALETTE.ui.accent};font-weight:700;`
        : `${baseBtnStyle}color:${PALETTE.ui.text.muted};`;
      viewToggleBtn.textContent = isMinimal ? '▸' : '▾';
      viewToggleBtn.title = isMinimal ? 'Expand overlay to Full view (M)' : 'Condense overlay to Minimal strip (M)';
      viewToggleBtn.addEventListener('click', (e) => { stopNav(e); onToggleCardView(); });
      bar.appendChild(viewToggleBtn);
    }

    const isStarred = record.status === 'shortlist';
    const starBtn = document.createElement('button');
    starBtn.type = 'button';
    starBtn.style.cssText = isStarred ? `${baseBtnStyle}background:rgba(212, 168, 67, 0.18);border-color:#9a7b2e;color:${PALETTE.ui.warm};font-weight:600;` : baseBtnStyle;
    starBtn.textContent = compactControls ? (isStarred ? '★' : '☆') : (isStarred ? '★ Shortlisted' : '☆ Shortlist');
    starBtn.title = 'Toggle Shortlist';
    starBtn.addEventListener('click', (e) => { stopNav(e); persistMeta({ status: isStarred ? null : 'shortlist' }); });

    const stageSelect = document.createElement('select');
    const activeStage = record.status ? STAGE_MAP[record.status] : null;
    stageSelect.style.cssText = activeStage
      ? `background:${activeStage.bg};color:${activeStage.color};border:1px solid ${activeStage.border};border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;font-weight:600;`
      : `background:#202024;color:${PALETTE.ui.text.muted};border:1px solid #3f3f46;border-radius:5px;padding:1px 4px;font-size:10px;cursor:pointer;`;
    stageSelect.title = 'Vetting Pipeline Stage';

    const noneOpt = document.createElement('option');
    noneOpt.value = '';
    noneOpt.textContent = compactControls ? 'Stage…' : 'Stage: None';
    noneOpt.style.background = '#18181b';
    noneOpt.style.color = PALETTE.ui.text.primary;
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
    stageSelect.addEventListener('change', (e) => { stopNav(e); persistMeta({ status: e.target.value || null }); });

    const genderSelect = buildGenderSelect(
      record,
      demos?.autoDetected || null,
      (nextManualGender) => persistMeta({ manualGender: nextManualGender }),
      compactControls
    );

    const curAge = normalizeValidAge(record.manualAge) ?? normalizeValidAge(demos?.age) ?? normalizeValidAge(record.age);
    const ageBtn = document.createElement('button');
    ageBtn.type = 'button';
    const ageOut = isAgeOutOfRange(curAge, settings);
    ageBtn.style.cssText = ageOut
      ? `${baseBtnStyle}background:rgba(201, 122, 107, 0.16);border-color:#8b4f44;color:${PALETTE.ui.warn};font-weight:600;`
      : (curAge !== null ? `${baseBtnStyle}color:${PALETTE.ui.text.secondary};` : `${baseBtnStyle}color:${PALETTE.ui.text.muted};`);
    ageBtn.textContent = curAge !== null ? `${curAge}y` : 'Age?';
    ageBtn.title = 'Click to set or override age (18-99), or leave blank to reset to auto';
    ageBtn.addEventListener('click', (e) => {
      stopNav(e);
      const raw = window.prompt(
        `Set manual age (18–99) for /${displayHandle || userKey} (leave blank to reset to auto):`,
        curAge !== null ? String(curAge) : ''
      );
      if (raw === null) return;
      const parsedAge = normalizeValidAge(raw);
      persistMeta({ manualAge: parsedAge, age: parsedAge });
    });

    const isPassed = record.status === 'hidden';
    const passBtn = document.createElement('button');
    passBtn.type = 'button';
    passBtn.style.cssText = isPassed ? `${baseBtnStyle}background:rgba(201, 122, 107, 0.18);border-color:#8b4f44;color:${PALETTE.ui.warn};font-weight:600;` : baseBtnStyle;
    passBtn.textContent = compactControls ? '✕' : (isPassed ? '✕ Passed' : '✕ Pass');
    passBtn.title = 'Pass / Hide Profile';
    passBtn.addEventListener('click', (e) => { stopNav(e); persistMeta({ status: isPassed ? null : 'hidden' }); });

    const noteBtn = document.createElement('button');
    noteBtn.type = 'button';
    noteBtn.style.cssText = record.note
      ? `${baseBtnStyle}background:rgba(212, 168, 55, 0.15);border-color:#9a7b2e;color:${PALETTE.ui.note};`
      : baseBtnStyle;
    noteBtn.textContent = compactControls ? '✎' : (record.note ? '✎ Edit Note' : '✎ Note');
    noteBtn.title = record.note ? `Private Note: ${record.note}` : 'Edit Private Note';
    noteBtn.addEventListener('click', (e) => {
      stopNav(e);
      const cur = Store.getUser(userKey);
      const nextNote = window.prompt(`Private note for ${displayHandle || userKey}:`, cur.note || '');
      if (nextNote !== null) persistMeta({ note: nextNote.trim() });
    });

    if (isMinimal) {
      bar.append(starBtn, passBtn, noteBtn, genderSelect, ageBtn);
    } else {
      bar.append(starBtn, stageSelect, genderSelect, ageBtn, passBtn, noteBtn);
    }

    if (!isInlineRow && (isProfileBar || viewMode === 'full')) {
      if (record.isFriend) {
        const fBadge = document.createElement('span');
        fBadge.style.cssText = `font-size:10px;color:${PALETTE.ui.friend};padding:1px 5px;background:rgba(138, 184, 150, 0.14);border:1px solid rgba(138, 184, 150, 0.35);border-radius:4px;font-weight:600;`;
        fBadge.textContent = '★ Friend';
        bar.appendChild(fBadge);
      } else if (record.isFollowing) {
        const folBadge = document.createElement('span');
        folBadge.style.cssText = `font-size:10px;color:${PALETTE.ui.follow};padding:1px 5px;background:rgba(122, 163, 184, 0.12);border:1px solid rgba(122, 163, 184, 0.3);border-radius:4px;`;
        folBadge.textContent = '✓ Following';
        bar.appendChild(folBadge);
      }

      if (record.lastContacted && record.status !== 'hidden') {
        const contacted = document.createElement('span');
        contacted.style.cssText = `font-size:10px;color:${PALETTE.ui.follow};padding:1px 5px;background:rgba(122, 163, 184, 0.1);border:1px solid rgba(122, 163, 184, 0.28);border-radius:4px;`;
        contacted.textContent = `Contacted ${record.lastContacted}`;
        bar.appendChild(contacted);
      } else if (record.lastSeen && record.status !== 'hidden') {
        const seen = document.createElement('span');
        seen.style.cssText = `font-size:10px;color:${PALETTE.ui.text.muted};padding:1px 5px;border:1px solid #333;border-radius:4px;`;
        seen.textContent = `Viewed ${record.lastSeen}`;
        bar.appendChild(seen);
      }

      if (record.note && (isProfileBar || settings.showNotesInline)) {
        const noteBox = document.createElement('div');
        noteBox.style.cssText = 'width:100%;flex:0 0 100%;margin-top:3px;padding:4px 8px;background:#16161a;border-left:2px solid #eab308;color:#e4e4e7;font-size:11px;white-space:pre-wrap;border-radius:4px;box-sizing:border-box;';
        noteBox.textContent = record.note;
        bar.appendChild(noteBox);
      }
    }

    return bar;
  }

  function appendMatchBadges(toolbar, cachedBio, demos, missingAbout, ageRejected, genderRejected, nonLocalRejected, relRejected, ruleHits, limitConflicts, excludedHits, viewMode) {
    const dotsCluster = createMatchDotsCluster(ruleHits, limitConflicts, excludedHits);
    if (dotsCluster) toolbar.appendChild(dotsCluster);

    if (viewMode !== 'full') return;

    const demoPill = createDemographicPill(demos?.age, demos?.gender, demos?.genderRole, demos?.location, demos?.isManualGender, demos?.genderCategory);
    if (demoPill) toolbar.appendChild(demoPill);

    if (demos?.relationships) {
      const relPill = document.createElement('span');
      relPill.style.cssText = `font-size:10px;color:${PALETTE.ui.cool};background:rgba(138, 184, 150, 0.12);border:1px solid rgba(138, 184, 150, 0.28);padding:1px 5px;border-radius:4px;`;
      relPill.textContent = demos.relationships;
      toolbar.appendChild(relPill);
    }

    if (cachedBio) {
      const bioBadge = document.createElement('span');
      bioBadge.style.cssText = `font-size:10px;color:${PALETTE.ui.text.muted};padding:1px 5px;border:1px solid #333;border-radius:4px;`;
      const hasFetishes = Boolean(cachedBio.fetishesInto && cachedBio.fetishesInto.length > 0);
      const limitCount = (cachedBio.fetishesLimits || []).length;
      bioBadge.textContent = `${cachedBio.hasAbout ? 'About ✓' : 'No About'}${hasFetishes ? ' • Fetishes ✓' : ''}${limitCount ? ` • Limits (${limitCount})` : ''}`;
      toolbar.appendChild(bioBadge);
    }

    if (genderRejected) {
      const b = document.createElement('span');
      b.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      b.textContent = `-Gender${demos?.gender ? ` (${demos.gender})` : ' (Unknown)'}`;
      toolbar.appendChild(b);
    }

    if (nonLocalRejected) {
      const b = document.createElement('span');
      b.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      b.textContent = `-Non-Local${demos?.location ? ` (${demos.location})` : ''}`;
      toolbar.appendChild(b);
    }

    if (relRejected) {
      const b = document.createElement('span');
      b.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      b.textContent = `-Rel${demos?.relationships ? ` (${demos.relationships})` : ''}`;
      toolbar.appendChild(b);
    }

    if (missingAbout) {
      const b = document.createElement('span');
      b.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      b.textContent = '-No About';
      toolbar.appendChild(b);
    }

    if (ageRejected) {
      const b = document.createElement('span');
      b.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      b.textContent = `-Age (${demos.age})`;
      toolbar.appendChild(b);
    }

    ruleHits.forEach((hit) => {
      const badge = document.createElement('span');
      badge.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:${hexToRgba(hit.color, 0.18)};color:${hit.color};border:1px solid ${hexToRgba(hit.color, 0.7)};font-weight:500;`;
      badge.textContent = `${hit.label}: ${hit.keyword}${hit.fromCache ? ' (cached)' : ''}`;
      toolbar.appendChild(badge);
    });

    limitConflicts.forEach((conf) => {
      const badge = document.createElement('span');
      badge.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.18);color:${PALETTE.ui.warn};border:1px solid #9a7b2e;font-weight:500;`;
      badge.textContent = `⚠ Limit: ${conf.keyword}`;
      toolbar.appendChild(badge);
    });

    excludedHits.forEach((kw) => {
      const badge = document.createElement('span');
      badge.style.cssText = `font-size:10px;padding:1px 5px;border-radius:4px;background:rgba(201, 122, 107, 0.16);color:${PALETTE.ui.warn};border:1px solid #8b4f44;`;
      badge.textContent = `-${kw}`;
      toolbar.appendChild(badge);
    });
  }

  // =========================================================================
  // 8. KEYBOARD LIST NAVIGATOR, THROTTLED BATCH OPENER & FLOATING TOAST
  // =========================================================================
  const BatchOpener = {
    timer: null,
    remaining: [],

    getUncachedCandidateCards() {
      const settings = Store.getSettings();
      const ttl = settings.bioCacheTtlDays;
      const all = Array.from(document.getElementsByClassName('flx-card-tracked'));
      const seenKeys = new Set();
      const candidates = [];

      for (const el of all) {
        if (!el.isConnected || el.dataset.flxFilteredOut === '1') continue;
        const userKey = el.dataset.flxUser;
        if (!userKey || seenKeys.has(userKey)) continue;
        if (Store.getCachedBio(userKey, ttl)) continue;

        const gCat = el.dataset.flxGenderCat || null;
        const loc = el.dataset.flxLocation || '';
        const rel = el.dataset.flxRelationships || '';
        const ageVal = normalizeValidAge(el.dataset.flxAge);
        const rawTxt = el.dataset.flxRawItemText || '';

        if (isGenderRejected(gCat, settings)) continue;
        if (isNonLocalRejected(loc, settings, false)) continue;
        if (isRelationshipRejected(rel, settings)) continue;
        if (isAgeOutOfRange(ageVal, settings)) continue;

        if (settings.batchRequireLocal && !isLocationLocal(loc, settings)) {
          continue;
        }

        if (!isProfileEligibleForAutoCache({
          genderCategory: gCat,
          location: loc,
          relationships: rel,
          fullText: rawTxt
        }, settings)) {
          continue;
        }

        seenKeys.add(userKey);
        candidates.push({
          key: userKey,
          handle: el.dataset.flxHandle || userKey,
          url: el.dataset.flxProfileUrl || `${window.location.origin}/${el.dataset.flxHandle || userKey}`
        });
      }
      return candidates;
    },

    isRunning() {
      return this.timer !== null || this.remaining.length > 0;
    },

    cancel() {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.remaining = [];
      Hud.syncQuickButtons();
    },

    start(maxBatch = 5, intervalMs = 2500) {
      if (this.isRunning()) {
        this.cancel();
        CardNavigator.showToast('Batch tab opener cancelled');
        return;
      }

      const candidates = this.getUncachedCandidateCards().slice(0, maxBatch);
      if (candidates.length === 0) {
        CardNavigator.showToast('No visible uncached cards matching your rules');
        return;
      }

      this.remaining = candidates;
      const openNext = () => {
        if (this.remaining.length === 0) {
          this.timer = null;
          Hud.syncQuickButtons();
          CardNavigator.showToast('✓ Finished opening batch tabs');
          return;
        }
        const item = this.remaining.shift();
        openProfileInBackgroundTab(item.url);
        Hud.syncQuickButtons();
        CardNavigator.showToast(`Opened /${item.handle} in background tab (${this.remaining.length} left)…`);

        if (this.remaining.length > 0) {
          this.timer = setTimeout(openNext, intervalMs);
        } else {
          this.timer = null;
          Hud.syncQuickButtons();
        }
      };

      openNext();
    }
  };

  const CardNavigator = {
    activeIndex: -1,
    toastEl: null,
    toastTimer: null,

    getVisibleCards() {
      const all = Array.from(document.getElementsByClassName('flx-card-tracked'));
      return all.filter(el => el.isConnected && el.dataset.flxFilteredOut !== '1');
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
      target.style.boxShadow = '0 0 0 2px #d4a843, 0 8px 24px rgba(0,0,0,0.65)';
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      const handle = target.dataset.flxHandle || target.dataset.flxUser || 'profile';
      const kb = Store.getSettings().keybinds;
      this.showToast(
        `Card ${clamped + 1}/${cards.length}: /${handle}  •  [${kb.toggleMinimal.toUpperCase()}] Overlay  [${kb.shortlist.toUpperCase()}] Shortlist  [${kb.cycleGender.toUpperCase()}] Gender  [${kb.pass.toUpperCase()}] Pass  [${kb.openTab.toUpperCase()}] Open`
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
      if (this.activeIndex < 0 || this.activeIndex >= cards.length) return this.focusCard(0);
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
        this.showToast(`/${handle} overlay → ${nextMode === 'minimal' ? 'Minimal' : 'Full'}`);
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
        if (remaining.length > 0) this.focusCard(Math.min(this.activeIndex, remaining.length - 1));
        const labels = {
          female: `♀ Set /${handle} as Female`,
          male: `♂ Set /${handle} as Male`,
          other: ` transgender Set /${handle} as Other`
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
        if (remaining.length > 0) this.focusCard(Math.min(this.activeIndex, remaining.length - 1));
        this.showToast(nextStatus ? `✕ Passed /${handle}` : `Restored /${handle}`);
        return;
     Yes — the previous message was cut off at `CardNavigator.actOnFocused`. Here's the rest:

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
  // 9. PAGE ENHANCERS: CARDS/POSTS, SELF-PROFILE LEARNER & LOCKED-DOWN CHAT STRIP
  // =========================================================================
  function getScopedCardText(container) {
    if (container.dataset.flxRawItemText) {
      return container.dataset.flxRawItemText;
    }
    const clone = container.cloneNode(true);
    clone.querySelectorAll('.flx-toolbar').forEach(el => el.remove());
    if (container.tagName === 'ARTICLE') {
      clone.querySelectorAll('ul, ol, li').forEach(el => el.remove());
    }
    const txt = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    container.dataset.flxRawItemText = txt;
    return txt;
  }

  function applyContainerState(container, identity, settings, force = false, pageSocialContext = null) {
    if (containsEditableComposer(container)) return;

    const userKey = identity.key;
    let record = Store.getUser(userKey);
    const cachedBio = Store.getCachedBio(userKey, settings.bioCacheTtlDays);
    const bioText = cachedBio ? cachedBio.text : '';
    const resolvedGender = resolveEffectiveGender(record, cachedBio, identity.demographics);
    const resolvedAge = resolveEffectiveAge(record, cachedBio, identity.demographics);

    const itemText = getScopedCardText(container);
    const isExploreTile = Boolean(container.closest('fl-masonry'));

    const liveSocial = detectLiveSocialRelation(container);
    const detectedFriend = Boolean(liveSocial.isFriend || pageSocialContext?.isFriendsList);
    const detectedFollowing = Boolean(liveSocial.isFollowing || pageSocialContext?.isFollowingList);

    const liveDemos = identity.demographics || {};
    const effectiveLocation = liveDemos.location || record.location || cachedBio?.location || null;
    const effectiveRelationships = liveDemos.relationships || record.relationships || cachedBio?.relationships || null;

    const hasManualWork = Boolean(
      record.status ||
      record.manualGender ||
      record.manualAge ||
      record.isFriend ||
      record.isFollowing ||
      detectedFriend ||
      detectedFollowing ||
      (record.note && record.note.trim().length > 0)
    );
    const canPersistRecord = hasManualWork || isProfileEligibleForAutoCache({
      genderCategory: resolvedGender.genderCategory,
      location: effectiveLocation || '',
      relationships: effectiveRelationships || '',
      fullText: `${itemText} ${bioText}`
    }, settings);

    if (
      canPersistRecord &&
      ((liveDemos.age && !record.manualAge && record.age !== liveDemos.age) ||
      (!record.manualGender && liveDemos.genderCategory && record.genderCategory !== liveDemos.genderCategory) ||
      (liveDemos.genderRole && !record.genderRole) ||
      (liveDemos.location && !record.location) ||
      (liveDemos.relationships && !record.relationships) ||
      (detectedFriend && !record.isFriend) ||
      (detectedFollowing && !record.isFollowing))
    ) {
      const patch = { username: identity.username || record.username || null };
      if (liveDemos.age && !record.manualAge) patch.age = liveDemos.age;
      if (liveDemos.genderRole) patch.genderRole = liveDemos.genderRole;
      if (liveDemos.location && !record.location) patch.location = liveDemos.location;
      if (liveDemos.relationships && !record.relationships) patch.relationships = liveDemos.relationships;
      if (detectedFriend) patch.isFriend = true;
      if (detectedFollowing) patch.isFollowing = true;
      if (!record.manualGender && liveDemos.genderCategory) {
        patch.gender = liveDemos.gender;
        patch.genderCategory = liveDemos.genderCategory;
      }
      record = Store.setUser(userKey, patch);
    }

    const globalViewMode = settings.cardViewMode || 'full';
    const overrideMode = cardViewOverrides.get(userKey);
    const effectiveViewMode = globalViewMode === 'off'
      ? 'off'
      : (overrideMode || globalViewMode);

    const mergedDemos = {
      age: resolvedAge,
      gender: resolvedGender.gender,
      genderCategory: resolvedGender.genderCategory,
      isManualGender: resolvedGender.isManual,
      autoDetected: resolvedGender.autoDetected,
      genderRole: liveDemos.genderRole || record.genderRole || cachedBio?.genderRole || null,
      location: effectiveLocation,
      relationships: effectiveRelationships,
      lookingFor: liveDemos.lookingFor || record.lookingFor || cachedBio?.lookingFor || null
    };

    const isExempt = Boolean(
      settings.exemptInteractedAndSocial &&
      hasProtectedInteractionOrSocial(record, { isFriend: detectedFriend, isFollowing: detectedFollowing })
    );

    const missingAbout = Boolean(!isExempt && settings.hideNoAbout && cachedBio && cachedBio.hasAbout === false);
    const ageRejected = !isExempt && isAgeOutOfRange(mergedDemos.age, settings);
    const genderRejected = !isExempt && isGenderRejected(mergedDemos.genderCategory, settings);
    const nonLocalRejected = !isExempt && isNonLocalRejected(mergedDemos.location, settings, isExploreTile);
    const relRejected = !isExempt && isRelationshipRejected(mergedDemos.relationships, settings);

    const excludeSourceText = getExcludeSearchText(cachedBio, itemText);
    const excludedHits = isExempt ? [] : findSimpleMatches(excludeSourceText, settings.excludeKeywords);
    const ruleHits = findRuleMatches(itemText, bioText, settings.highlightRules);
    const limitConflicts = cachedBio ? findLimitConflicts(cachedBio.fetishesLimits, settings.highlightRules) : [];

    const sig = JSON.stringify({
      userKey,
      effectiveViewMode,
      isExempt,
      status: record.status,
      isFriend: record.isFriend,
      isFollowing: record.isFollowing,
      manualGender: record.manualGender,
      manualAge: record.manualAge,
      note: record.note,
      lastSeen: record.lastSeen,
      lastContacted: record.lastContacted,
      mergedDemos,
      bioFetchedAt: cachedBio ? cachedBio.fetchedAt : null,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      showHidden: settings.showHidden,
      exemptInteractedAndSocial: settings.exemptInteractedAndSocial,
      hideNoAbout: settings.hideNoAbout,
      localOnlyFilter: settings.localOnlyFilter,
      localRegions: settings.localRegions,
      allowUnknownLocationOnExplore: settings.allowUnknownLocationOnExplore,
      relationshipFilter: settings.relationshipFilter,
      allowedGenders: settings.allowedGenders,
      strictGenderHideUnknown: settings.strictGenderHideUnknown,
      filterByAge: settings.filterByAge,
      minAge: settings.minAge,
      maxAge: settings.maxAge,
      hideMode: settings.hideMode,
      dimOpacity: settings.dimOpacity,
      showNotesInline: settings.showNotesInline,
      excludedHits,
      ruleHits,
      limitConflicts
    });

    if (!force && container.dataset.flxSig === sig) return;

    const isFilteredOut = record.status === 'hidden' || (!isExempt && (excludedHits.length > 0 || missingAbout || ageRejected || genderRejected || nonLocalRejected || relRejected));

    container.classList.add('flx-card-tracked');
    container.dataset.flxUser = userKey;
    container.dataset.flxHandle = identity.username || record.username || userKey;
    container.dataset.flxProfileUrl = identity.profileUrl;
    container.dataset.flxEffectiveView = effectiveViewMode;
    container.dataset.flxAge = mergedDemos.age !== null ? String(mergedDemos.age) : '';
    container.dataset.flxGenderCat = mergedDemos.genderCategory || '';
    container.dataset.flxLocation = mergedDemos.location || '';
    container.dataset.flxRelationships = mergedDemos.relationships || '';
    container.dataset.flxFilteredOut = isFilteredOut ? '1' : '0';
    container.dataset.flxSig = sig;

    applyCardAccentStyle(container, record.status, ruleHits, isFilteredOut, settings);

    for (const child of Array.from(container.children)) {
      if (child.classList && child.classList.contains('flx-toolbar')) {
        child.remove();
      }
    }

    if (effectiveViewMode !== 'off') {
      const isInlineRow = isInlineFlexRowItem(container);

      const toolbar = buildToolbar(
        userKey,
        settings,
        () => {
          withObserverPaused(() => applyContainerState(container, identity, Store.getSettings(), true, pageSocialContext));
        },
        {
          viewMode: isInlineRow ? 'minimal' : effectiveViewMode,
          isProfileBar: false,
          displayHandle: identity.username,
          profileUrl: identity.profileUrl,
          demos: mergedDemos,
          isInlineRow,
          onToggleCardView: () => {
            const nextOverride = effectiveViewMode === 'minimal' ? 'full' : 'minimal';
            cardViewOverrides.set(userKey, nextOverride);
            withObserverPaused(() => applyContainerState(container, identity, Store.getSettings(), true, pageSocialContext));
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
        nonLocalRejected,
        relRejected,
        ruleHits,
        limitConflicts,
        excludedHits,
        isInlineRow ? 'minimal' : effectiveViewMode
      );

      container.appendChild(toolbar);
    }
  }

  function enhancePostsAndCards() {
    const path = window.location.pathname;
    if (path.startsWith('/conversations') || path.startsWith('/inbox')) {
      return 0;
    }

    const settings = Store.getSettings();
    const root = document.getElementById('main-content') || document.body;
    const currentProfile = detectCurrentProfilePage();
    const currentProfileKey = currentProfile ? currentProfile.key : null;
    const { selfId, selfUsername } = getSelfIdentity();

    const isSelfPage = Boolean(currentProfile && isCurrentProfileSelf(currentProfile));
    const pageSocialContext = {
      isFriendsList: Boolean(isSelfPage && currentProfile.activeView === 'friends'),
      isFollowingList: Boolean(isSelfPage && currentProfile.activeView === 'following')
    };

    const links = root.getElementsByTagName('a');
    const seenContainers = new Set();

    for (const link of links) {
      if (link.closest('nav, footer, aside, form, dialog, #feed-status-form, #chat_dock, .flx-toolbar, .flx-profile-bar, .flx-chat-context')) continue;
      const closestHeader = link.closest('header');
      if (closestHeader && !closestHeader.closest('article') && !closestHeader.closest('fl-masonry')) continue;

      const parsed = parseUserHref(link.getAttribute('href'));
      if (!parsed || parsed.key === currentProfileKey) continue;
      if (selfUsername && parsed.key === selfUsername) continue;
      if (selfId && parsed.key === `users/${selfId}`) continue;

      const container = findPostOrCardContainer(link, root);
      if (!container || seenContainers.has(container)) continue;

      const identity = resolveAuthorFromPostOrCard(container, link, parsed);
      if (selfUsername && identity.key === selfUsername) continue;

      seenContainers.add(container);
      container.dataset.flxLinkHref = link.getAttribute('href') || '';
      applyContainerState(container, identity, settings, false, pageSocialContext);
    }

    return seenContainers.size;
  }

  function findProfileBarAnchorBlock() {
    const profileNav = document.getElementById('profile-navigation');
    if (profileNav) return profileNav.closest('header') || profileNav;
    const profileHeader = findProfileHeaderElement();
    if (profileHeader) return profileHeader;

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      const h1 = mainContent.querySelector('h1');
      if (h1) return h1.closest('header') || h1.parentElement || mainContent.firstElementChild;
      if (mainContent.firstElementChild) return mainContent.firstElementChild;
    }
    return null;
  }

  function enhanceProfilePage() {
    const profilePage = detectCurrentProfilePage();
    if (!profilePage) return null;

    const currentKey = profilePage.key;
    const displayHandle = profilePage.username || currentKey;
    const isSelf = isCurrentProfileSelf(profilePage);

    let liveData;
    try {
      liveData = extractProfileData(profilePage.activeView);
    } catch (err) {
      console.error('[FLX] extractProfileData error:', err);
      liveData = {
        nonFetishFullText: '', aboutText: '', hasAbout: null, fetishesText: '',
        fetishesInto: [], fetishesLimits: [], writingsText: '', headerText: '',
        age: null, gender: null, genderCategory: null, genderRole: null,
        location: null, relationships: null, orientation: null, lookingFor: null, groups: []
      };
    }

    const anchorBlock = findProfileBarAnchorBlock();
    if (!anchorBlock) return profilePage;

    if (isSelf) {
      const prevSelf = Store.getSelfProfile();
      const nextInto = liveData.fetishesInto.length > 0 ? liveData.fetishesInto : (prevSelf.fetishesInto || []);
      const nextLimits = liveData.fetishesLimits.length > 0 ? liveData.fetishesLimits : (prevSelf.fetishesLimits || []);
      const nextGroups = liveData.groups.length > 0 ? liveData.groups : (prevSelf.groups || []);

      const updatedSelf = Store.saveSelfProfile({
        key: currentKey,
        username: displayHandle,
        genderCategory: liveData.genderCategory || prevSelf.genderCategory || null,
        orientation: liveData.orientation || prevSelf.orientation || null,
        location: liveData.location || prevSelf.location || null,
        fetishesInto: nextInto,
        fetishesLimits: nextLimits,
        groups: nextGroups,
        lookingFor: liveData.lookingFor || prevSelf.lookingFor || null
      });

      const settings = Store.getSettings();
      if (settings.autoLearnFromSelf && (liveData.fetishesInto.length > 0 || liveData.fetishesLimits.length > 0)) {
        Store.learnPreferencesFromSelf(updatedSelf, false);
      }

      const selfSig = JSON.stringify({
        selfKey: currentKey,
        intoCount: updatedSelf.fetishesInto.length,
        limitsCount: updatedSelf.fetishesLimits.length,
        groupCount: updatedSelf.groups.length,
        orientation: updatedSelf.orientation,
        location: updatedSelf.location,
        autoSync: settings.autoLearnFromSelf
      });

      const existingBars = document.getElementsByClassName('flx-profile-bar');
      for (const bar of existingBars) {
        if (bar.dataset.flxProfile === currentKey && bar.dataset.flxSig === selfSig) {
          return profilePage;
        }
      }

      Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());

      const selfBar = document.createElement('div');
      selfBar.className = 'flx-profile-bar';
      selfBar.dataset.flxProfile = currentKey;
      selfBar.dataset.flxSig = selfSig;
      selfBar.style.cssText = 'width:100%;max-width:1280px;margin:8px auto 0;padding:9px 14px;background:rgba(16,24,32,0.96);backdrop-filter:blur(10px);border:1px solid #0284c7;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;position:relative;z-index:90;box-sizing:border-box;font-family:system-ui,sans-serif;font-size:12px;color:#e4e4e7;';

      const badge = document.createElement('strong');
      badge.style.color = PALETTE.ui.accent;
      badge.textContent = `👤 Your Profile (/${displayHandle})`;

      const stats = document.createElement('span');
      stats.style.color = PALETTE.ui.text.secondary;
      stats.textContent = `${updatedSelf.fetishesInto.length} Into kinks • ${updatedSelf.fetishesLimits.length} Atomic Limits • ${updatedSelf.groups.length} Groups`;

      const learnAllBtn = document.createElement('button');
      learnAllBtn.type = 'button';
      learnAllBtn.style.cssText = `background:rgba(122, 163, 184, 0.18);color:${PALETTE.ui.accent};border:1px solid #4a6b7d;border-radius:5px;padding:3px 9px;cursor:pointer;font-size:11px;font-weight:600;margin-left:auto;`;
      learnAllBtn.textContent = '✨ Auto-Configure Filters From My Profile';
      learnAllBtn.title = 'Infer gender preferences from Orientation, set Local Region from your Location, and sync Into kinks & atomic Limits';
      learnAllBtn.addEventListener('click', () => {
        const res = Store.learnPreferencesFromSelf(Store.getSelfProfile(), true);
        CardNavigator.showToast(`Configured filters from /${displayHandle}: ${res.intoAdded} Shared Kinks & ${res.limitsAdded} Limits`);
        withObserverPaused(enhanceProfilePage);
      });

      selfBar.append(badge, stats, learnAllBtn);
      anchorBlock.insertAdjacentElement('afterend', selfBar);
      return profilePage;
    }

    const currentSettings = Store.getSettings();
    const existing = Store.getUser(currentKey);
    const profileHeader = findProfileHeaderElement();
    const liveSocial = profileHeader ? detectLiveSocialRelation(profileHeader) : { isFriend: false, isFollowing: false };

    const hasManualWork = Boolean(
      existing.status ||
      existing.manualGender ||
      existing.manualAge ||
      existing.isFriend ||
      existing.isFollowing ||
      liveSocial.isFriend ||
      liveSocial.isFollowing ||
      (existing.note && existing.note.trim().length > 0)
    );
    const effectiveGenderCat = existing.manualGender || liveData.genderCategory || existing.genderCategory;
    const effectiveLoc = liveData.location || existing.location || '';
    const effectiveRel = liveData.relationships || existing.relationships || '';

    const eligibleForCache = hasManualWork || isProfileEligibleForAutoCache({
      genderCategory: effectiveGenderCat,
      location: effectiveLoc,
      relationships: effectiveRel,
      fullText: `${liveData.headerText || ''} ${liveData.aboutText || ''}`
    }, currentSettings);

    if (eligibleForCache) {
      const today = new Date().toISOString().slice(0, 10);
      if (
        existing.lastSeen !== today ||
        (!existing.username && profilePage.username) ||
        (liveData.location && liveData.location !== existing.location) ||
        (liveSocial.isFriend && !existing.isFriend) ||
        (liveSocial.isFollowing && !existing.isFollowing)
      ) {
        const patch = {
          lastSeen: today,
          username: profilePage.username || existing.username || null
        };
        if (liveData.location) patch.location = liveData.location;
        if (liveSocial.isFriend) patch.isFriend = true;
        if (liveSocial.isFollowing) patch.isFollowing = true;
        Store.setUser(currentKey, patch);
      }
    }

    let cachedBio = Store.getCachedBio(currentKey, currentSettings.bioCacheTtlDays);

    if (
      eligibleForCache &&
      (liveData.nonFetishFullText.length > 30 ||
      liveData.hasAbout === true ||
      liveData.fetishesText.length > 0 ||
      liveData.fetishesLimits.length > 0 ||
      liveData.writingsText.length > 0 ||
      liveData.groups.length > 0 ||
      liveData.age !== null ||
      liveData.location !== null)
    ) {
      cachedBio = Store.mergeCachedProfile(currentKey, liveData, profilePage.username);
    }

    const latestUser = Store.getUser(currentKey);
    const sig = JSON.stringify({
      currentKey,
      age: resolveEffectiveAge(latestUser, cachedBio, liveData),
      location: liveData.location || latestUser.location || cachedBio?.location || null,
      hasAbout: cachedBio ? cachedBio.hasAbout : null,
      aboutLen: cachedBio ? (cachedBio.aboutText || '').length : 0,
      writingsLen: cachedBio ? (cachedBio.writingsText || '').length : 0,
      fetishLen: cachedBio ? (cachedBio.fetishesInto.length + cachedBio.fetishesLimits.length) : 0,
      groupCount: cachedBio && cachedBio.groups ? cachedBio.groups.length : 0,
      status: latestUser.status,
      isFriend: latestUser.isFriend,
      isFollowing: latestUser.isFollowing,
      manualGender: latestUser.manualGender,
      manualAge: latestUser.manualAge,
      note: latestUser.note,
      lastContacted: latestUser.lastContacted,
      genderCategory: latestUser.genderCategory,
      stickyProfileBar: currentSettings.stickyProfileBar,
      exemptInteractedAndSocial: currentSettings.exemptInteractedAndSocial,
      hideNoAbout: currentSettings.hideNoAbout,
      localOnlyFilter: currentSettings.localOnlyFilter,
      localRegions: currentSettings.localRegions,
      relationshipFilter: currentSettings.relationshipFilter,
      allowedGenders: currentSettings.allowedGenders,
      strictGenderHideUnknown: currentSettings.strictGenderHideUnknown,
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
      const targetAnchor = findProfileBarAnchorBlock();
      if (!targetAnchor) return;

      const settings = Store.getSettings();
      const latestBio = Store.getCachedBio(currentKey, settings.bioCacheTtlDays);
      const u = Store.getUser(currentKey);
      const resolvedGender = resolveEffectiveGender(u, latestBio, liveData);
      const resolvedAge = resolveEffectiveAge(u, latestBio, liveData);
      const demos = {
        age: resolvedAge,
        gender: resolvedGender.gender,
        genderCategory: resolvedGender.genderCategory,
        isManualGender: resolvedGender.isManual,
        autoDetected: resolvedGender.autoDetected,
        genderRole: u.genderRole || latestBio?.genderRole || liveData?.genderRole || null,
        location: liveData?.location || u.location || latestBio?.location || null,
        relationships: liveData?.relationships || u.relationships || latestBio?.relationships || null,
        lookingFor: liveData?.lookingFor || u.lookingFor || latestBio?.lookingFor || null
      };

      Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());

      const isSticky = Boolean(settings.stickyProfileBar);
      const wrapper = document.createElement('div');
      wrapper.className = 'flx-profile-bar';
      wrapper.dataset.flxProfile = currentKey;
      wrapper.dataset.flxSig = sig;
      wrapper.style.cssText = isSticky
        ? 'width:100%;max-width:1280px;margin:8px auto 0;padding:9px 14px;background:rgba(18,18,22,0.96);backdrop-filter:blur(10px);border:1px solid #383842;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;position:sticky;top:var(--flx-sticky-top, 62px);z-index:90;box-sizing:border-box;box-shadow:0 6px 22px rgba(0,0,0,0.65);'
        : 'width:100%;max-width:1280px;margin:10px auto 0;padding:10px 14px;background:rgba(22,22,26,0.95);backdrop-filter:blur(8px);border:1px solid #33333a;border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;position:relative;z-index:10;box-sizing:border-box;box-shadow:0 4px 16px rgba(0,0,0,0.45);';

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
          isInlineRow: false
        }
      );

      const scanText = latestBio ? latestBio.text : (liveData.nonFetishFullText || '');
      const excludeSourceText = getExcludeSearchText(latestBio, liveData.aboutText || '');
      const excludedHits = findSimpleMatches(excludeSourceText, settings.excludeKeywords);
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const limitConflicts = latestBio ? findLimitConflicts(latestBio.fetishesLimits, settings.highlightRules) : [];
      const missingAbout = Boolean(settings.hideNoAbout && latestBio && latestBio.hasAbout === false);
      const ageRejected = isAgeOutOfRange(demos.age, settings);
      const genderRejected = isGenderRejected(demos.genderCategory, settings);
      const nonLocalRejected = isNonLocalRejected(demos.location, settings, false);
      const relRejected = isRelationshipRejected(demos.relationships, settings);

      appendMatchBadges(toolbar, latestBio, demos, missingAbout, ageRejected, genderRejected, nonLocalRejected, relRejected, ruleHits, limitConflicts, excludedHits, 'full');

      const pinBtn = document.createElement('button');
      pinBtn.type = 'button';
      pinBtn.style.cssText = isSticky
        ? `background:rgba(122, 163, 184, 0.16);color:${PALETTE.ui.accent};border:1px solid #4a6b7d;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;font-weight:600;margin-left:auto;`
        : 'background:#202024;color:#a1a1aa;border:1px solid #3f3f46;border-radius:5px;padding:2px 7px;cursor:pointer;font-size:11px;margin-left:auto;';
      pinBtn.textContent = isSticky ? '📌 Pinned' : '📌 Pin Bar';
      pinBtn.title = 'Keep this profile bar pinned at the top while scrolling';
      pinBtn.addEventListener('click', () => {
        Store.saveSettings({ stickyProfileBar: !Store.getSettings().stickyProfileBar });
        withObserverPaused(renderProfileBar);
      });

      if (ruleHits.length > 0 && excludedHits.length === 0 && !genderRejected && !nonLocalRejected && !relRejected) {
        wrapper.style.borderColor = ruleHits[0].color;
      } else if (excludedHits.length > 0 || missingAbout || ageRejected || genderRejected || nonLocalRejected || relRejected) {
        wrapper.style.borderColor = PALETTE.stage.hidden.border;
      }

      wrapper.append(label, toolbar, pinBtn);
      targetAnchor.insertAdjacentElement('afterend', wrapper);
      syncStickyViewportOffset();
    };

    renderProfileBar();
    return profilePage;
  }

  function insertTextIntoComposer(rootEl, textToInsert) {
    const searchRoots = [rootEl, document.getElementById('chat_dock'), document.getElementById('main-content')].filter(Boolean);
    for (const scope of searchRoots) {
      const textareas = scope.getElementsByTagName('textarea');
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
      const editors = scope.getElementsByTagName('lexxy-editor');
      for (const ed of editors) {
        if (ed.offsetParent !== null) {
          ed.focus();
          document.execCommand('insertText', false, textToInsert);
          return true;
        }
      }
    }
    return false;
  }

  function enhanceChatContext() {
    const settings = Store.getSettings();
    if (!settings.enableChatStrip) {
      document.querySelectorAll('.flx-chat-context').forEach(el => el.remove());
      return;
    }

    if (isUserScrolling) return;
    const active = document.activeElement;
    if (active && isElementEditableNode(active) && active.closest('#chat_dock, #chat_dock_thread, #main-content')) {
      return;
    }

    const { selfId, selfUsername } = getSelfIdentity();
    const targets = [];

    const dockThread = document.getElementById('chat_dock_thread');
    const dockContainer = document.getElementById('chat_dock');
    if (dockThread && dockThread.innerHTML.trim().length > 0 && dockContainer) {
      targets.push({ scanRoot: dockThread, dockEl: dockContainer, mode: 'dock' });
    } else {
      document.querySelectorAll('.flx-chat-context[data-flx-chat-mode="dock"]').forEach(el => el.remove());
    }

    const path = window.location.pathname;
    if (path.startsWith('/inbox') || path.startsWith('/conversations')) {
      const mainContent = document.getElementById('main-content');
      if (mainContent) targets.push({ scanRoot: mainContent, dockEl: null, mode: 'inbox' });
    } else {
      document.querySelectorAll('.flx-chat-context[data-flx-chat-mode="inbox"]').forEach(el => el.remove());
    }

    for (const target of targets) {
      const anchors = target.scanRoot.getElementsByTagName('a');
      let partner = null;

      for (const a of anchors) {
        if (a.closest('.flx-chat-context, .flx-toolbar, form')) continue;
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
      const resolvedAge = resolveEffectiveAge(record, cachedBio);

      const scanText = cachedBio ? cachedBio.text : '';
      const excludeSourceText = getExcludeSearchText(cachedBio);
      const ruleHits = findRuleMatches('', scanText, settings.highlightRules);
      const limitConflicts = cachedBio ? findLimitConflicts(cachedBio.fetishesLimits, settings.highlightRules) : [];
      const excludedHits = findSimpleMatches(excludeSourceText, settings.excludeKeywords);
      const sharedGroups = getSharedOrNotableGroups(cachedBio?.groups || record.groups || []);

      const sig = JSON.stringify({
        mode: target.mode, userKey, age: resolvedAge, status: record.status,
        manualGender: record.manualGender, note: record.note, lastContacted: record.lastContacted,
        hasCache: Boolean(cachedBio), templateCount: settings.messageTemplates.length,
        sharedGroups, ruleHits, limitConflicts, excludedHits
      });

      const existingStrip = document.querySelector(`.flx-chat-context[data-flx-chat-mode="${target.mode}"]`);
      if (existingStrip && existingStrip.dataset.flxSig === sig) continue;
      if (existingStrip) existingStrip.remove();

      const strip = document.createElement('div');
      strip.className = 'flx-chat-context';
      strip.dataset.flxChatMode = target.mode;
      strip.dataset.flxSig = sig;

      strip.style.cssText = target.mode === 'dock'
        ? 'width:100%;box-sizing:border-box;margin:0;padding:5px 8px;background:#16161a;border-bottom:1px solid #383842;font-size:11px;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:4px;position:static;flex-shrink:0;overflow:hidden;'
        : 'width:100%;max-width:960px;box-sizing:border-box;margin:6px auto;padding:7px 12px;background:#16161a;border:1px solid #383842;border-radius:8px;font-size:12px;color:#e4e4e7;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:5px;position:static;flex-shrink:0;overflow:hidden;';

      if (ruleHits.length > 0) strip.style.borderLeft = `3px solid ${ruleHits[0].color}`;
      else if (record.status && STAGE_MAP[record.status]) strip.style.borderLeft = `3px solid ${STAGE_MAP[record.status].color}`;

      const topRow = document.createElement('div');
      topRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;width:100%;';

      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;';

      const title = document.createElement('strong');
      title.style.color = PALETTE.ui.accent;
      title.textContent = `CRM: /${escapeHtml(displayHandle)}`;
      left.appendChild(title);

      const demoPill = createDemographicPill(
        resolvedAge, resolvedGender.gender,
        record.genderRole || cachedBio?.genderRole || null,
        record.location || cachedBio?.location || null,
        resolvedGender.isManual, resolvedGender.genderCategory
      );
      if (demoPill) left.appendChild(demoPill);

      const dots = createMatchDotsCluster(ruleHits, limitConflicts, excludedHits);
      if (dots) left.appendChild(dots);

      const tplSel = document.createElement('select');
      tplSel.style.cssText = 'background:#222228;color:#d4d4d8;border:1px solid #3f3f46;border-radius:4px;padding:1px 5px;font-size:11px;cursor:pointer;max-width:130px;';
      const tplDefault = document.createElement('option');
      tplDefault.value = '';
      tplDefault.textContent = 'Template ▾';
      tplSel.appendChild(tplDefault);
      for (const tpl of settings.messageTemplates) {
        const opt = document.createElement('option');
        opt.value = tpl.id;
        opt.textContent = escapeHtml(tpl.title);
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
        const inserted = insertTextIntoComposer(target.scanRoot, rendered);
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
        record, resolvedGender.autoDetected,
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

      if (record.note) {
        const noteLine = document.createElement('div');
        noteLine.style.cssText = 'padding:3px 7px;background:#1e1e24;border-left:2px solid #eab308;color:#fef08a;border-radius:3px;white-space:pre-wrap;width:100%;box-sizing:border-box;';
        noteLine.textContent = escapeHtml(record.note);
        strip.appendChild(noteLine);
      }

      if (target.mode === 'dock' && target.dockEl) target.dockEl.insertAdjacentElement('afterbegin', strip);
      else {
        const headerEl = target.scanRoot.querySelector('header');
        if (headerEl) headerEl.insertAdjacentElement('afterend', strip);
        else target.scanRoot.prepend(strip);
      }
    }
  }

  // =========================================================================
  // 10. FILE DOWNLOAD / UPLOAD HELPERS & LOCAL CRM DASHBOARD MODAL
  // =========================================================================
  function downloadTextFile(filename, content, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function promptJsonFileUpload(onLoaded) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onLoaded(String(reader.result || ''), file.name);
      reader.readAsText(file);
    });
    document.body.appendChild(fileInput);
    fileInput.click();
    setTimeout(() => fileInput.remove(), 60000);
  }

  const CrmModal = {
    host: null,
    shadow: null,
    isOpen: false,
    filterStatus: 'all',
    filterCategory: 'all',
    filterGender: 'all',
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
      const { selfUsername } = getSelfIdentity();
      const allKeys = new Set([...Object.keys(users), ...Object.keys(cache)]);
      const entries = [];

      for (const key of allKeys) {
        if (selfUsername && key === selfUsername) continue;
        const u = this.normalizeUser(users[key]);
        const rawC = cache[key] || null;
        const c = rawC ? Object.assign({}, rawC, {
          aboutText: rawC.aboutText || rawC.sections?.about || '',
          writingsText: rawC.writingsText || rawC.sections?.writings || '',
          text: buildCompositeSearchText(rawC)
        }) : null;

        const displayHandle = u.username || (c && c.username) || key;
        const profileUrl = key.startsWith('users/')
          ? `${window.location.origin}/${key}`
          : `${window.location.origin}/${displayHandle}`;

        const bioText = c && typeof c.text === 'string' ? c.text : '';
        const aboutText = c && typeof c.aboutText === 'string' ? c.aboutText : '';
        const writingsText = c && typeof c.writingsText === 'string' ? c.writingsText : '';
        const fetishesText = c && typeof c.fetishesRaw === 'string' ? c.fetishesRaw : '';
        const fetishesInto = c && Array.isArray(c.fetishesInto) ? c.fetishesInto : [];

        let fetishesLimits = c && Array.isArray(c.fetishesLimits) ? c.fetishesLimits : [];
        if (fetishesLimits.length === 0 && (aboutText || bioText)) {
          fetishesLimits = extractLimitsFromProfileText(aboutText, bioText);
        }

        const hasCache = Boolean(c && (bioText.length > 0 || c.hasAbout !== null || fetishesLimits.length > 0));
        const hasAbout = Boolean(c && c.hasAbout === true);
        const noAbout = Boolean(c && c.hasAbout === false);
        const hasFetishes = Boolean(fetishesInto.length > 0 || fetishesLimits.length > 0 || fetishesText.length > 0);

        const resolvedGender = resolveEffectiveGender(u, c);
        const age = resolveEffectiveAge(u, c);
        const genderRole = u.genderRole || c?.genderRole || null;
        const location = u.location || c?.location || null;
        const relationships = u.relationships || c?.relationships || null;
        const lookingFor = u.lookingFor || c?.lookingFor || null;
        const groups = (c && Array.isArray(c.groups) && c.groups.length > 0) ? c.groups : (u.groups || []);
        const sharedGroups = getSharedOrNotableGroups(groups);

        const excludeSourceText = getExcludeSearchText(c);
        const ruleHits = findRuleMatches('', bioText, settings.highlightRules);
        const limitConflicts = findLimitConflicts(fetishesLimits, settings.highlightRules);
        const excludedHits = findSimpleMatches(excludeSourceText, settings.excludeKeywords);

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
          key, displayHandle, profileUrl, status: u.status || null, note: u.note || '',
          lastSeen: u.lastSeen || null, lastContacted: u.lastContacted || null,
          daysSinceContact, followUpDue, isFriend: Boolean(u.isFriend), isFollowing: Boolean(u.isFollowing),
          cachedDate, recentStamp, age, gender: resolvedGender.gender,
          genderCategory: resolvedGender.genderCategory, isManualGender: resolvedGender.isManual,
          manualGender: u.manualGender || null, genderRole, location, relationships, lookingFor,
          groups, sharedGroups, isLocal: isLocationLocal(location, settings),
          hasCache, hasAbout, noAbout, hasFetishes, aboutText, writingsText, fetishesText,
          fetishesInto, fetishesLimits, fullText: bioText, ruleHits, limitConflicts, excludedHits
        });
      }

      return entries;
    },

    normalizeUser(raw) {
      return Object.assign({
        status: null, note: '', lastSeen: null, lastContacted: null,
        isFriend: false, isFollowing: false, username: null, age: null,
        manualAge: null, gender: null, genderCategory: null, manualGender: null,
        genderRole: null, location: null, relationships: null, lookingFor: null, groups: []
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

        lines.push(`## [/${escapeHtml(e.displayHandle)}](${e.profileUrl}) — ${stageLabel}`);
        if (meta) lines.push(`* **Profile:** ${escapeHtml(meta)}`);
        if (e.lastContacted) lines.push(`* **Last Contacted:** ${e.lastContacted} (${e.daysSinceContact}d ago)`);
        else if (e.lastSeen) lines.push(`* **Last Viewed:** ${e.lastSeen}`);
        if (e.ruleHits.length > 0) lines.push(`* **Matches:** ${e.ruleHits.map(h => `${h.label} (${h.keyword})`).join(', ')}`);
        if (e.fetishesLimits.length > 0) lines.push(`* **Profile Limits:** ${e.fetishesLimits.map(escapeHtml).join(', ')}`);
        if (e.limitConflicts.length > 0) lines.push(`* **Limit Conflicts:** ${e.limitConflicts.map(c => c.keyword).join(', ')}`);
        if (e.excludedHits.length > 0) lines.push(`* **Excludes:** ${e.excludedHits.map(escapeHtml).join(', ')}`);
        if (e.sharedGroups.length > 0) lines.push(`* **Shared Groups:** ${e.sharedGroups.map(escapeHtml).join(', ')}`);
        if (e.note) lines.push(`> **Note:** ${escapeHtml(e.note).replace(/\n/g, '\n> ')}`);
        if (e.aboutText) {
          const snippet = e.aboutText.slice(0, 500).replace(/\n+/g, ' ');
          lines.push(`\n${escapeHtml(snippet)}${e.aboutText.length > 500 ? '…' : ''}`);
        }
        lines.push('\n---\n');
      }

      return lines.join('\n');
    },

    open() {
      if (this.isOpen) return;
      this.isOpen = true;
      const s = Store.getSettings();
      this.filterRel = s.relationshipFilter || 'all';
      this.localOnly = Boolean(s.localOnlyFilter);
      if (s.filterByAge) {
        if (!this.minAgeFilter) this.minAgeFilter = String(s.minAge || '');
        if (!this.maxAgeFilter) this.maxAgeFilter = String(s.maxAge || '');
      }
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
      if (e.key === 'Escape') CrmModal.close();
    },

    renderModal() {
      withObserverPaused(() => {
        if (!this.host) {
          this.host = document.createElement('div');
          this.host.id = 'flx-crm-host';
          this.host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
          this.shadow = this.host.attachShadow({ mode: 'open' });
          shieldShadowInputs(this.shadow, () => this.close());
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
            .title { font-size: 16px; font-weight: 700; color: #fafafa; }
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
            .search-input { flex: 1; min-width: 200px; }
            .age-input { width: 72px; }
            .tabs { display: flex; gap: 5px; flex-wrap: wrap; }
            button {
              background: #222228; color: #d4d4d8; border: 1px solid #3a3a44; border-radius: 6px;
              padding: 5px 9px; cursor: pointer; font-size: 12px; font-family: inherit;
            }
            button:hover { background: #2d2d35; color: #fff; }
            button.active-tab { background: rgba(212, 168, 67, 0.16); border-color: #9a7b2e; color: #fde047; font-weight: 600; }
            button.toggle-pill { font-size: 11px; padding: 4px 8px; }
            button.toggle-pill.on { background: rgba(122, 163, 184, 0.16); border-color: #4a6b7d; color: #7dd3fc; font-weight: 600; }
            button.danger-ghost { color: #fca5a5; border-color: #4c1d1d; }
            .list { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
            .empty { text-align: center; color: #71717a; padding: 54px 16px; font-size: 13px; }
            .card { background: #1a1a20; border: 1px solid #2d2d36; border-radius: 10px; padding: 13px 15px; display: flex; flex-direction: column; gap: 9px; }
            .card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
            .user-link { color: #93c5fd; font-weight: 700; font-size: 15px; text-decoration: none; }
            .user-link:hover { text-decoration: underline; }
            .badges { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .pill { font-size: 11px; padding: 2px 7px; border-radius: 5px; background: #24242b; color: #a1a1aa; border: 1px solid #363640; }
            .pill-ex { background: rgba(201, 122, 107, 0.16); color: #fca5a5; border-color: #8b4f44; }
            .pill-warn { background: rgba(212, 168, 67, 0.18); color: #fcd34d; border-color: #9a7b2e; }
            .pill-group { background: rgba(138, 184, 150, 0.12); color: #6ee7b7; border-color: rgba(138, 184, 150, 0.35); }
            .stage-bar { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
            .stage-btn { padding: 3px 8px; font-size: 11px; border-radius: 5px; }
            .gender-seg { display: inline-flex; border: 1px solid #3a3a44; border-radius: 5px; overflow: hidden; }
            .gender-seg button { border: none; border-radius: 0; padding: 3px 7px; font-size: 11px; background: #1d1d24; }
            .gender-seg button.g-female { background: rgba(212, 168, 67, 0.22); color: #fde047; font-weight: 600; }
            .gender-seg button.g-male { background: rgba(122, 163, 184, 0.22); color: #7dd3fc; font-weight: 600; }
            .gender-seg button.g-other { background: rgba(138, 184, 150, 0.22); color: #6ee7b7; font-weight: 600; }
            .gender-seg button.g-auto { background: #2c2c36; color: #e4e4e7; font-weight: 600; }
            .note-row { display: flex; gap: 8px; align-items: flex-start; width: 100%; }
            .note-area { flex: 1; min-height: 44px; resize: vertical; line-height: 1.45; background: #131317; border-color: #32323c; }
            .cache-panel { background: #131317; border: 1px solid #272730; border-radius: 7px; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
            .cache-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; color: #8e8e9a; }
            .sub-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
            .sub-tab { padding: 2px 7px; font-size: 11px; border-radius: 4px; }
            .sub-tab.active { background: #2c2c36; color: #f4f4f5; border-color: #525260; }
            .bio-body { font-size: 12px; color: #d4d4d8; line-height: 1.5; white-space: pre-wrap; max-height: 220px; overflow-y: auto; }
            .fetish-group { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
            .ftag-into { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(138, 184, 150, 0.14); color: #6ee7b7; border: 1px solid rgba(138, 184, 150, 0.35); }
            .ftag-limit { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: rgba(201, 122, 107, 0.14); color: #fca5a5; border: 1px solid rgba(201, 122, 107, 0.35); }
          </style>
          <div class="backdrop" id="crm-backdrop">
            <div class="modal" role="dialog" aria-modal="true" aria-label="Local FetLife CRM">
              <div class="header">
                <div class="title-wrap">
                  <span class="title">Local FetLife CRM</span>
                  <span class="subtitle" id="crm-summary"></span>
                </div>
                <div class="stage-bar">
                  <button type="button" id="crm-export-md">Download .md</button>
                  <button type="button" id="crm-export">Download .json</button>
                  <button type="button" id="crm-close">✕ Close (Esc)</button>
                </div>
              </div>
              <div class="controls">
                <div class="control-row">
                  <input type="text" class="search-input" id="crm-search" placeholder="Search handle, location, groups, notes, About, or fetishes...">
                  <select id="crm-gender-filter">
                    <option value="all">All Genders</option>
                    <option value="female">♀ Cis Female Only</option>
                    <option value="male">♂ Male Only</option>
                    <option value="other"> transgender Trans / NB / Other</option>
                    <option value="unknown">Gender Unknown</option>
                  </select>
                  <select id="crm-rel-filter">
                    <option value="all">All Relationships</option>
                    <option value="single">Single / Available</option>
                    <option value="partnered">Partnered / Married / Poly</option>
                    <option value="unknown">Relationship Unknown</option>
                  </select>
                  <input type="number" class="age-input" id="crm-age-min" min="18" max="99" placeholder="Min age">
                  <input type="number" class="age-input" id="crm-age-max" min="18" max="99" placeholder="Max age">
                </div>
                <div class="control-row">
                  <select id="crm-cat-filter">
                    <option value="all">All Categories</option>
                    ${settings.highlightRules.map(r => `<option value="rule:${r.id || r.label}">${escapeHtml(r.label)}</option>`).join('')}
                    <option value="excluded">Has Excluded Term</option>
                    <option value="conflict">Has Limit Conflict</option>
                  </select>
                  <select id="crm-sort">
                    <option value="matches">Sort: Most Categories Matched</option>
                    <option value="priority">Sort: Pipeline Stage & Notes</option>
                    <option value="recent">Sort: Most Recent</option>
                    <option value="alpha">Sort: Username (A–Z)</option>
                  </select>
                  <button type="button" class="toggle-pill" id="crm-tgl-excludes">🚫 Hide Excludes</button>
                  <button type="button" class="toggle-pill" id="crm-tgl-local">📍 Local Region Only</button>
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

        $('crm-backdrop').addEventListener('click', (e) => { if (e.target === $('crm-backdrop')) this.close(); });
        $('crm-close').addEventListener('click', () => this.close());

        $('crm-export').addEventListener('click', () => {
          const today = new Date().toISOString().slice(0, 10);
          downloadTextFile(`FetLife-CRM-Backup-${today}.json`, Store.exportAll(), 'application/json');
          $('crm-summary').textContent = `✓ Downloaded FetLife-CRM-Backup-${today}.json`;
        });

        $('crm-export-md').addEventListener('click', () => {
          const today = new Date().toISOString().slice(0, 10);
          const md = this.generateMarkdownDossier(this.lastRenderedEntries);
          downloadTextFile(`FetLife-CRM-Dossier-${today}.md`, md, 'text/markdown');
          $('crm-summary').textContent = `✓ Downloaded Markdown dossier (${this.lastRenderedEntries.length} profiles)`;
        });

        searchInput.addEventListener('input', (e) => { this.searchQuery = e.target.value; this.refreshList(); });
        genderSelect.addEventListener('change', (e) => { this.filterGender = e.target.value; this.refreshList(); });
        relSelect.addEventListener('change', (e) => { this.filterRel = e.target.value; this.refreshList(); });
        minAgeInput.addEventListener('input', (e) => { this.minAgeFilter = e.target.value; this.refreshList(); });
        maxAgeInput.addEventListener('input', (e) => { this.maxAgeFilter = e.target.value; this.refreshList(); });
        catSelect.addEventListener('change', (e) => { this.filterCategory = e.target.value; this.refreshList(); });
        sortSelect.addEventListener('change', (e) => { this.sortBy = e.target.value; this.refreshList(); });

        btnExcludes.addEventListener('click', () => { this.hideExcludes = !this.hideExcludes; syncToggleButtons(); this.refreshList(); });
        btnLocal.addEventListener('click', () => { this.localOnly = !this.localOnly; syncToggleButtons(); this.refreshList(); });
        btnFollowUp.addEventListener('click', () => { this.followUpOnly = !this.followUpOnly; syncToggleButtons(); this.refreshList(); });

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
        social: allEntries.filter(e => e.isFriend || e.isFollowing).length,
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
        { id: 'social', label: `🤝 Friends/Follows (${counts.social})` },
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
        btn.addEventListener('click', () => { this.filterStatus = t.id; this.refreshList(); });
        tabsEl.appendChild(btn);
      }

      const q = this.searchQuery.trim().toLowerCase();
      const minA = normalizeValidAge(this.minAgeFilter);
      const maxA = normalizeValidAge(this.maxAgeFilter);

      const filtered = allEntries.filter((entry) => {
        if (this.filterStatus === 'shortlist' && entry.status !== 'shortlist') return false;
        if (this.filterStatus === 'messaged' && entry.status !== 'messaged') return false;
        if (this.filterStatus === 'talking' && entry.status !== 'talking') return false;
        if (this.filterStatus === 'met' && entry.status !== 'met') return false;
        if (this.filterStatus === 'social' && !entry.isFriend && !entry.isFollowing) return false;
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
          if (classifyRelationshipStatus(entry.relationships) !== 'single') return false;
        } else if (this.filterRel === 'partnered') {
          if (classifyRelationshipStatus(entry.relationships) !== 'partnered') return false;
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
            entry.displayHandle, entry.key, entry.gender || '', entry.genderRole || '',
            entry.location || '', entry.relationships || '', entry.lookingFor || '',
            entry.groups.join(' '), entry.note, entry.aboutText, entry.writingsText,
            entry.fetishesText, entry.fetishesLimits.join(' '), entry.fullText,
            ...entry.ruleHits.map(h => `${h.label} ${h.keyword}`), ...entry.excludedHits
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
        if (this.sortBy === 'alpha') return a.displayHandle.localeCompare(b.displayHandle);
        if (this.sortBy === 'recent') return (b.recentStamp - a.recentStamp) || a.displayHandle.localeCompare(b.displayHandle);
        if (this.sortBy === 'matches') {
          const matchDiff = b.ruleHits.length - a.ruleHits.length;
          if (matchDiff !== 0) return matchDiff;
          const swDiff = stageWeight(b.status) - stageWeight(a.status);
          if (swDiff !== 0) return swDiff;
          return (b.recentStamp - a.recentStamp) || a.displayHandle.localeCompare(b.displayHandle);
        }
        const score = (x) => stageWeight(x.status) + (x.isFriend ? 35 : 0) + (x.isFollowing ? 15 : 0) + (x.note.trim() ? 25 : 0) + (x.ruleHits.length * 5);
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
        if (activeStage) card.style.borderLeft = `4px solid ${activeStage.color}`;
        else if (entry.ruleHits.length > 0) card.style.borderLeft = `4px solid ${entry.ruleHits[0].color}`;
        else if (entry.excludedHits.length > 0) card.style.borderLeft = `4px solid ${PALETTE.stage.hidden.border}`;

        const top = document.createElement('div');
        top.className = 'card-top';

        const leftInfo = document.createElement('div');
        leftInfo.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;';

        const link = document.createElement('a');
        link.className = 'user-link';
        link.href = entry.profileUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = `/${escapeHtml(entry.displayHandle)}`;
        leftInfo.appendChild(link);

        const demoPill = createDemographicPill(entry.age, entry.gender, entry.genderRole, entry.location, entry.isManualGender, entry.genderCategory);
        if (demoPill) leftInfo.appendChild(demoPill);

        const dots = createMatchDotsCluster(entry.ruleHits, entry.limitConflicts, entry.excludedHits);
        if (dots) leftInfo.appendChild(dots);

        const badges = document.createElement('div');
        badges.className = 'badges';

        if (entry.isFriend) {
          const b = document.createElement('span');
          b.className = 'pill pill-group';
          b.textContent = '★ Friend';
          badges.appendChild(b);
        } else if (entry.isFollowing) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = PALETTE.ui.follow;
          b.style.borderColor = PALETTE.stage.messaged.border;
          b.textContent = '✓ Following';
          badges.appendChild(b);
        }

        if (entry.relationships) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = PALETTE.ui.cool;
          b.style.borderColor = 'rgba(138, 184, 150, 0.35)';
          b.textContent = escapeHtml(entry.relationships);
          badges.appendChild(b);
        }

        if (entry.lastContacted) {
          const b = document.createElement('span');
          b.className = 'pill';
          b.style.color = entry.followUpDue ? PALETTE.ui.warn : PALETTE.ui.follow;
          b.style.borderColor = entry.followUpDue ? PALETTE.stage.shortlist.border : PALETTE.stage.messaged.border;
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
          const limCount = entry.fetishesLimits.length;
          b.textContent = `${entry.hasAbout ? 'About ✓' : 'No About'}${entry.fetishesInto.length ? ' • Fetishes ✓' : ''}${limCount ? ` • Limits (${limCount})` : ''}`;
          if (entry.noAbout) {
            b.style.color = PALETTE.ui.warn;
            b.style.borderColor = PALETTE.stage.hidden.border;
          }
          badges.appendChild(b);
        }

        for (const g of entry.sharedGroups.slice(0, 3)) {
          const b = document.createElement('span');
          b.className = 'pill pill-group';
          b.textContent = `🤝 ${escapeHtml(g)}`;
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
          b.textContent = `-${escapeHtml(kw)}`;
          badges.appendChild(b);
        }

        leftInfo.appendChild(badges);

        const stageBar = document.createElement('div');
        stageBar.className = 'stage-bar';

        const genderSeg = document.createElement('div');
        genderSeg.className = 'gender-seg';

        const genderOpts = [
          { val: null,     label: 'Auto',     activeCls: 'g-auto' },
          { val: 'female', label: '♀ Female', activeCls: 'g-female' },
          { val: 'male',   label: '♂ Male',   activeCls: 'g-male' },
          { val: 'other',  label: ' transgender Other',  activeCls: 'g-other' }
        ];
        for (const gOpt of genderOpts) {
          const gBtn = document.createElement('button');
          gBtn.type = 'button';
          gBtn.textContent = gOpt.label;
          if ((entry.manualGender || null) === gOpt.val) gBtn.className = gOpt.activeCls;
          gBtn.addEventListener('click', () => {
            Store.setUser(entry.key, { username: entry.displayHandle, manualGender: gOpt.val });
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
            Store.setUser(entry.key, { username: entry.displayHandle, status: isCurrent ? null : st.id });
            this.refreshList();
          });
          stageBar.appendChild(sBtn);
        }

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'stage-btn danger-ghost';
        delBtn.textContent = 'Delete';
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
          lfLine.textContent = `Looking for: ${escapeHtml(entry.lookingFor)}`;
          card.appendChild(lfLine);
        }

        const noteRow = document.createElement('div');
        noteRow.className = 'note-row';

        const noteArea = document.createElement('textarea');
        noteArea.className = 'note-area';
        noteArea.placeholder = `Private notes for /${escapeHtml(entry.displayHandle)}...`;
        noteArea.value = entry.note;

        const saveNoteBtn = document.createElement('button');
        saveNoteBtn.type = 'button';
        saveNoteBtn.textContent = 'Save Note';
        const persistNote = () => {
          const trimmed = noteArea.value.trim();
          if (trimmed !== entry.note) {
            Store.setUser(entry.key, { username: entry.displayHandle, note: trimmed });
            entry.note = trimmed;
            saveNoteBtn.textContent = 'Saved ✓';
            saveNoteBtn.className = 'active-tab';
            setTimeout(() => { saveNoteBtn.textContent = 'Save Note'; saveNoteBtn.className = ''; }, 1500);
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
            subTabs.querySelectorAll('.sub-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === activeSub));
            bodyBox.innerHTML = '';

            if (activeSub === 'about') {
              bodyBox.textContent = entry.aboutText || (entry.status === 'hidden'
                ? 'Bio prose stripped for Passed profile (demographics & limits retained).'
                : 'No About section written on this profile.');
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
                  chip.textContent = escapeHtml(item);
                  wrap.appendChild(chip);
                }
                bodyBox.append(lbl, wrap);
              }
              if (entry.fetishesLimits.length > 0) {
                const lbl = document.createElement('div');
                lbl.style.cssText = 'font-size:11px;color:#fca5a5;font-weight:600;margin:6px 0 3px;';
                lbl.textContent = `Extracted Profile Limits (${entry.fetishesLimits.length}):`;
                const wrap = document.createElement('div');
                wrap.className = 'fetish-group';
                for (const item of entry.fetishesLimits) {
                  const chip = document.createElement('span');
                  chip.className = 'ftag-limit';
                  chip.textContent = escapeHtml(item);
                  wrap.appendChild(chip);
                }
                bodyBox.append(lbl, wrap);
              }
              if (entry.fetishesInto.length === 0 && entry.fetishesLimits.length === 0) {
                bodyBox.textContent = entry.fetishesText || 'No structured fetishes or profile limits cached yet.';
              }
            } else if (activeSub === 'writings') {
              bodyBox.textContent = entry.writingsText || 'No Writings or Lists cached for this profile.';
            } else if (activeSub === 'groups') {
              bodyBox.textContent = entry.groups.length > 0 ? entry.groups.map(escapeHtml).join('  •  ') : 'No groups cached for this profile.';
            } else {
              bodyBox.textContent = entry.fullText || 'No full-text cache stored.';
            }
          };

          const tabOptions = [
            { id: 'about', label: `About${entry.aboutText ? ` (${entry.aboutText.length})` : ''}` },
            ...(entry.hasFetishes ? [{ id: 'fetishes', label: `Fetishes & Limits (${entry.fetishesLimits.length})` }] : []),
            ...(entry.writingsText ? [{ id: 'writings', label: 'Writings' }] : []),
            ...(entry.groups.length > 0 ? [{ id: 'groups', label: `Groups (${entry.groups.length})` }] : []),
            { id: 'full', label: 'Full Cache' }
          ];

          for (const opt of tabOptions) {
            const tBtn = document.createElement('button');
            tBtn.type = 'button';
            tBtn.className = `sub-tab ${activeSub === opt.id ? 'active' : ''}`;
            tBtn.textContent = opt.label;
            tBtn.dataset.tab = opt.id;
            tBtn.addEventListener('click', () => { activeSub = opt.id; renderCacheBody(); });
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
  // 11. SHADOW DOM FLOATING HUD (MULTI-SELECT GENDERS + PRESET PACK I/O)
  // =========================================================================
  const Hud = {
    shadow: null,
    host: null,
    expanded: false,
    countSpan: null,
    cacheSpan: null,
    viewModeBtn: null,
    hideModeBtn: null,
    batchOpenBtn: null,
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
      CardNavigator.showToast(`Overlay → ${VIEW_MODE_LABELS[next] || next}`);
    },

    init() {
      const mountRoot = document.documentElement || document.body;
      if (!mountRoot) return;

      const existing = document.getElementById('flx-hud-host');
      if (existing) {
        if (existing.parentElement !== mountRoot) mountRoot.appendChild(existing);
        return;
      }

      const settings = Store.getSettings();
      this.draftKeybinds = Object.assign({}, settings.keybinds);
      this.host = document.createElement('div');
      this.host.id = 'flx-hud-host';
      this.host.style.cssText = 'position:fixed;z-index:2147483646;';
      this.applyPosition(settings.hudPosition);

      this.shadow = this.host.attachShadow({ mode: 'open' });
      shieldShadowInputs(this.shadow);
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
            box-shadow: 0 8px 28px rgba(0,0,0,0.75); width: min(485px, calc(100vw - 32px)); max-height: 82vh; overflow-y: auto;
          }
          .box.collapsed { width: auto; overflow: visible; }
          .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
          button {
            background: #232329; color: #e4e4e7; border: 1px solid #3f3f48; border-radius: 5px;
            padding: 4px 8px; cursor: pointer; font-size: 11px;
          }
          button:hover { background: #303038; color: #fff; }
          button.star { background: rgba(212, 168, 67, 0.18); border-color: #9a7b2e; color: #fde047; font-weight: 600; }
          button.sky { background: rgba(122, 163, 184, 0.16); border-color: #4a6b7d; color: #7dd3fc; font-weight: 600; }
          button.danger { background: rgba(201, 122, 107, 0.18); border-color: #8b4f44; color: #fca5a5; }
          button.capturing { background: rgba(122, 163, 184, 0.22); border-color: #4a6b7d; color: #7dd3fc; font-weight: 600; }
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
          .gender-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
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
            <button type="button" id="btn-batch-open" title="Open up to 5 visible, un-filtered, un-cached profile cards in background tabs">Open Uncached</button>
            <button type="button" id="btn-hide-mode" title="Toggle between removing (zero-height) or dimming filtered cards">Filtered: Removed</button>
            <button type="button" id="btn-view-mode" title="Cycle overlay view: Full / Compact / Minimal (V)">View: Full</button>
            <button type="button" id="btn-hidden"></button>
            <button type="button" id="btn-pause"></button>
            <span class="scan-pill" id="cache-status">Cached: 0</span>
          </div>
          <div class="panel" id="hud-panel" style="display:none;">
            <div class="section-box">
              <div class="rules-header"><span>📦 Preset Pack Builder, Loader &amp; I/O (≤2 Words, Deduplicated)</span></div>
              <div class="row">
                <select id="in-pack-select" style="flex:1;"></select>
                <button type="button" class="sky" id="btn-load-pack">Load Pack</button>
                <button type="button" id="btn-import-pack">Import Pack .json</button>
              </div>
              <div class="row">
                <input type="text" id="in-new-pack-name" placeholder="Pack name (e.g. My Sensory Pack)" style="flex:1;">
                <button type="button" id="btn-save-pack">Save Pack</button>
                <button type="button" id="btn-export-pack">Export Pack .json</button>
              </div>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>👤 My Profile &amp; Smart Preference Learner</span>
                <button type="button" class="sky" id="btn-learn-self">✨ Learn From My Profile</button>
              </div>
              <div id="self-profile-summary" style="font-size:11px;color:#9ca3af;"></div>
              <label class="inline-label">
                <input type="checkbox" id="in-auto-learn-self"> Auto-sync my Fetishes &amp; Limits when visiting my profile
              </label>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Show Genders (Toggle Any Combination)</span>
              </div>
              <div class="gender-grid">
                <label class="inline-label"><input type="checkbox" id="in-g-female"> ♀ Cis Female</label>
                <label class="inline-label"><input type="checkbox" id="in-g-male"> ♂ Cis Male</label>
                <label class="inline-label"><input type="checkbox" id="in-g-other"> transgender Trans / Non-Binary / Other</label>
                <label class="inline-label"><input type="checkbox" id="in-g-unknown"> ❓ Unspecified Gender</label>
              </div>
            </div>

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
                <label>Overlay View Mode
                  <select id="in-view-mode">
                    <option value="full">Full Overlay + Pills</option>
                    <option value="compact">Compact Overlay (Dots)</option>
                    <option value="minimal">Minimal Strip (Dots)</option>
                    <option value="off">Hidden Overlays</option>
                  </select>
                </label>
              </div>
              <div class="grid2">
                <label>Filtered Card Action
                  <select id="in-mode">
                    <option value="remove">Remove From View (Layout-Safe)</option>
                    <option value="dim">Dim Card</option>
                  </select>
                </label>
                <label>Relationship Filter
                  <select id="in-rel-filter">
                    <option value="all">All Relationships</option>
                    <option value="single">Single / Available Only</option>
                    <option value="partnered">Partnered / Married Only</option>
                  </select>
                </label>
              </div>
              <label class="inline-label">
                <input type="checkbox" id="in-exempt-social"> ★ Always keep Friends, Following, Shortlisted, Interacted &amp; Noted profiles visible
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-local-only"> 📍 Local Region Filter (hide profiles outside your Local Regions)
              </label>
              <label>Local Regions (comma-separated, e.g. portland, oregon, vancouver, wa)
                <input type="text" id="in-local-regions" placeholder="portland, oregon, vancouver, wa">
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-allow-explore-unknown"> Keep uncached Explore tiles visible when location isn't shown on card (prevents scroll loop)
              </label>
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
                <label>Dim Opacity (<span id="opacity-val">18%</span>)
                  <input type="range" id="in-opacity" min="0.05" max="0.75" step="0.05">
                </label>
                <label>Cache Retention (Days)
                  <input type="number" id="in-ttl" min="1" max="90">
                </label>
              </div>
              <label class="inline-label">
                <input type="checkbox" id="in-cache-match"> Only auto-cache profiles matching active display filters
              </label>
              <label class="inline-label">
                <input type="checkbox" id="in-chat-strip"> Show compact CRM bar in Inbox &amp; Chat Dock
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
                <span>Content Color Categories (≤2 Words per Term)</span>
                <button type="button" id="btn-add-rule">+ Add Category</button>
              </div>
              <div id="rules-list"></div>
              <label style="margin-top:4px;">Excludes (≤2 Words per Term, Deduplicated)
                <input type="text" id="in-exclude" placeholder="comma-separated terms (max 2 words each)...">
              </label>
            </div>

            <div class="section-box">
              <div class="rules-header">
                <span>Outreach Templates ({username})</span>
                <div class="row">
                  <button type="button" id="btn-reset-tpls">Reset</button>
                  <button type="button" id="btn-add-tpl">+ Add Template</button>
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
                <span>Local Storage & File Backups</span>
                <span id="storage-size" style="font-weight:normal;color:#9ca3af;">0 KB</span>
              </div>
              <div class="row">
                <button type="button" class="star" id="btn-save" style="flex:1;">Save All Settings</button>
                <button type="button" id="btn-purge-excluded">Purge Non-Matching Cache</button>
                <button type="button" id="btn-slim-storage">Slim Storage</button>
              </div>
              <div class="row">
                <button type="button" id="btn-prune-cache">Prune Expired</button>
                <button type="button" id="btn-clear-cache">Clear Cache</button>
                <button type="button" id="btn-export" style="flex:1;">Download .json</button>
                <button type="button" id="btn-import" style="flex:1;">Load .json</button>
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
      this.hideModeBtn = $('btn-hide-mode');
      this.batchOpenBtn = $('btn-batch-open');
      this.showHiddenBtn = $('btn-hidden');
      this.pauseBtn = $('btn-pause');

      const refreshPackDropdown = () => {
        const sel = $('in-pack-select');
        if (!sel) return;
        sel.innerHTML = '';
        for (const pack of Object.values(Store.getAllAvailablePacks())) {
          const opt = document.createElement('option');
          opt.value = pack.id;
          opt.textContent = escapeHtml(pack.name);
          opt.title = escapeHtml(pack.description || '');
          sel.appendChild(opt);
        }
      };

      const refreshStorageLabel = () => {
        const stats = Store.getStorageStats();
        $('storage-size').textContent = `${stats.kb} KB [${stats.backend}] (${stats.cacheCount} cached, ${stats.userCount} CRM)`;
      };

      const refreshSelfSummary = () => {
        const { selfId, selfUsername, displayUsername } = getSelfIdentity();
        const selfProf = Store.getSelfProfile();
        const handleLabel = displayUsername || selfProf.username || selfUsername || (selfId ? `User #${selfId}` : 'Not detected yet');
        const intoCount = (selfProf.fetishesInto || []).length;
        const limCount = (selfProf.fetishesLimits || []).length;
        $('self-profile-summary').textContent =
          `/${escapeHtml(handleLabel)} • ${escapeHtml(selfProf.orientation || 'Orientation?')} • ${escapeHtml(selfProf.location || 'Location?')} • ${intoCount} Into • ${limCount} Limits`;
      };

      const addRuleRow = (rule = { label: 'New Tag', color: PALETTE.ui.accent, keywords: [] }) => {
        const row = document.createElement('div');
        row.className = 'rule-row';
        row.dataset.ruleId = rule.id || `custom_${Date.now()}`;

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = rule.color || PALETTE.ui.accent;

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'rule-label';
        labelInput.placeholder = 'Category';
        labelInput.value = rule.label || '';

        const kwInput = document.createElement('input');
        kwInput.type = 'text';
        kwInput.className = 'rule-kws';
        kwInput.placeholder = 'term1, term2 (≤2 words)';
        kwInput.value = Array.isArray(rule.keywords) ? rule.keywords.join(', ') : '';

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'rule-del';
        delBtn.textContent = '×';
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

        refreshPackDropdown();
        $('in-auto-learn-self').checked = Boolean(s.autoLearnFromSelf);
        $('in-g-female').checked = s.allowedGenders.female !== false;
        $('in-g-male').checked = s.allowedGenders.male !== false;
        $('in-g-other').checked = s.allowedGenders.other !== false;
        $('in-g-unknown').checked = s.allowedGenders.unknown !== false;

        $('in-pos').value = s.hudPosition;
        $('in-view-mode').value = s.cardViewMode || 'full';
        $('in-mode').value = s.hideMode;
        $('in-rel-filter').value = s.relationshipFilter || 'all';
        $('in-exempt-social').checked = Boolean(s.exemptInteractedAndSocial);
        $('in-local-only').checked = Boolean(s.localOnlyFilter);
        $('in-local-regions').value = (s.localRegions || []).join(', ');
        $('in-allow-explore-unknown').checked = Boolean(s.allowUnknownLocationOnExplore);
        $('in-cache-match').checked = Boolean(s.cacheMatchDisplayFilters);

        $('in-opacity').value = s.dimOpacity;
        $('opacity-val').textContent = `${Math.round(s.dimOpacity * 100)}%`;
        $('in-age-filter').checked = Boolean(s.filterByAge);
        $('in-min-age').value = s.minAge;
        $('in-max-age').value = s.maxAge;
        $('in-chat-strip').checked = Boolean(s.enableChatStrip);
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
        refreshSelfSummary();
        refreshStorageLabel();
      };

      $('btn-load-pack').addEventListener('click', () => {
        const packId = $('in-pack-select').value;
        const res = Store.applyPresetPack(packId);
        syncFormFromStore();
        runAll();
        $('hud-status').textContent = `✓ Loaded +${res.rulesAdded} rule terms, +${res.excludesAdded} excludes (${res.duplicatesSkipped} duplicates skipped)`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3500);
      });

      $('btn-import-pack').addEventListener('click', () => {
        promptJsonFileUpload((rawText, fileName) => {
          try {
            const imported = Store.sanitizeAndStoreImportedPack(rawText);
            refreshPackDropdown();
            $('in-pack-select').value = imported.id;
            $('hud-status').textContent = `✓ Imported pack "${escapeHtml(imported.name)}" from ${escapeHtml(fileName)} (≤2 words, deduplicated)`;
            setTimeout(() => { $('hud-status').textContent = ''; }, 3500);
          } catch (err) {
            $('hud-status').textContent = `✕ Invalid pack JSON: ${err.message}`;
          }
        });
      });

      $('btn-save-pack').addEventListener('click', () => {
        const packName = $('in-new-pack-name').value.trim() || 'Custom Pack';
        const created = Store.buildPackFromCurrentSettings(packName);
        const s = Store.getSettings();
        Store.saveSettings({ customPacks: [...(s.customPacks || []), created] });
        $('in-new-pack-name').value = '';
        refreshPackDropdown();
        $('in-pack-select').value = created.id;
        $('hud-status').textContent = `✓ Saved preset pack "${escapeHtml(created.name)}"`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-export-pack').addEventListener('click', () => {
        const packName = $('in-new-pack-name').value.trim() || 'FetLife-Filter-Pack';
        const packObj = Store.buildPackFromCurrentSettings(packName);
        downloadTextFile(`${packObj.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, JSON.stringify(packObj, null, 2));
        $('hud-status').textContent = `✓ Exported "${escapeHtml(packObj.name)}" (.json)`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-learn-self').addEventListener('click', () => {
        const selfProf = Store.getSelfProfile();
        if (!selfProf.orientation && !selfProf.location && (selfProf.fetishesInto || []).length === 0) {
          const { displayUsername, selfUsername } = getSelfIdentity();
          const h = displayUsername || selfUsername;
          if (h) {
            openProfileInBackgroundTab(`${window.location.origin}/${h}`);
            $('hud-status').textContent = `Opened /${h} — visit it once so the script can learn your orientation, region, kinks & limits`;
          } else {
            $('hud-status').textContent = 'Visit your own FetLife profile page once to capture your preferences';
          }
          setTimeout(() => { $('hud-status').textContent = ''; }, 4000);
          return;
        }
        const res = Store.learnPreferencesFromSelf(selfProf, true);
        syncFormFromStore();
        runAll();
        $('hud-status').textContent = `✓ Learned preferences (${res.intoAdded} Shared Kinks, ${res.limitsAdded} Limits)`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      const applyLiveControls = () => {
        const minVal = normalizeValidAge($('in-min-age').value) ?? 21;
        const maxVal = normalizeValidAge($('in-max-age').value) ?? 65;
        const regions = $('in-local-regions').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        Store.saveSettings({
          allowedGenders: {
            female: $('in-g-female').checked,
            male: $('in-g-male').checked,
            other: $('in-g-other').checked,
            unknown: $('in-g-unknown').checked
          },
          filterByAge: $('in-age-filter').checked,
          minAge: Math.min(minVal, maxVal),
          maxAge: Math.max(minVal, maxVal),
          exemptInteractedAndSocial: $('in-exempt-social').checked,
          relationshipFilter: $('in-rel-filter').value,
          localOnlyFilter: $('in-local-only').checked,
          localRegions: regions,
          allowUnknownLocationOnExplore: $('in-allow-explore-unknown').checked,
          cacheMatchDisplayFilters: $('in-cache-match').checked,
          enableChatStrip: $('in-chat-strip').checked,
          hideMode: $('in-mode').value
        });
        this.syncQuickButtons();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
      };

      ['in-g-female', 'in-g-male', 'in-g-other', 'in-g-unknown', 'in-age-filter', 'in-min-age', 'in-max-age',
       'in-exempt-social', 'in-rel-filter', 'in-local-only', 'in-local-regions', 'in-allow-explore-unknown',
       'in-cache-match', 'in-chat-strip', 'in-mode'].forEach(id => {
        $(id).addEventListener('change', applyLiveControls);
      });

      $('btn-crm').addEventListener('click', () => {
        if (CrmModal.isOpen) CrmModal.close();
        else CrmModal.open();
      });

      this.batchOpenBtn.addEventListener('click', () => BatchOpener.start(5, 2500));
      this.viewModeBtn.addEventListener('click', () => this.cycleGlobalCardView());
      this.hideModeBtn.addEventListener('click', () => {
        const s = Store.getSettings();
        const nextMode = s.hideMode === 'remove' ? 'dim' : 'remove';
        Store.saveSettings({ hideMode: nextMode });
        if (this.expanded && this.shadow) {
          const modeSel = this.shadow.getElementById('in-mode');
          if (modeSel) modeSel.value = nextMode;
        }
        this.syncQuickButtons();
        runAll();
        CardNavigator.showToast(nextMode === 'remove' ? 'Filtered cards: Removed from view' : 'Filtered cards: Dimmed');
      });

      $('btn-add-rule').addEventListener('click', () => addRuleRow());
      $('btn-add-tpl').addEventListener('click', () => addTemplateRow());
      $('btn-reset-tpls').addEventListener('click', () => {
        Store.saveSettings({ messageTemplates: JSON.parse(JSON.stringify(DEFAULT_MESSAGE_TEMPLATES)) });
        syncFormFromStore();
      });
      $('btn-reset-keys').addEventListener('click', () => {
        Store.resetKeybindsToDefaults();
        syncFormFromStore();
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
        const seenTerms = new Set();
        let dupesFound = 0;
        const collectedRules = [];

        rulesList.querySelectorAll('.rule-row').forEach((row, idx) => {
          const rawTokens = row.querySelector('.rule-kws').value.split(',').map(x => x.trim()).filter(Boolean);
          const { unique, duplicates } = deduplicateTerms(rawTokens, seenTerms);
          dupesFound += duplicates.length;
          if (unique.length > 0) {
            collectedRules.push({ id: row.dataset.ruleId || `rule_${idx}`, label: row.querySelector('.rule-label').value.trim() || `Tag ${idx + 1}`, color: row.querySelector('input[type="color"]').value, keywords: unique });
          }
        });

        const rawExcludes = $('in-exclude').value.split(',').map(x => x.trim()).filter(Boolean);
        const { unique: cleanExcludes, duplicates: exDupes } = deduplicateTerms(rawExcludes, seenTerms);
        dupesFound += exDupes.length;

        const collectedTpls = [];
        tplsList.querySelectorAll('.tpl-card').forEach((card, idx) => {
          const title = card.querySelector('input[type="text"]').value.trim() || `Template ${idx + 1}`;
          const body = card.querySelector('textarea').value.trim();
          if (body.length > 0) {
            collectedTpls.push({ id: card.dataset.tplId || `tpl_${idx}`, title, body });
          }
        });

        const nextKeybinds = Object.assign({}, this.draftKeybinds, { navEnabled: $('in-kb-nav').checked });
        const rawMin = normalizeValidAge($('in-min-age').value) ?? 21;
        const rawMax = normalizeValidAge($('in-max-age').value) ?? 65;
        const regions = $('in-local-regions').value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

        cardViewOverrides.clear();
        const next = Store.saveSettings({
          autoLearnFromSelf: $('in-auto-learn-self').checked,
          allowedGenders: {
            female: $('in-g-female').checked,
            male: $('in-g-male').checked,
            other: $('in-g-other').checked,
            unknown: $('in-g-unknown').checked
          },
          hudPosition: $('in-pos').value,
          cardViewMode: $('in-view-mode').value,
          hideMode: $('in-mode').value,
          exemptInteractedAndSocial: $('in-exempt-social').checked,
          relationshipFilter: $('in-rel-filter').value,
          localOnlyFilter: $('in-local-only').checked,
          localRegions: regions,
          allowUnknownLocationOnExplore: $('in-allow-explore-unknown').checked,
          cacheMatchDisplayFilters: $('in-cache-match').checked,
          dimOpacity: parseFloat($('in-opacity').value) || 0.18,
          filterByAge: $('in-age-filter').checked,
          minAge: Math.min(rawMin, rawMax),
          maxAge: Math.max(rawMin, rawMax),
          enableChatStrip: $('in-chat-strip').checked,
          stickyProfileBar: $('in-sticky-profile').checked,
          bioCacheTtlDays: Math.max(1, parseInt($('in-ttl').value, 10) || 14),
          showNotesInline: $('in-notes').checked,
          hideNoAbout: $('in-noabout').checked,
          highlightRules: collectedRules,
          messageTemplates: collectedTpls,
          keybinds: nextKeybinds,
          excludeKeywords: cleanExcludes
        });

        this.applyPosition(next.hudPosition);
        this.syncQuickButtons();
        syncFormFromStore();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        refreshStorageLabel();
        $('hud-status').textContent = `✓ Saved (≤2 words enforced, ${dupesFound} duplicates removed)`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-purge-excluded').addEventListener('click', () => {
        const res = Store.purgeExcludedFromCache();
        refreshStorageLabel();
        runAll();
        $('hud-status').textContent = `✓ Purged ${res.removedCache} cached & ${res.removedUsers} un-noted excluded records`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3500);
      });

      $('btn-slim-storage').addEventListener('click', () => {
        const count = Store.compactAllStorage();
        refreshStorageLabel();
        $('hud-status').textContent = `✓ Deduplicated ${count} cached entries & stripped Passed prose`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-prune-cache').addEventListener('click', () => {
        const res = Store.pruneExpiredCache();
        Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
        runAll();
        refreshStorageLabel();
        $('hud-status').textContent = `✓ Pruned ${res.pruned} expired entries (${res.retainedTracked} active tracked kept)`;
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
        const today = new Date().toISOString().slice(0, 10);
        downloadTextFile(`FetLife-CRM-Backup-${today}.json`, Store.exportAll(), 'application/json');
        $('hud-status').textContent = `✓ Downloaded FetLife-CRM-Backup-${today}.json`;
        setTimeout(() => { $('hud-status').textContent = ''; }, 3000);
      });

      $('btn-import').addEventListener('click', () => {
        promptJsonFileUpload((rawText, fileName) => {
          try {
            Store.importAll(rawText);
            syncFormFromStore();
            this.applyPosition(Store.getSettings().hudPosition);
            this.syncQuickButtons();
            Array.from(document.getElementsByClassName('flx-profile-bar')).forEach(el => el.remove());
            runAll();
            $('hud-status').textContent = `✓ Restored backup from ${escapeHtml(fileName)}`;
          } catch (err) {
            $('hud-status').textContent = `✕ Invalid JSON file: ${err.message}`;
          }
        });
      });

      this.syncQuickButtons();
      mountRoot.appendChild(this.host);
    },

    syncQuickButtons() {
      const s = Store.getSettings();
      const mode = s.cardViewMode || 'full';

      if (this.batchOpenBtn) {
        if (BatchOpener.isRunning()) {
          this.batchOpenBtn.className = 'danger';
          this.batchOpenBtn.textContent = `Stop (${BatchOpener.remaining.length} left)`;
        } else {
          const uncachedCount = BatchOpener.getUncachedCandidateCards().length;
          this.batchOpenBtn.className = uncachedCount > 0 ? 'sky' : '';
          this.batchOpenBtn.textContent = uncachedCount > 0
            ? `Open Uncached (${Math.min(5, uncachedCount)}/${uncachedCount})`
            : 'Open Uncached (0)';
        }
      }

      if (this.hideModeBtn) {
        const isRemove = s.hideMode === 'remove';
        this.hideModeBtn.className = isRemove ? 'star' : '';
        this.hideModeBtn.textContent = isRemove ? 'Filtered: Removed' : 'Filtered: Dimmed';
      }

      if (this.viewModeBtn) {
        this.viewModeBtn.className = mode === 'minimal' ? 'sky' : (mode === 'compact' ? 'star' : '');
        this.viewModeBtn.textContent = VIEW_MODE_LABELS[mode] || 'View: Full';
      }

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
  // 12. DEBOUNCED, SCOPED OBSERVER & KEYBOARD LISTENER (LOW CPU)
  // =========================================================================
  let debounceTimer = null;
  let lastRunAt = 0;

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
    const target = document.getElementById('main-content') || document.body;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
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
    lastRunAt = Date.now();
    withObserverPaused(() => {
      Store.runOneTimeSanitization();
      syncStickyViewportOffset();
      attachScrollListeners();
      Hud.init();
      const settings = Store.getSettings();
      if (settings.paused) {
        Hud.syncQuickButtons();
        Hud.updateCount(0);
        return;
      }
      const profilePage = enhanceProfilePage();
      const count = enhancePostsAndCards();
      enhanceChatContext();
      Hud.syncQuickButtons();
      Hud.updateCount(count);
      Hud.updateCacheStatus(profilePage);
    });
  }

  function scheduleRun() {
    if (debounceTimer) return;
    const elapsed = Date.now() - lastRunAt;
    const delay = elapsed < 450 ? 450 - elapsed : 250;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      runAll();
    }, delay);
  }

  function cleanup() {
    observer.disconnect();
    clearTimeout(debounceTimer);
    clearTimeout(scrollIdleTimer);
    if (stickyRafPending) cancelAnimationFrame(syncStickyViewportOffset);
    if (BatchOpener.timer) clearTimeout(BatchOpener.timer);
    if (CardNavigator.toastEl) CardNavigator.toastEl.remove();
    if (CardNavigator.toastTimer) clearTimeout(CardNavigator.toastTimer);
  }

  document.addEventListener('keydown', (e) => {
    if (Hud.capturingKeyAction) return;

    const editing = isEditableTarget(e);
    const hasModifier = e.altKey || e.ctrlKey || e.metaKey;
    if (editing && !hasModifier) return;

    const settings = Store.getSettings();
    const kb = settings.keybinds || DEFAULT_KEYBINDS;

    if (kb.toggleCrm && matchesKeyCombo(e, kb.toggleCrm)) {
      if (hasModifier || !editing) {
        e.preventDefault();
        if (CrmModal.isOpen) CrmModal.close();
        else CrmModal.open();
        return;
      }
    }

    if (settings.paused || CrmModal.isOpen || editing) return;

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
