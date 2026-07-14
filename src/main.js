const API_KEY = import.meta.env.VITE_NASA_API_KEY;
const API_BASE = 'https://api.nasa.gov/planetary/apod';

const APOD_START = new Date('1995-06-16');
const TODAY = new Date();

const $ = (sel) => document.querySelector(sel);

const datepicker = $('#datepicker');
const apodView = $('#apod-view');
const loading = $('#loading');
const errorEl = $('#error');
const errorMsg = $('#error-message');
const apodImage = $('#apod-image');
const apodVideo = $('#apod-video');
const apodTitle = $('#apod-title');
const apodExplanation = $('#apod-explanation');
const dateBadge = $('#date-badge');
const btnPrev = $('#btn-prev');
const btnNext = $('#btn-next');
const btnToday = $('#btn-today');
const btnRetry = $('#btn-retry');

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

function showState(show) {
  loading.classList.toggle('hidden', show !== 'loading');
  errorEl.classList.toggle('hidden', show !== 'error');
  apodView.classList.toggle('hidden', show !== 'apod');
}

function updateDateBadge(dateStr) {
  const d = toDateObj(dateStr);
  dateBadge.textContent = d.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function updateUI(data) {
  apodTitle.textContent = data.title;
  apodExplanation.textContent = data.explanation;
  updateDateBadge(data.date);

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

  showState('apod');
}

async function fetchAPOD(dateStr) {
  showState('loading');

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
    errorMsg.textContent = err.message;
    showState('error');
  }
}

function goToDate(dateStr) {
  datepicker.value = dateStr;
  fetchAPOD(dateStr);
}

function goToday() {
  const str = formatDate(TODAY);
  goToDate(str);
}

function shiftDay(delta) {
  const current = datepicker.value ? toDateObj(datepicker.value) : new Date(TODAY);
  current.setDate(current.getDate() + delta);
  const clamped = clampDate(current);
  goToDate(formatDate(clamped));
}

/* ─── Init ─── */

datepicker.max = formatDate(TODAY);
datepicker.min = formatDate(APOD_START);

goToday();

/* ─── Events ─── */

datepicker.addEventListener('change', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

btnPrev.addEventListener('click', () => shiftDay(-1));
btnNext.addEventListener('click', () => shiftDay(1));
btnToday.addEventListener('click', goToday);
btnRetry.addEventListener('click', () => {
  if (datepicker.value) fetchAPOD(datepicker.value);
});

/* ─── Keyboard ─── */

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowLeft') shiftDay(-1);
  if (e.key === 'ArrowRight') shiftDay(1);
  if (e.key === 't' || e.key === 'T') goToday();
});
