// lab-couleurs.js — laboratoire de couleurs (visible avec ?lab sur l'accueil).
// Les versions de mise en page sont toutes verrouillées (12/06) : le panneau
// ne propose plus QUE des couleurs. Chaque pastille s'applique en direct via
// les variables CSS de la charte (rien n'est enregistré : recharger = retour
// aux couleurs officielles). Aucun défilement automatique : on se déplace via
// les boutons « voir le hero / voir le footer » pour comparer à volonté.
(function () {
  if (!/[?&]lab\b/.test(location.search)) return;

  // --- Styles du panneau (auto-contenus, retirables avec ce fichier) ---
  var css = [
    '.color-lab{',
    '  position:fixed;bottom:20px;right:20px;z-index:9999;width:294px;',
    '  background:#FCFAF4;border:1px solid rgba(44,36,25,.14);border-radius:16px;',
    '  box-shadow:0 18px 50px rgba(28,22,12,.30),0 2px 8px rgba(28,22,12,.12);',
    '  font-family:Inter,system-ui,sans-serif;font-size:12px;color:#2c2419;',
    '  max-height:84vh;overflow:auto;overscroll-behavior:contain;',
    '}',
    '.color-lab::-webkit-scrollbar{width:8px;}',
    '.color-lab::-webkit-scrollbar-thumb{background:rgba(121,48,30,.25);border-radius:8px;}',
    /* En-tête */
    '.cl-head{position:sticky;top:0;z-index:3;display:flex;align-items:center;gap:9px;',
    '  padding:13px 15px;background:linear-gradient(135deg,#79301E,#9C4030);color:#fff;',
    '  border-radius:16px 16px 0 0;cursor:pointer;user-select:none;}',
    '.cl-head .cl-dot{width:22px;height:22px;border-radius:50%;flex:0 0 auto;',
    '  background:conic-gradient(#B8924D,#79301E,#5A6347,#BA7770,#B8924D);',
    '  box-shadow:inset 0 0 0 2px rgba(255,255,255,.55);}',
    '.cl-head .cl-ttl{flex:1;font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;}',
    '.cl-head .cl-chev{font-size:13px;line-height:1;opacity:.9;transition:transform .2s;}',
    '.color-lab.is-min .cl-chev{transform:rotate(-90deg);}',
    '.color-lab.is-min .cl-body{display:none;}',
    /* Intro */
    '.cl-intro{padding:11px 15px;background:#F4EEDD;border-bottom:1px solid rgba(44,36,25,.10);',
    '  font-size:11px;line-height:1.55;color:#6a5a47;}',
    /* Boutons de navigation */
    '.cl-jump{display:flex;gap:8px;padding:11px 15px 3px;}',
    '.cl-jump button{flex:1;cursor:pointer;border:1px solid rgba(44,36,25,.18);border-radius:999px;',
    '  padding:7px 0;background:#fff;font-size:11px;font-weight:600;color:#5A6347;',
    '  letter-spacing:.02em;transition:background .18s,color .18s,border-color .18s;}',
    '.cl-jump button:hover{background:#5A6347;color:#fff;border-color:#5A6347;}',
    /* Groupes */
    '.cl-grp{padding:13px 15px;border-bottom:1px solid rgba(44,36,25,.08);}',
    '.cl-grp:last-of-type{border-bottom:0;}',
    '.cl-grp .cl-lbl{display:flex;align-items:center;gap:8px;font-weight:700;font-size:12px;color:#2c2419;}',
    '.cl-grp .cl-num{display:inline-flex;align-items:center;justify-content:center;',
    '  width:20px;height:20px;border-radius:50%;background:#B8924D;color:#fff;',
    '  font-size:11px;font-weight:700;flex:0 0 auto;}',
    '.cl-grp .cl-hint{display:block;font-size:10.5px;color:#8a7a66;margin:4px 0 9px;line-height:1.45;}',
    '.cl-sw{display:flex;flex-wrap:wrap;gap:7px;}',
    '.cl-sw button{position:relative;cursor:pointer;width:30px;height:30px;border-radius:8px;',
    '  border:1px solid rgba(44,36,25,.16);padding:0;transition:transform .12s,box-shadow .12s;}',
    '.cl-sw button:hover{transform:translateY(-2px);box-shadow:0 4px 10px rgba(28,22,12,.22);}',
    '.cl-sw button[aria-pressed=true]{box-shadow:0 0 0 2px #FCFAF4,0 0 0 4px #2c2419;}',
    '.cl-sw button[aria-pressed=true]::after{content:"✓";position:absolute;inset:0;',
    '  display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;',
    '  text-shadow:0 1px 2px rgba(0,0,0,.5);}',
    '.cl-grp .cl-current{display:block;margin-top:9px;font-size:10.5px;color:#6a5a47;font-style:italic;}',
    '.cl-grp .cl-current b{font-style:normal;font-weight:600;color:#2c2419;}',
    /* Pied : reset */
    '.cl-reset{display:block;width:calc(100% - 30px);margin:13px 15px 16px;padding:9px 0;',
    '  border:1px solid rgba(121,48,30,.30);border-radius:999px;background:#fff;',
    '  font-size:11px;font-weight:600;color:#79301E;cursor:pointer;',
    '  transition:background .18s,color .18s;}',
    '.cl-reset:hover{background:#79301E;color:#fff;}',
    /* Fond clair choisi : texte hero + footer passe en encre foncée (lisibilité) */
    'body.cl-bg-light header.slider .slider-texts :where(h1,p,small,li,.hero-eyebrow){',
    '  color:#2c2419 !important;text-shadow:none !important;opacity:1 !important;}',
    'body.cl-bg-light header.slider .slider-texts :where(h1 em,p em){color:#79301E !important;}',
    'body.cl-bg-light header.slider .hero-meta__ic{fill:#79301E !important;}',
    'body.cl-bg-light .mdt-footer :where(.mdt-footer-name,.mdt-footer-nav a,.mdt-footer-coords,',
    '  .mdt-footer-coords a,.fb-l,.fb-c a,.fb-r a){color:#2c2419 !important;}',
    'body.cl-bg-light .mdt-footer .mdt-footer-coords{color:rgba(44,36,25,.85) !important;}',
    /* Bande newsletter sur fond clair : texture florale allégée pour matcher les autres sections */
    'body.cl-nl-light .mdt-newsletter::before{opacity:.07 !important;}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function scrollToSel(sel) {
    var t = document.querySelector(sel);
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // Luminance perçue d'un hex #RRGGBB (0 = noir, 1 = blanc)
  function isLight(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
  }

  // --- Panneau ---
  var panel = el('div', 'color-lab');

  var head = el('div', 'cl-head');
  head.appendChild(el('span', 'cl-dot'));
  head.appendChild(el('span', 'cl-ttl', 'Laboratoire couleurs'));
  var chev = el('span', 'cl-chev', '▾');
  head.appendChild(chev);
  head.addEventListener('click', function () { panel.classList.toggle('is-min'); });
  panel.appendChild(head);

  var body = el('div', 'cl-body');
  panel.appendChild(body);

  body.appendChild(el('div', 'cl-intro',
    'Cliquez une pastille : la couleur s’applique en direct sur tout le site. Rien n’est enregistré — recharger la page revient aux couleurs actuelles.'));

  // Navigation pour comparer haut / bas sans défilement automatique
  var jump = el('div', 'cl-jump');
  var jHero = el('button', null, '↑ Voir le hero');
  jHero.type = 'button';
  jHero.addEventListener('click', function () { scrollToSel('header.slider'); });
  var jFoot = el('button', null, '↓ Voir le footer');
  jFoot.type = 'button';
  jFoot.addEventListener('click', function () { scrollToSel('.mdt-footer'); });
  jump.appendChild(jHero);
  jump.appendChild(jFoot);
  body.appendChild(jump);

  var resetFns = [];

  // Fabrique un groupe de pastilles qui pilote UNE variable CSS de la charte.
  // onPick(color) : rappel optionnel après chaque choix (ex. lisibilité fond clair).
  function swatchGroup(num, labelText, hintText, varName, colors, onPick) {
    var g = el('div', 'cl-grp');
    var lbl = el('div', 'cl-lbl');
    lbl.appendChild(el('span', 'cl-num', String(num)));
    lbl.appendChild(el('span', null, labelText));
    g.appendChild(lbl);
    g.appendChild(el('span', 'cl-hint', hintText));

    // Couleur réellement appliquée par défaut (marquée cur:true), sinon la 1re.
    var defaultColor = colors.filter(function (c) { return c.cur; })[0] || colors[0];

    var row = el('div', 'cl-sw');
    g.appendChild(row);
    var current = el('span', 'cl-current');
    function setCurrent(c) {
      current.textContent = '';
      current.appendChild(document.createTextNode('Choisi : '));
      current.appendChild(el('b', null, c.nom));
      current.appendChild(document.createTextNode(' · ' + c.hex));
    }
    setCurrent(defaultColor);

    colors.forEach(function (c) {
      var b = el('button');
      b.type = 'button';
      b.style.background = c.hex;
      b.title = c.nom + ' — ' + c.hex;
      b.setAttribute('aria-label', labelText + ' : ' + c.nom);
      b.setAttribute('aria-pressed', c === defaultColor ? 'true' : 'false');
      b.addEventListener('click', function () {
        document.documentElement.style.setProperty(varName, c.hex);
        row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        setCurrent(c);
        if (onPick) onPick(c);
      });
      b._color = c;
      row.appendChild(b);
    });
    g.appendChild(current);

    resetFns.push(function () {
      document.documentElement.style.removeProperty(varName);
      row.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x._color === defaultColor ? 'true' : 'false'); });
      setCurrent(defaultColor);
      if (onPick) onPick(defaultColor);
    });
    body.appendChild(g);
  }

  // Propositions — la 1re pastille de chaque groupe = couleur actuelle validée.
  swatchGroup(1, 'Doré (accents)',
    'Italiques, icônes, filets, survols — partout sur le site.',
    '--mdt-laiton', [
      { nom: 'Laiton (actuel)', hex: '#B8924D', cur: true },
      { nom: 'Or chaud', hex: '#C9A24B' },
      { nom: 'Bronze', hex: '#A6792E' },
      { nom: 'Or pâle', hex: '#CDAA5A' },
      { nom: 'Rose poudré (charte)', hex: '#BA7770' },
      { nom: 'Olive claire (charte)', hex: '#8A976C' },
      { nom: 'Cuivre rosé', hex: '#B0654F' }
    ]);

  swatchGroup(2, 'Boutons (terracotta)',
    'Tous les boutons du site + les mots manuscrits.',
    '--mdt-terracotta', [
      { nom: 'Terracotta charte (actuel)', hex: '#79301E', cur: true },
      { nom: 'Brique', hex: '#8B3A26' },
      { nom: 'Tomette', hex: '#9C4030' },
      { nom: 'Corail terre', hex: '#B84F3E' },
      { nom: 'Vert sauge', hex: '#5A6347' },
      { nom: 'Vert profond', hex: '#3F4731' },
      { nom: 'Encre', hex: '#2C2419' }
    ]);

  swatchGroup(3, 'Hero + footer (fond)',
    'Une seule couleur pour le grand fond du haut ET le pied de page (texture fleurie conservée). Sur un fond clair, le texte passe automatiquement en foncé. Utilisez « voir le footer » pour comparer.',
    '--mdt-hero-bg', [
      // Fonds clairs (mis en avant par Tara) — texte basculé en foncé
      { nom: 'Crème (charte)', hex: '#F0ECDB' },
      { nom: 'Sable chaud', hex: '#E8DCC4' },
      { nom: 'Sable doré', hex: '#DCC9A5' },
      { nom: 'Vert d’eau pâle', hex: '#CBD3BC' },
      { nom: 'Sauge claire', hex: '#A3AE88' },
      { nom: 'Rosé poudré', hex: '#E3C9C2' },
      // Fonds soutenus / actuels
      { nom: 'Olive claire (charte)', hex: '#8A976C' },
      { nom: 'Sauge (actuel)', hex: '#5A6347', cur: true },
      { nom: 'Vert profond', hex: '#3F4731' },
      { nom: 'Brun cacao', hex: '#4A372A' },
      { nom: 'Terracotta profond', hex: '#79301E' }
    ], function (c) {
      document.body.classList.toggle('cl-bg-light', isLight(c.hex));
    });

  swatchGroup(4, 'Bande « La lettre de la maison » (fond)',
    'L’avant-dernière section, juste au-dessus du footer. La carte d’inscription reste lisible quel que soit le fond.',
    '--mdt-newsletter-bg', [
      { nom: 'Sauge grisée (actuel)', hex: '#9CA68C', cur: true },
      { nom: 'Fond principal du site (beige)', hex: '#F0ECDB' },
      { nom: 'Sable chaud', hex: '#E8DCC4' },
      { nom: 'Vert d’eau pâle', hex: '#CBD3BC' },
      { nom: 'Rosé poudré', hex: '#E3C9C2' },
      { nom: 'Olive claire', hex: '#8A976C' },
      { nom: 'Sauge', hex: '#5A6347' },
      { nom: 'Vert profond', hex: '#3F4731' },
      { nom: 'Terracotta profond', hex: '#79301E' }
    ], function (c) {
      // Fond clair : on allège la texture florale pour fondre la bande dans le site
      document.body.classList.toggle('cl-nl-light', isLight(c.hex));
    });

  var reset = el('button', 'cl-reset', 'Tout remettre aux couleurs actuelles');
  reset.type = 'button';
  reset.addEventListener('click', function () { resetFns.forEach(function (f) { f(); }); });
  body.appendChild(reset);

  document.body.appendChild(panel);
})();
