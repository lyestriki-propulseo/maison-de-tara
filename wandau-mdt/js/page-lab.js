// page-lab.js — choix v1 / v2 / v3 (?lab) sur les pages intérieures.
// v1 = page actuelle ; v2 & v3 = propositions de mise en page
// (css/mdt-variants.css, règles scopées body.pv2 / body.pv3).
// Mêmes textes, seul le design change.
// En ?lab, Locomotive est désactivé (scripts.js → body.lab-native) :
// la bascule n'a aucun recalcul de scroll à gérer.
(function () {
  if (!/[?&]lab\b/.test(location.search)) return;

  var slug = (location.pathname.split('/').pop() || '').replace('.html', '') || 'page';
  document.body.classList.add('lab-' + slug);

  // Pilotage par URL (comparateur.html) : ?lab&v=2|3 applique la variante,
  // &nopanel masque le panneau (la page est alors affichée dans une iframe).
  var auto = (location.search.match(/[?&]v=([23])\b/) || [])[1] || '';
  if (auto) document.body.classList.add('pv' + auto);
  if (/[?&]nopanel\b/.test(location.search)) return;

  var css = ''
    + '.page-lab{position:fixed;bottom:18px;right:18px;z-index:9999;width:232px;background:#fff;border:1px solid rgba(44,36,25,.25);border-radius:10px;box-shadow:0 12px 40px rgba(0,0,0,.28);font-family:Inter,system-ui,sans-serif;font-size:12px;color:#2c2419;}'
    + '.page-lab h5{margin:0;padding:11px 13px;background:#79301E;color:#fff;font-size:11px;letter-spacing:.1em;text-transform:uppercase;border-radius:10px 10px 0 0;}'
    + '.page-lab .grp{padding:11px 13px;}'
    + '.page-lab .hint{display:block;font-size:10.5px;color:#8a7a66;margin-bottom:9px;line-height:1.4;}'
    + '.page-lab .opts{display:flex;gap:6px;}'
    + '.page-lab .opts button{cursor:pointer;border:2px solid transparent;border-radius:6px;padding:8px 10px;background:#ece7da;font-size:11px;color:#2c2419;flex:1;}'
    + '.page-lab .opts button[aria-pressed=true]{border-color:#79301E;background:#f6e9e4;}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var panel = document.createElement('div');
  panel.className = 'page-lab';
  var head = document.createElement('h5');
  head.textContent = 'Mise en page';
  panel.appendChild(head);

  var grp = document.createElement('div');
  grp.className = 'grp';
  var hint = document.createElement('span');
  hint.className = 'hint';
  hint.textContent = 'Comparez les trois versions de la page : mêmes textes, mises en page différentes.';
  grp.appendChild(hint);

  var opts = document.createElement('div');
  opts.className = 'opts';
  [
    { label: 'v1', cls: '' },
    { label: 'v2', cls: 'pv2' },
    { label: 'v3', cls: 'pv3' },
  ].forEach(function (it, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = it.label;
    var pressed = auto ? it.cls === 'pv' + auto : i === 0;
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.addEventListener('click', function () {
      document.body.classList.remove('pv2', 'pv3');
      if (it.cls) document.body.classList.add(it.cls);
      opts.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
      b.setAttribute('aria-pressed', 'true');
    });
    opts.appendChild(b);
  });
  grp.appendChild(opts);
  panel.appendChild(grp);
  document.body.appendChild(panel);
})();
