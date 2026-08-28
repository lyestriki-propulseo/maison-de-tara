// Assembleur d'includes statique — zéro dépendance.
// Lit _src/*.html, remplace <!-- include: name --> par _partials/name.html,
// écrit les *.html à la racine wandau-mdt/. Ne relit JAMAIS la racine (idempotent).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, '_src');
const PARTIALS = join(ROOT, '_partials');
const INCLUDE_RE = /<!--\s*include:\s*([\w-]+)\s*-->/g;

function renderPartial(name, seen) {
  if (seen.has(name)) throw new Error(`Include cyclique détecté: ${name}`);
  const next = new Set(seen).add(name);
  const file = join(PARTIALS, `${name}.html`);
  if (!existsSync(file)) throw new Error(`Partial introuvable: _partials/${name}.html`);
  return readFileSync(file, 'utf8').replace(INCLUDE_RE, (_, n) => renderPartial(n, next));
}

function build() {
  if (!existsSync(SRC)) throw new Error('Dossier _src/ manquant');
  const pages = readdirSync(SRC).filter((f) => f.endsWith('.html'));
  for (const page of pages) {
    const src = readFileSync(join(SRC, page), 'utf8');
    const out = src.replace(INCLUDE_RE, (_, name) => renderPartial(name, new Set()));
    if (INCLUDE_RE.test(out)) throw new Error(`Marqueur include résiduel dans ${page}`);
    writeFileSync(join(ROOT, page), out);
    console.log(`✓ ${page}`);
  }
  console.log(`${pages.length} page(s) assemblée(s).`);
}
build();
