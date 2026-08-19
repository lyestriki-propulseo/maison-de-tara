// js/site-booking.js — Tunnel de réservation unifié (atelier libre OU événement).
// Écrit directement en base via le guichet public `book_reservation` (RPC SECURITY DEFINER :
// impose toujours status='pending'/source='online', calcule lui-même l'acompte — jamais de prix
// ni de statut envoyé par le client). Lit les disponibilités via les vues `public_availability` /
// `public_availability_events` (3 états, jamais de chiffres bruts). Remplace l'ancien formulaire
// "submissions" (jamais activé, table inexistante) — décision produit du 19/08.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };
const ETAT_LABEL = { disponible: 'Disponible', presque_complet: 'Presque complet', complet: 'Complet' };
const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const form = document.getElementById('reservationForm');
if (form) {
  if (CONFIGURED) initBooking(form);
  else {
    const msg = form.querySelector('.form-msg');
    if (msg) msg.textContent = 'Le formulaire sera actif très bientôt. En attendant, écrivez-nous à contact@maisondetara.com.';
  }
}

function initBooking(form) {
  const dateHidden = document.getElementById('rf-date');
  const slotsBox = document.getElementById('rf-slots');
  const slotsMsg = document.getElementById('rf-slots-msg');
  const eventsList = document.getElementById('rf-events');
  const eventsMsg = document.getElementById('rf-events-msg');
  const modeAtelier = document.getElementById('rf-mode-atelier');
  const modeEvenement = document.getElementById('rf-mode-evenement');
  const capMsg = document.getElementById('rf-capacity-msg');
  const msg = form.querySelector('.form-msg');
  const submitBtn = form.querySelector('[type="submit"]');

  let sessions = [];
  let events = [];
  let capacityCheckId = 0;
  const preselectEvent = new URLSearchParams(location.search).get('event');

  Promise.all([
    fetchRows('public_availability', 'id,session_date,start_time,availability'),
    fetchRows('public_availability_events', 'id,title,starts_at,availability'),
  ]).then(([s, e]) => {
    sessions = s;
    events = e;
    renderEvents();
    if (preselectEvent && events.some((ev) => ev.id === preselectEvent)) {
      form.querySelector('input[name="mode"][value="evenement"]').checked = true;
      toggleMode();
      selectEvent(preselectEvent);
    }
  });

  function fetchRows(table, select) {
    const order = table === 'public_availability' ? 'session_date,start_time' : 'starts_at';
    return fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=${order}`, { headers: HEADERS })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }

  function fmtTime(t) {
    const [h, m] = String(t).split(':');
    return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    return `${d.getDate()} ${MOIS[d.getMonth()]}`;
  }

  function renderSlots() {
    slotsBox.textContent = '';
    const day = sessions.filter((s) => s.session_date === dateHidden.value);
    slotsMsg.hidden = day.length > 0;
    if (!day.length) {
      slotsMsg.textContent = 'Aucun créneau ce jour-là, essayez une autre date.';
      return;
    }
    day.forEach((s) => {
      const label = document.createElement('label');
      label.className = 'pill' + (s.availability === 'complet' ? ' pill--complet' : s.availability === 'presque_complet' ? ' pill--presque' : '');
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'creneau';
      input.value = s.id;
      if (s.availability === 'complet') input.disabled = true;
      const span = document.createElement('span');
      span.textContent = fmtTime(s.start_time) + (s.availability !== 'disponible' ? ' · ' + ETAT_LABEL[s.availability] : '');
      label.append(input, span);
      slotsBox.appendChild(label);
    });
  }

  function renderEvents() {
    eventsList.textContent = '';
    eventsMsg.hidden = events.length > 0;
    if (!events.length) {
      eventsMsg.textContent = 'Aucun événement à venir pour le moment.';
      return;
    }
    events.forEach((ev) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'evt-pick';
      btn.dataset.id = ev.id;
      if (ev.availability === 'complet') btn.disabled = true;
      const title = document.createElement('span');
      title.className = 'evt-pick__title';
      title.textContent = ev.title;
      const meta = document.createElement('span');
      meta.className = 'evt-pick__meta';
      const date = document.createElement('span');
      date.textContent = fmtDate(ev.starts_at);
      const etat = document.createElement('span');
      etat.textContent = ETAT_LABEL[ev.availability];
      if (ev.availability !== 'disponible') etat.className = 'evt-pick__etat--' + (ev.availability === 'presque_complet' ? 'presque' : 'complet');
      meta.append(date, etat);
      btn.append(title, meta);
      btn.addEventListener('click', () => selectEvent(ev.id));
      li.appendChild(btn);
      eventsList.appendChild(li);
    });
  }

  function selectEvent(id) {
    eventsList.dataset.selected = id;
    eventsList.querySelectorAll('.evt-pick').forEach((b) => b.classList.toggle('is-selected', b.dataset.id === id));
    refreshCapacity();
  }

  function toggleMode() {
    const mode = form.mode.value;
    modeAtelier.hidden = mode !== 'atelier';
    modeEvenement.hidden = mode !== 'evenement';
    refreshCapacity();
  }

  // Cible actuellement choisie (créneau atelier ou événement), et son état 3-couleurs déjà connu
  // côté client (sert juste à afficher un petit message doux, jamais un chiffre).
  function currentTarget() {
    const mode = form.mode.value;
    if (mode === 'atelier') {
      const id = form.querySelector('input[name="creneau"]:checked')?.value;
      return { mode, id, row: sessions.find((s) => s.id === id) };
    }
    const id = eventsList.dataset.selected;
    return { mode, id, row: events.find((ev) => ev.id === id) };
  }

  // Vérifie côté serveur si le nombre de personnes demandé tient encore dans la cible choisie —
  // le guichet ne répond que vrai/faux, jamais le nombre de places restantes (cf. migration
  // 20260819110000). Grise le bouton si ça ne tient pas, affiche un message doux si ça devient juste.
  async function refreshCapacity() {
    const { mode, id, row } = currentTarget();
    const checkId = ++capacityCheckId;
    if (!id) {
      submitBtn.disabled = false;
      capMsg.hidden = true;
      return;
    }
    const partySize = Number(form.participants.value);
    let ok = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_availability`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_session_instance_id: mode === 'atelier' ? id : null,
          p_event_id: mode === 'evenement' ? id : null,
          p_party_size: partySize,
        }),
      });
      if (res.ok) ok = await res.json();
    } catch (err) {
      ok = true; // pas de blocage sur un souci réseau, le serveur retranchera à la soumission
    }
    if (checkId !== capacityCheckId) return; // une saisie plus récente a déjà pris le relais

    submitBtn.disabled = !ok;
    if (!ok) {
      capMsg.hidden = false;
      capMsg.className = 'picker__empty picker__empty--complet';
      capMsg.textContent = 'Il ne reste plus assez de places pour ce nombre de personnes. Réduisez le nombre de participants ou choisissez un autre créneau.';
    } else if (row && row.availability === 'presque_complet') {
      capMsg.hidden = false;
      capMsg.className = 'picker__empty picker__empty--presque';
      capMsg.textContent = 'Il reste peu de places pour ce choix : mieux vaut confirmer rapidement.';
    } else {
      capMsg.hidden = true;
    }
  }

  form.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', toggleMode));
  form.querySelectorAll('input[name="participants"]').forEach((r) => r.addEventListener('change', refreshCapacity));
  slotsBox.addEventListener('change', refreshCapacity);
  dateHidden.addEventListener('change', renderSlots);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = form.mode.value;
    const targetId = mode === 'atelier'
      ? form.querySelector('input[name="creneau"]:checked')?.value
      : eventsList.dataset.selected;
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();

    if (!targetId) {
      setMsg(mode === 'atelier' ? 'Merci de choisir une date et un créneau.' : 'Merci de choisir un événement.');
      return;
    }
    if (!nom || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setMsg('Merci de compléter votre nom et un email valide.');
      return;
    }

    submitBtn.disabled = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/book_reservation`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_session_instance_id: mode === 'atelier' ? targetId : null,
          p_event_id: mode === 'evenement' ? targetId : null,
          p_party_size: Number(form.participants.value),
          p_customer_name: nom,
          p_customer_email: email,
          p_customer_phone: form.telephone.value.trim() || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg((data && data.message) || 'Une erreur est survenue, merci de réessayer.');
        return;
      }
      setMsg("Merci ! Votre demande est enregistrée. Tara vous recontacte pour confirmer et prendre l'acompte.");
      form.reset();
      // form.reset() ne déclenche pas 'change' sur les radios : on resynchronise nous-mêmes
      // l'affichage du mode et l'état du bouton/message de capacité.
      toggleMode();
      slotsBox.textContent = '';
      slotsMsg.hidden = true;
      selectEvent('');
    } catch (err) {
      setMsg('Une erreur est survenue, merci de réessayer.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  function setMsg(text) {
    msg.textContent = text;
  }
}
