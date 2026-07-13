/* ==========================================================================
   Habit RPG — local profile manager
   PIN-protected profiles with isolated app state and theme preferences.
   Profiles live on this device because the app is hosted as a static PWA.
   ========================================================================== */
(function () {
  'use strict';

  var PROFILE_INDEX_KEY = 'habitRpg.profiles.v1';
  var ACTIVE_PROFILE_KEY = 'habitRpg.activeProfile.v1';
  var LEGACY_STATE_KEY = 'habitRpg.state.v1';
  var LEGACY_THEME_KEY = 'habitRpg.activeTheme.v1';

  function $(id) { return document.getElementById(id); }

  function loadProfiles() {
    try {
      var parsed = JSON.parse(localStorage.getItem(PROFILE_INDEX_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(function (profile) {
        return profile && typeof profile.id === 'string' && typeof profile.name === 'string';
      }) : [];
    } catch (error) {
      return [];
    }
  }

  var profiles = loadProfiles();
  var activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || '';
  if (!profileById(activeProfileId)) {
    activeProfileId = '';
    localStorage.removeItem(ACTIVE_PROFILE_KEY);
  }

  function profileById(id) {
    for (var i = 0; i < profiles.length; i++) {
      if (profiles[i].id === id) return profiles[i];
    }
    return null;
  }

  function stateKey(id) { return 'habitRpg.profile.' + id + '.state.v1'; }
  function themeKey(id) { return 'habitRpg.profile.' + id + '.theme.v1'; }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (part) {
      return part.charAt(0).toUpperCase();
    }).join('') || '?';
  }

  function randomHex(bytes) {
    var values = new Uint8Array(bytes);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(values);
    else for (var i = 0; i < values.length; i++) values[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(values, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  function fallbackHash(text) {
    var h1 = 2166136261;
    var h2 = 2246822519;
    for (var i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619);
      h2 = Math.imul(h2 ^ text.charCodeAt(i), 3266489917);
    }
    return ('00000000' + (h1 >>> 0).toString(16)).slice(-8) +
      ('00000000' + (h2 >>> 0).toString(16)).slice(-8);
  }

  function hashPin(pin, salt) {
    var value = salt + ':' + pin;
    if (!window.crypto || !window.crypto.subtle || !window.TextEncoder) {
      return Promise.resolve(fallbackHash(value));
    }
    return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
      .then(function (buffer) {
        return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
          return byte.toString(16).padStart(2, '0');
        }).join('');
      });
  }

  function saveProfiles() {
    localStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(profiles));
  }

  function setError(message) {
    var error = $('profileAuthError');
    error.textContent = message || '';
    error.hidden = !message;
  }

  function setAuthView(view) {
    $('profileChooser').hidden = view !== 'choose';
    $('profileLoginForm').hidden = view !== 'login';
    $('profileCreateForm').hidden = view !== 'create';
    setError('');
  }

  function renderProfileChoices() {
    var list = $('profileList');
    list.textContent = '';
    profiles.forEach(function (profile) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'profile-choice';
      button.dataset.profileId = profile.id;
      var avatar = document.createElement('span');
      avatar.className = 'profile-avatar';
      avatar.textContent = initials(profile.name);
      var name = document.createElement('span');
      name.className = 'profile-choice-name';
      name.textContent = profile.name;
      var arrow = document.createElement('span');
      arrow.className = 'profile-choice-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '›';
      button.appendChild(avatar);
      button.appendChild(name);
      button.appendChild(arrow);
      button.setAttribute('aria-label', 'Log in as ' + profile.name);
      list.appendChild(button);
    });
    $('profileChooserTitle').textContent = profiles.length ? 'Choose your profile' : 'Create your profile';
    $('profileChooserHint').textContent = profiles.length
      ? 'Your habits, XP, streaks, and theme stay private to your profile.'
      : 'Your current tracker data will be safely moved into this first profile.';
    $('backFromCreateBtn').hidden = !profiles.length;
    if (!profiles.length) setAuthView('create');
  }

  function showAuth(view) {
    document.body.classList.add('profile-locked');
    $('profileAuthScreen').hidden = false;
    $('accountModal').hidden = true;
    renderProfileChoices();
    setAuthView(view || (profiles.length ? 'choose' : 'create'));
  }

  function hideAuth() {
    document.body.classList.remove('profile-locked');
    $('profileAuthScreen').hidden = true;
  }

  function selectProfile(profile) {
    $('profileLoginName').textContent = profile.name;
    $('profileLoginAvatar').textContent = initials(profile.name);
    $('profileLoginId').value = profile.id;
    $('profilePin').value = '';
    setAuthView('login');
    $('profilePin').focus();
  }

  function activateProfile(profile) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, profile.id);
    window.location.reload();
  }

  function createProfile(name, pin) {
    var firstProfile = profiles.length === 0;
    var salt = randomHex(16);
    return hashPin(pin, salt).then(function (pinHash) {
      var profile = {
        id: 'p_' + Date.now().toString(36) + '_' + randomHex(4),
        name: name,
        salt: salt,
        pinHash: pinHash,
        createdAt: Date.now()
      };
      profiles.push(profile);
      saveProfiles();

      if (firstProfile) {
        var legacyState = localStorage.getItem(LEGACY_STATE_KEY);
        var legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
        if (legacyState) localStorage.setItem(stateKey(profile.id), legacyState);
        if (legacyTheme) localStorage.setItem(themeKey(profile.id), legacyTheme);
      }
      activateProfile(profile);
    });
  }

  function populateAccountShortcut() {
    var profile = profileById(activeProfileId);
    if (!profile) return;
    $('profileShortcutAvatar').textContent = initials(profile.name);
    $('profileShortcutName').textContent = profile.name;
    $('accountAvatar').textContent = initials(profile.name);
    $('accountName').textContent = profile.name;
  }

  function bindEvents() {
    $('profileList').addEventListener('click', function (event) {
      var button = event.target.closest('[data-profile-id]');
      if (!button) return;
      var profile = profileById(button.dataset.profileId);
      if (profile) selectProfile(profile);
    });

    $('showCreateProfileBtn').addEventListener('click', function () {
      $('newProfileName').value = '';
      $('newProfilePin').value = '';
      $('confirmProfilePin').value = '';
      setAuthView('create');
      $('newProfileName').focus();
    });

    $('backToProfilesBtn').addEventListener('click', function () { setAuthView('choose'); });
    $('backFromCreateBtn').addEventListener('click', function () {
      if (profiles.length) setAuthView('choose');
    });

    $('profileLoginForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var profile = profileById($('profileLoginId').value);
      var pin = $('profilePin').value;
      if (!profile) return setAuthView('choose');
      $('profileLoginSubmit').disabled = true;
      hashPin(pin, profile.salt).then(function (hash) {
        $('profileLoginSubmit').disabled = false;
        if (hash !== profile.pinHash) {
          setError('That PIN is not correct. Try again.');
          $('profilePin').select();
          return;
        }
        activateProfile(profile);
      });
    });

    $('profileCreateForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var name = $('newProfileName').value.trim().slice(0, 28);
      var pin = $('newProfilePin').value;
      var confirmation = $('confirmProfilePin').value;
      if (name.length < 2) return setError('Enter a name with at least 2 characters.');
      if (!/^\d{4,8}$/.test(pin)) return setError('Use a PIN with 4 to 8 numbers.');
      if (pin !== confirmation) return setError('The PINs do not match.');
      var duplicate = profiles.some(function (profile) {
        return profile.name.toLowerCase() === name.toLowerCase();
      });
      if (duplicate) return setError('A profile with that name already exists.');
      $('profileCreateSubmit').disabled = true;
      createProfile(name, pin).catch(function () {
        $('profileCreateSubmit').disabled = false;
        setError('Could not create the profile. Check browser storage and try again.');
      });
    });

    $('profileShortcutBtn').addEventListener('click', function () {
      $('accountModal').hidden = false;
    });
    $('closeAccountBtn').addEventListener('click', function () { $('accountModal').hidden = true; });
    $('accountModal').addEventListener('click', function (event) {
      if (event.target === $('accountModal')) $('accountModal').hidden = true;
    });
    $('switchProfileBtn').addEventListener('click', function () {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      activeProfileId = '';
      showAuth('choose');
    });
    $('addProfileBtn').addEventListener('click', function () {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      activeProfileId = '';
      showAuth('create');
    });
    $('logoutProfileBtn').addEventListener('click', function () {
      localStorage.removeItem(ACTIVE_PROFILE_KEY);
      window.location.reload();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !$('accountModal').hidden) $('accountModal').hidden = true;
    });
  }

  window.HabitProfiles = {
    getActiveProfileId: function () { return activeProfileId; },
    getStateKey: function () { return activeProfileId ? stateKey(activeProfileId) : 'habitRpg.guest.state.v1'; },
    getThemeKey: function () { return activeProfileId ? themeKey(activeProfileId) : LEGACY_THEME_KEY; },
    getActiveProfile: function () { return profileById(activeProfileId); }
  };

  bindEvents();
  if (activeProfileId) {
    hideAuth();
    populateAccountShortcut();
  } else {
    showAuth();
  }
})();
