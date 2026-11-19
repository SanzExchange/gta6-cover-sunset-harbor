// main.js — the editor of Senja Pelabuhan Leonida (Sunset Cover Maker).
// Photo library (kit samples + the visitor's own uploads, read locally and never sent anywhere),
// per-panel crop / zoom / pan / caption, undo-redo history, a Surprise-me randomiser and one-click
// PNG export in the three post sizes. The drawing itself lives in cover.js.

import { GRADES, LAYOUTS, layoutById, analyzeFaceFocus, drawCover } from './cover.js';

const SAMPLE_PHOTOS = [
  { id: 'pier', name: 'Dermaga Senja', src: 'samples/pier.jpg' },
  { id: 'boulevard', name: 'Jalan Raya Leonida', src: 'samples/boulevard.jpg' },
  { id: 'harbor', name: 'Pelabuhan Senja', src: 'samples/harbor-dusk.jpg' },
  { id: 'palm', name: 'Palem Avenue', src: 'samples/palm-avenue.jpg' },
];
const TITLE_POOL = ['Senja Pelabuhan', 'Raja Dermaga', 'Neon Leonida', 'Pelabuhan Terakhir', 'Matahari Tenggelam', 'Ratu Boulevard', 'Emas di Dermaga', 'Senja di Leonida'];
const SUBTITLE_POOL = ['Leonida — Golden Hour', 'Cerita dari Dermaga Sembilan', 'Negeri Senja Abadi', 'Satu Kota, Seribu Lampu', 'Edisi Matahari Tenggelam'];
const CAPTION_POOL = ['Dermaga 9', 'Golden Hour', 'Anak Pelabuhan', 'Kapal Terakhir', 'Jalan Pulang', 'Neon & Garam', 'Senja Abadi', 'Lampu Kota', 'Roda Dua', 'Pasang Surut'];
const EXPORT_SIZES = [
  { id: 'square', label: 'PNG 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'PNG 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'PNG 1920 × 1080', w: 1920, h: 1080 },
];

const library = new Map(); // photoId -> { id, name, img, focus }
const state = {
  layout: 'big-four', grade: 'golden-hour',
  title: 'Senja Pelabuhan', subtitle: 'Leonida — Golden Hour', badge: 'Edisi Pelabuhan',
  faceAware: true, grain: 1, panels: [],
};
let selectedPanel = 0;
const undoStack = []; const redoStack = [];

const $ = (sel) => document.querySelector(sel);
const preview = $('#preview');
const pctx = preview.getContext('2d');

function blankPanel() { return { photoId: null, zoom: 1, ox: 0, oy: 0, caption: '' }; }
function ensurePanels() {
  const need = layoutById(state.layout).panels().length;
  while (state.panels.length < need) state.panels.push(blankPanel());
  state.panels.length = need;
  if (selectedPanel >= need) selectedPanel = 0;
}
function resolvedPanels() {
  return state.panels.map((p) => {
    const entry = p.photoId ? library.get(p.photoId) : null;
    return { img: entry ? entry.img : null, focus: entry ? entry.focus : null, zoom: p.zoom, ox: p.ox, oy: p.oy, caption: p.caption };
  });
}
function render() {
  ensurePanels();
  drawCover(pctx, preview.width, preview.height, { ...state, panels: resolvedPanels() });
  markSelectedPanel();
  syncPanelControls();
}
function markSelectedPanel() {
  document.querySelectorAll('.panel-chip').forEach((el, i) => el.classList.toggle('active', i === selectedPanel));
}

// ---------- history (undo / redo) ----------
function snapshot() {
  return JSON.stringify({ layout: state.layout, grade: state.grade, title: state.title, subtitle: state.subtitle,
    badge: state.badge, faceAware: state.faceAware, grain: state.grain, selectedPanel,
    panels: state.panels.map((p) => ({ ...p })) });
}
function restore(json) {
  const s = JSON.parse(json);
  Object.assign(state, { layout: s.layout, grade: s.grade, title: s.title, subtitle: s.subtitle, badge: s.badge,
    faceAware: s.faceAware, grain: s.grain, panels: s.panels });
  selectedPanel = s.selectedPanel || 0;
  buildLayoutButtons(); buildGradeChips(); syncTextInputs(); render();
}
function pushHistory() { undoStack.push(snapshot()); if (undoStack.length > 60) undoStack.shift(); redoStack.length = 0; }
function undo() { if (!undoStack.length) return; redoStack.push(snapshot()); restore(undoStack.pop()); }
function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }

