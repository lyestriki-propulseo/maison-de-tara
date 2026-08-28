// home-events.js — « Les rendez-vous » de l'accueil, rendus depuis Supabase
// (table events, MÊME source que la page Calendrier via js/site-events.js).
// Affiche les 4 prochains événements (le 1er en vedette). Rendu via textContent.
import { loadEvents } from './site-events.js';

(function () {
  'use strict';

  var root = document.getElementById('home-events');
  if (!root) return;

  var MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  var JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  var MOIS_LONGS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var TYPES = { atelier: 'Atelier', evenement: 'Événement', boutique: 'Boutique', brunch: 'Brunch' };

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt) n.textContent = txt;
    return n;
  }

  loadEvents()
    .then(function (events) {
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      var tries = events.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      var next = tries.filter(function (e) { return new Date(e.date + 'T00:00:00') >= now; }).slice(0, 4);
      var list = next.length ? next : tries.slice(0, 4);

      list.forEach(function (e, i) {
        var d = new Date(e.date + 'T00:00:00');
        var featured = i === 0;

        var art = el('article', 'event-row' + (featured ? ' event-row--featured' : ''));

        var date = el('div', 'event-row__date' + (featured ? ' event-row__date--featured' : ''));
        date.appendChild(el('strong', '', String(d.getDate()).padStart(2, '0')));
        date.appendChild(el('span', '', MOIS_COURTS[d.getMonth()]));
        art.appendChild(date);

        var body = el('div', 'event-row__body');
        body.appendChild(el('div', 'event-row__meta', (TYPES[e.type] || 'Rendez-vous') + ' · Maison de Tara'));
        var title = el(featured ? 'h3' : 'h4', 'event-row__title', e.titre);
        body.appendChild(title);
        var time = el('div', 'event-row__time',
          JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS_LONGS[d.getMonth()] + ' ' + d.getFullYear()
          + (e.description ? ' · ' + e.description : ''));
        body.appendChild(time);
        art.appendChild(body);

        var cta = el('a', 'btn ' + (featured ? 'btn--primary' : 'btn--outline') + ' event-row__cta',
          e.lienReservation ? 'Réserver' : 'En savoir plus');
        cta.href = e.lienReservation || 'calendrier.html';
        art.appendChild(cta);

        root.appendChild(art);
      });

      // Locomotive (accueil) : recaler les positions après l'insertion
      if (window.__mdtLoco && window.__mdtLoco.update) {
        setTimeout(function () { window.__mdtLoco.update(); }, 120);
      }
    })
    .catch(function () {
      var p = el('p', 'events-fallback', 'Le programme arrive bientôt. Retrouvez toutes les dates sur la page calendrier.');
      var a = el('a', '', 'Voir le calendrier');
      a.href = 'calendrier.html';
      p.appendChild(document.createTextNode(' '));
      p.appendChild(a);
      root.appendChild(p);
    });
})();
