/* ==========================================================================
   Habit RPG — centralized theme manager
   Nine built-in reference themes (stylesheet-driven via data-theme),
   persisted switching, and IndexedDB-backed custom image themes.
   ========================================================================== */
(function () {
  'use strict';

  var ACTIVE_THEME_KEY = window.HabitProfiles
    ? window.HabitProfiles.getThemeKey()
    : 'habitRpg.activeTheme.v1';
  var DB_NAME = 'habitRpgThemes';
  var DB_VERSION = 1;
  var STORE_NAME = 'customThemes';
  var DEFAULT_THEME = 'voxel-world';

  /* Old stored ids from the previous theme system. */
  var LEGACY_THEMES = {
    'default': 'blue-ember',
    'midnight': 'midnight-virtuoso',
    'light': 'light-minimal'
  };

  /* Central registry. Visuals live in css/themes/<id>.css and
     assets/themes/<id>/ — entries here describe and preview each theme. */
  var BUILTIN_THEMES = {
    'voxel-world': {
      name: 'Voxel World',
      description: 'Pixel-cut teal panels, glowing green borders, and a floating voxel landscape.',
      themeColor: '#041b1b',
      ui: { surface: 'rgba(2,38,42,.85)', border: 'rgba(100,255,226,.72)', accent: '#77FF8E', glow: 'rgba(88,255,174,.7)' }
    },
    'blue-ember': {
      name: 'Blue Ember',
      description: 'Forged navy steel lit by electric-blue flame and bright edge light.',
      themeColor: '#02040c',
      ui: { surface: 'rgba(7,17,36,.88)', border: 'rgba(120,190,255,.6)', accent: '#3F9DFF', glow: 'rgba(63,157,255,.66)' }
    },
    'abyssal-athlete': {
      name: 'Abyssal Athlete',
      description: 'Deep-water glass, lane lines, bubbles, and cyan competitive-swimming light.',
      themeColor: '#01121e',
      ui: { surface: 'rgba(3,34,50,.85)', border: 'rgba(53,224,255,.55)', accent: '#35E0FF', glow: 'rgba(53,224,255,.6)' }
    },
    'midnight-virtuoso': {
      name: 'Midnight Virtuoso',
      description: 'A moonlit concert hall in black lacquer, ivory, violet, and warm gold.',
      themeColor: '#070510',
      ui: { surface: 'rgba(18,13,30,.9)', border: 'rgba(212,175,106,.5)', accent: '#D4AF6A', glow: 'rgba(212,175,106,.45)' }
    },
    'scholars-observatory': {
      name: "Scholar's Observatory",
      description: 'Midnight navy star maps, gold instruments, and constellation-dotted cards.',
      themeColor: '#050a1e',
      ui: { surface: 'rgba(12,17,42,.9)', border: 'rgba(227,184,92,.5)', accent: '#E3B85C', glow: 'rgba(154,215,255,.5)' }
    },
    'roman-resolve': {
      name: 'Roman Resolve',
      description: 'Black stone, bronze, crimson, and gold — engraved Stoic discipline.',
      themeColor: '#0d0a08',
      ui: { surface: 'rgba(26,20,15,.92)', border: 'rgba(201,162,39,.55)', accent: '#C9A227', glow: 'rgba(201,162,39,.4)' }
    },
    'neon-training-lab': {
      name: 'Neon Training Lab',
      description: 'Biometric HUD panels, scan lines, and cyan-lime performance energy.',
      themeColor: '#020604',
      ui: { surface: 'rgba(6,17,12,.9)', border: 'rgba(43,245,216,.55)', accent: '#2BF5D8', glow: 'rgba(43,245,216,.6)' }
    },
    'light-minimal': {
      name: 'Light Minimal',
      description: 'Bright white surfaces, soft shadows, and restrained blue-green accents.',
      themeColor: '#f4f6f9',
      ui: { surface: 'rgba(255,255,255,.92)', border: 'rgba(37,99,235,.32)', accent: '#2563EB', glow: 'rgba(37,99,235,.24)' }
    },
    'monarch': {
      name: 'Monarch',
      description: 'Black velvet, deep burgundy, and polished gold — a royal command deck.',
      themeColor: '#0a0508',
      ui: { surface: 'rgba(28,13,20,.92)', border: 'rgba(224,178,82,.55)', accent: '#E0B252', glow: 'rgba(224,178,82,.45)' }
    }
  };

  Object.keys(BUILTIN_THEMES).forEach(function (id) {
    BUILTIN_THEMES[id].preview =
      'linear-gradient(rgba(2,6,10,.16), rgba(2,6,10,.44)), url("assets/themes/' + id + '/bg.svg") center/cover';
  });

  /* The inline-variable contract used by custom image themes. Built-in
     themes never set inline vars — their stylesheets own the look. */
  var VAR_KEYS = [
    '--theme-bg', '--theme-bg-image', '--theme-bg-overlay', '--theme-texture',
    '--theme-surface', '--theme-surface-raised', '--theme-surface-transparent',
    '--theme-header', '--theme-input', '--theme-text', '--theme-text-muted',
    '--theme-accent', '--theme-accent-secondary', '--theme-border',
    '--theme-border-strong', '--theme-shadow', '--theme-glow', '--theme-success',
    '--theme-danger', '--theme-xp-fill', '--theme-xp', '--theme-on-accent',
    '--theme-radius', '--theme-radius-sm', '--theme-heading-font', '--theme-body-font'
  ];

  var customThemes = [];
  var activeThemeId = normalizeId(localStorage.getItem(ACTIVE_THEME_KEY) || DEFAULT_THEME);
  var activeImageUrl = null;
  var pendingCustom = null;
  var dbPromise = null;

  function $(id) { return document.getElementById(id); }

  function normalizeId(id) {
    if (LEGACY_THEMES[id]) return LEGACY_THEMES[id];
    return id;
  }

  function openDatabase() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
    });
    return dbPromise;
  }

  function readCustomThemes() {
    return openDatabase().then(function (db) {
      if (!db) return [];
      return new Promise(function (resolve) {
        var request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
        request.onsuccess = function () { resolve(request.result || []); };
        request.onerror = function () { resolve([]); };
      });
    });
  }

  function writeCustomTheme(theme) {
    return openDatabase().then(function (db) {
      if (!db) throw new Error('Image theme storage is unavailable in this browser.');
      return new Promise(function (resolve, reject) {
        var storedTheme = Object.assign({}, theme);
        delete storedTheme.previewUrl;
        var request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(storedTheme);
        request.onsuccess = function () { resolve(); };
        request.onerror = function () { reject(request.error); };
      });
    });
  }

  function removeCustomTheme(id) {
    return openDatabase().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var request = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
        request.onsuccess = request.onerror = function () { resolve(); };
      });
    });
  }

  function getTheme(id) {
    if (BUILTIN_THEMES[id]) return BUILTIN_THEMES[id];
    for (var i = 0; i < customThemes.length; i++) {
      if (customThemes[i].id === id) return customThemes[i];
    }
    return null;
  }

  function clearVariables() {
    var root = document.documentElement;
    VAR_KEYS.forEach(function (key) { root.style.removeProperty(key); });
  }

  function setVariables(vars) {
    clearVariables();
    var root = document.documentElement;
    Object.keys(vars).forEach(function (key) { root.style.setProperty(key, vars[key]); });
  }

  function applyTheme(id, persist) {
    id = normalizeId(id);
    var theme = getTheme(id);
    if (!theme) { theme = BUILTIN_THEMES[DEFAULT_THEME]; id = DEFAULT_THEME; }
    if (activeImageUrl) {
      URL.revokeObjectURL(activeImageUrl);
      activeImageUrl = null;
    }

    var themeColor;
    if (BUILTIN_THEMES[id]) {
      /* Stylesheets own built-in themes; remove any custom inline vars. */
      clearVariables();
      document.documentElement.dataset.theme = id;
      themeColor = theme.themeColor;
    } else {
      var vars = Object.assign({}, theme.vars);
      if (theme.imageBlob) {
        activeImageUrl = URL.createObjectURL(theme.imageBlob);
        vars['--theme-bg-image'] = 'url("' + activeImageUrl + '")';
      }
      setVariables(vars);
      document.documentElement.dataset.theme = 'custom';
      themeColor = vars['--theme-bg'] || '#0B0F1A';
    }

    document.documentElement.dataset.themeId = id;
    activeThemeId = id;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColor);
    var label = $('themeShortcutLabel');
    if (label) label.textContent = theme.name;
    if (persist !== false) localStorage.setItem(ACTIVE_THEME_KEY, id);
    renderThemeCards();
    window.dispatchEvent(new CustomEvent('habit-theme-change', { detail: { id: id, theme: theme } }));
  }

  function makeElement(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (typeof text === 'string') el.textContent = text;
    return el;
  }

  function imageUrlForTheme(theme) {
    if (theme.imageBlob) {
      if (!theme.previewUrl) theme.previewUrl = URL.createObjectURL(theme.imageBlob);
      return theme.previewUrl;
    }
    return null;
  }

  function themeUi(theme) {
    if (theme.ui) return theme.ui;
    var vars = theme.vars || {};
    return {
      surface: vars['--theme-surface-transparent'] || 'rgba(20,27,46,.88)',
      border: vars['--theme-border-strong'] || 'rgba(96,165,250,.32)',
      accent: vars['--theme-accent'] || '#3B82F6',
      glow: vars['--theme-glow'] || 'rgba(56,189,248,.62)'
    };
  }

  function buildThemeCard(id, theme, custom) {
    var selected = id === activeThemeId;
    var ui = themeUi(theme);
    var card = makeElement('article', 'theme-card' + (selected ? ' is-selected' : ''));
    card.dataset.themeId = id;

    var preview = makeElement('div', 'theme-preview');
    var imageUrl = imageUrlForTheme(theme);
    preview.style.background = imageUrl
      ? 'linear-gradient(rgba(2,14,18,.2),rgba(2,14,18,.68)),url("' + imageUrl + '") center/cover'
      : theme.preview;
    var miniSurface = makeElement('span', 'preview-surface');
    miniSurface.style.background = ui.surface;
    miniSurface.style.borderColor = ui.border;
    var miniAccent = makeElement('span', 'preview-accent');
    miniAccent.style.background = ui.accent;
    miniAccent.style.boxShadow = '0 0 12px ' + ui.glow;
    preview.appendChild(miniSurface);
    preview.appendChild(miniAccent);
    if (selected) preview.appendChild(makeElement('span', 'selected-badge', 'Selected'));

    var body = makeElement('div', 'theme-card-body');
    var title = makeElement('h4', '', theme.name);
    var description = makeElement('p', '', theme.description || 'A custom theme generated from your image.');
    body.appendChild(title);
    body.appendChild(description);

    var actions = makeElement('div', 'theme-card-actions');
    var apply = makeElement('button', 'btn ' + (selected ? 'btn-ghost' : 'btn-primary'), selected ? 'Applied' : 'Apply');
    apply.type = 'button';
    apply.disabled = selected;
    apply.addEventListener('click', function () { applyTheme(id); });
    actions.appendChild(apply);

    if (custom) {
      var rename = makeElement('button', 'btn btn-ghost btn-compact', 'Rename');
      rename.type = 'button';
      rename.addEventListener('click', function () { renameTheme(id); });
      var del = makeElement('button', 'btn btn-danger btn-compact', 'Delete');
      del.type = 'button';
      del.addEventListener('click', function () { deleteTheme(id); });
      actions.appendChild(rename);
      actions.appendChild(del);
    }

    body.appendChild(actions);
    card.appendChild(preview);
    card.appendChild(body);
    return card;
  }

  function renderThemeCards() {
    var builtInGrid = $('builtInThemeGrid');
    var customGrid = $('customThemeGrid');
    if (!builtInGrid || !customGrid) return;
    builtInGrid.textContent = '';
    customGrid.textContent = '';
    Object.keys(BUILTIN_THEMES).forEach(function (id) {
      builtInGrid.appendChild(buildThemeCard(id, BUILTIN_THEMES[id], false));
    });
    customThemes.forEach(function (theme) {
      customGrid.appendChild(buildThemeCard(theme.id, theme, true));
    });
    $('customThemeEmpty').hidden = customThemes.length > 0;
    renderSettingsSelect();
  }

  function renderSettingsSelect() {
    var select = $('themeSettingsSelect');
    if (!select) return;
    select.textContent = '';
    var builtInGroup = document.createElement('optgroup');
    builtInGroup.label = 'Built-in themes';
    Object.keys(BUILTIN_THEMES).forEach(function (id) {
      var option = document.createElement('option');
      option.value = id;
      option.textContent = BUILTIN_THEMES[id].name;
      builtInGroup.appendChild(option);
    });
    select.appendChild(builtInGroup);
    if (customThemes.length) {
      var customGroup = document.createElement('optgroup');
      customGroup.label = 'Custom themes';
      customThemes.forEach(function (theme) {
        var option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        customGroup.appendChild(option);
      });
      select.appendChild(customGroup);
    }
    select.value = activeThemeId;
  }

  function openThemes() {
    $('themesScreen').hidden = false;
    document.body.classList.add('themes-open');
    renderThemeCards();
    $('closeThemesBtn').focus();
  }

  function closeThemes() {
    $('themesScreen').hidden = true;
    document.body.classList.remove('themes-open');
    cancelCustomTheme();
    $('themeShortcutBtn').focus();
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function toHex(n) { return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0'); }
  function rgbHex(rgb) { return '#' + toHex(rgb[0]) + toHex(rgb[1]) + toHex(rgb[2]); }
  function luminance(rgb) { return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255; }
  function saturation(rgb) {
    var max = Math.max(rgb[0], rgb[1], rgb[2]);
    var min = Math.min(rgb[0], rgb[1], rgb[2]);
    return max ? (max - min) / max : 0;
  }
  function mix(a, b, amount) {
    return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount, a[2] + (b[2] - a[2]) * amount];
  }
  function lighten(rgb, amount) { return mix(rgb, [255, 255, 255], amount); }
  function darken(rgb, amount) { return mix(rgb, [0, 0, 0], amount); }
  function rgba(rgb, alpha) { return 'rgba(' + rgb.map(Math.round).join(',') + ',' + alpha + ')'; }

  function extractTheme(img) {
    var canvas = document.createElement('canvas');
    var scale = Math.min(1, 96 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    var buckets = {};
    for (var i = 0; i < data.length; i += 16) {
      if (data[i + 3] < 180) continue;
      var r = Math.round(data[i] / 32) * 32;
      var g = Math.round(data[i + 1] / 32) * 32;
      var b = Math.round(data[i + 2] / 32) * 32;
      var key = r + ',' + g + ',' + b;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    var colors = Object.keys(buckets).map(function (key) {
      return { rgb: key.split(',').map(Number), count: buckets[key] };
    }).sort(function (a, b) { return b.count - a.count; }).slice(0, 18);
    if (!colors.length) colors = [{ rgb: [38, 110, 120], count: 1 }];

    var dark = colors.slice().sort(function (a, b) { return luminance(a.rgb) - luminance(b.rgb); })[0].rgb;
    var accents = colors.filter(function (c) {
      var lum = luminance(c.rgb);
      return saturation(c.rgb) > 0.28 && lum > 0.2 && lum < 0.82;
    }).sort(function (a, b) {
      return (saturation(b.rgb) * b.count) - (saturation(a.rgb) * a.count);
    });
    var accent = accents.length ? accents[0].rgb : colors[0].rgb;
    if (luminance(accent) < 0.38) accent = lighten(accent, 0.35);
    var secondary = accents.length > 1 ? accents[1].rgb : lighten(accent, 0.32);
    if (luminance(secondary) < 0.48) secondary = lighten(secondary, 0.38);
    var bg = darken(mix(dark, accent, 0.14), 0.55);
    var surface = lighten(bg, 0.14);
    var raised = lighten(surface, 0.12);

    return {
      palette: [rgbHex(bg), rgbHex(surface), rgbHex(accent), rgbHex(secondary)],
      vars: {
        '--theme-bg': rgbHex(bg),
        '--theme-bg-image': 'none',
        '--theme-bg-overlay': 'linear-gradient(180deg,' + rgba(bg, .34) + ',' + rgba(bg, .78) + ' 62%,' + rgba(darken(bg, .2), .92) + ')',
        '--theme-texture': 'linear-gradient(135deg,transparent 0 49%,rgba(255,255,255,.018) 50%,transparent 51%)',
        '--theme-surface': rgbHex(surface),
        '--theme-surface-raised': rgbHex(raised),
        '--theme-surface-transparent': rgba(surface, .8),
        '--theme-header': rgba(bg, .84),
        '--theme-input': rgba(darken(bg, .28), .72),
        '--theme-text': '#F7FBFF',
        '--theme-text-muted': rgbHex(lighten(mix(accent, [190, 200, 210], .6), .2)),
        '--theme-accent': rgbHex(accent),
        '--theme-accent-secondary': rgbHex(secondary),
        '--theme-border': rgba(secondary, .2),
        '--theme-border-strong': rgba(secondary, .48),
        '--theme-shadow': '0 14px 38px ' + rgba(darken(bg, .5), .62),
        '--theme-glow': rgba(accent, .64),
        '--theme-success': rgbHex(lighten(mix(accent, [56, 220, 140], .65), .12)),
        '--theme-danger': '#FF7A84',
        '--theme-xp-fill': 'linear-gradient(90deg,' + rgbHex(darken(accent, .18)) + ',' + rgbHex(accent) + ' 56%,' + rgbHex(secondary) + ')',
        '--theme-xp': rgbHex(secondary),
        '--theme-on-accent': luminance(accent) > .62 ? '#071015' : '#FFFFFF',
        '--theme-radius': '16px',
        '--theme-radius-sm': '10px',
        '--theme-heading-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        '--theme-body-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      }
    };
  }

  function showPendingTheme(file) {
    loadImage(file).then(function (loaded) {
      var extracted = extractTheme(loaded.img);
      if (pendingCustom && pendingCustom.previewUrl) URL.revokeObjectURL(pendingCustom.previewUrl);
      pendingCustom = { file: file, previewUrl: loaded.url, extracted: extracted };
      $('customThemePreview').src = loaded.url;
      $('customThemeName').value = file.name.replace(/\.[^.]+$/, '').slice(0, 36) || 'My theme';
      $('extractedColors').textContent = '';
      extracted.palette.forEach(function (color) {
        var swatch = makeElement('span', 'color-swatch');
        swatch.style.background = color;
        swatch.title = color;
        $('extractedColors').appendChild(swatch);
      });
      $('customThemeBuilder').hidden = false;
      $('customThemeName').focus();
    }).catch(function (error) { window.alert(error.message); });
  }

  function cancelCustomTheme() {
    if (pendingCustom && pendingCustom.previewUrl) URL.revokeObjectURL(pendingCustom.previewUrl);
    pendingCustom = null;
    if ($('customThemeBuilder')) $('customThemeBuilder').hidden = true;
    if ($('customThemeImage')) $('customThemeImage').value = '';
  }

  function savePendingTheme() {
    if (!pendingCustom) return;
    var name = $('customThemeName').value.trim();
    if (!name) { $('customThemeName').focus(); return; }
    var theme = {
      id: 'custom-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      description: 'Generated from your uploaded image.',
      vars: pendingCustom.extracted.vars,
      palette: pendingCustom.extracted.palette,
      imageBlob: pendingCustom.file,
      createdAt: Date.now()
    };
    $('saveCustomThemeBtn').disabled = true;
    writeCustomTheme(theme).then(function () {
      customThemes.push(theme);
      cancelCustomTheme();
      $('saveCustomThemeBtn').disabled = false;
      applyTheme(theme.id);
    }).catch(function (error) {
      $('saveCustomThemeBtn').disabled = false;
      window.alert(error.message || 'Could not save this theme.');
    });
  }

  function renameTheme(id) {
    var theme = getTheme(id);
    if (!theme || BUILTIN_THEMES[id]) return;
    var name = window.prompt('Theme name', theme.name);
    if (!name || !name.trim()) return;
    theme.name = name.trim().slice(0, 36);
    writeCustomTheme(theme).then(renderThemeCards);
  }

  function deleteTheme(id) {
    var theme = getTheme(id);
    if (!theme || BUILTIN_THEMES[id]) return;
    if (!window.confirm('Delete “' + theme.name + '”?')) return;
    removeCustomTheme(id).then(function () {
      customThemes = customThemes.filter(function (item) { return item.id !== id; });
      if (activeThemeId === id) applyTheme(DEFAULT_THEME);
      else renderThemeCards();
    });
  }

  function bindUI() {
    $('themeShortcutBtn').addEventListener('click', openThemes);
    $('closeThemesBtn').addEventListener('click', closeThemes);
    $('themesScreen').addEventListener('click', function (event) {
      if (event.target === $('themesScreen')) closeThemes();
    });
    $('customThemeImage').addEventListener('change', function () {
      var file = this.files && this.files[0];
      if (file) showPendingTheme(file);
    });
    $('cancelCustomThemeBtn').addEventListener('click', cancelCustomTheme);
    $('saveCustomThemeBtn').addEventListener('click', savePendingTheme);
    $('themeSettingsSelect').addEventListener('change', function () { applyTheme(this.value); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !$('themesScreen').hidden) closeThemes();
    });
  }

  function init() {
    var requestedThemeId = activeThemeId;
    bindUI();
    applyTheme(BUILTIN_THEMES[requestedThemeId] ? requestedThemeId : DEFAULT_THEME, false);
    readCustomThemes().then(function (themes) {
      themes.forEach(function (theme) { delete theme.previewUrl; });
      customThemes = themes.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
      if (requestedThemeId.indexOf('custom-') === 0 && getTheme(requestedThemeId)) applyTheme(requestedThemeId, false);
      else renderThemeCards();
    });
  }

  window.HabitThemeManager = {
    themes: BUILTIN_THEMES,
    apply: applyTheme,
    open: openThemes,
    getActiveId: function () { return activeThemeId; }
  };

  init();
})();
