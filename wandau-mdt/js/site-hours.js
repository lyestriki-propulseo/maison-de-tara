// js/site-hours.js — Horaires d'ouverture de la maison, lus depuis Supabase (source de vérité :
// table site_settings, clé 'hours', éditée par Tara dans l'admin). Lecture anon autorisée par la RLS.
// Progressif : si Supabase n'est pas configuré ou indisponible, on garde le HTML statique de repli.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);

const DAYS = [
  ['monday', 'Lundi'],
  ['tuesday', 'Mardi'],
  ['wednesday', 'Mercredi'],
  ['thursday', 'Jeudi'],
  ['friday', 'Vendredi'],
  ['saturday', 'Samedi'],
  ['sunday', 'Dimanche'],
];

function formatTime(t) {
  const [h, m] = String(t).split(':');
  const hour = String(Number(h));
  return m === '00' ? hour + 'h' : hour + 'h' + m;
}

function formatDay(day) {
  if (!day || day.closed || !Array.isArray(day.ranges) || day.ranges.length === 0) return 'Fermé';
  return day.ranges.map((r) => formatTime(r.start) + ' – ' + formatTime(r.end)).join(' · ');
}

function render(target, hours) {
  const frag = document.createDocumentFragment();
  DAYS.forEach(([key, label]) => {
    const day = hours[key];
    const closed = !day || day.closed || !day.ranges || day.ranges.length === 0;
    const li = document.createElement('li');
    if (closed) li.className = 'is-closed';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('span');
    value.textContent = formatDay(day);
    li.append(name, value);
    frag.append(li);
  });
  target.replaceChildren(frag);
}

async function loadHours() {
  const targets = document.querySelectorAll('[data-mdt-hours="maison"]');
  if (targets.length === 0 || !CONFIGURED) return;
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/site_settings?key=eq.hours&select=value',
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
    );
    if (!res.ok) return;
    const rows = await res.json();
    const hours = rows && rows[0] && rows[0].value;
    if (!hours) return;
    targets.forEach((el) => render(el, hours));
  } catch (err) {
    /* On garde le repli statique déjà présent dans le HTML. */
  }
}

loadHours();
