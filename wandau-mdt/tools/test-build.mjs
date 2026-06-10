// Vérifie : (1) aucun marqueur include résiduel ; (2) build idempotent (2 builds == même sortie).
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
execSync('node build.mjs', { cwd: ROOT });
const snap1 = readdirSync(join(ROOT, '_src')).map((p) => readFileSync(join(ROOT, p), 'utf8'));
execSync('node build.mjs', { cwd: ROOT });
const snap2 = readdirSync(join(ROOT, '_src')).map((p) => readFileSync(join(ROOT, p), 'utf8'));
const leftover = snap2.some((h) => /<!--\s*include:/.test(h));
const stable = JSON.stringify(snap1) === JSON.stringify(snap2);
if (leftover) throw new Error('FAIL: marqueur include résiduel');
if (!stable) throw new Error('FAIL: build non idempotent');
console.log('PASS: build idempotent, aucun marqueur résiduel');
