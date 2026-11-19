// shots.js — deterministic screenshot mode for the maker.
// Open the app with ?shot=cover or ?shot=editor plus layout / grade / photo / caption parameters and
// the studio arranges itself into that exact scene, then flags window.__shotReady for the camera.
// Without a ?shot parameter this module does nothing at all.

const params = new URLSearchParams(location.search);
const shot = params.get('shot');

if (shot) {
  const studio = window.__coverStudio;
  studio.ready.then(() => {
    studio.applyShot({
      layout: params.get('layout') || undefined,
      grade: params.get('grade') || undefined,
      title: params.get('title') || undefined,
      subtitle: params.get('subtitle') || undefined,
      badge: params.get('badge') || undefined,
      photos: (params.get('photos') || '').split(',').filter(Boolean),
      captions: (params.get('captions') || '').split('|').filter(Boolean),
    });
    if (shot === 'cover') {
      document.body.classList.add('shot-cover');
      const w = Number(params.get('w') || 1080), h = Number(params.get('h') || 1080);
      studio.renderPreviewTo(w, h);
    }
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  });
}
