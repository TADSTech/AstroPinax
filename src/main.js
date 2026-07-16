const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const API_BASE = 'https://api.nasa.gov/planetary/apod';

const APOD_START = new Date('1995-06-16');
const TODAY = new Date();

const $ = (sel) => document.querySelector(sel);

// DOM Elements
const datepicker = $('#datepicker');
const btnCalendar = $('#btn-calendar');
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
const starfield = $('#starfield');

// Theme Management
const THEME_KEY = 'astropinax-theme';

function getPreferredTheme() {
  return localStorage.getItem(THEME_KEY) || 'space';
}

function setTheme(name) {
  document.documentElement.setAttribute('data-theme', name);
  localStorage.setItem(THEME_KEY, name);
  
  // Starfield logic: Faint in void mode to blend in
  if (starfield) {
    starfield.style.opacity = name === 'void' ? '0.15' : '1';
  }
}

btnTheme.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'space';
  const next = current === 'void' ? 'space' : 'void';
  setTheme(next);
});

// Initialize Theme
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
  
  // Clear contents for skeleton effect
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

function updateUI(data) {
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
  
  // Auto-focus search input after state updates
  setTimeout(() => searchInput.focus(), 100);
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

function shiftDay(delta) {
  const current = datepicker.value ? toDateObj(datepicker.value) : new Date(TODAY);
  current.setDate(current.getDate() + delta);
  goToDate(formatDate(clampDate(current)));
}

// Search Redirect
searchForm.addEventListener('submit', (e) => {
  const q = searchInput.value.trim();
  if (!q) {
    e.preventDefault();
    return;
  }
  if (q.includes('.') && !q.includes(' ')) {
    e.preventDefault();
    window.open(`https://${q}`, '_blank');
  }
});

// Initialization
datepicker.max = formatDate(TODAY);
datepicker.min = formatDate(APOD_START);
goToday();

// UI Event Listeners
btnCalendar.addEventListener('click', () => datepicker.showPicker?.() ?? datepicker.click());

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

// Initial focus
window.addEventListener('load', () => {
  apodView.classList.remove('hidden');
  searchInput.focus();
});
