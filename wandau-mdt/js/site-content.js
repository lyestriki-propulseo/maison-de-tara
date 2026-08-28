// js/site-content.js — Contenu éditorial (photos + textes) piloté par Tara depuis /admin/contenu,
// table content_blocks. Générique : marque chaque zone éditable avec data-mdt-content="<clé>" dans
// le HTML, ce script va chercher la valeur correspondante et la pose à la place du contenu statique.
// Progressif : si Supabase n'est pas configuré, indisponible, ou qu'un champ n'a pas encore été
// personnalisé (valeur vide), le HTML statique déjà présent reste affiché tel quel.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);

function applyText(el, value) {
  if (el.dataset.mdtMode === 'list') {
    const tag = el.querySelector('li') ? 'li' : 'p';
    el.replaceChildren(
      ...value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const item = document.createElement(tag);
          item.textContent = line;
          return item;
        }),
    );
    return;
  }
  el.textContent = value;
}

function applyImage(el, imagePath, caption) {
  el.src = imagePath;
  if (!caption) return;
  el.alt = caption;
  const figure = el.closest('figure');
  const figcaption = figure && figure.querySelector('figcaption');
  if (figcaption) figcaption.textContent = caption;
}

// Certains champs de coordonnées (page "global") apparaissent sur plusieurs
// éléments à la fois (topbar, menu tiroir, footer…) et pilotent aussi un lien
// tel:/mailto:/instagram.com qui doit rester cohérent avec le texte affiché —
// sinon on retombe dans le même problème qu'avant (numéro visible à jour,
// lien qui compose toujours l'ancien). D'où la synchronisation ci-dessous,
// et pourquoi applyRow met à jour TOUS les éléments qui portent la clé, pas
// juste le premier trouvé.
function syncContactHrefs(key, value) {
  if (key === 'global.contact.telephone') {
    const tel = 'tel:' + value.replace(/[^\d+]/g, '');
    document.querySelectorAll('a[href^="tel:"]').forEach((a) => {
      a.href = tel;
    });
  } else if (key === 'global.contact.email') {
    document.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
      a.href = 'mailto:' + value;
    });
  } else if (key === 'global.contact.instagram') {
    const handle = value.trim().replace(/^@/, '');
    document.querySelectorAll('a[href*="instagram.com"]').forEach((a) => {
      a.href = 'https://www.instagram.com/' + handle + '/';
    });
  }
}

function applyRow(row) {
  const els = document.querySelectorAll('[data-mdt-content="' + row.field_key + '"]');
  if (!els.length) return;
  els.forEach((el) => {
    if (row.field_type === 'image') {
      if (row.image_path) applyImage(el, row.image_path, row.image_caption);
    } else if (row.text_value) {
      applyText(el, row.text_value);
    }
  });
  if (row.field_type === 'text' && row.text_value) syncContactHrefs(row.field_key, row.text_value);
}

async function fetchPage(page) {
  const res = await fetch(
    SUPABASE_URL +
      '/rest/v1/content_blocks?page=eq.' +
      encodeURIComponent(page) +
      '&select=field_key,field_type,text_value,image_path,image_caption',
    {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
      // Sans ça, le navigateur peut resservir une réponse mise en cache pour cette
      // même URL — un visiteur qui revient sur le site ne verrait pas un texte ou
      // une photo tout juste modifiés par Tara depuis l'admin.
      cache: 'no-store',
    },
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function loadContent() {
  if (!CONFIGURED) return;
  // "global" (coordonnées, bandeau) est présent sur le header/footer de
  // chaque page ; la page elle-même (accueil, atelier…) s'ajoute en plus.
  const page = document.body.dataset.mdtPage;
  try {
    const results = await Promise.all([fetchPage('global'), page ? fetchPage(page) : []]);
    results.flat().forEach(applyRow);
  } catch (err) {
    /* On garde le contenu statique déjà présent dans le HTML. */
  }
}

loadContent();
