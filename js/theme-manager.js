/* ==========================================================================
   Habit RPG — centralized theme manager
   Built-in themes, persisted switching, and IndexedDB-backed image themes.
   ========================================================================== */
(function () {
  'use strict';

  var ACTIVE_THEME_KEY = 'habitRpg.activeTheme.v1';
  var DB_NAME = 'habitRpgThemes';
  var DB_VERSION = 1;
  var STORE_NAME = 'customThemes';

  var BUILTIN_THEMES = {
    'default': {
      name: 'Default',
      description: 'The original blue and black RPG interface.',
      preview: 'linear-gradient(145deg, #0B0F1A 0%, #141B2E 58%, #3B82F6 100%)',
      vars: {
        '--theme-bg': '#0B0F1A',
        '--theme-bg-image': 'none',
        '--theme-bg-overlay': 'linear-gradient(rgba(11,15,26,.12), rgba(11,15,26,.25))',
        '--theme-texture': 'none',
        '--theme-surface': '#141B2E',
        '--theme-surface-raised': '#1A2340',
        '--theme-surface-transparent': 'rgba(20,27,46,.88)',
        '--theme-header': 'rgba(11,15,26,.86)',
        '--theme-input': 'rgba(0,0,0,.35)',
        '--theme-text': '#E7ECF5',
        '--theme-text-muted': '#64748B',
        '--theme-accent': '#3B82F6',
        '--theme-accent-secondary': '#60A5FA',
        '--theme-border': 'rgba(96,165,250,.14)',
        '--theme-border-strong': 'rgba(96,165,250,.32)',
        '--theme-shadow': '0 10px 30px rgba(0,0,0,.45)',
        '--theme-glow': 'rgba(56,189,248,.62)',
        '--theme-success': '#34D399',
        '--theme-danger': '#F87171',
        '--theme-xp-fill': 'linear-gradient(90deg,#3B82F6,#38BDF8 60%,#60A5FA)',
        '--theme-xp': '#38BDF8',
        '--theme-on-accent': '#FFFFFF',
        '--theme-radius': '16px',
        '--theme-radius-sm': '10px',
        '--theme-heading-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        '--theme-body-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      }
    },
    'voxel-world': {
      name: 'Voxel World',
      description: 'Shader-lit water, forest glass, mint glow, and pixel detail.',
      preview: 'linear-gradient(rgba(2,24,23,.2),rgba(2,21,19,.7)),url("assets/themes/voxel-world.png") center/cover',
      vars: {
        '--theme-bg': '#041B1B',
        '--theme-bg-image': 'url("../assets/themes/voxel-world.png")',
        '--theme-bg-overlay': 'linear-gradient(180deg,rgba(1,18,22,.2),rgba(1,24,25,.55) 52%,rgba(0,13,17,.84))',
        '--theme-texture': 'repeating-linear-gradient(0deg,transparent 0 11px,rgba(90,249,222,.022) 11px 12px),repeating-linear-gradient(90deg,transparent 0 11px,rgba(90,249,222,.022) 11px 12px)',
        '--theme-surface': '#062F32',
        '--theme-surface-raised': '#0B4A47',
        '--theme-surface-transparent': 'rgba(2,38,42,.82)',
        '--theme-header': 'rgba(1,24,29,.88)',
        '--theme-input': 'rgba(1,24,25,.68)',
        '--theme-text': '#F1FFF8',
        '--theme-text-muted': '#77DCE3',
        '--theme-accent': '#77FF8E',
        '--theme-accent-secondary': '#5EF3FF',
        '--theme-border': 'rgba(70,224,211,.34)',
        '--theme-border-strong': 'rgba(100,255,226,.72)',
        '--theme-shadow': '0 14px 38px rgba(0,10,15,.68),inset 0 1px 0 rgba(193,255,236,.12)',
        '--theme-glow': 'rgba(88,255,174,.76)',
        '--theme-success': '#77FF8E',
        '--theme-danger': '#FF7D6E',
        '--theme-xp-fill': 'linear-gradient(90deg,#22BFA2,#65F5E5 48%,#8BFF9F)',
        '--theme-xp': '#5EF3FF',
        '--theme-on-accent': '#032218',
        '--theme-radius': '8px',
        '--theme-radius-sm': '5px',
        '--theme-heading-font': 'ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,monospace',
        '--theme-body-font': 'ui-monospace,"SFMono-Regular",Menlo,Monaco,Consolas,monospace'
      }
    },
    'midnight': {
      name: 'Midnight',
      description: 'Quiet charcoal surfaces with restrained violet light.',
      preview: 'radial-gradient(circle at 70% 20%,#44308C 0,#11121A 48%,#050507 100%)',
      vars: {
        '--theme-bg': '#050507',
        '--theme-bg-image': 'none',
        '--theme-bg-overlay': 'linear-gradient(rgba(5,5,7,.15),rgba(5,5,7,.35))',
        '--theme-texture': 'none',
        '--theme-surface': '#111218',
        '--theme-surface-raised': '#1A1B24',
        '--theme-surface-transparent': 'rgba(17,18,24,.91)',
        '--theme-header': 'rgba(5,5,7,.9)',
        '--theme-input': 'rgba(0,0,0,.42)',
        '--theme-text': '#F3F1FA',
        '--theme-text-muted': '#858393',
        '--theme-accent': '#7457E8',
        '--theme-accent-secondary': '#A78BFA',
        '--theme-border': 'rgba(167,139,250,.13)',
        '--theme-border-strong': 'rgba(167,139,250,.32)',
        '--theme-shadow': '0 12px 34px rgba(0,0,0,.62)',
        '--theme-glow': 'rgba(124,92,246,.56)',
        '--theme-success': '#43D6A0',
        '--theme-danger': '#FB7185',
        '--theme-xp-fill': 'linear-gradient(90deg,#4F46E5,#7C5CF6 60%,#A78BFA)',
        '--theme-xp': '#A78BFA',
        '--theme-on-accent': '#FFFFFF',
        '--theme-radius': '14px',
        '--theme-radius-sm': '9px',
        '--theme-heading-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        '--theme-body-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      }
    },
    'light': {
      name: 'Light',
      description: 'Bright neutral surfaces with crisp blue-green accents.',
      preview: 'linear-gradient(145deg,#FFFFFF 0%,#E8EEF5 58%,#2C7BE5 100%)',
      vars: {
        '--theme-bg': '#EDF2F7',
        '--theme-bg-image': 'none',
        '--theme-bg-overlay': 'linear-gradient(rgba(255,255,255,.08),rgba(222,231,240,.2))',
        '--theme-texture': 'none',
        '--theme-surface': '#FFFFFF',
        '--theme-surface-raised': '#F8FAFC',
        '--theme-surface-transparent': 'rgba(255,255,255,.9)',
        '--theme-header': 'rgba(248,250,252,.9)',
        '--theme-input': '#F1F5F9',
        '--theme-text': '#152033',
        '--theme-text-muted': '#596579',
        '--theme-accent': '#2563EB',
        '--theme-accent-secondary': '#0F9D88',
        '--theme-border': 'rgba(45,66,94,.14)',
        '--theme-border-strong': 'rgba(37,99,235,.3)',
        '--theme-shadow': '0 10px 28px rgba(33,48,71,.13)',
        '--theme-glow': 'rgba(37,99,235,.3)',
        '--theme-success': '#148564',
        '--theme-danger': '#D7354F',
        '--theme-xp-fill': 'linear-gradient(90deg,#2563EB,#0EA5E9 58%,#0F9D88)',
        '--theme-xp': '#087FCE',
        '--theme-on-accent': '#FFFFFF',
        '--theme-radius': '16px',
        '--theme-radius-sm': '10px',
        '--theme-heading-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        '--theme-body-font': '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
      }
    }
  };

  var customThemes = [];
  var activeThemeId = localStorage.getItem(ACTIVE_THEME_KEY) || 'default';
  var activeImageUrl = null;
  var pendingCustom = null;
  var dbPromise = null;

  function $(id) { return document.getElementById(id); }

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

  function setVariables(vars) {
    var root = document.documentElement;
    Object.keys(BUILTIN_THEMES['default'].vars).forEach(function (key) {
      root.style.removeProperty(key);
    });
    Object.keys(vars).forEach(function (key) { root.style.setProperty(key, vars[key]); });
  }

  function applyTheme(id, persist) {
    var theme = getTheme(id) || BUILTIN_THEMES['default'];
    id = getTheme(id) ? id : 'default';
    if (activeImageUrl) {
      URL.revokeObjectURL(activeImageUrl);
      activeImageUrl = null;
    }
    var vars = Object.assign({}, theme.vars);
    if (theme.imageBlob) {
      activeImageUrl = URL.createObjectURL(theme.imageBlob);
      vars['--theme-bg-image'] = 'url("' + activeImageUrl + '")';
    }
    setVariables(vars);
    document.documentElement.dataset.theme = id.indexOf('custom-') === 0 ? 'custom' : id;
    document.documentElement.dataset.themeId = id;
    activeThemeId = id;
    var themeColor = vars['--theme-bg'] || '#0B0F1A';
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColor);
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

  function buildThemeCard(id, theme, custom) {
    var selected = id === activeThemeId;
    var card = makeElement('article', 'theme-card' + (selected ? ' is-selected' : ''));
    card.dataset.themeId = id;

    var preview = makeElement('div', 'theme-preview');
    var imageUrl = imageUrlForTheme(theme);
    preview.style.background = imageUrl
      ? 'linear-gradient(rgba(2,14,18,.2),rgba(2,14,18,.68)),url("' + imageUrl + '") center/cover'
      : theme.preview;
    var miniSurface = makeElement('span', 'preview-surface');
    miniSurface.style.background = theme.vars['--theme-surface-transparent'];
    miniSurface.style.borderColor = theme.vars['--theme-border-strong'];
    var miniAccent = makeElement('span', 'preview-accent');
    miniAccent.style.background = theme.vars['--theme-accent'];
    miniAccent.style.boxShadow = '0 0 12px ' + theme.vars['--theme-glow'];
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
      if (activeThemeId === id) applyTheme('default');
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
    applyTheme(BUILTIN_THEMES[requestedThemeId] ? requestedThemeId : 'default', false);
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
