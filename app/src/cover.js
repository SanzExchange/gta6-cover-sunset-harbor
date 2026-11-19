// cover.js — the drawing engine of Senja Pelabuhan Leonida (Sunset Cover Maker).
// Pure Canvas 2D: colour grades, nine panel layouts, face-aware photo fitting, extruded 3D lettering,
// film grain and vignette. No network, no library, every effect is drawn here by hand.

// ---------- colour grades ----------
// Each grade is a photo filter plus a hand-mixed overlay gradient in the Leonida golden-hour family:
// harbour orange against deep teal, the signature of this studio.
export const GRADES = [
  { id: 'golden-hour', name: 'Golden Hour', filter: 'saturate(1.28) contrast(1.07) brightness(1.04) sepia(0.16)',
    overlay: [[0, 'rgba(255,166,66,0.20)'], [0.55, 'rgba(255,94,58,0.10)'], [1, 'rgba(8,60,72,0.30)']], blend: 'soft-light', grain: 0.5 },
  { id: 'purple-dusk', name: 'Dusk Ungu', filter: 'saturate(1.18) contrast(1.1) brightness(0.97) hue-rotate(-12deg)',
    overlay: [[0, 'rgba(96,52,168,0.26)'], [0.6, 'rgba(214,72,132,0.12)'], [1, 'rgba(16,18,54,0.34)']], blend: 'soft-light', grain: 0.45 },
  { id: 'neon-dusk', name: 'Neon Dusk', filter: 'saturate(1.45) contrast(1.14) brightness(1.0)',
    overlay: [[0, 'rgba(0,229,255,0.14)'], [0.5, 'rgba(255,46,166,0.16)'], [1, 'rgba(10,10,44,0.32)']], blend: 'overlay', grain: 0.4 },
  { id: 'teal-orange', name: 'Teal-Orange Blockbuster', filter: 'saturate(1.32) contrast(1.16) brightness(1.01)',
    overlay: [[0, 'rgba(0,128,140,0.22)'], [0.55, 'rgba(0,0,0,0)'], [1, 'rgba(255,122,26,0.22)']], blend: 'soft-light', grain: 0.35 },
  { id: 'faded-film', name: 'Faded Film', filter: 'saturate(0.82) contrast(0.94) brightness(1.07) sepia(0.32)',
    overlay: [[0, 'rgba(244,222,178,0.20)'], [1, 'rgba(74,64,48,0.24)']], blend: 'soft-light', grain: 0.9 },
  { id: 'harbor-teal', name: 'Harbour Teal', filter: 'saturate(1.22) contrast(1.1) brightness(0.99) hue-rotate(6deg)',
    overlay: [[0, 'rgba(10,92,96,0.24)'], [0.6, 'rgba(32,160,140,0.08)'], [1, 'rgba(255,150,60,0.18)']], blend: 'soft-light', grain: 0.55 },
];
export function gradeById(id) { return GRADES.find((g) => g.id === id) || GRADES[0]; }

// ---------- panel layouts ----------
// Rects are normalised to the cover; the diagonal layout adds clip polygons and an inset panel.
function rect(x, y, w, h, extra) { return Object.assign({ x, y, w, h }, extra || {}); }
export const LAYOUTS = [
  { id: 'hero', name: 'Single Hero', panels: () => [rect(0, 0, 1, 1)] },
  { id: 'big-four', name: '1 Besar + 4 Kecil', panels: () => [
    rect(0, 0, 0.6, 1), rect(0.6, 0, 0.4, 0.25), rect(0.6, 0.25, 0.4, 0.25), rect(0.6, 0.5, 0.4, 0.25), rect(0.6, 0.75, 0.4, 0.25)] },
  { id: 'triple', name: '3 Vertikal', panels: () => [rect(0, 0, 1 / 3, 1), rect(1 / 3, 0, 1 / 3, 1), rect(2 / 3, 0, 1 / 3, 1)] },
  { id: 'grid', name: 'Grid 2×2', panels: () => [
    rect(0, 0, 0.5, 0.5), rect(0.5, 0, 0.5, 0.5), rect(0, 0.5, 0.5, 0.5), rect(0.5, 0.5, 0.5, 0.5)] },
  { id: 'film', name: 'Strip Film 5', film: true, panels: () => [0, 1, 2, 3, 4].map((i) => rect(i * 0.2, 0, 0.2, 1)) },
  { id: 'diagonal', name: 'Diagonal Split', panels: () => [
    rect(0, 0, 0.72, 1, { poly: [[0, 0], [0.72, 0], [0.3, 1], [0, 1]] }),
    rect(0.28, 0, 0.72, 1, { poly: [[0.44, 0], [0.72, 0], [0.72, 1], [0.02, 1]] }),
    rect(0.58, 0.6, 0.38, 0.36, { inset: true })] },
  { id: 'magazine', name: 'Majalah 6', panels: () => [
    rect(0, 0, 1, 0.42), rect(0, 0.42, 1 / 3, 0.33), rect(1 / 3, 0.42, 1 / 3, 0.33), rect(2 / 3, 0.42, 1 / 3, 0.33),
    rect(0, 0.75, 0.5, 0.25), rect(0.5, 0.75, 0.5, 0.25)] },
  { id: 'mosaic', name: 'Mosaik 9', panels: () => {
    const out = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) out.push(rect(c / 3, r / 3, 1 / 3, 1 / 3)); return out; } },
  { id: 'pano', name: 'Panorama + 2 Inset', panels: () => [
    rect(0, 0, 1, 0.62), rect(0, 0.62, 0.5, 0.38), rect(0.5, 0.62, 0.5, 0.38)] },
];
export function layoutById(id) { return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0]; }

