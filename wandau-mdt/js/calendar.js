// Rendu d'une grille mensuelle 7 colonnes + events posés sur les dates (scroll natif, sans dépendance).
const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

export async function initCalendar(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  let events = [];
  try {
    events = await fetch('data/events.json').then((r) => r.json());
  } catch (e) {
    root.innerHTML = '<p class="cal-empty-msg">Le calendrier sera bientôt disponible.</p>';
    return;
  }

  const byDate = {};
  for (const e of events) (byDate[e.date] ||= []).push(e);
  // On part du 1er mois ayant un event (sinon un mois fixe — pas de Date.now ici pour rester déterministe).
  let [year, month] = (events[0]?.date || '2026-10-01').split('-').map(Number);
  month -= 1;

  function render() {
    const first = new Date(year, month, 1);
    const startCol = (first.getDay() + 6) % 7; // lundi = 0
    const days = new Date(year, month + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < startCol; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (let d = 1; d <= days; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const evs = byDate[iso] || [];
      const dot = evs.length ? `<span class="cal-dot" data-date="${iso}">${evs.length}</span>` : '';
      cells += `<button class="cal-cell${evs.length ? ' has-event' : ''}" data-date="${iso}"${evs.length ? '' : ' disabled'}><span class="cal-num">${d}</span>${dot}</button>`;
    }
    root.innerHTML = `
      <div class="cal-head">
        <button class="cal-prev" aria-label="Mois précédent">‹</button>
        <h2>${MOIS[month]} ${year}</h2>
        <button class="cal-next" aria-label="Mois suivant">›</button>
      </div>
      <div class="cal-grid cal-weekdays">${JOURS.map((j) => `<div>${j}</div>`).join('')}</div>
      <div class="cal-grid cal-days">${cells}</div>
      <div class="cal-detail" id="cal-detail" hidden></div>`;
    root.querySelector('.cal-prev').onclick = () => { month--; if (month < 0) { month = 11; year--; } render(); };
    root.querySelector('.cal-next').onclick = () => { month++; if (month > 11) { month = 0; year++; } render(); };
    root.querySelectorAll('.cal-cell.has-event').forEach((c) => {
      c.onclick = () => showDetail(c.dataset.date, byDate[c.dataset.date]);
    });
  }

  function showDetail(date, evs) {
    const box = root.querySelector('#cal-detail');
    box.hidden = false;
    box.innerHTML = evs.map((e) => `
      <article class="exhibition-box cal-event cal-type-${e.type || 'evenement'}">
        <h3>${e.titre}</h3>
        <p class="cal-date">${formatDate(date)}</p>
        <p>${e.description || ''}</p>
        ${e.lienReservation ? `<a class="btn btn--primary" href="${e.lienReservation}">Réserver</a>` : ''}
      </article>`).join('');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  render();
}

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

// Colonne « à venir » (proposition v2 du calendrier) : les 3 prochains
// événements à partir d'aujourd'hui, mêmes données que la grille.
export async function initUpcoming(rootId) {
  const root = document.getElementById(rootId);
  if (!root) return;

  let events = [];
  try {
    events = await fetch('data/events.json').then((r) => r.json());
  } catch (e) {
    return;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const next = sorted.filter((e) => e.date >= today).slice(0, 3);
  // Avant l'ouverture (aucun event passé/futur proche), montrer les 3 premiers.
  const list = next.length ? next : sorted.slice(0, 3);

  root.innerHTML = '<h3>À venir</h3>' + (list.length
    ? list.map((e) => `
      <article class="up-card">
        <span class="up-date">${formatDate(e.date)}</span>
        <h4>${e.titre}</h4>
        <p>${e.description || ''}</p>
      </article>`).join('')
    : '<p class="up-empty">Les prochains rendez-vous seront bientôt annoncés.</p>');
}
