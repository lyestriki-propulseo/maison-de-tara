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

function applyRow(row) {
  const el = document.querySelector('[data-mdt-content="' + row.field_key + '"]');
  if (!el) return;
  if (row.field_type === 'image') {
    if (row.image_path) applyImage(el, row.image_path, row.image_caption);
  } else if (row.text_value) {
    applyText(el, row.text_value);
  }
}

async function loadContent() {
  const page = document.body.dataset.mdtPage;
  if (!page || !CONFIGURED) return;
  try {
    const res = await fetch(
      SUPABASE_URL +
        '/rest/v1/content_blocks?page=eq.' +
        encodeURIComponent(page) +
        '&select=field_key,field_type,text_value,image_path,image_caption',
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
    );
    if (!res.ok) return;
    const rows = await res.json();
    if (Array.isArray(rows)) rows.forEach(applyRow);
  } catch (err) {
    /* On garde le contenu statique déjà présent dans le HTML. */
  }
}

loadContent();