// ---------- face-aware focus ----------
// A small heuristic pass: downscale the photo, score skin-like pixels, and return their centroid as the
// focus point, so an automatic cover crop keeps faces in frame. Falls back to a gentle upper-centre focus.
export function analyzeFaceFocus(img) {
  try {
    const w = 48, h = 48;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    const data = x.getImageData(0, 0, w, h).data;
    const skinAt = [];
    let minY = h, maxY = 0;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = (j * w + i) * 4, r = data[p], g = data[p + 1], b = data[p + 2];
      const skin = r > 92 && g > 38 && b > 18 && r > g && r > b && (r - g) > 14 && (r - b) > 22 && r < 252;
      if (skin) { skinAt.push([i, j]); if (j < minY) minY = j; if (j > maxY) maxY = j; }
    }
    if (skinAt.length > 24) {
      // Bare arms and shoulders outweigh a face in raw pixel count, so the focus is the centroid of
      // only the upper band of the skin region — heads live there, limbs mostly do not.
      const cutoff = minY + (maxY - minY) * 0.45;
      let sx = 0, sy = 0, n = 0;
      for (const [i, j] of skinAt) if (j <= cutoff) { sx += i; sy += j; n++; }
      if (n > 8) return { fx: (sx / n + 0.5) / w, fy: (sy / n + 0.5) / h, found: true };
    }
  } catch (err) { /* a tainted or odd image simply falls through to the default focus */ }
  return { fx: 0.5, fy: 0.38, found: false };
}

// ---------- film grain ----------
let grainCanvas = null;
function getGrain() {
  if (grainCanvas) return grainCanvas;
  const s = 180; const c = document.createElement('canvas'); c.width = s; c.height = s;
  const x = c.getContext('2d'); const img = x.createImageData(s, s);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 96 + (seed % 128);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0); grainCanvas = c; return c;
}

// ---------- photo fitting ----------
function panelPath(x, r) {
  x.beginPath();
  if (r.poly) {
    r.poly.forEach((pt, i) => { const px = pt[0] * r.W, py = pt[1] * r.H; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); });
    x.closePath();
  } else { x.rect(r.px, r.py, r.pw, r.ph); }
}
function drawPhoto(x, img, r, st, grade, faceAware) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const zoom = st.zoom || 1;
  const scale = Math.max(r.pw / iw, r.ph / ih) * zoom;
  const dw = iw * scale, dh = ih * scale;
  const focus = faceAware && st.focus ? st.focus : { fx: 0.5, fy: 0.42 };
  let ox = r.pw / 2 - focus.fx * dw + (st.ox || 0) * r.pw;
  let oy = r.ph / 2 - focus.fy * dh + (st.oy || 0) * r.ph;
  ox = Math.min(0, Math.max(r.pw - dw, ox)); oy = Math.min(0, Math.max(r.ph - dh, oy));
  x.save(); panelPath(x, r); x.clip();
  try { x.filter = grade.filter; } catch (err) { /* older engines ignore canvas filters */ }
  x.drawImage(img, r.px + ox, r.py + oy, dw, dh);
  try { x.filter = 'none'; } catch (err) { /* ignore */ }
  x.restore();
}
// A painted Leonida backdrop for an empty panel: layered sunset, sea band and a palm silhouette.
function drawBackdrop(x, r, grade, idx) {
  x.save(); panelPath(x, r); x.clip();
  const g = x.createLinearGradient(0, r.py, 0, r.py + r.ph);
  g.addColorStop(0, '#2b3a6e'); g.addColorStop(0.45, '#b84a6e'); g.addColorStop(0.68, '#f2824a'); g.addColorStop(0.8, '#f7b95c'); g.addColorStop(0.801, '#14586a'); g.addColorStop(1, '#0a3448');
  x.fillStyle = g; x.fillRect(r.px, r.py, r.pw, r.ph);
  x.fillStyle = 'rgba(255,196,96,0.9)';
  x.beginPath(); x.arc(r.px + r.pw * (0.3 + 0.14 * idx), r.py + r.ph * 0.8, r.ph * 0.13, 0, Math.PI * 2); x.fill();
  x.strokeStyle = 'rgba(12,16,20,0.9)'; x.lineWidth = Math.max(3, r.ph * 0.02);
  const bx = r.px + r.pw * 0.72, by = r.py + r.ph;
  x.beginPath(); x.moveTo(bx, by); x.quadraticCurveTo(bx + r.pw * 0.03, by - r.ph * 0.5, bx + r.pw * 0.07, by - r.ph * 0.62); x.stroke();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.06 + i * 0.15);
    x.beginPath(); x.moveTo(bx + r.pw * 0.07, by - r.ph * 0.62);
    x.quadraticCurveTo(bx + r.pw * 0.07 + Math.cos(a) * r.pw * 0.12, by - r.ph * 0.62 - Math.sin(a) * r.ph * 0.12,
      bx + r.pw * 0.07 + Math.cos(a) * r.pw * 0.2, by - r.ph * 0.6 - Math.sin(a) * r.ph * 0.1 + r.ph * 0.05); x.stroke();
  }
  x.restore();
}

