// js/site-events.js — Programme de la maison, lu depuis Supabase (source de vérité : table events,
// éditée par Tara dans l'admin). Seuls les événements PUBLIÉS sont lisibles en anon (RLS).
// Adapte le format base → format attendu par le site, avec repli sur data/events.json.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);

// Type de la base → type d'affichage du site (réutilise les classes CSS/tags existantes).
const TYPE_MAP = {
  workshop: 'atelier',
  kids: 'atelier',
  soiree: 'evenement',
  collaboration: 'evenement',
  autre: 'evenement',
};

// Date calendaire en heure de Paris (et non UTC) : un événement de fin de soirée ne doit pas
// basculer à la veille à cause du décalage UTC. fr-CA formate en YYYY-MM-DD.
const PARIS_DATE = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' });
function parisDate(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : PARIS_DATE.format(d);
}

function mapRow(row) {
  return {
    id: row.id,
    date: parisDate(row.starts_at),
    titre: row.title,
    type: TYPE_MAP[row.event_type] || 'evenement',
    description: row.description || '',
    // Réservation en ligne branchée en Phase 4 ; pour l'instant, lien vers la page Atelier.
    lienReservation: row.deposit_enabled ? 'atelier.html#reserver' : undefined,
  };
}

function fromStaticFile() {
  return fetch('data/events.json').then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
}

// Renvoie une promesse de tableau d'événements au format { date, titre, type, description, lienReservation }.
export function loadEvents() {
  if (!CONFIGURED) return fromStaticFile();
  return fetch(
    SUPABASE_URL +
      '/rest/v1/events?published=eq.true&select=id,title,event_type,description,starts_at,deposit_enabled&order=starts_at',
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
  )
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then((rows) => (Array.isArray(rows) ? rows.map(mapRow) : []))
    .catch(fromStaticFile);
}
