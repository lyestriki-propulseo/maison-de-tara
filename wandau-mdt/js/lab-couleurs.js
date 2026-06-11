// lab-couleurs.js — laboratoire de couleurs (visible avec ?lab sur l'accueil).
// Les versions de mise en page sont toutes verrouillées (12/06) : le panneau
// ne propose plus QUE des couleurs. Chaque pastille s'applique en direct via
// les variables CSS de la charte (rien n'est enregistré : recharger = retour
// aux couleurs officielles).
(function () {
  if (!/[?&]lab\b/.test(location.search)) return;

  // --- Styles du panneau (auto-contenus, retirables avec ce fichier) ---
  var css = ''
    + '.lab-flash{outline:3px dashed #B84F3E !important;outline-offset:-3px;}'
    + '.color-lab{position:fixed;bottom:18px;right:18px;z-index:9999;width:272px;background:#fff;border:1px solid rgba(44,36,25,.25);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);font-family:Inter,system-ui,sans-serif;font-size:12px;color:#2c2419;max-height:76vh;overflow:auto;}'
    + '.color-lab h5{margin:0;padding:11px 13px;background:#79301E;color:#fff;font-size:11px;letter-spacing:.1em;text-transform:uppercase;border-radius:10px 10px 0 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;position:sticky;top:0;z-index:2;}'
    + '.color-lab h5 .chev{font-size:13px;line-height:1;}'
    + '.color-lab .lab-help{padding:9px 13px;background:#FBF7EC;border-bottom:1px solid rgba(44,36,25,.12);font-size:11px;line-height:1.5;color:#5f4f3f;}'
    + '.color-lab.is-min .grp,.color-lab.is-min .lab-help,.color-lab.is-min .lab-reset{display:none;}'
    + '.color-lab .grp{padding:10px 13px;border-bottom:1px solid rgba(44,36,25,.1);}'
    + '.color-lab .grp>label{display:block;font-weight:700;font-size:11px;color:#2c2419;margin-bottom:2px;}'
    + '.color-lab .grp>.hint{display:block;font-size:10.5px;color:#8a7a66;margin-bottom:8px;line-height:1.4;}'
    + '.color-lab .opts{display:flex;flex-wrap:wrap;gap:6px;}'
    + '.color-lab .opts button{cursor:pointer;border:2px solid rgba(44,36,25,.18);border-radius:6px;width:26px;height:26px;padding:0;}'
    + '.color-lab .opts button[aria-pressed=true]{border-color:#79301E;box-shadow:0 0 0 2px #f6e9e4;}'
    + '.color-lab .lab-reset{display:block;width:calc(100% - 26px);margin:10px 13px 12px;padding:7px 0;border:1px solid rgba(44,36,25,.25);border-radius:6px;background:#ece7da;font-size:11px;color:#2c2419;cursor:pointer;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // --- Défilement + surbrillance de la zone concernée (scroll natif en ?lab) ---
  function goTo(sel) {
    if (!sel) return;
    var el = document.querySelector(sel);
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.top < -180 || r.top > window.innerHeight * 0.55) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    el.classList.add('lab-flash');
    setTimeout(function () { el.classList.remove('lab-flash'); }, 2200);
  }

  // --- Panneau ---
  var panel = document.createElement('div');
  panel.className = 'color-lab';
  var head = document.createElement('h5');
  var headTitle = document.createElement('span');
  headTitle.textContent = 'Laboratoire · couleurs';
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
  help.textContent = 'Cliquez une pastille : la couleur s’applique en direct. Rien n’est enregistré — recharger la page revient aux couleurs actuelles.';
  panel.appendChild(help);

  var resetFns = [];

  // Fabrique un groupe de pastilles qui pilote UNE variable CSS de la charte.
  function swatchGroup(labelText, hintText, varName, colors, target) {
    var g = document.createElement('div');
    g.className = 'grp';
    var l = document.createElement('label');
    l.textContent = labelText;
    g.appendChild(l);
    var h = document.createElement('span');
    h.className = 'hint';
    h.textContent = hintText;
    g.appendChild(h);
    var opts = document.createElement('div');
    opts.className = 'opts';
    g.appendChild(opts);
    colors.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.style.background = c.hex;
      b.title = c.nom + ' — ' + c.hex;
      b.setAttribute('aria-label', labelText + ' : ' + c.nom);
      b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () {
        document.documentElement.style.setProperty(varName, c.hex);
        opts.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        goTo(target);
      });
      opts.appendChild(b);
    });
    resetFns.push(function () {
      document.documentElement.style.removeProperty(varName);
      opts.querySelectorAll('button').forEach(function (x, i) { x.setAttribute('aria-pressed', i === 0 ? 'true' : 'false'); });
    });
    panel.appendChild(g);
  }

  // Propositions — la 1re pastille de chaque groupe = couleur actuelle validée.
  swatchGroup('1 · Doré (accents)',
    'Italiques, icônes, filets, survols — partout sur le site.',
    '--mdt-laiton', [
      { nom: 'Laiton (actuel)', hex: '#B8924D' },
      { nom: 'Or chaud', hex: '#C9A24B' },
      { nom: 'Bronze', hex: '#A6792E' },
      { nom: 'Or pâle', hex: '#CDAA5A' },
      { nom: 'Rose poudré (charte)', hex: '#BA7770' },
      { nom: 'Olive claire (charte)', hex: '#8A976C' },
      { nom: 'Cuivre rosé', hex: '#B0654F' },
    ], null);

  swatchGroup('2 · Boutons (terracotta)',
    'Tous les boutons du site + les mots manuscrits.',
    '--mdt-terracotta', [
      { nom: 'Terracotta charte (actuel)', hex: '#79301E' },
      { nom: 'Brique', hex: '#8B3A26' },
      { nom: 'Tomette', hex: '#9C4030' },
      { nom: 'Corail terre', hex: '#B84F3E' },
      { nom: 'Vert sauge', hex: '#5A6347' },
      { nom: 'Vert profond', hex: '#3F4731' },
      { nom: 'Encre', hex: '#2C2419' },
    ], null);

  swatchGroup('3 · Hero (fond)',
    'Le grand fond vert du haut de page (texture fleurie conservée).',
    '--mdt-hero-bg', [
      { nom: 'Sauge (actuel)', hex: '#5A6347' },
      { nom: 'Sauge claire', hex: '#6B7355' },
      { nom: 'Sauge profonde', hex: '#49513A' },
      { nom: 'Vert footer (raccord)', hex: '#3F4731' },
      { nom: 'Terracotta profond', hex: '#79301E' },
      { nom: 'Brun cacao', hex: '#4A372A' },
    ], 'header.slider');

  swatchGroup('4 · Footer (fond)',
    'Le pied de page, sur toutes les pages.',
    '--mdt-footer-bg', [
      { nom: 'Vert profond (actuel)', hex: '#3F4731' },
      { nom: 'Sauge', hex: '#5A6347' },
      { nom: 'Sauge profonde', hex: '#49513A' },
      { nom: 'Encre brune', hex: '#2C2419' },
      { nom: 'Brun cacao', hex: '#4A372A' },
      { nom: 'Terracotta profond', hex: '#79301E' },
    ], '.mdt-footer');

  var reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'lab-reset';
  reset.textContent = 'Tout remettre aux couleurs actuelles';
  reset.addEventListener('click', function () { resetFns.forEach(function (f) { f(); }); });
  panel.appendChild(reset);

  document.body.appendChild(panel);
})();