// ---------- lettering ----------
function fitFontSize(x, text, maxWidth, start, family) {
  let size = start;
  while (size > 12) { x.font = `italic 900 ${size}px ${family}`; if (x.measureText(text).width <= maxWidth) break; size -= 4; }
  return size;
}
// Extruded 3D title: a stack of offset shadows, a hard outline, then a warm gradient face.
export function drawCoverTitle(x, text, cx, baselineY, maxWidth, startSize) {
  if (!text) return 0;
  const family = '"Arial Black", Impact, "Franklin Gothic Heavy", sans-serif';
  const size = fitFontSize(x, text.toUpperCase(), maxWidth, startSize, family);
  x.save(); x.translate(cx, baselineY); x.transform(1, 0, -0.1, 1, 0, 0);
  x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.font = `italic 900 ${size}px ${family}`;
  const depth = Math.max(3, Math.round(size * 0.09));
  for (let i = depth; i >= 1; i--) { x.fillStyle = i % 2 ? '#0d3b46' : '#12586a'; x.fillText(text.toUpperCase(), i * 1.1, i * 1.3); }
  x.lineWidth = Math.max(2, size * 0.14); x.strokeStyle = '#101014'; x.lineJoin = 'round';
  x.strokeText(text.toUpperCase(), 0, 0);
  const g = x.createLinearGradient(0, -size, 0, size * 0.25);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#ffe9b0'); g.addColorStop(1, '#ffb03a');
  x.fillStyle = g; x.fillText(text.toUpperCase(), 0, 0);
  x.restore(); return size;
}
export function drawSpacedText(x, text, cx, y, size, tracking, color) {
  if (!text) return;
  x.save(); x.font = `700 ${size}px "Arial Narrow", "Franklin Gothic Medium", sans-serif`;
  x.fillStyle = color; x.textBaseline = 'middle';
  const chars = [...text.toUpperCase()]; const widths = chars.map((ch) => x.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let cur = cx - total / 2;
  chars.forEach((ch, i) => { x.fillText(ch, cur, y); cur += widths[i] + tracking; });
  x.restore();
}
function drawPanelCaption(x, r, caption, size) {
  if (!caption) return;
  x.save(); panelPath(x, r); x.clip();
  x.font = `700 ${size}px "Arial Narrow", "Franklin Gothic Medium", sans-serif`;
  const label = caption.toUpperCase(); const tw = x.measureText(label).width;
  // Panels that end at the cover's bottom edge carry their caption at the top instead,
  // so the extruded title along the bottom never swallows it.
  const atCoverBottom = r.py + r.ph >= r.H * 0.97;
  const stripY = atCoverBottom ? r.py + size * 0.5 : r.py + r.ph - size * 1.9;
  x.fillStyle = 'rgba(8,10,14,0.66)';
  x.fillRect(r.px + size * 0.5, stripY, tw + size * 0.9, size * 1.35);
  x.fillStyle = '#ffd98a'; x.textBaseline = 'middle';
  x.fillText(label, r.px + size * 0.95, stripY + size * 0.68);
  x.restore();
}
function drawBadge(x, W, H, text) {
  if (!text) return;
  x.save(); x.translate(W * 0.965, H * 0.055); x.rotate(0.1);
  x.font = `700 ${Math.round(H * 0.021)}px "Arial Narrow", sans-serif`;
  const label = text.toUpperCase(); const tw = x.measureText(label).width; const pad = H * 0.014;
  x.fillStyle = '#0e4a56'; x.strokeStyle = '#ffd98a'; x.lineWidth = Math.max(2, H * 0.003);
  x.beginPath(); x.roundRect(-tw - pad * 2, -H * 0.02, tw + pad * 2, H * 0.04, H * 0.02); x.fill(); x.stroke();
  x.fillStyle = '#ffe9b0'; x.textAlign = 'right'; x.textBaseline = 'middle'; x.fillText(label, -pad, 0);
  x.restore();
}

// ---------- the whole cover ----------
export function drawCover(x, W, H, state) {
  const grade = gradeById(state.grade); const layout = layoutById(state.layout);
  const gutter = Math.max(6, Math.round(W * 0.008));
  x.fillStyle = layout.film ? '#0b0b0e' : '#f3ecd9'; x.fillRect(0, 0, W, H);
  const panels = layout.panels();
  panels.forEach((p, i) => {
    const inset = p.inset ? gutter * 0.4 : gutter / 2;
    const r = { x: p.x, y: p.y, w: p.w, h: p.h, poly: p.poly, W, H,
      px: p.x * W + inset, py: p.y * H + inset, pw: p.w * W - inset * 2, ph: p.h * H - inset * 2 };
    if (p.poly) { r.px = p.x * W; r.py = p.y * H; r.pw = p.w * W; r.ph = p.h * H; }
    const st = state.panels[i] || {};
    if (st.img) drawPhoto(x, st.img, r, st, grade, state.faceAware !== false); else drawBackdrop(x, r, grade, i);
    x.save(); panelPath(x, r); x.strokeStyle = 'rgba(10,10,14,0.35)'; x.lineWidth = 2; x.stroke(); x.restore();
    drawPanelCaption(x, r, st.caption || '', Math.max(15, H * 0.026));
  });
  // Grade overlay, glow, vignette and grain wash over the whole composition.
  const og = x.createLinearGradient(0, 0, 0, H);
  grade.overlay.forEach(([pos, col]) => og.addColorStop(pos, col));
  x.save(); x.globalCompositeOperation = grade.blend; x.fillStyle = og; x.fillRect(0, 0, W, H); x.restore();
  const glow = x.createRadialGradient(W * 0.5, H * 0.62, H * 0.05, W * 0.5, H * 0.62, H * 0.95);
  glow.addColorStop(0, 'rgba(255,170,80,0.13)'); glow.addColorStop(0.6, 'rgba(0,0,0,0)'); glow.addColorStop(1, 'rgba(4,8,14,0.42)');
  x.fillStyle = glow; x.fillRect(0, 0, W, H);
  if (layout.film) { // sprocket holes along both edges
    x.fillStyle = '#f3ecd9'; const n = 14, sw = W * 0.028, sh = H * 0.016;
    for (let i = 0; i < n; i++) { const fx = (i + 0.5) * (W / n) - sw / 2; x.beginPath(); x.roundRect(fx, H * 0.012, sw, sh, 3); x.fill(); x.beginPath(); x.roundRect(fx, H * 0.972, sw, sh, 3); x.fill(); }
  }
  const grainLevel = state.grain == null ? 1 : state.grain;
  if (grade.grain * grainLevel > 0.02) {
    x.save(); x.globalAlpha = 0.16 * grade.grain * grainLevel; x.globalCompositeOperation = 'overlay';
    const pat = x.createPattern(getGrain(), 'repeat'); x.fillStyle = pat; x.fillRect(0, 0, W, H); x.restore();
  }
  // Bottom scrim, subtitle, extruded title, badge.
  const scrim = x.createLinearGradient(0, H * 0.68, 0, H);
  scrim.addColorStop(0, 'rgba(6,8,12,0)'); scrim.addColorStop(1, 'rgba(6,8,12,0.55)');
  x.fillStyle = scrim; x.fillRect(0, H * 0.68, W, H * 0.32);
  const titleSize = drawCoverTitle(x, state.title || '', W / 2, H * 0.955, W * 0.94, H * 0.115);
  drawSpacedText(x, state.subtitle || '', W / 2, H * 0.955 - titleSize * 1.12, Math.max(14, H * 0.026), Math.max(2, H * 0.006), '#ffe9b0');
  drawBadge(x, W, H, state.badge || '');
  x.strokeStyle = '#101014'; x.lineWidth = Math.max(4, W * 0.006); x.strokeRect(0, 0, W, H);
}
