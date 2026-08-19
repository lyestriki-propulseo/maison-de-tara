// mdt-datepicker.js — sélecteur de date maison, aux couleurs de la charte.
// Remplace l'agenda natif du navigateur (non stylable, souvent anglophone).
// Marche sur tout conteneur .dp : bouton .dp__field (optionnel si .dp--inline) + input hidden
// + .dp__pop. Variante .dp--inline : l'agenda reste affiché en permanence, pas de popup.
// Règles métier : pas de date passée, lundi fermé (atelier).
(function () {
  'use strict';

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var JOURS = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
  var JOURS_LONGS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var JOUR_FERME = 1; // lundi (Date#getDay)

  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function libelle(d) {
    return JOURS_LONGS[d.getDay()] + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()] + ' ' + d.getFullYear();
  }

  document.querySelectorAll('.dp').forEach(function (dp) {
    var inline = dp.classList.contains('dp--inline');
    var btn = dp.querySelector('.dp__field');
    var hidden = dp.querySelector('input[type="hidden"]');
    var pop = dp.querySelector('.dp__pop');
    if (!hidden || !pop || (!inline && !btn)) return;

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var placeholder = btn ? btn.textContent : '';

    function render() {
      pop.textContent = '';

      var head = document.createElement('div');
      head.className = 'dp__head';
      var prev = navBtn('‹', 'Mois précédent', -1);
      // pas de retour avant le mois courant
      prev.disabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
      var title = document.createElement('span');
      title.className = 'dp__month';
      title.textContent = MOIS[view.getMonth()] + ' ' + view.getFullYear();
      head.appendChild(prev);
      head.appendChild(title);
      head.appendChild(navBtn('›', 'Mois suivant', 1));
      pop.appendChild(head);

      var wd = document.createElement('div');
      wd.className = 'dp__grid dp__weekdays';
      JOURS.forEach(function (j) {
        var s = document.createElement('span');
        s.textContent = j;
        wd.appendChild(s);
      });
      pop.appendChild(wd);

      var grid = document.createElement('div');
      grid.className = 'dp__grid';
      var startCol = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7; // lundi = 0
      for (var i = 0; i < startCol; i++) grid.appendChild(document.createElement('span'));
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dp__day';
        b.textContent = d;
        if (date < today || date.getDay() === JOUR_FERME) {
          b.disabled = true;
        } else {
          if (hidden.value === iso(date)) b.classList.add('is-selected');
          b.addEventListener('click', pick.bind(null, date));
        }
        grid.appendChild(b);
      }
      pop.appendChild(grid);

      var note = document.createElement('p');
      note.className = 'dp__note';
      note.textContent = 'La maison est fermée le lundi.';
      pop.appendChild(note);
    }

    function navBtn(txt, label, dir) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dp__nav';
      b.textContent = txt;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function (e) {
        // Le rendu recrée les boutons (dont celui-ci) : sans stopPropagation, le clic remonte
        // jusqu'au listener document qui voit une cible détachée du DOM et referme le popup.
        e.stopPropagation();
        view = new Date(view.getFullYear(), view.getMonth() + dir, 1);
        render();
      });
      return b;
    }

    function pick(date) {
      hidden.value = iso(date);
      if (btn) {
        btn.textContent = libelle(date);
        btn.classList.add('has-value');
      }
      if (inline) {
        render(); // rafraîchit juste le surlignage du jour choisi
      } else {
        close();
        btn.focus();
      }
      // Permet à un consommateur (ex. tunnel de réservation) de réagir au choix de date.
      hidden.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function open() { render(); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
    function close() { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

    if (inline) {
      render();
    } else {
      btn.addEventListener('click', function () { pop.hidden ? open() : close(); });
      document.addEventListener('click', function (e) { if (!dp.contains(e.target)) close(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); }
      });
    }

    // reset du formulaire (après envoi réussi) : on rend son libellé au bouton
    var form = dp.closest('form');
    if (form) form.addEventListener('reset', function () {
      if (btn) { btn.textContent = placeholder; btn.classList.remove('has-value'); }
      if (inline) render();
    });
  });
})();