// ---------- photo library ----------
function addPhoto(id, name, img) {
  library.set(id, { id, name, img, focus: analyzeFaceFocus(img) });
  buildLibrary();
}
function loadSample(def) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { addPhoto(def.id, def.name, img); resolve(); };
    img.onerror = () => resolve();
    img.src = def.src;
  });
}
function buildLibrary() {
  const box = $('#library'); box.innerHTML = '';
  library.forEach((entry) => {
    const btn = document.createElement('button');
    btn.className = 'thumb'; btn.type = 'button'; btn.title = entry.name;
    const im = document.createElement('img'); im.src = entry.img.src; im.alt = entry.name;
    const cap = document.createElement('span'); cap.textContent = entry.name;
    const face = document.createElement('em'); face.textContent = entry.focus && entry.focus.found ? 'wajah terdeteksi' : 'fokus tengah';
    btn.append(im, cap, face);
    btn.addEventListener('click', () => { pushHistory(); state.panels[selectedPanel].photoId = entry.id; render(); });
    box.append(btn);
  });
}
function handleUploads(files) {
  [...files].forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => { pushHistory(); addPhoto(`up-${Date.now()}-${i}`, file.name.replace(/\.[^.]+$/, ''), img);
        if (!state.panels[selectedPanel].photoId) { state.panels[selectedPanel].photoId = `up-${Date.now()}-${i}`; }
        render(); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ---------- control builders ----------
function buildLayoutButtons() {
  const box = $('#layouts'); box.innerHTML = '';
  LAYOUTS.forEach((l) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = l.name;
    b.className = 'chip' + (l.id === state.layout ? ' active' : '');
    b.addEventListener('click', () => { if (state.layout !== l.id) { pushHistory(); state.layout = l.id; buildLayoutButtons(); buildPanelChips(); render(); } });
    box.append(b);
  });
}
function buildGradeChips() {
  const box = $('#grades'); box.innerHTML = '';
  GRADES.forEach((g) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = g.name;
    b.className = 'chip grade-' + g.id + (g.id === state.grade ? ' active' : '');
    b.addEventListener('click', () => { if (state.grade !== g.id) { pushHistory(); state.grade = g.id; buildGradeChips(); render(); } });
    box.append(b);
  });
}
function buildPanelChips() {
  const box = $('#panelChips'); box.innerHTML = '';
  layoutById(state.layout).panels().forEach((_, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = `Panel ${i + 1}`;
    b.className = 'panel-chip' + (i === selectedPanel ? ' active' : '');
    b.addEventListener('click', () => { selectedPanel = i; render(); });
    box.append(b);
  });
}
function syncTextInputs() {
  $('#titleInput').value = state.title; $('#subtitleInput').value = state.subtitle; $('#badgeInput').value = state.badge;
  $('#faceToggle').checked = state.faceAware; $('#grainRange').value = String(Math.round(state.grain * 100));
}
function syncPanelControls() {
  const p = state.panels[selectedPanel] || blankPanel();
  $('#captionInput').value = p.caption || '';
  $('#zoomRange').value = String(Math.round((p.zoom || 1) * 100));
  $('#panXRange').value = String(Math.round((p.ox || 0) * 100));
  $('#panYRange').value = String(Math.round((p.oy || 0) * 100));
  $('#panelPhotoName').textContent = p.photoId && library.get(p.photoId) ? library.get(p.photoId).name : 'belum ada foto — klik foto di perpustakaan';
}

// ---------- surprise me ----------
function surprise() {
  pushHistory();
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(LAYOUTS).id; state.grade = pick(GRADES).id;
  state.title = pick(TITLE_POOL); state.subtitle = pick(SUBTITLE_POOL);
  ensurePanels();
  const ids = [...library.keys()];
  state.panels.forEach((p, i) => {
    p.photoId = ids.length ? ids[i % ids.length] : null;
    p.caption = pick(CAPTION_POOL); p.zoom = 1 + Math.random() * 0.25; p.ox = 0; p.oy = 0;
  });
  buildLayoutButtons(); buildGradeChips(); buildPanelChips(); syncTextInputs(); render();
  setStatus('Surprise me: layout, grade, judul dan caption diacak dari pool bawaan.');
}

