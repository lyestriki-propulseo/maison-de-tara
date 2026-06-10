// Configurateur couleur — chaque zone applique une CSS custom property sur #preview, en live.
const ZONES = [
  { key: 'bg',      label: 'Fond vert (hero)',          prop: '--lab-bg',
    options: ['#8A976C', '#5A6347', '#9AA67E', '#7C8A5E'] },
  { key: 'header',  label: 'Barre header',              prop: '--lab-header',
    options: ['#F0ECDB', '#FBF9F1', '#E7E0C8', '#8A976C'] },
  { key: 'cta',     label: 'Boutons (CTA)',             prop: '--lab-cta',
    options: ['#79301E', '#BA7770', '#8A976C', '#5A6347'] },
  { key: 'title',   label: 'Titres',                    prop: '--lab-title',
    options: ['#79301E', '#5A6347', '#2C2419', '#BA7770'] },
  { key: 'body',    label: 'Police du corps',           prop: '--mdt-font-body', font: true,
    options: ['Inter, sans-serif', 'Mulish, sans-serif', 'Karla, sans-serif', 'Nunito Sans, sans-serif'] },
  { key: 'pattern', label: 'Motif floral (opacité)',    prop: '--lab-pattern-opacity',
    options: ['0.12', '0.18', '0.24', '0.30'] },
];

const preview = document.getElementById('preview');
const out = document.getElementById('export-out');
const controls = document.querySelector('.controls');
const chosen = {};

for (const z of ZONES) {
  const block = document.createElement('div');
  block.className = 'zone';
  block.innerHTML = `<h4>${z.label}</h4>`;
  const row = document.createElement('div');
  row.className = 'swatches';

  z.options.forEach((val, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch' + (z.font ? ' is-font' : '');
    if (z.font) {
      b.style.fontFamily = val;
      b.textContent = val.split(',')[0];
    } else if (val.startsWith('#')) {
      b.style.background = val;
      b.textContent = val;
    } else {
      b.textContent = val;       // opacité du motif
      b.style.background = '#8A976C';
    }
    b.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    b.addEventListener('click', () => {
      preview.style.setProperty(z.prop, val);
      chosen[z.key] = val;
      row.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      render();
    });
    row.appendChild(b);
  });

  block.appendChild(row);
  controls.appendChild(block);
  // état initial = première option (cohérent avec aria-pressed)
  chosen[z.key] = z.options[0];
  preview.style.setProperty(z.prop, z.options[0]);
}

function render() {
  out.textContent = ZONES.map((z) => `${z.prop}: ${chosen[z.key]};`).join('\n');
}
render();

const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(out.textContent);
      copyBtn.textContent = 'Copié ✓';
      setTimeout(() => (copyBtn.textContent = 'Copier'), 1500);
    } catch {
      copyBtn.textContent = 'Copie impossible';
    }
  });
}
