const API_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY';
const API_BASE = 'https://api.nasa.gov/planetary/apod';

const APOD_START = new Date('1995-06-16');
const TODAY = new Date();

const $ = (sel) => document.querySelector(sel);

const datepicker = $('#datepicker');
const dateWidgetBtn = $('#date-widget-btn');
const calendarDropdown = $('#calendar-dropdown');
const btnTheme = $('#btn-theme');
const btnAudio = $('#btn-audio');
const audioEq = $('#audio-equalizer');
const btnSettings = $('#btn-settings');
const settingsDialog = $('#settings-dialog');
const btnCloseSettings = $('#btn-close-settings');
const btnSaveSettings = $('#btn-save-settings');
const settingTheme = $('#setting-theme');
const settingEngine = $('#setting-engine');
const settingMusic = $('#setting-music');
const settingTrack = $('#setting-track');
const settingVolume = $('#setting-volume');
const shortcutsEditor = $('#shortcuts-editor');
const shortcutsEmpty = $('#shortcuts-empty');
const btnAddShortcut = $('#btn-add-shortcut');
const btnCancelSettings = $('#btn-cancel-settings');
const volumeReadout = $('#volume-readout');
const btnCopyUrl = $('#btn-copy-url');
const copyLabel = $('#copy-label');
const defaultUrlField = $('#default-url');
const quickAccessBox = $('#quick-access-box');
const apodView = $('#apod-view');
const apodImage = $('#apod-image');
const apodVideo = $('#apod-video');
const apodTitle = $('#apod-title');
const apodExplanation = $('#apod-explanation');
const apodDateLabel = $('#apod-date-label');
const apodBadge = $('#apod-badge');
const dateDisplay = $('#date-display');
const btnRetry = $('#btn-retry');
const errorMsg = $('#error-message');
const searchForm = $('#search-form');
const searchInput = $('#search-input');
const searchWrapper = $('#search-wrapper');
const suggestionsBox = $('#suggestions-box');
const starfield = $('#starfield');

const DEFAULT_SHORTCUTS = "GitHub,https://github.com\nReddit,https://reddit.com\nYouTube,https://youtube.com\nNASA,https://apod.nasa.gov";

let prefs = {
  theme: localStorage.getItem('astropinax-pref-theme') || 'space',
  engine: localStorage.getItem('astropinax-pref-engine') || 'google',
  musicAutoplay: localStorage.getItem('astropinax-pref-music') === 'true',
  musicTrack: localStorage.getItem('astropinax-pref-track') || '1',
  musicVolume: parseInt(localStorage.getItem('astropinax-pref-volume') || '50', 10),
  shortcuts: localStorage.getItem('astropinax-pref-shortcuts') || DEFAULT_SHORTCUTS
};

const THEME_ORDER = ['space', 'void', 'light'];
const THEME_LABELS = { space: 'Space', void: 'Void', light: 'Nova (Light)' };

function applyPreferences() {
  document.documentElement.setAttribute('data-theme', prefs.theme);
  if (starfield) {
    const themeOpacity = getComputedStyle(document.documentElement)
      .getPropertyValue('--starfield-opacity').trim();
    starfield.style.opacity = themeOpacity || '1';
  }
  if (btnTheme) {
    btnTheme.setAttribute('title', `Theme: ${THEME_LABELS[prefs.theme] || prefs.theme} — click to cycle`);
    btnTheme.setAttribute('aria-label', `Switch theme. Current theme: ${THEME_LABELS[prefs.theme] || prefs.theme}`);
  }

  const placeholderText = prefs.engine === 'ddg' ? 'Search DuckDuckGo or type a URL…' : 'Search Google or type a URL…';
  searchInput.setAttribute('placeholder', placeholderText);
  searchForm.setAttribute('action', prefs.engine === 'ddg' ? 'https://duckduckgo.com/' : 'https://www.google.com/search');

  if (mainGain && audioCtx) {
    const targetGain = (prefs.musicVolume / 100) * 0.35;
    mainGain.gain.setValueAtTime(targetGain, audioCtx.currentTime);
  }

  renderShortcuts();

}

