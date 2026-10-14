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

/** url("…") CSS sûr : guillemets et barres obliques inverses échappés, retours à la ligne retirés. */
export function cssUrl(path) {
  const escaped = String(path).replace(/["\\\n]/g, (char) => (char === '\n' ? '' : `\\${char}`));
  return `url("${escaped}")`;
}

const OFFSCREEN = '-100000px -100000px';

/**
 * Peint la photo zoomée dans <img> (dont le src vaut déjà imagePath). focusX / focusY en %, déjà
 * bornés. Ne fait rien à 100 % : l'affichage existant (object-fit: cover + object-position) reste.
 */
export function paintZoom(img, imagePath, zoom, focusX, focusY) {
  const z = clampZoom(zoom);
  if (z <= ZOOM_MIN) return;

  // Le fond est posé tout de suite, en même temps que le src (une seule requête pour les deux),
  // mais il reste caché SOUS la photo normale, opaque. On ne retire celle-ci qu'une fois la
  // NOUVELLE photo chargée (pas l'ancienne image statique) et la taille du fond calculée : jamais
  // de cadre vide ni de fond à la mauvaise taille.
  paintBackground(img, imagePath, focusX, focusY);
  const target = new URL(imagePath, document.baseURI).href;
  let frameRatio = 0;
  let revealed = false;
  const update = () => {
    const ready = img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
    if (!ready || !frameRatio || img.currentSrc !== target) return;
    const size = zoomBackgroundSize(img.naturalWidth / img.naturalHeight, frameRatio, z);
    img.style.backgroundSize = `${size}, auto`;
    if (revealed) return;
    revealed = true;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        img.style.objectPosition = OFFSCREEN;
        img.dataset.mdtZoom = String(z);
      }),
    );
  };
  img.addEventListener('load', update);
  // La forme du cadre peut changer avec la largeur de l'écran : on recalcule la taille du fond
  // (l'observateur se déclenche aussi une première fois dès qu'il est branché).
  new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (width > 0 && height > 0) frameRatio = width / height;
    update();
  }).observe(img);
}

function paintBackground(img, imagePath, focusX, focusY) {
  // La couleur de fond existante (ex. passe-partout crème) suit le dernier calque : on lui laisse
  // sa zone d'origine via un second calque vide, la photo n'occupe que la zone de contenu.
  const style = getComputedStyle(img);
  const clip = style.backgroundClip.split(',')[0].trim() || 'border-box';
  const origin = style.backgroundOrigin.split(',')[0].trim() || 'padding-box';
  img.style.backgroundImage = `${cssUrl(imagePath)}, none`;
  img.style.backgroundRepeat = 'no-repeat';
  img.style.backgroundPosition = `${focusX}% ${focusY}%, 0% 0%`;
  img.style.backgroundOrigin = `content-box, ${origin}`;
  img.style.backgroundClip = `content-box, ${clip}`;
}
