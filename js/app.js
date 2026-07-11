/* ==========================================================================
   Habit RPG — app engine
   Vanilla JS, localStorage only. No presets, no backend.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'habitRpg.state.v1';

  /* Default XP per frequency (project game math) */
  var XP_DEFAULTS = { daily: 10, weekly: 35, monthly: 100 };

  var CATEGORY_LABELS = {
    body: 'Body',
    mind: 'Mind',
    discipline: 'Discipline',
    learning: 'Learning',
    health: 'Health',
    skill: 'Skill'
  };

  /* ------------------------------------------------------------------
     Quotes (rotates daily, deterministic by date)
  ------------------------------------------------------------------ */
  var QUOTES = [
    { t: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', a: 'Will Durant' },
    { t: 'Waste no more time arguing about what a good man should be. Be one.', a: 'Marcus Aurelius' },
    { t: 'You have power over your mind — not outside events. Realize this, and you will find strength.', a: 'Marcus Aurelius' },
    { t: 'First say to yourself what you would be; and then do what you have to do.', a: 'Epictetus' },
    { t: 'No man is free who is not master of himself.', a: 'Epictetus' },
    { t: 'It is not that we have a short time to live, but that we waste a lot of it.', a: 'Seneca' },
    { t: 'A journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
    { t: 'It does not matter how slowly you go as long as you do not stop.', a: 'Confucius' },
    { t: 'He who conquers himself is the mightiest warrior.', a: 'Confucius' },
    { t: 'Well begun is half done.', a: 'Aristotle' },
    { t: 'You may delay, but time will not.', a: 'Benjamin Franklin' },
    { t: 'Do what you can, with what you have, where you are.', a: 'Theodore Roosevelt' },
    { t: 'Genius is one percent inspiration and ninety-nine percent perspiration.', a: 'Thomas Edison' },
    { t: 'Motivation is what gets you started. Habit is what keeps you going.', a: 'Jim Rohn' },
    { t: 'I fear not the man who has practiced 10,000 kicks once, but I fear the man who has practiced one kick 10,000 times.', a: 'Bruce Lee' },
    { t: 'Suffer now and live the rest of your life as a champion.', a: 'Muhammad Ali' },
    { t: 'Every action you take is a vote for the type of person you wish to become.', a: 'James Clear' },
    { t: 'You do not rise to the level of your goals. You fall to the level of your systems.', a: 'James Clear' },
    { t: 'Discipline equals freedom.', a: 'Jocko Willink' },
    { t: 'The best time to plant a tree was twenty years ago. The second best time is now.', a: 'Chinese proverb' },
    { t: 'Hard choices, easy life. Easy choices, hard life.', a: 'Jerzy Gregorek' },
    { t: 'What you do every day matters more than what you do once in a while.', a: 'Gretchen Rubin' },
    { t: 'Small disciplines repeated with consistency every day lead to great achievements.', a: 'John C. Maxwell' },
    { t: 'The only place where success comes before work is in the dictionary.', a: 'Vidal Sassoon' }
  ];

  var LATIN = [
    { p: 'Per aspera ad astra', m: 'Through hardships to the stars' },
    { p: 'Fortis fortuna adiuvat', m: 'Fortune favors the bold' },
    { p: 'Amor fati', m: 'Love your fate' },
    { p: 'Memento mori', m: 'Remember you must die' },
    { p: 'Carpe diem', m: 'Seize the day' },
    { p: 'Festina lente', m: 'Make haste slowly' },
    { p: 'Acta non verba', m: 'Deeds, not words' },
    { p: 'Dum spiro spero', m: 'While I breathe, I hope' },
    { p: 'Gutta cavat lapidem', m: 'The drop hollows the stone' },
    { p: 'Nulla dies sine linea', m: 'No day without a line' },
    { p: 'Vincit qui se vincit', m: 'He conquers who conquers himself' },
    { p: 'Labor omnia vincit', m: 'Work conquers all' },
    { p: 'Aut viam inveniam aut faciam', m: 'I shall find a way or make one' },
    { p: 'Faber est suae quisque fortunae', m: 'Each is the maker of his own fortune' }
  ];

  /* ------------------------------------------------------------------
     Date helpers — local calendar, day ends at device midnight,
     ISO weeks Monday–Sunday, calendar months.
  ------------------------------------------------------------------ */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function dateToStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayStr() { return dateToStr(new Date()); }

  function strToDate(s) {
    var p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function addDaysStr(s, n) {
    var d = strToDate(s);
    d.setDate(d.getDate() + n);
    return dateToStr(d);
  }

  /* ISO 8601 week key, e.g. "2026-W28" (weeks run Monday–Sunday) */
  function isoWeekKey(s) {
    var d = strToDate(s);
    var t = new Date(d.getTime());
    t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); /* nearest Thursday */
    var week1 = new Date(t.getFullYear(), 0, 4);
    var week = 1 + Math.round(
      ((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    );
    return t.getFullYear() + '-W' + pad2(week);
  }

  function monthKey(s) { return s.slice(0, 7); }

  /* The period bucket a given date falls into for a habit's frequency */
  function periodKey(frequency, dateStr) {
    if (frequency === 'weekly') return isoWeekKey(dateStr);
    if (frequency === 'monthly') return monthKey(dateStr);
    return dateStr;
  }

  /* ------------------------------------------------------------------
     State
  ------------------------------------------------------------------ */
  var state = loadState();

  function defaultState() {
    return {
      habits: [],
      profile: { totalXP: 0, level: 1 },
      identity: '',
      ui: { tab: 'daily' }
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      var parsed = JSON.parse(raw);
      var base = defaultState();
      if (!parsed || typeof parsed !== 'object') return base;
      if (Array.isArray(parsed.habits)) base.habits = parsed.habits;
      if (parsed.profile && typeof parsed.profile.totalXP === 'number') {
        base.profile.totalXP = Math.max(0, parsed.profile.totalXP);
      }
      base.profile.level = levelForXP(base.profile.totalXP);
      if (typeof parsed.identity === 'string') base.identity = parsed.identity;
      if (parsed.ui && typeof parsed.ui.tab === 'string' &&
          ['daily', 'weekly', 'monthly'].indexOf(parsed.ui.tab) !== -1) {
        base.ui.tab = parsed.ui.tab;
      }
      return base;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage full or unavailable — app keeps running in memory */ }
  }

  /* ------------------------------------------------------------------
     Leveling — XP from level L to L+1 costs 100 × L.
     Cumulative XP required to reach level L: 50 × L × (L − 1).
  ------------------------------------------------------------------ */
  function levelForXP(xp) {
    var L = 1;
    while (xp >= 50 * (L + 1) * L) L++;
    return L;
  }

  function levelFloorXP(L) { return 50 * L * (L - 1); }

  function xpForNextLevel(L) { return 100 * L; }

  /* ------------------------------------------------------------------
     Habit helpers
  ------------------------------------------------------------------ */
  function isCompletedThisPeriod(habit, refDateStr) {
    var key = periodKey(habit.frequency, refDateStr);
    for (var i = 0; i < habit.completions.length; i++) {
      if (periodKey(habit.frequency, habit.completions[i]) === key) return true;
    }
    return false;
  }

  /* Streak for daily habits: consecutive days ending today
     (or ending yesterday if today isn't completed yet). */
  function dailyStreak(habit) {
    if (habit.frequency !== 'daily') return 0;
    var set = {};
    for (var i = 0; i < habit.completions.length; i++) set[habit.completions[i]] = true;
    var d = todayStr();
    if (!set[d]) d = addDaysStr(d, -1);
    var streak = 0;
    while (set[d]) {
      streak++;
      d = addDaysStr(d, -1);
    }
    return streak;
  }

  function habitById(id) {
    for (var i = 0; i < state.habits.length; i++) {
      if (state.habits[i].id === id) return state.habits[i];
    }
    return null;
  }

  function makeId() {
    return 'h_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ------------------------------------------------------------------
     Actions
  ------------------------------------------------------------------ */
  function grantXP(amount) {
    var oldLevel = state.profile.level;
    state.profile.totalXP = Math.max(0, state.profile.totalXP + amount);
    state.profile.level = levelForXP(state.profile.totalXP);
    saveState();
    if (state.profile.level > oldLevel) showLevelUp(state.profile.level);
  }

  function toggleComplete(id) {
    var habit = habitById(id);
    if (!habit) return;
    var today = todayStr();
    var key = periodKey(habit.frequency, today);

    if (isCompletedThisPeriod(habit, today)) {
      /* Undo: remove this period's completion(s) and take the XP back */
      habit.completions = habit.completions.filter(function (c) {
        return periodKey(habit.frequency, c) !== key;
      });
      grantXP(-habit.xp);
      showToast('−' + habit.xp + ' XP', true);
    } else {
      habit.completions.push(today);
      grantXP(habit.xp);
      showToast('+' + habit.xp + ' XP', false);
    }
    saveState();
    render();
  }

  function upsertHabit(data, existingId) {
    if (existingId) {
      var habit = habitById(existingId);
      if (!habit) return;
      habit.name = data.name;
      habit.category = data.category;
      habit.frequency = data.frequency;
      habit.xp = data.xp;
      habit.note = data.note;
    } else {
      state.habits.push({
        id: makeId(),
        name: data.name,
        category: data.category,
        frequency: data.frequency,
        xp: data.xp,
        note: data.note,
        createdAt: todayStr(),
        completions: []
      });
    }
    saveState();
    render();
  }

  function deleteHabit(id) {
    state.habits = state.habits.filter(function (h) { return h.id !== id; });
    saveState();
    render();
  }

  /* ------------------------------------------------------------------
     DOM references
  ------------------------------------------------------------------ */
  function $(id) { return document.getElementById(id); }

  var els = {
    levelBadge: $('levelBadge'),
    levelNum: $('levelNum'),
    xpTotal: $('xpTotal'),
    xpBar: $('xpBar'),
    xpBarFill: $('xpBarFill'),
    xpText: $('xpText'),

    identityCard: $('identityCard'),
    identityView: $('identityView'),
    identityText: $('identityText'),
    identityEdit: $('identityEdit'),
    identityInput: $('identityInput'),
    identitySaveBtn: $('identitySaveBtn'),
    identityCancelBtn: $('identityCancelBtn'),

    quoteText: $('quoteText'),
    quoteAuthor: $('quoteAuthor'),
    latinPhrase: $('latinPhrase'),
    latinMeaning: $('latinMeaning'),

    statCompleted: $('statCompleted'),
    statLevel: $('statLevel'),
    statXP: $('statXP'),
    statRate: $('statRate'),
    statActive: $('statActive'),
    statBestStreak: $('statBestStreak'),

    tabs: document.querySelectorAll('.tab'),
    panels: document.querySelectorAll('.habit-panel'),
    counts: { daily: $('countDaily'), weekly: $('countWeekly'), monthly: $('countMonthly') },
    lists: { daily: $('listDaily'), weekly: $('listWeekly'), monthly: $('listMonthly') },
    empties: { daily: $('emptyDaily'), weekly: $('emptyWeekly'), monthly: $('emptyMonthly') },

    addHabitBtn: $('addHabitBtn'),
    habitModal: $('habitModal'),
    modalTitle: $('modalTitle'),
    habitForm: $('habitForm'),
    habitName: $('habitName'),
    habitCategory: $('habitCategory'),
    habitFrequency: $('habitFrequency'),
    habitXP: $('habitXP'),
    habitNote: $('habitNote'),
    deleteHabitBtn: $('deleteHabitBtn'),
    cancelHabitBtn: $('cancelHabitBtn'),

    levelUpOverlay: $('levelUpOverlay'),
    levelUpLevel: $('levelUpLevel'),
    levelUpBurst: $('levelUpBurst'),
    toastRoot: $('toastRoot')
  };

  /* ------------------------------------------------------------------
     Rendering
  ------------------------------------------------------------------ */
  function render() {
    renderHeader();
    renderStats();
    renderIdentity();
    renderTabs();
    renderHabits();
  }

  function renderHeader() {
    var xp = state.profile.totalXP;
    var L = state.profile.level;
    var into = xp - levelFloorXP(L);
    var need = xpForNextLevel(L);
    var pct = Math.max(0, Math.min(100, Math.round((into / need) * 100)));

    els.levelNum.textContent = L;
    els.levelBadge.style.setProperty('--ring', pct + '%');
    els.xpTotal.textContent = xp + ' XP total';
    els.xpBarFill.style.width = pct + '%';
    els.xpBar.setAttribute('aria-valuenow', pct);
    els.xpText.textContent = into + ' / ' + need + ' XP to Level ' + (L + 1);
  }

  function renderStats() {
    var today = todayStr();
    var totalCompleted = 0;
    var dailies = 0;
    var dailiesDone = 0;
    var bestStreak = 0;

    for (var i = 0; i < state.habits.length; i++) {
      var h = state.habits[i];
      totalCompleted += h.completions.length;
      if (h.frequency === 'daily') {
        dailies++;
        if (isCompletedThisPeriod(h, today)) dailiesDone++;
        var s = dailyStreak(h);
        if (s > bestStreak) bestStreak = s;
      }
    }

    els.statCompleted.textContent = totalCompleted;
    els.statLevel.textContent = state.profile.level;
    els.statXP.textContent = state.profile.totalXP;
    els.statRate.textContent = dailies ? Math.round((dailiesDone / dailies) * 100) + '%' : '—';
    els.statActive.textContent = state.habits.length;
    els.statBestStreak.textContent = bestStreak;
  }

  function renderIdentity() {
    if (state.identity) {
      els.identityText.textContent = '“' + state.identity + '”';
      els.identityText.classList.remove('is-empty');
    } else {
      els.identityText.textContent = 'Tap to define your identity…';
      els.identityText.classList.add('is-empty');
    }
  }

  /* Whole days since a fixed local-calendar epoch. Advances exactly once
     per device-local day; Math.round absorbs the ±1h a DST transition
     adds to or removes from a day's length. */
  function dayIndex() {
    var epoch = new Date(2024, 0, 1);
    return Math.round((strToDate(todayStr()).getTime() - epoch.getTime()) / 86400000);
  }

  function renderDailyQuote() {
    var i = dayIndex();
    var q = QUOTES[((i % QUOTES.length) + QUOTES.length) % QUOTES.length];
    els.quoteText.textContent = '“' + q.t + '”';
    els.quoteAuthor.textContent = '— ' + q.a;
  }

  function renderLatinSaying() {
    var i = dayIndex();
    var l = LATIN[((i % LATIN.length) + LATIN.length) % LATIN.length];
    els.latinPhrase.textContent = l.p;
    els.latinMeaning.textContent = l.m;
  }

  function renderTabs() {
    var today = todayStr();
    var byFreq = { daily: [], weekly: [], monthly: [] };
    for (var i = 0; i < state.habits.length; i++) {
      var h = state.habits[i];
      if (byFreq[h.frequency]) byFreq[h.frequency].push(h);
    }
    ['daily', 'weekly', 'monthly'].forEach(function (freq) {
      var list = byFreq[freq];
      var done = list.filter(function (h) { return isCompletedThisPeriod(h, today); }).length;
      els.counts[freq].textContent = list.length ? done + '/' + list.length : '';
    });

    els.tabs.forEach(function (tab) {
      var active = tab.dataset.tab === state.ui.tab;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    els.panels.forEach(function (panel) {
      panel.hidden = panel.dataset.frequency !== state.ui.tab;
    });
  }

  function renderHabits() {
    var today = todayStr();
    ['daily', 'weekly', 'monthly'].forEach(function (freq) {
      var listEl = els.lists[freq];
      listEl.textContent = '';
      var habits = state.habits.filter(function (h) { return h.frequency === freq; });
      els.empties[freq].hidden = habits.length > 0;
      habits.forEach(function (h) {
        listEl.appendChild(buildHabitCard(h, today));
      });
    });
  }

  function buildHabitCard(habit, today) {
    var done = isCompletedThisPeriod(habit, today);

    var li = document.createElement('li');
    li.className = 'habit-card' + (done ? ' is-done' : '');
    li.dataset.id = habit.id;

    var check = document.createElement('button');
    check.type = 'button';
    check.className = 'habit-check';
    check.setAttribute('aria-pressed', done ? 'true' : 'false');
    check.setAttribute('aria-label',
      (done ? 'Mark not complete: ' : 'Mark complete: ') + habit.name);
    check.dataset.action = 'toggle';
    check.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" ' +
      'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    var info = document.createElement('div');
    info.className = 'habit-info';

    var name = document.createElement('div');
    name.className = 'habit-name';
    name.textContent = habit.name;
    info.appendChild(name);

    var meta = document.createElement('div');
    meta.className = 'habit-meta';

    var catChip = document.createElement('span');
    catChip.className = 'chip';
    catChip.textContent = CATEGORY_LABELS[habit.category] || habit.category;
    meta.appendChild(catChip);

    var xpChip = document.createElement('span');
    xpChip.className = 'chip chip-xp';
    xpChip.textContent = '+' + habit.xp + ' XP';
    meta.appendChild(xpChip);

    if (habit.frequency === 'daily') {
      var streak = dailyStreak(habit);
      if (streak > 0) {
        var streakChip = document.createElement('span');
        streakChip.className = 'chip chip-streak';
        streakChip.textContent = '🔥 ' + streak + (streak === 1 ? ' day' : ' days');
        meta.appendChild(streakChip);
      }
    }
    info.appendChild(meta);

    if (habit.note) {
      var note = document.createElement('p');
      note.className = 'habit-note';
      note.textContent = habit.note;
      info.appendChild(note);
    }

    var edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'habit-edit';
    edit.setAttribute('aria-label', 'Edit habit: ' + habit.name);
    edit.dataset.action = 'edit';
    edit.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';

    li.appendChild(check);
    li.appendChild(info);
    li.appendChild(edit);
    return li;
  }

  /* ------------------------------------------------------------------
     Effects: toast + level up
  ------------------------------------------------------------------ */
  function showToast(text, isMinus) {
    var toast = document.createElement('div');
    toast.className = 'toast' + (isMinus ? ' toast-minus' : '');
    toast.textContent = text;
    els.toastRoot.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 1700);
  }

  var levelUpTimer = null;

  function showLevelUp(level) {
    els.levelUpLevel.textContent = level;

    /* particle burst */
    els.levelUpBurst.textContent = '';
    var reduced = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) {
      for (var i = 0; i < 26; i++) {
        var p = document.createElement('span');
        p.className = 'particle';
        var angle = (Math.PI * 2 * i) / 26 + Math.random() * 0.4;
        var dist = 90 + Math.random() * 130;
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        p.style.animationDelay = (Math.random() * 0.15) + 's';
        els.levelUpBurst.appendChild(p);
      }
    }

    els.levelUpOverlay.hidden = false;
    if (levelUpTimer) clearTimeout(levelUpTimer);
    levelUpTimer = setTimeout(hideLevelUp, 2600);
  }

  function hideLevelUp() {
    if (levelUpTimer) { clearTimeout(levelUpTimer); levelUpTimer = null; }
    els.levelUpOverlay.hidden = true;
    els.levelUpBurst.textContent = '';
  }

  /* ------------------------------------------------------------------
     Modal (create / edit)
  ------------------------------------------------------------------ */
  var editingId = null;
  var xpTouched = false;

  function openModal(habit) {
    editingId = habit ? habit.id : null;
    xpTouched = !!habit;
    els.modalTitle.textContent = habit ? 'Edit Habit' : 'New Habit';
    els.habitName.value = habit ? habit.name : '';
    els.habitCategory.value = habit ? habit.category : 'body';
    els.habitFrequency.value = habit ? habit.frequency : state.ui.tab;
    els.habitXP.value = habit ? habit.xp : XP_DEFAULTS[els.habitFrequency.value];
    els.habitNote.value = habit ? (habit.note || '') : '';
    resetDeleteBtn();
    els.deleteHabitBtn.hidden = !habit;
    els.habitModal.hidden = false;
    els.habitName.focus();
  }

  function closeModal() {
    els.habitModal.hidden = true;
    editingId = null;
  }

  function resetDeleteBtn() {
    els.deleteHabitBtn.classList.remove('is-confirming');
    els.deleteHabitBtn.textContent = 'Delete';
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    var name = els.habitName.value.trim();
    if (!name) {
      els.habitName.focus();
      return;
    }
    var xp = parseInt(els.habitXP.value, 10);
    if (isNaN(xp) || xp < 1) xp = XP_DEFAULTS[els.habitFrequency.value] || 10;
    if (xp > 1000) xp = 1000;

    upsertHabit({
      name: name,
      category: els.habitCategory.value,
      frequency: els.habitFrequency.value,
      xp: xp,
      note: els.habitNote.value.trim()
    }, editingId);
    closeModal();
  }

  /* ------------------------------------------------------------------
     Identity editing
  ------------------------------------------------------------------ */
  function openIdentityEditor() {
    els.identityInput.value = state.identity;
    els.identityView.hidden = true;
    els.identityEdit.hidden = false;
    els.identityInput.focus();
  }

  function closeIdentityEditor() {
    els.identityView.hidden = false;
    els.identityEdit.hidden = true;
  }

  /* ------------------------------------------------------------------
     Events
  ------------------------------------------------------------------ */
  function bindEvents() {
    /* Tabs */
    els.tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.ui.tab = tab.dataset.tab;
        saveState();
        renderTabs();
      });
    });

    /* Habit list actions (delegated per list) */
    ['daily', 'weekly', 'monthly'].forEach(function (freq) {
      els.lists[freq].addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-action]');
        if (!btn) return;
        var card = btn.closest('.habit-card');
        if (!card) return;
        var id = card.dataset.id;
        if (btn.dataset.action === 'toggle') {
          toggleComplete(id);
        } else if (btn.dataset.action === 'edit') {
          var habit = habitById(id);
          if (habit) openModal(habit);
        }
      });
    });

    /* Add / modal */
    els.addHabitBtn.addEventListener('click', function () { openModal(null); });
    els.cancelHabitBtn.addEventListener('click', closeModal);
    els.habitModal.addEventListener('click', function (e) {
      if (e.target === els.habitModal) closeModal();
    });
    els.habitForm.addEventListener('submit', handleFormSubmit);

    /* Default XP follows frequency until the user edits the XP field */
    els.habitXP.addEventListener('input', function () { xpTouched = true; });
    els.habitFrequency.addEventListener('change', function () {
      if (!xpTouched) els.habitXP.value = XP_DEFAULTS[els.habitFrequency.value];
    });

    /* Delete: two-tap confirm */
    els.deleteHabitBtn.addEventListener('click', function () {
      if (els.deleteHabitBtn.classList.contains('is-confirming')) {
        var id = editingId;
        closeModal();
        deleteHabit(id);
      } else {
        els.deleteHabitBtn.classList.add('is-confirming');
        els.deleteHabitBtn.textContent = 'Tap again to delete';
      }
    });

    /* Identity */
    els.identityCard.addEventListener('click', function (e) {
      if (!els.identityEdit.hidden) return;
      if (e.target.closest('button, textarea')) return;
      openIdentityEditor();
    });
    els.identitySaveBtn.addEventListener('click', function () {
      state.identity = els.identityInput.value.trim();
      saveState();
      closeIdentityEditor();
      renderIdentity();
    });
    els.identityCancelBtn.addEventListener('click', closeIdentityEditor);

    /* Level-up overlay dismiss */
    els.levelUpOverlay.addEventListener('click', hideLevelUp);

    /* Escape closes modal (external keyboards) */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!els.habitModal.hidden) closeModal();
        if (!els.levelUpOverlay.hidden) hideLevelUp();
      }
    });

    /* Day rollover: when the local date changes, habits show as incomplete
       for the new period (state is derived from stored dates, so this is
       purely a re-render — nothing is deleted or reset) and the quote and
       Latin saying advance. Checked on every way the app can wake up, plus
       a timer for when it simply stays open past midnight. */
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkDayChange();
    });
    window.addEventListener('focus', checkDayChange);
    window.addEventListener('pageshow', checkDayChange);
    setInterval(checkDayChange, 30000);
  }

  var renderedDay = todayStr();

  function checkDayChange() {
    if (todayStr() === renderedDay) return;
    renderedDay = todayStr();
    renderDailyQuote();
    renderLatinSaying();
    render();
  }

  /* ------------------------------------------------------------------
     Init
  ------------------------------------------------------------------ */
  bindEvents();
  renderDailyQuote();
  renderLatinSaying();
  render();
})();
