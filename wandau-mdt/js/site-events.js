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

// Heure de Paris « 14h » / « 14h30 » (affichage sous la date dans le calendrier).
const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit',
});
function parisHeure(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const [h, m] = PARIS_TIME.format(d).split(':');
  return m === '00' ? h + 'h' : h + 'h' + m;
}

function mapRow(row) {
  return {
    id: row.id,
    date: parisDate(row.starts_at),
    // Retour cliente 25/08 : horaires affichés sous la date dans le calendrier.
    horaire: parisHeure(row.starts_at),
    horaireFin: row.ends_at ? parisHeure(row.ends_at) : '',
    titre: row.title,
    type: TYPE_MAP[row.event_type] || 'evenement',
    description: row.description || '',
    // Tunnel de réservation unifié (atelier.html) : ?event=<id> présélectionne cet événement.
    lienReservation: 'atelier.html?event=' + encodeURIComponent(row.id) + '#reserver',
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
      '/rest/v1/events?published=eq.true&select=id,title,event_type,description,starts_at,ends_at&order=starts_at',
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
  )
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then((rows) => (Array.isArray(rows) ? rows.map(mapRow) : []))
    .catch(fromStaticFile);
}
