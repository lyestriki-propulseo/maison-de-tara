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

// Durée « 2h » / « 1h30 » / « 1h05 » (« 45 min » sous l'heure) à partir d'un écart en millisecondes.
// Renvoie '' si l'écart est absent, invalide ou nul.
export function formatDuree(ms) {
  const minutes = Math.round(Number(ms) / 60000);
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return m + '\u00a0min';
  return m === 0 ? h + 'h' : h + 'h' + String(m).padStart(2, '0');
}

// Montant en centimes → « 45 € » / « 12,50 € » (espace insécable avant €).
export function formatEuros(cents) {
  const c = Math.round(Number(cents));
  if (!Number.isFinite(c)) return '';
  const euros = c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace('.', ',');
  return euros + '\u00a0€';
}

// Le paiement en ligne refuse les montants sous 1 € (HTTP 409) : en dessous, on n'affiche
// aucun prix plutôt qu'un tarif que le tunnel ne pourra pas encaisser.
export const PRIX_MINIMUM_CENTS = 100;
export function prixValide(cents) {
  const c = Number(cents);
  return Number.isFinite(c) && c >= PRIX_MINIMUM_CENTS;
}

// « 45 € / pers. », ou '' si le prix est absent ou trop bas.
export function formatPrixParPersonne(cents) {
  return prixValide(cents) ? formatEuros(cents) + ' / pers.' : '';
}

function mapRow(row) {
  return {
    id: row.id,
    date: parisDate(row.starts_at),
    // Retour cliente 25/08 : horaires affichés sous la date dans le calendrier.
    horaire: parisHeure(row.starts_at),
    horaireFin: row.ends_at ? parisHeure(row.ends_at) : '',
    // Retours Tara 05/10 : durée et prix par personne (payé en totalité en ligne).
    duree: row.ends_at ? formatDuree(new Date(row.ends_at) - new Date(row.starts_at)) : '',
    prix: row.deposit_enabled ? formatPrixParPersonne(row.deposit_amount_cents) : '',
    titre: row.title,
    type: TYPE_MAP[row.event_type] || 'evenement',
    description: row.description || '',
    // Tunnel de réservation unifié (/atelier) : ?event=<id> présélectionne cet événement.
    lienReservation: '/atelier?event=' + encodeURIComponent(row.id) + '#reserver',
  };
}

// Le calendrier public est une vitrine des rendez-vous à venir. Les éléments
// passés restent bien dans l'admin (historique et réservations) mais ne sont
// plus montrés aux visiteurs dès le lendemain, heure de Paris.
function keepUpcoming(events) {
  const today = PARIS_DATE.format(new Date());
  return events.filter((event) => typeof event.date === 'string' && event.date >= today);
}

function fromStaticFile() {
  return fetch('data/events.json').then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  }).then((events) => (Array.isArray(events) ? keepUpcoming(events) : []));
}

// Renvoie une promesse de tableau d'événements au format { date, horaire, duree, prix, titre, type,
// description, lienReservation } (horaire/duree/prix absents du repli data/events.json).
export function loadEvents() {
  if (!CONFIGURED) return fromStaticFile();
  return fetch(
    SUPABASE_URL +
      '/rest/v1/events?published=eq.true&select=id,title,event_type,description,starts_at,ends_at,deposit_enabled,deposit_amount_cents&order=starts_at',
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } },
  )
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then((rows) => (Array.isArray(rows) ? keepUpcoming(rows.map(mapRow)) : []))
    .catch(fromStaticFile);
}
