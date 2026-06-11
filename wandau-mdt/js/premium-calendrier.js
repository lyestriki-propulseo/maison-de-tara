/* ============================================================
   Premium Calendrier — Maison de Tara
   Programme éditorial + grille mensuelle, data-driven depuis
   data/events.json. Création DOM sûre (textContent), fallback
   doux si le fetch échoue, démarre sur le premier mois à
   événement, clic sur un jour → surligne l'entrée du programme.
   ============================================================ */
(function () {
  'use strict';

  var MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  var JOURS_SEMAINE = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var ENTETE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  var TYPES = {
    atelier:   { label: 'Atelier',   cls: 'tag--atelier' },
    brunch:    { label: 'Brunch',    cls: 'tag--brunch' },
    evenement: { label: 'Événement', cls: 'tag--evenement' },
    boutique:  { label: 'Boutique',  cls: 'tag--boutique' }
  };

  var progRoot = document.getElementById('programme');
  var calRoot = document.getElementById('calendar');
  if (!progRoot || !calRoot) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Création DOM sûre : jamais d'innerHTML sur les données.
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function parseIso(iso) {
    var p = iso.split('-').map(Number);
    return { y: p[0], m: p[1], d: p[2] };
  }

  function fallback() {
    calRoot.appendChild(el('p', 'cal-fallback', 'Le calendrier sera bientôt disponible.'));
    progRoot.parentNode.replaceChild(
      el('p', 'prog-empty', 'Le calendrier sera bientôt disponible.'),
      progRoot
    );
  }

  fetch('data/events.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (events) {
      if (!Array.isArray(events) || !events.length) { fallback(); return; }
      var sorted = events.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      renderProgramme(sorted);
      initCalendar(sorted);
    })
    .catch(fallback);

  /* ---------- Programme éditorial ---------- */
  function renderProgramme(events) {
    events.forEach(function (ev, i) {
      var d = parseIso(ev.date);
      var li = el('li', 'prog-entry');
      li.id = 'ev-' + i;
      li.dataset.date = ev.date;

      var when = el('div', 'prog-when');
      when.appendChild(el('span', 'prog-day', String(d.d)));
      when.appendChild(el('span', 'prog-month', MOIS[d.m - 1]));
      when.appendChild(el('span', 'prog-year', String(d.y)));
      li.appendChild(when);

      var body = el('div', 'prog-body');
      var meta = el('div', 'prog-meta');
      var type = TYPES[ev.type] || TYPES.evenement;
      meta.appendChild(el('span', 'tag ' + type.cls, type.label));
      var weekday = JOURS_SEMAINE[new Date(d.y, d.m - 1, d.d).getDay()];
      meta.appendChild(el('span', 'prog-weekday', weekday + ' ' + d.d + ' ' + MOIS[d.m - 1].toLowerCase() + ' ' + d.y));
      body.appendChild(meta);

      body.appendChild(el('h3', 'prog-title', ev.titre || ''));
      if (ev.description) body.appendChild(el('p', 'prog-desc', ev.description));

      if (ev.lienReservation) {
        var btn = el('a', 'btn-reserve', 'Réserver');
        btn.href = encodeURI(ev.lienReservation);
        body.appendChild(btn);
      }

      li.appendChild(body);
      progRoot.appendChild(li);
    });
  }

  function highlightDate(iso) {
    var entries = progRoot.querySelectorAll('.prog-entry[data-date="' + iso + '"]');
    if (!entries.length) return;
    entries[0].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    entries.forEach(function (entry) {
      entry.classList.add('is-flash');
      setTimeout(function () { entry.classList.remove('is-flash'); }, 1800);
    });
  }

  /* ---------- Grille mensuelle ---------- */
  function initCalendar(events) {
    var byDate = {};
    events.forEach(function (ev) { (byDate[ev.date] = byDate[ev.date] || []).push(ev); });

    // Démarre sur le premier mois ayant un événement.
    var start = parseIso(events[0].date);
    var year = start.y;
    var month = start.m - 1; // 0-indexé

    function render() {
      calRoot.textContent = '';

      var head = el('div', 'cal-head');
      var prev = el('button', 'cal-nav cal-prev', '‹');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Mois précédent');
      var title = el('h2', 'cal-month', MOIS[month] + ' ');
      title.appendChild(el('span', 'cal-y', String(year)));
      var next = el('button', 'cal-nav cal-next', '›');
      next.type = 'button';
      next.setAttribute('aria-label', 'Mois suivant');
      head.appendChild(prev);
      head.appendChild(title);
      head.appendChild(next);
      calRoot.appendChild(head);

      var weekdays = el('div', 'cal-grid cal-weekdays');
      ENTETE.forEach(function (j) { weekdays.appendChild(el('div', null, j)); });
      calRoot.appendChild(weekdays);

      var grid = el('div', 'cal-grid cal-days');
      var startCol = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
      var days = new Date(year, month + 1, 0).getDate();
      for (var i = 0; i < startCol; i++) grid.appendChild(el('div', 'cal-cell'));
      for (var d = 1; d <= days; d++) {
        var iso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        var has = !!byDate[iso];
        var cell = el('button', 'cal-cell' + (has ? ' has-event' : ''), String(d));
        cell.type = 'button';
        if (has) {
          cell.setAttribute('aria-label', d + ' ' + MOIS[month] + ' — voir l’événement dans le programme');
          cell.dataset.date = iso;
          cell.addEventListener('click', function () { highlightDate(this.dataset.date); });
        } else {
          cell.disabled = true;
        }
        grid.appendChild(cell);
      }
      calRoot.appendChild(grid);

      var legend = el('div', 'cal-legend');
      legend.appendChild(el('span', 'dot'));
      legend.appendChild(el('span', null, 'Jour avec rendez-vous — cliquez pour voir le détail'));
      calRoot.appendChild(legend);

      prev.addEventListener('click', function () {
        month--; if (month < 0) { month = 11; year--; }
        render();
      });
      next.addEventListener('click', function () {
        month++; if (month > 11) { month = 0; year++; }
        render();
      });
    }

    render();
  }
})();
