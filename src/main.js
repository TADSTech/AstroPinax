const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const API_BASE = 'https://api.nasa.gov/planetary/apod';

const APOD_START = new Date('1995-06-16');
const TODAY = new Date();

const $ = (sel) => document.querySelector(sel);

// DOM Elements
const datepicker = $('#datepicker');
const dateWidgetBtn = $('#date-widget-btn');
const btnTheme = $('#btn-theme');
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

// Theme Management
const THEME_KEY = 'astropinax-theme';

function getPreferredTheme() {
  return localStorage.getItem(THEME_KEY) || 'space';
}

function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem(THEME_KEY, name);
  
  if (starfield) {
    starfield.style.opacity = name === 'void' ? '0.15' : '1';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'space';
  const next = current === 'void' ? 'space' : 'void';
  setTheme(next);
}

btnTheme.addEventListener('click', toggleTheme);
setTheme(getPreferredTheme());

// Starfield Canvas Background Animation
let stars = [];
let starAnimId = null;

function initStarfield() {
  const ctx = starfield.getContext('2d');
  if (!ctx) return;

  function resize() {
    starfield.width = window.innerWidth;
    starfield.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const NUM_STARS = 250;
  stars = [];

  for (let i = 0; i < NUM_STARS; i++) {
    stars.push({
      x: Math.random() * starfield.width,
      y: Math.random() * starfield.height,
      r: Math.random() * 1.8 + 0.3,
      base: Math.random() * 0.5 + 0.3,
      speed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    });
  }

  let time = 0;

  function draw() {
    ctx.clearRect(0, 0, starfield.width, starfield.height);
    time++;

    for (const s of stars) {
      const alpha = s.base + Math.sin(time * s.speed + s.phase) * 0.2;
      const a = Math.max(0.1, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 230, 255, ${a})`;
      ctx.fill();
    }

    starAnimId = requestAnimationFrame(draw);
  }

  draw();
}

initStarfield();

// Date Utility Helpers
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

// UI State Management
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

function updateUI(data) {
  activeApodData = data;
  apodView.classList.remove('loading');
  errorMsg.classList.add('hidden');
  btnRetry.classList.add('hidden');
  apodBadge.classList.remove('hidden');

  apodTitle.textContent = data.title;
  apodExplanation.textContent = data.explanation;
  updateDateUI(data.date);

  if (data.media_type === 'video') {
    apodImage.classList.add('hidden');
    apodVideo.classList.remove('hidden');
    apodVideo.src = data.url;
  } else {
    apodVideo.classList.add('hidden');
    apodImage.classList.remove('hidden');
    apodImage.src = data.url;
    apodImage.alt = data.title;
  }
  
  setTimeout(forceFocus, 100);
}

// API Integration
async function fetchAPOD(dateStr) {
  showLoading();

  try {
    const res = await fetch(`${API_BASE}?api_key=${API_KEY}&date=${dateStr}`);
    if (!res.ok) {
      if (res.status === 429) throw new Error('API rate limit reached. Try again shortly.');
      if (res.status === 400) throw new Error('No APOD available for this date.');
      throw new Error(`Request failed (${res.status})`);
    }
    const data = await res.json();
    updateUI(data);
  } catch (err) {
    showError(err.message);
  }
}

// Navigation Controls
function goToDate(dateStr) {
  datepicker.value = dateStr;
  fetchAPOD(dateStr);
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

// Custom UI: Command Terminal Help Mode
function showHelpGuide() {
  apodTitle.textContent = "AstroPinax Terminal System Guide";
  apodDateLabel.textContent = "COMMAND DIRECTORY";
  
  apodExplanation.innerHTML = `
    <div style="font-family: monospace; line-height: 1.6; color: var(--text-secondary);">
      <p style="margin-bottom: 12px; color: var(--green-500);">=== UTILITY COMMANDS (Type &gt; to activate) ===</p>
      <div style="margin-bottom: 8px;"><strong>&gt;today</strong> - Jump to today's cosmic image</div>
      <div style="margin-bottom: 8px;"><strong>&gt;random</strong> - View a random cosmic date since 1995</div>
      <div style="margin-bottom: 8px;"><strong>&gt;theme</strong> - Toggle between Space and Void layout</div>
      <div style="margin-bottom: 8px;"><strong>&gt;nasa</strong> - Open official NASA Astronomy Pic portal</div>
      <div style="margin-bottom: 8px;"><strong>&gt;source</strong> - Visit the open-source project repository</div>
      <div style="margin-bottom: 16px;"><strong>&gt;help</strong> - Reload this interface guide</div>
      
      <p style="margin-bottom: 12px; color: #00D2FF;">=== TARGETED SECTOR SEARCHES (Type / to activate) ===</p>
      <div style="margin-bottom: 8px;"><strong>/github &lt;query&gt;</strong> - Search GitHub repositories</div>
      <div style="margin-bottom: 8px;"><strong>/reddit &lt;query&gt;</strong> - Search Reddit posts & communities</div>
      <div style="margin-bottom: 8px;"><strong>/ddg &lt;query&gt;</strong> - Search DuckDuckGo search engine</div>
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

// Commands Directory (">" operator)
const UTILITY_COMMANDS = [
  { cmd: '>today', desc: 'Jump to today\'s astronomy picture', action: () => goToday() },
  { cmd: '>random', desc: 'Explore a random date from the archives', action: () => goRandom() },
  { cmd: '>theme', desc: 'Toggle Space and Void theme modes', action: () => toggleTheme() },
  { cmd: '>nasa', desc: 'Open the official NASA APOD site', action: () => { window.location.href = 'https://apod.nasa.gov/apod/astropix.html'; } },
  { cmd: '>source', desc: 'View source code on GitHub', action: () => { window.location.href = 'https://github.com/TADSTech/AstroPinax'; } },
  { cmd: '>help', desc: 'Display all terminal commands', action: () => showHelpGuide() }
];

// Targeted Search Operators ("/" operator)
const SEARCH_ENGINES = [
  { cmd: '/github', placeholder: '/github ', desc: 'Search GitHub', url: 'https://github.com/search?q={q}' },
  { cmd: '/reddit', placeholder: '/reddit ', desc: 'Search Reddit', url: 'https://www.reddit.com/search/?q={q}' },
  { cmd: '/ddg', placeholder: '/ddg ', desc: 'Search DuckDuckGo', url: 'https://duckduckgo.com/?q={q}' },
  { cmd: '/youtube', placeholder: '/youtube ', desc: 'Search YouTube', url: 'https://www.youtube.com/results?search_query={q}' },
  { cmd: '/wikipedia', placeholder: '/wikipedia ', desc: 'Search Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search={q}' }
];

let activeSuggestionIdx = -1;
let filteredItems = [];
let mode = null; // 'command' or 'slash'

function hideSuggestions() {
  suggestionsBox.classList.add('hidden');
  suggestionsBox.innerHTML = '';
  activeSuggestionIdx = -1;
  filteredItems = [];
  mode = null;
}

function showSuggestions(inputVal) {
  const query = inputVal.toLowerCase().split(' ')[0]; // only search prefix
  
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
    // Fill the input with the engine placeholder so they can complete query
    searchInput.value = itemObj.placeholder;
    searchWrapper.classList.remove('command-active');
    searchWrapper.classList.add('slash-active');
    hideSuggestions();
    searchInput.focus();
  }
}

// Search Inputs listeners
searchInput.addEventListener('input', () => {
  const val = searchInput.value;
  if (val.startsWith('>')) {
    searchWrapper.classList.remove('slash-active');
    searchWrapper.classList.add('command-active');
    showSuggestions(val);
  } else if (val.startsWith('/')) {
    searchWrapper.classList.remove('command-active');
    searchWrapper.classList.add('slash-active');
    
    // Hide suggestions if they already typed space after command (they are writing query now)
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

// Search Redirect (Same Tab)
searchForm.addEventListener('submit', (e) => {
  const q = searchInput.value.trim();
  if (!q) {
    e.preventDefault();
    return;
  }

  // Parse command directly
  if (q.startsWith('>')) {
    e.preventDefault();
    const match = UTILITY_COMMANDS.find(c => c.cmd === q.toLowerCase());
    if (match) {
      executeItem(match);
    }
    return;
  }

  // Parse slash search operators
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
        // If empty query, just redirect to placeholder/command fill state
        searchInput.value = engine.placeholder;
        searchInput.focus();
      }
    }
    return;
  }

  // Standard URL check
  if (q.includes('.') && !q.includes(' ')) {
    e.preventDefault();
    window.location.href = q.startsWith('http') ? q : `https://${q}`;
  }
});

// Focus Retargeting Hack
function forceFocus() {
  searchInput.focus();
}

// Initialization
datepicker.max = formatDate(TODAY);
datepicker.min = formatDate(APOD_START);
goToday();

// UI Event Listeners
dateWidgetBtn.addEventListener('click', () => datepicker.showPicker?.() ?? datepicker.click());

datepicker.addEventListener('change', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

btnRetry.addEventListener('click', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

// Keyboard Navigation
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') shiftDay(-1);
  if (e.key === 'ArrowRight') shiftDay(1);
  if (e.key === 't' || e.key === 'T') goToday();
});

// Close suggestions on outside click
document.addEventListener('click', (e) => {
  if (!searchForm.contains(e.target)) {
    hideSuggestions();
  }
});

// Initial delayed focus retargeting sequence
window.addEventListener('load', () => {
  apodView.classList.remove('hidden');
  forceFocus();
  setTimeout(forceFocus, 500);
  setTimeout(forceFocus, 1000);
  setTimeout(forceFocus, 2000);
});
