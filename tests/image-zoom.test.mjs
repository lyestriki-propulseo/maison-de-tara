import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampZoom, cssUrl, zoomBackgroundSize } from '../wandau-mdt/js/image-zoom.js';

// US-003 — copie site du calcul de cadrage de l'admin (app/src/lib/image-zoom.ts, dépôt app).
// Le rendu DOM (paintZoom) est couvert par app/e2e-site/photos-zoom.e2e.ts.

// Mêmes cas que SHARED_CASES dans app/src/lib/image-zoom.test.ts : toute modification se reporte
// des deux côtés.
const SHARED_CASES = [
  { image: [1600, 1200], frame: [0.741, 1], zoom: 1.3, focus: [50, 40], size: 'auto 130%' },
  { image: [1200, 1600], frame: [1.6, 1], zoom: 2, focus: [20, 80], size: '200% auto' },
  { image: [1000, 1000], frame: [1, 1], zoom: 1, focus: [50, 50], size: 'auto 100%' },
];

test('CA-04 — taille de fond identique à l’admin pour les cas partagés', () => {
  for (const c of SHARED_CASES) {
    assert.equal(zoomBackgroundSize(c.image[0] / c.image[1], c.frame[0] / c.frame[1], c.zoom), c.size);
  }
});

test('CA-02 — le zoom est borné entre 100 % et 300 % (valeur absente ou invalide = 100 %)', () => {
  assert.equal(clampZoom(0.5), 1);
  assert.equal(clampZoom(4), 3);
  assert.equal(clampZoom(1.37), 1.37);
  assert.equal(clampZoom(Number.NaN), 1);
  assert.equal(clampZoom(undefined), 1);
  assert.equal(clampZoom('2.5'), 2.5);
});

test('CA-05 — l’adresse de la photo passe telle quelle dans le CSS, sans pouvoir en sortir', () => {
  const supabase =
    'https://x.supabase.co/storage/v1/object/public/medias/content/atelier/atelier.ch01.photo-1a2b3c4d.jpeg';
  assert.equal(cssUrl(supabase), `url("${supabase}")`);
  assert.equal(cssUrl('../assets-premium-lp/sortie-four.jpg'), 'url("../assets-premium-lp/sortie-four.jpg")');
  assert.equal(cssUrl('a"), url(x'), String.raw`url("a\"), url(x")`);
  assert.equal(cssUrl(`${String.raw`a\b`}\nc`), String.raw`url("a\\bc")`);
});