function renderShortcuts() {
  quickAccessBox.innerHTML = '';

  parseShortcuts(prefs.shortcuts).forEach(({ name, url }) => {
    if (!url) return;
    const href = url.startsWith('http') ? url : `https://${url}`;

    const a = document.createElement('a');
    a.className = 'quick-access-item';
    a.href = href;
    a.title = name || href;
    a.target = '_self';

    const fallback = (name || href).replace(/^https?:\/\//, '').slice(0, 2).toUpperCase();
    try {
      const domain = new URL(href).hostname;
      const img = document.createElement('img');
      img.alt = name;
      img.style.width = '20px';
      img.style.height = '20px';
      img.style.pointerEvents = 'none';
        img.addEventListener('error', () => {
        img.remove();
        a.textContent = fallback;
      });
      img.src = `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
      a.appendChild(img);
    } catch (err) {
      a.textContent = fallback;
    }

    quickAccessBox.appendChild(a);
  });
}

function toggleTheme() {
  const idx = THEME_ORDER.indexOf(prefs.theme);
  prefs.theme = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
  localStorage.setItem('astropinax-pref-theme', prefs.theme);
  applyPreferences();
}

btnTheme.addEventListener('click', toggleTheme);

btnAudio.addEventListener('click', () => {
  if (isPlayingAudio) {
    stopAmbientAudio();
  } else {
    startAmbientAudio();
  }
});

function parseShortcuts(raw) {
  return raw.split('\n')
    .map(line => {
      const idx = line.indexOf(',');
      if (idx === -1) return null;
      const name = line.slice(0, idx).trim();
      const url = line.slice(idx + 1).trim();
      if (!name && !url) return null;
      return { name, url };
    })
    .filter(Boolean);
}

function serializeShortcuts() {
  const rows = shortcutsEditor.querySelectorAll('.shortcut-row');
  const lines = [];
  rows.forEach(row => {
    const name = row.querySelector('.shortcut-name').value.trim();
    const url = row.querySelector('.shortcut-url').value.trim();
    if (name || url) lines.push(`${name},${url}`);
  });
  return lines.join('\n');
}

function faviconFor(url) {
  try {
    const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  } catch {
    return null;
  }
}

function updateShortcutsEmptyState() {
  const hasRows = shortcutsEditor.querySelector('.shortcut-row');
  shortcutsEmpty.classList.toggle('hidden', !!hasRows);
}

function createShortcutRow(name = '', url = '') {
  const row = document.createElement('div');
  row.className = 'shortcut-row';

  const fav = document.createElement('span');
  fav.className = 'shortcut-favicon';
  const setFav = (u) => {
    const letter = ((nameInput && nameInput.value) || name || u || '?').trim().slice(0, 1).toUpperCase() || '?';
    const src = faviconFor(u);
    fav.innerHTML = '';
    if (src) {
      const img = document.createElement('img');
      img.alt = '';
      img.width = 18;
      img.height = 18;
        img.addEventListener('error', () => {
        fav.innerHTML = '';
        fav.textContent = letter;
      });
      img.src = src;
      fav.appendChild(img);
    } else {
      fav.textContent = letter;
    }
  };

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'shortcut-name input-field input-field-sm';
  nameInput.placeholder = 'Name';
  nameInput.value = name;

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.className = 'shortcut-url input-field input-field-sm';
  urlInput.placeholder = 'https://example.com';
  urlInput.value = url;
  urlInput.addEventListener('input', () => setFav(urlInput.value));
  nameInput.addEventListener('input', () => setFav(urlInput.value));

  setFav(url);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'shortcut-remove';
  removeBtn.title = 'Remove link';
  removeBtn.setAttribute('aria-label', 'Remove link');
  removeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  removeBtn.addEventListener('click', () => {
    row.remove();
    updateShortcutsEmptyState();
  });

  row.append(fav, nameInput, urlInput, removeBtn);
  shortcutsEditor.appendChild(row);
  return row;
}

function renderShortcutsEditor(raw) {
  shortcutsEditor.innerHTML = '';
  parseShortcuts(raw).forEach(({ name, url }) => createShortcutRow(name, url));
  updateShortcutsEmptyState();
}

btnAddShortcut.addEventListener('click', () => {
  const row = createShortcutRow();
  updateShortcutsEmptyState();
  row.querySelector('.shortcut-name').focus();
});

settingVolume.addEventListener('input', () => {
  volumeReadout.textContent = `${settingVolume.value}%`;
});

btnCopyUrl.addEventListener('click', async () => {
  const url = defaultUrlField.value;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    defaultUrlField.select();
    document.execCommand('copy');
  }
  copyLabel.textContent = 'Copied!';
  btnCopyUrl.classList.add('copied');
  setTimeout(() => {
    copyLabel.textContent = 'Copy';
    btnCopyUrl.classList.remove('copied');
  }, 1600);
});

btnSettings.addEventListener('click', () => {
  settingTheme.value = prefs.theme;
  settingEngine.value = prefs.engine;
  settingMusic.checked = prefs.musicAutoplay;
  settingTrack.value = prefs.musicTrack;
  settingVolume.value = prefs.musicVolume;
  volumeReadout.textContent = `${prefs.musicVolume}%`;
  renderShortcutsEditor(prefs.shortcuts);
  settingsDialog.showModal();
});

function closeSettings() {
  settingsDialog.close();
}

btnCloseSettings.addEventListener('click', closeSettings);
btnCancelSettings.addEventListener('click', closeSettings);

settingsDialog.addEventListener('click', (e) => {
  if (e.target === settingsDialog) closeSettings();
});

btnSaveSettings.addEventListener('click', () => {
  const trackChanged = (prefs.musicTrack !== settingTrack.value);

  prefs.theme = settingTheme.value;
  prefs.engine = settingEngine.value;
  prefs.musicAutoplay = settingMusic.checked;
  prefs.musicTrack = settingTrack.value;
  prefs.musicVolume = parseInt(settingVolume.value, 10);
  prefs.shortcuts = serializeShortcuts();

  localStorage.setItem('astropinax-pref-theme', prefs.theme);
  localStorage.setItem('astropinax-pref-engine', prefs.engine);
  localStorage.setItem('astropinax-pref-music', prefs.musicAutoplay);
  localStorage.setItem('astropinax-pref-track', prefs.musicTrack);
  localStorage.setItem('astropinax-pref-volume', prefs.musicVolume);
  localStorage.setItem('astropinax-pref-shortcuts', prefs.shortcuts);

  applyPreferences();

  if (isPlayingAudio && trackChanged) {
    stopAmbientAudio();
    startAmbientAudio();
  }
  settingsDialog.close();
});

let audioCtx = null;
let mainGain = null;
let delayNode = null;
let delayFeedback = null;
let isPlayingAudio = false;

let trackNodes = [];
let melodicTimer = null;
let twinkleTimer = null;

function initAudioEngine() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  
  delayNode = audioCtx.createDelay();
  delayNode.delayTime.setValueAtTime(0.6, audioCtx.currentTime);
  delayFeedback = audioCtx.createGain();
  delayFeedback.gain.setValueAtTime(0.4, audioCtx.currentTime);
  
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  
  mainGain = audioCtx.createGain();
  mainGain.gain.setValueAtTime(0, audioCtx.currentTime);
  
  mainGain.connect(delayNode);
  delayNode.connect(audioCtx.destination);
  mainGain.connect(audioCtx.destination);
}

function startAmbientAudio() {
  initAudioEngine();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  stopTrackSynths();

  const selectedTrack = prefs.musicTrack;
  const initialGain = (prefs.musicVolume / 100) * 0.35;
  mainGain.gain.linearRampToValueAtTime(initialGain, audioCtx.currentTime + 2.0);

  if (selectedTrack === '1') {
    playTrack1();
  } else if (selectedTrack === '2') {
    playTrack2();
  } else if (selectedTrack === '3') {
    playTrack3();
  }

  isPlayingAudio = true;
  updateAudioUI();

}

function stopTrackSynths() {
  if (melodicTimer) clearInterval(melodicTimer);
  if (twinkleTimer) clearInterval(twinkleTimer);
  melodicTimer = null;
  twinkleTimer = null;

  trackNodes.forEach(node => {
    try { node.stop(); } catch(e) {}
    try { node.disconnect(); } catch(e) {}
  });
  trackNodes = [];

}

function playTrack1() {
  const osc = audioCtx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(55, audioCtx.currentTime);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(220, audioCtx.currentTime);
  filter.Q.setValueAtTime(5, audioCtx.currentTime);

  const filterLFO = audioCtx.createOscillator();
  filterLFO.frequency.setValueAtTime(0.06, audioCtx.currentTime);
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(120, audioCtx.currentTime);

  filterLFO.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  osc.connect(filter);
  filter.connect(mainGain);

  osc.start();
  filterLFO.start();

  trackNodes.push(osc, filterLFO, lfoGain, filter);
}

function playTrack2() {
  const baseOsc = audioCtx.createOscillator();
  baseOsc.type = 'sawtooth';
  baseOsc.frequency.setValueAtTime(65.41, audioCtx.currentTime);

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(150, audioCtx.currentTime);
  
  const filterLFO = audioCtx.createOscillator();
  filterLFO.frequency.setValueAtTime(0.1, audioCtx.currentTime);
  const lfoGain = audioCtx.createGain();
  lfoGain.gain.setValueAtTime(50, audioCtx.currentTime);
  filterLFO.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  baseOsc.connect(filter);
  filter.connect(mainGain);

  baseOsc.start();
  filterLFO.start();
  trackNodes.push(baseOsc, filterLFO, lfoGain, filter);

  const scale = [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66, 329.63];
  
  melodicTimer = setInterval(() => {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const randomFreq = scale[Math.floor(Math.random() * scale.length)];
    
    const noteOsc = audioCtx.createOscillator();
    noteOsc.type = 'sine';
    noteOsc.frequency.setValueAtTime(randomFreq, audioCtx.currentTime);

    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0, audioCtx.currentTime);
    
    noteGain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 1.5);
    noteGain.gain.setValueAtTime(0.08, audioCtx.currentTime + 2.0);
    noteGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.8);

    noteOsc.connect(noteGain);
    noteGain.connect(mainGain);

    noteOsc.start();
    noteOsc.stop(audioCtx.currentTime + 4.0);
  }, 4000);

}

function playTrack3() {
  const root = 110.00;
  const chord = [root, root * 1.2, root * 1.5, root * 1.8];
  
  chord.forEach(freq => {
    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, audioCtx.currentTime);

    osc.connect(filter);
    filter.connect(mainGain);
    osc.start();
    trackNodes.push(osc, filter);
  });

  twinkleTimer = setInterval(() => {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    
    const sparkleFreq = 880 + Math.random() * 800;

    const sparkleOsc = audioCtx.createOscillator();
    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(sparkleFreq, audioCtx.currentTime);

    const sparkleGain = audioCtx.createGain();
    sparkleGain.gain.setValueAtTime(0, audioCtx.currentTime);
    sparkleGain.gain.linearRampToValueAtTime(0.02, audioCtx.currentTime + 0.05);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(mainGain);

    sparkleOsc.start();
    sparkleOsc.stop(audioCtx.currentTime + 1.3);
  }, 1200);
}

function stopAmbientAudio() {
  if (mainGain && audioCtx) {
    mainGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);
  }
  setTimeout(() => {
    if (!isPlayingAudio) stopTrackSynths();
  }, 1000);

  isPlayingAudio = false;
  updateAudioUI();
}

function updateAudioUI() {
  if (isPlayingAudio) {
    btnAudio.querySelector('.icon-audio-off').classList.add('hidden');
    btnAudio.querySelector('.icon-audio-on').classList.remove('hidden');
    audioEq.classList.remove('hidden');
  } else {
    btnAudio.querySelector('.icon-audio-on').classList.add('hidden');
    btnAudio.querySelector('.icon-audio-off').classList.remove('hidden');
    audioEq.classList.add('hidden');
  }
}

let currentCalYear = TODAY.getFullYear();
let currentCalMonth = TODAY.getMonth();

function renderCustomCalendar(year, month) {
  calendarDropdown.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const selectedDateStr = datepicker.value;
  const selectedObj = selectedDateStr ? toDateObj(selectedDateStr) : null;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const calHeader = document.createElement('div');
  calHeader.className = 'cal-header';
  calHeader.innerHTML = `
    <button class="cal-btn" id="cal-prev-month">&larr;</button>
    <span class="cal-month-year">${monthNames[month]} ${year}</span>
    <button class="cal-btn" id="cal-next-month">&rarr;</button>
  `;
  calendarDropdown.appendChild(calHeader);

  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const calWeekdays = document.createElement('div');
  calWeekdays.className = 'cal-weekdays';
  weekdays.forEach(day => {
    const span = document.createElement('span');
    span.textContent = day;
    calWeekdays.appendChild(span);
  });
  calendarDropdown.appendChild(calWeekdays);

  const calDays = document.createElement('div');
  calDays.className = 'cal-days';

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('span');
    emptyCell.className = 'cal-day empty';
    calDays.appendChild(emptyCell);
  }

  for (let d = 1; d <= totalDays; d++) {
    const dayBtn = document.createElement('span');
    dayBtn.className = 'cal-day';
    dayBtn.textContent = d;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const thisDate = new Date(year, month, d);

    if (thisDate < APOD_START || thisDate > TODAY) {
      dayBtn.classList.add('disabled');
    } else {
      dayBtn.addEventListener('click', () => {
        calendarDropdown.classList.add('hidden');
        goToDate(dateStr);
      });
    }

    if (selectedObj && selectedObj.getFullYear() === year && selectedObj.getMonth() === month && selectedObj.getDate() === d) {
      dayBtn.classList.add('selected');
    }

    calDays.appendChild(dayBtn);
  }

  calendarDropdown.appendChild(calDays);

  $('#cal-prev-month').addEventListener('click', (e) => {
    e.stopPropagation();
    currentCalMonth--;
    if (currentCalMonth < 0) {
      currentCalMonth = 11;
      currentCalYear--;
    }
    renderCustomCalendar(currentCalYear, currentCalMonth);
  });

  $('#cal-next-month').addEventListener('click', (e) => {
    e.stopPropagation();
    currentCalMonth++;
    if (currentCalMonth > 11) {
      currentCalMonth = 0;
      currentCalYear++;
    }
    renderCustomCalendar(currentCalYear, currentCalMonth);
  });
}

dateWidgetBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const dropdownHidden = calendarDropdown.classList.contains('hidden');
  if (dropdownHidden) {
    const activeDateStr = datepicker.value || formatDate(TODAY);
    const dObj = toDateObj(activeDateStr);
    currentCalYear = dObj.getFullYear();
    currentCalMonth = dObj.getMonth();
    renderCustomCalendar(currentCalYear, currentCalMonth);
    calendarDropdown.classList.remove('hidden');
  } else {
    calendarDropdown.classList.add('hidden');
  }
});

document.addEventListener('click', (e) => {
  if (!calendarDropdown.contains(e.target) && e.target !== dateWidgetBtn) {
    calendarDropdown.classList.add('hidden');
  }
});


function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toDateObj(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function clampDate(date) {
  if (date > TODAY) return new Date(TODAY);
  if (date < APOD_START) return new Date(APOD_START);
  return date;
}

function formatDisplay(d) {
  return d.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
  });
}

function formatShort(d) {
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function showLoading() {
  apodView.classList.remove('hidden');
  apodView.classList.add('loading');
  errorMsg.classList.add('hidden');
  btnRetry.classList.add('hidden');
  apodBadge.classList.add('hidden');
  
  apodTitle.textContent = '';
  apodExplanation.textContent = '';
  apodDateLabel.textContent = '';
}

function showError(msg) {
  apodView.classList.remove('loading');
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
  btnRetry.classList.remove('hidden');
}

function updateDateUI(dateStr) {
  const d = toDateObj(dateStr);
  dateDisplay.textContent = formatDisplay(d);
  apodDateLabel.textContent = formatShort(d);
}

let activeApodData = null;

let activeBlobUrl = null;

async function loadImageWithCache(url, title) {
  if (!url) return;
  
  if (activeBlobUrl) {
    URL.revokeObjectURL(activeBlobUrl);
    activeBlobUrl = null;
  }

  try {
    const cache = await caches.open('astropinax-image-cache');
    const cachedResponse = await cache.match(url);

    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      activeBlobUrl = URL.createObjectURL(blob);
      apodImage.src = activeBlobUrl;
      apodImage.alt = title;
    } else {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Image fetch failed');
      
      await cache.put(url, response.clone());
      
      const blob = await response.blob();
      activeBlobUrl = URL.createObjectURL(blob);
      apodImage.src = activeBlobUrl;
      apodImage.alt = title;
      
      const keys = await cache.keys();
      for (const request of keys) {
        if (request.url !== url) {
          await cache.delete(request);
        }
      }
    }
  } catch (err) {
    apodImage.src = url;
    apodImage.alt = title;
  }
}

function updateUI(data) {
  activeApodData = data;
  apodView.classList.remove('loading');
  errorMsg.classList.add('hidden');
  btnRetry.classList.add('hidden');
  apodBadge.classList.remove('hidden');

  apodTitle.textContent = data.title;
  apodExplanation.textContent = data.explanation;
  updateDateUI(data.date);

  const secureUrl = data.url.replace('http://', 'https://');

  if (data.media_type === 'video') {
    apodImage.classList.add('hidden');
    apodVideo.classList.remove('hidden');
    apodVideo.src = secureUrl;
  } else {
    apodVideo.classList.add('hidden');
    apodImage.classList.remove('hidden');
    loadImageWithCache(secureUrl, data.title);
  }
  
  setTimeout(forceFocus, 100);
}

async function fetchAPOD(dateStr, attempt = 0) {
  showLoading();

  try {
    const res = await fetch(`${API_BASE}?api_key=${API_KEY}&date=${dateStr}`);
    if (!res.ok) {
      if ((res.status === 400 || res.status === 404) && attempt < 3) {
        const d = toDateObj(dateStr);
        d.setDate(d.getDate() - 1);
        goToDate(formatDate(d), attempt + 1);
        return;
      }
      if (res.status === 429) throw new Error('API rate limit reached. Try again shortly.');
      if (res.status === 400 || res.status === 404) throw new Error('No APOD available for this date.');
      throw new Error(`Request failed (${res.status})`);
    }
    const data = await res.json();
    updateUI(data);
  } catch (err) {
    showError(err.message);
  }
}

function goToDate(dateStr, attempt = 0) {
  datepicker.value = dateStr;
  fetchAPOD(dateStr, attempt);
}

function goToday() {
  goToDate(formatDate(TODAY));
}

function goRandom() {
  const start = APOD_START.getTime();
  const end = TODAY.getTime();
  const randomTime = start + Math.random() * (end - start);
  const randomDate = new Date(randomTime);
  goToDate(formatDate(randomDate));
}

function shiftDay(delta) {
  const current = datepicker.value ? toDateObj(datepicker.value) : new Date(TODAY);
  current.setDate(current.getDate() + delta);
  goToDate(formatDate(clampDate(current)));
}

function showHelpGuide() {
  apodTitle.textContent = "AstroPinax Terminal System Guide";
  apodDateLabel.textContent = "COMMAND DIRECTORY";
  
  apodExplanation.innerHTML = `
    <div style="font-family: monospace; line-height: 1.6; color: var(--text-secondary);">
      <p style="margin-bottom: 12px; color: var(--green-500);">=== UTILITY COMMANDS (Type &gt; to activate) ===</p>
      <div style="margin-bottom: 8px;"><strong>&gt;today</strong> - Jump to today's cosmic image</div>
      <div style="margin-bottom: 8px;"><strong>&gt;random</strong> - View a random cosmic date since 1995</div>
      <div style="margin-bottom: 8px;"><strong>&gt;prev</strong> - Go back one day</div>
      <div style="margin-bottom: 8px;"><strong>&gt;next</strong> - Go forward one day</div>
      <div style="margin-bottom: 8px;"><strong>&gt;theme</strong> - Toggle between Space and Void layout</div>
      <div style="margin-bottom: 8px;"><strong>&gt;music</strong> - Toggle ambient space synthesizer music</div>
      <div style="margin-bottom: 8px;"><strong>&gt;settings</strong> - Open AstroPinax preferences panel</div>
      <div style="margin-bottom: 8px;"><strong>&gt;nasa</strong> - Open official NASA Astronomy Pic portal</div>
      <div style="margin-bottom: 8px;"><strong>&gt;source</strong> - Visit the open-source project repository</div>
      <div style="margin-bottom: 16px;"><strong>&gt;help</strong> - Reload this interface guide</div>
      
      <p style="margin-bottom: 12px; color: #00D2FF;">=== TARGETED SECTOR SEARCHES (Type / to activate) ===</p>
      <div style="margin-bottom: 8px;"><strong>/google &lt;query&gt;</strong> - Search using Google</div>
      <div style="margin-bottom: 8px;"><strong>/ddg &lt;query&gt;</strong> - Search using DuckDuckGo</div>
      <div style="margin-bottom: 8px;"><strong>/github &lt;query&gt;</strong> - Search GitHub repositories</div>
      <div style="margin-bottom: 8px;"><strong>/reddit &lt;query&gt;</strong> - Search Reddit posts & communities</div>
      <div style="margin-bottom: 8px;"><strong>/youtube &lt;query&gt;</strong> - Search YouTube videos</div>
      <div style="margin-bottom: 12px;"><strong>/wikipedia &lt;query&gt;</strong> - Search Wikipedia encyclopedia</div>
      
      <button id="btn-close-help" class="btn btn-primary btn-sm" style="margin-top: 10px;">Return to APOD Info</button>
    </div>
  `;

  $('#btn-close-help').addEventListener('click', () => {
    if (activeApodData) {
      updateUI(activeApodData);
    } else {
      goToday();
    }
  });
}

const UTILITY_COMMANDS = [
  { cmd: '>today', desc: 'Jump to today\'s astronomy picture', action: () => goToday() },
  { cmd: '>random', desc: 'Explore a random date from the archives', action: () => goRandom() },
  { cmd: '>prev', desc: 'Go back one day in history', action: () => shiftDay(-1) },
  { cmd: '>next', desc: 'Go forward one day in history', action: () => shiftDay(1) },
  { cmd: '>theme', desc: 'Toggle Space and Void theme modes', action: () => toggleTheme() },
  { cmd: '>music', desc: 'Toggle ambient space synthesizer music', action: () => isPlayingAudio ? stopAmbientAudio() : startAmbientAudio() },
  { cmd: '>settings', desc: 'Display visual preference panel', action: () => btnSettings.click() },
  { cmd: '>nasa', desc: 'Open the official NASA APOD site', action: () => { window.location.href = 'https://apod.nasa.gov/apod/astropix.html'; } },
  { cmd: '>source', desc: 'View source code on GitHub', action: () => { window.location.href = 'https://github.com/TADSTech/AstroPinax'; } },
  { cmd: '>help', desc: 'Display all terminal commands', action: () => showHelpGuide() }
];

const SEARCH_ENGINES = [
  { cmd: '/google', placeholder: '/google ', desc: 'Search Google', url: 'https://www.google.com/search?q={q}' },
  { cmd: '/ddg', placeholder: '/ddg ', desc: 'Search DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
  { cmd: '/github', placeholder: '/github ', desc: 'Search GitHub', url: 'https://github.com/search?q={q}' },
  { cmd: '/reddit', placeholder: '/reddit ', desc: 'Search Reddit', url: 'https://www.reddit.com/search/?q={q}' },
  { cmd: '/youtube', placeholder: '/youtube ', desc: 'Search YouTube', url: 'https://www.youtube.com/results?search_query={q}' },
  { cmd: '/wikipedia', placeholder: '/wikipedia ', desc: 'Search Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search={q}' }
];

let activeSuggestionIdx = -1;
let filteredItems = [];
let mode = null;

function hideSuggestions() {
  suggestionsBox.classList.add('hidden');
  suggestionsBox.innerHTML = '';
  activeSuggestionIdx = -1;
  filteredItems = [];
  mode = null;
}

function showSuggestions(inputVal) {
  const query = inputVal.toLowerCase().split(' ')[0];
  
  if (inputVal.startsWith('>')) {
    mode = 'command';
    filteredItems = UTILITY_COMMANDS.filter(c => c.cmd.startsWith(query));
  } else if (inputVal.startsWith('/')) {
    mode = 'slash';
    filteredItems = SEARCH_ENGINES.filter(c => c.cmd.startsWith(query));
  }

  if (filteredItems.length === 0) {
    hideSuggestions();
    return;
  }

  suggestionsBox.innerHTML = '';
  filteredItems.forEach((c, idx) => {
    const div = document.createElement('div');
    div.className = 'suggestion-item' + (idx === activeSuggestionIdx ? ' active' : '');
    
    const cmdClass = mode === 'slash' ? 'suggestion-command slash' : 'suggestion-command';
    div.innerHTML = `<span class="${cmdClass}">${c.cmd}</span><span class="suggestion-desc">${c.desc}</span>`;
    
    div.addEventListener('click', () => {
      executeItem(c);
    });
    
    suggestionsBox.appendChild(div);
  });
  suggestionsBox.classList.remove('hidden');
}

function updateSuggestionHighlight() {
  const items = suggestionsBox.querySelectorAll('.suggestion-item');
  items.forEach((item, idx) => {
    item.classList.toggle('active', idx === activeSuggestionIdx);
  });
}

function executeItem(itemObj) {
  if (mode === 'command') {
    searchInput.value = '';
    searchWrapper.classList.remove('command-active');
    hideSuggestions();
    itemObj.action();
  } else if (mode === 'slash') {
    searchInput.value = itemObj.placeholder;
    searchWrapper.classList.remove('command-active');
    searchWrapper.classList.add('slash-active');
    hideSuggestions();
    searchInput.focus();
  }
}



searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  if (val.startsWith('>')) {
    searchWrapper.classList.remove('slash-active');
    searchWrapper.classList.add('command-active');
    showSuggestions(val);
  } else if (val.startsWith('/')) {
    searchWrapper.classList.remove('command-active');
    searchWrapper.classList.add('slash-active');
    
    if (val.includes(' ')) {
      hideSuggestions();
    } else {
      showSuggestions(val);
    }
  } else {
    searchWrapper.classList.remove('command-active', 'slash-active');
    hideSuggestions();
  }
});

searchInput.addEventListener('keydown', (e) => {
  const hasSuggestions = !suggestionsBox.classList.contains('hidden') && filteredItems.length > 0;

  if (hasSuggestions) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeSuggestionIdx = (activeSuggestionIdx + 1) % filteredItems.length;
      updateSuggestionHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeSuggestionIdx = (activeSuggestionIdx - 1 + filteredItems.length) % filteredItems.length;
      updateSuggestionHighlight();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const targetIdx = activeSuggestionIdx >= 0 ? activeSuggestionIdx : 0;
      executeItem(filteredItems[targetIdx]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIdx >= 0) {
        executeItem(filteredItems[activeSuggestionIdx]);
      } else {
        const queryWord = searchInput.value.trim().toLowerCase();
        const exactMatch = filteredItems.find(c => c.cmd === queryWord);
        if (exactMatch) {
          executeItem(exactMatch);
        }
      }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  }
});

searchForm.addEventListener('submit', (e) => {
  const q = searchInput.value.trim();
  if (!q) {
    e.preventDefault();
    return;
  }

  if (q.startsWith('>')) {
    e.preventDefault();
    const match = UTILITY_COMMANDS.find(c => c.cmd === q.toLowerCase());
    if (match) {
      executeItem(match);
    }
    return;
  }

  if (q.startsWith('/')) {
    e.preventDefault();
    const parts = q.split(' ');
    const command = parts[0].toLowerCase();
    const query = parts.slice(1).join(' ');

    const engine = SEARCH_ENGINES.find(se => se.cmd === command);
    if (engine) {
      if (query) {
        window.location.href = engine.url.replace('{q}', encodeURIComponent(query));
      } else {
        searchInput.value = engine.placeholder;
        searchInput.focus();
      }
    }
    return;
  }

  if (q.includes('.') && !q.includes(' ')) {
    e.preventDefault();
    window.location.href = q.startsWith('http') ? q : `https://${q}`;
  }
});

function forceFocus() {
  searchInput.focus();
}

datepicker.max = formatDate(TODAY);
datepicker.min = formatDate(APOD_START);

applyPreferences();
goToday();

datepicker.addEventListener('change', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

btnRetry.addEventListener('click', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') shiftDay(-1);
  if (e.key === 'ArrowRight') shiftDay(1);
  if (e.key === 't' || e.key === 'T') goToday();
});

document.addEventListener('click', (e) => {
  if (!searchForm.contains(e.target)) {
    hideSuggestions();
  }
});

window.addEventListener('load', () => {
  apodView.classList.remove('hidden');
  forceFocus();
  
  setTimeout(forceFocus, 500);
  setTimeout(forceFocus, 1000);
  setTimeout(forceFocus, 2000);

  const startAutoplay = () => {
    if (prefs.musicAutoplay && !isPlayingAudio) {
      startAmbientAudio();
    }
    document.removeEventListener('click', startAutoplay);
    document.removeEventListener('keydown', startAutoplay);
  };
  document.addEventListener('click', startAutoplay);
  document.addEventListener('keydown', startAutoplay);
});