// ---------- export ----------
function renderCoverCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  drawCover(c.getContext('2d'), w, h, { ...state, panels: resolvedPanels() });
  return c;
}
function exportPNG(size) {
  const t0 = performance.now();
  const c = renderCoverCanvas(size.w, size.h);
  c.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `senja-pelabuhan-${size.w}x${size.h}.png`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setStatus(`PNG ${size.w} × ${size.h} diekspor dalam ${Math.round(performance.now() - t0)} ms.`);
  }, 'image/png');
}
function setStatus(msg) { $('#status').textContent = msg; }

// ---------- wiring ----------
function wire() {
  buildLayoutButtons(); buildGradeChips(); buildPanelChips(); syncTextInputs();
  $('#titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('#titleInput').addEventListener('change', pushHistory);
  $('#subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('#badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; render(); });
  $('#captionInput').addEventListener('input', (e) => { state.panels[selectedPanel].caption = e.target.value; render(); });
  $('#zoomRange').addEventListener('input', (e) => { state.panels[selectedPanel].zoom = Number(e.target.value) / 100; render(); });
  $('#panXRange').addEventListener('input', (e) => { state.panels[selectedPanel].ox = Number(e.target.value) / 100; render(); });
  $('#panYRange').addEventListener('input', (e) => { state.panels[selectedPanel].oy = Number(e.target.value) / 100; render(); });
  $('#faceToggle').addEventListener('change', (e) => { pushHistory(); state.faceAware = e.target.checked; render(); });
  $('#grainRange').addEventListener('input', (e) => { state.grain = Number(e.target.value) / 100; render(); });
  $('#uploadInput').addEventListener('change', (e) => handleUploads(e.target.files));
  $('#fillAllBtn').addEventListener('click', () => {
    pushHistory(); const ids = [...library.keys()];
    state.panels.forEach((p, i) => { if (ids.length) p.photoId = ids[i % ids.length]; });
    render(); setStatus('Semua panel diisi dari perpustakaan foto.');
  });
  $('#surpriseBtn').addEventListener('click', surprise);
  $('#undoBtn').addEventListener('click', undo);
  $('#redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
  });
  EXPORT_SIZES.forEach((s) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'export-btn'; b.textContent = s.label;
    b.addEventListener('click', () => exportPNG(s)); $('#exports').append(b);
  });
  preview.addEventListener('click', (e) => {
    const r = preview.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width, ny = (e.clientY - r.top) / r.height;
    const panels = layoutById(state.layout).panels();
    const hit = panels.findIndex((p) => nx >= p.x && nx <= p.x + p.w && ny >= p.y && ny <= p.y + p.h);
    if (hit >= 0) { selectedPanel = hit; buildPanelChips(); render(); }
  });
}

// ---------- shot / automation surface ----------
const ready = (async () => {
  wire(); ensurePanels();
  await Promise.all(SAMPLE_PHOTOS.map(loadSample));
  const ids = [...library.keys()];
  state.panels.forEach((p, i) => { p.photoId = ids[i % ids.length] || null; p.caption = CAPTION_POOL[i % CAPTION_POOL.length]; });
  buildPanelChips(); render();
  setStatus('Siap — foto sampel dimuat. Klik panel untuk memilih, atur caption, lalu ekspor PNG.');
})();
window.__coverStudio = {
  ready,
  getState: () => state,
  applyShot(cfg) {
    if (cfg.layout) state.layout = cfg.layout;
    if (cfg.grade) state.grade = cfg.grade;
    if (cfg.title) state.title = cfg.title;
    if (cfg.subtitle) state.subtitle = cfg.subtitle;
    if (cfg.badge) state.badge = cfg.badge;
    ensurePanels();
    if (Array.isArray(cfg.photos)) cfg.photos.forEach((pid, i) => { if (state.panels[i] && library.has(pid)) state.panels[i].photoId = pid; });
    if (Array.isArray(cfg.captions)) cfg.captions.forEach((cap, i) => { if (state.panels[i]) state.panels[i].caption = cap; });
    buildLayoutButtons(); buildGradeChips(); buildPanelChips(); syncTextInputs(); render();
  },
  exportDataURL(w, h) { return renderCoverCanvas(w, h).toDataURL('image/png'); },
  renderPreviewTo(w, h) { preview.width = w; preview.height = h; render(); },
};
