// js/image-zoom.js — Zoom des photos éditables (US-003), réglé par Tara dans /admin/contenu.
// Copie du calcul de l'admin (app/src/lib/image-zoom.ts) : toute modification se reporte des deux
// côtés (cas de test partagés, tests/image-zoom.test.mjs).
//
// Rendu : au-delà de 100 %, la photo est PEINTE EN FOND de la balise <img> elle-même, agrandie
// (« cover × zoom ») et placée au point de focus — le point à x % du cadre montre le point à x % de
// la photo, exactement comme l'aperçu de l'admin. Rien ne change dans le HTML ni le CSS des pages :
// arrondis, liserés, cadres dorés, survols et apparitions restent portés par la même balise, et le
// fond est limité à la zone de la photo (content-box), donc jamais sur le liseré ni hors du cadre.
// La photo « normale » de la balise est poussée hors de sa zone (coupée par le navigateur) : la
// balise garde son src, son alt et son chargement différé. À 100 %, on ne pose rien.

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;

const round2 = (value) => Math.round(value * 100) / 100;

export function clampZoom(zoom) {
  const value = Number(zoom);
  if (!Number.isFinite(value)) return ZOOM_MIN;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

/** Valeur CSS background-size : la photo couvre le cadre, puis est agrandie du zoom. */
export function zoomBackgroundSize(imageRatio, frameRatio, zoom) {
  const percent = `${round2(clampZoom(zoom) * 100)}%`;
  return imageRatio >= frameRatio ? `auto ${percent}` : `${percent} auto`;
}

const OFFSCREEN = '-100000px -100000px';

/**
 * Peint la photo zoomée dans <img> (dont le src vaut déjà imagePath). focusX / focusY en %, déjà
 * bornés. Ne fait rien à 100 % : l'affichage existant (object-fit: cover + object-position) reste.
 */
export function paintZoom(img, imagePath, zoom, focusX, focusY) {
  const z = clampZoom(zoom);
  if (z <= ZOOM_MIN) return;

  // La couleur de fond existante (ex. passe-partout crème) suit le dernier calque : on lui laisse
  // sa zone d'origine via un second calque vide, la photo n'occupe que la zone de contenu.
  const style = getComputedStyle(img);
  const clip = style.backgroundClip.split(',')[0].trim() || 'border-box';
  const origin = style.backgroundOrigin.split(',')[0].trim() || 'padding-box';
  const cssUrl = String(imagePath).replace(/["\\\n]/g, (char) => (char === '\n' ? '' : `\\${char}`));
  img.style.backgroundImage = `url("${cssUrl}"), none`;
  img.style.backgroundRepeat = 'no-repeat';
  img.style.backgroundPosition = `${focusX}% ${focusY}%, 0% 0%`;
  img.style.backgroundOrigin = `content-box, ${origin}`;
  img.style.backgroundClip = `content-box, ${clip}`;
  img.style.objectPosition = OFFSCREEN;
  img.dataset.mdtZoom = String(z);

  // La forme du cadre peut changer avec la largeur de l'écran : on recalcule la taille du fond
  // (l'observateur se déclenche aussi une première fois dès qu'il est branché).
  let frameRatio = 0;
  const update = () => {
    if (!img.naturalWidth || !img.naturalHeight || !frameRatio) return;
    const size = zoomBackgroundSize(img.naturalWidth / img.naturalHeight, frameRatio, z);
    img.style.backgroundSize = `${size}, auto`;
  };
  img.addEventListener('load', update);
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) frameRatio = width / height;
    update();
  }).observe(img);
}
