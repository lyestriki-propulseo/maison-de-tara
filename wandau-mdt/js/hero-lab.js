// hero-lab.js — panneau de réglages injecté sur l'accueil (visible avec ?lab).
// Pour Tara : chaque clic applique la variante EN DIRECT, fait défiler la page
// jusqu'à la zone modifiée et la met en surbrillance quelques secondes.
(function () {
  if (!/[?&]lab\b/.test(location.search)) return;

  var hero = document.querySelector('header.slider');
  if (!hero) return;

  // --- Styles (auto-contenus, retirables avec ce fichier) ---
  var css = ''
    /* Surbrillance de la zone modifiée */
    + '.lab-flash{outline:3px dashed #B84F3E !important;outline-offset:-3px;}'
    /* Panneau */
    + '.hero-lab{position:fixed;bottom:18px;right:18px;z-index:9999;width:264px;background:#fff;border:1px solid rgba(44,36,25,.25);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);font-family:Inter,system-ui,sans-serif;font-size:12px;color:#2c2419;max-height:76vh;overflow:auto;}'
    + '.hero-lab h5{margin:0;padding:11px 13px;background:#79301E;color:#fff;font-size:11px;letter-spacing:.1em;text-transform:uppercase;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:sticky;top:0;z-index:2;}'
    + '.hero-lab h5 .chev{font-size:13px;line-height:1;}'
    + '.hero-lab .lab-help{padding:9px 13px;background:#FBF7EC;border-bottom:1px solid rgba(44,36,25,.12);font-size:11px;line-height:1.5;color:#5f4f3f;}'
    + '.hero-lab.is-min .grp,.hero-lab.is-min .lab-help{display:none;}'
    + '.hero-lab .grp{padding:10px 13px;border-bottom:1px solid rgba(44,36,25,.1);}'
    + '.hero-lab .grp:last-child{border-bottom:0;}'
    + '.hero-lab .grp>label{display:block;font-weight:700;font-size:11px;color:#2c2419;margin-bottom:2px;}'
    + '.hero-lab .grp>.hint{display:block;font-size:10.5px;color:#8a7a66;margin-bottom:8px;line-height:1.4;}'
    + '.hero-lab .opts{display:flex;flex-wrap:wrap;gap:6px;}'
    + '.hero-lab .opts button{cursor:pointer;border:2px solid transparent;border-radius:6px;padding:6px 9px;background:#ece7da;font-size:11px;color:#2c2419;}'
    + '.hero-lab .opts button[aria-pressed=true]{border-color:#79301E;background:#f6e9e4;}'
    + '.hero-lab .opts button.sw{width:26px;height:26px;padding:0;}'
    + '.hero-lab .opts button.thumb{width:64px;height:44px;padding:0;background-size:cover;background-position:center;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // --- Défilement + surbrillance de la zone modifiée ---
  function goTo(target) {
    if (!target) return;
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    // Ne défiler que si la zone n'est pas déjà sous les yeux
    var r = el.getBoundingClientRect();
    var needScroll = r.top < -180 || r.top > window.innerHeight * 0.55;
    if (needScroll) {
      if (window.__mdtLoco && window.__mdtLoco.scrollTo) {
        window.__mdtLoco.scrollTo(el, { offset: -140, duration: 600 });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    el.classList.add('lab-flash');
    setTimeout(function () { el.classList.remove('lab-flash'); }, 2200);
  }

  // Les bascules changent la hauteur des sections : Locomotive Scroll garde
  // les anciennes positions en cache → chevauchements / page blanche.
  // Séquencement STRICT : recalcul d'abord, défilement ensuite, puis
  // re-calages une fois l'animation finie et les images chargées.
  // (Un update() pendant l'animation de scrollTo la fait dérailler.)
  function locoUpdate() {
    if (window.__mdtLoco && window.__mdtLoco.update) window.__mdtLoco.update();
  }
  function refresh(target) {
    setTimeout(locoUpdate, 50);                       // recalcul après application
    setTimeout(function () { goTo(target); }, 230);   // scroll sur positions à jour
    setTimeout(locoUpdate, 1300);                     // après la fin de l'animation
    setTimeout(locoUpdate, 2200);                     // après chargement des images
  }

  // --- Couleurs ---
  var GOLDS = ['#B8924D', '#C9A24B', '#A6792E', '#CDAA5A'];
  var TERRAS = ['#79301E', '#8B3A26', '#9C4030', '#A84A33', '#B84F3E', '#C2542F'];

  // --- Panneau ---
  var panel = document.createElement('div');
  panel.className = 'hero-lab';
  var head = document.createElement('h5');
  var headTitle = document.createElement('span');
  headTitle.textContent = 'Réglages · accueil';
  var chev = document.createElement('span');
  chev.className = 'chev';
  chev.textContent = '▾';
  head.appendChild(headTitle);
  head.appendChild(chev);
  panel.appendChild(head);
  head.addEventListener('click', function () {
    panel.classList.toggle('is-min');
    chev.textContent = panel.classList.contains('is-min') ? '▸' : '▾';
  });

  var help = document.createElement('div');
  help.className = 'lab-help';
  help.textContent = 'Cliquez une option : la page défile jusqu’à la zone concernée et l’encadre quelques secondes en pointillés.';
  panel.appendChild(help);

  function group(labelText, hintText) {
    var g = document.createElement('div');
    g.className = 'grp';
    var l = document.createElement('label');
    l.textContent = labelText;
    g.appendChild(l);
    if (hintText) {
      var h = document.createElement('span');
      h.className = 'hint';
      h.textContent = hintText;
      g.appendChild(h);
    }
    var opts = document.createElement('div');
    opts.className = 'opts';
    g.appendChild(opts);
    panel.appendChild(g);
    return opts;
  }

  function press(container, btn) {
    container.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    btn.setAttribute('aria-pressed', 'true');
  }

  // Fabrique un groupe de boutons texte génériques
  function buttonGroup(opts, items, onPick, target) {
    items.forEach(function (it, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        onPick(it);
        press(opts, b);
        refresh(target);
      });
      opts.appendChild(b);
    });
  }

  // 0 · VERSION DE LA PAGE — v1 actuelle / v2 premium (css/mdt-accueil-v2.css)
  var gVer = group('0 · Version de la page', 'v2 premium = boutons pilule, titres manuscrits, photos en arche — le langage des pages intérieures.');
  buttonGroup(gVer, [
    { label: 'v1 · actuelle', on: false },
    { label: 'v2 · premium', on: true },
  ], function (it) {
    document.body.classList.toggle('av2', it.on);
  }, null);

  // 1 · UNIVERS — titre de la section (demande Tara : remplace « Créer. Partager. Prolonger. »)
  var gUt = group('1 · Univers — titre de la section', 'Deux propositions de Tara.');
  buttonGroup(gUt, [
    { label: 'À découvrir à la maison', on: false },
    { label: 'Trois univers à découvrir', on: true },
  ], function (it) {
    document.body.classList.toggle('univers-title-b', it.on);
  }, '#univers');

  // 2 · UNIVERS — cartes
  var gUv = group('2 · Cartes Atelier / Café / Boutique', 'Texte complet de Tara, ou version raccourcie avec des puces.');
  buttonGroup(gUv, [
    { label: 'Texte entier', on: false },
    { label: 'Avec puces', on: true },
  ], function (it) {
    document.body.classList.toggle('univers-bullets', it.on);
  }, '#univers');

  // 3 · PARCOURS (texte = résumé unique ; seul le style des titres se choisit)
  var gPt = group('3 · « Comment ça se passe ? » — titres', 'Titres complets (« Réserver votre session ») ou raccourcis (« Réserver »).');
  buttonGroup(gPt, [
    { label: 'Complets', on: false },
    { label: 'Courts', on: true },
  ], function (it) {
    document.body.classList.toggle('parcours-short', it.on);
  }, '#parcours');

  // 4 · BOUTIQUE
  var gBtq = group('4 · Section boutique — mise en scène', 'Même texte, 4 présentations différentes.');
  buttonGroup(gBtq, [
    { label: 'Actuelle', cls: '' },
    { label: 'Photo + texte', cls: 'boutique-v2' },
    { label: 'Vitrine 3 photos', cls: 'boutique-v3' },
    { label: 'Bande verte', cls: 'boutique-v4' },
  ], function (it) {
    document.body.classList.remove('boutique-v2', 'boutique-v3', 'boutique-v4');
    if (it.cls) document.body.classList.add(it.cls);
  }, '#section-boutique');

  // COULEURS
  var gGold = group('Couleur — doré (accents)', 'S’applique partout : italiques, icônes, survols. Pas de défilement.');
  GOLDS.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.style.background = c;
    b.title = c;
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', function () { document.documentElement.style.setProperty('--mdt-laiton', c); press(gGold, b); });
    gGold.appendChild(b);
  });

  var gTerra = group('Couleur — terracotta (boutons)', 'S’applique à tous les boutons du site. Pas de défilement.');
  TERRAS.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sw';
    b.style.background = c;
    b.title = c;
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', function () { document.documentElement.style.setProperty('--mdt-terracotta', c); press(gTerra, b); });
    gTerra.appendChild(b);
  });

  document.body.appendChild(panel);
})();
