import assert from 'node:assert/strict';
import { test } from 'node:test';
import { linkify, splitParagraphs } from '../wandau-mdt/js/content-format.js';

// US-002 — mise en forme du texte brut des pages légales (docs/us/US-002-pages-legales-editables.md,
// dépôt app). Le rendu DOM (renderTexte) est couvert par app/e2e-site/pages-legales.e2e.ts.

test('CA-03 — un retour à la ligne garde la ligne dans le même paragraphe', () => {
  assert.deepEqual(splitParagraphs('Maison de Tara SAS\nSIRET : 123'), [['Maison de Tara SAS', 'SIRET : 123']]);
});

test('CA-03 — une ligne vide sépare deux paragraphes', () => {
  assert.deepEqual(splitParagraphs('Premier.\n\nSecond.'), [['Premier.'], ['Second.']]);
});

test('CA-03 — une ligne faite d’espaces compte comme vide, plusieurs lignes vides = un seul saut', () => {
  assert.deepEqual(splitParagraphs('Un.\n  \t \n\n \nDeux.'), [['Un.'], ['Deux.']]);
});

test('CA-03 — lignes vides en début et en fin ignorées, fins de ligne Windows acceptées', () => {
  assert.deepEqual(splitParagraphs('\r\n\r\nA\r\nB\r\n\r\n'), [['A', 'B']]);
});

test('CA-04 — une adresse email devient un lien mailto:', () => {
  assert.deepEqual(linkify('Écrivez à contact@maisondetara.com'), [
    { type: 'text', text: 'Écrivez à ' },
    { type: 'link', text: 'contact@maisondetara.com', href: 'mailto:contact@maisondetara.com' },
  ]);
});

test('CA-04 — la ponctuation qui suit une adresse reste hors du lien', () => {
  for (const ponctuation of ['.', ',', ';', ':', '!', '?', ')', '»', ').']) {
    const parts = linkify(`à contact@maisondetara.com${ponctuation} Merci`);
    assert.deepEqual(parts[1], {
      type: 'link',
      text: 'contact@maisondetara.com',
      href: 'mailto:contact@maisondetara.com',
    }, `email suivi de « ${ponctuation} »`);
    const web = linkify(`voir https://www.cnil.fr/fr${ponctuation} Merci`);
    assert.deepEqual(web[1], { type: 'link', text: 'https://www.cnil.fr/fr', href: 'https://www.cnil.fr/fr' }, `url suivie de « ${ponctuation} »`);
    assert.equal(web[2].text.startsWith(ponctuation), true);
  }
});

test('CA-04 — http:// et https:// deviennent des liens, pas cnil.fr ni www.…', () => {
  assert.deepEqual(linkify('http://exemple.fr'), [{ type: 'link', text: 'http://exemple.fr', href: 'http://exemple.fr' }]);
  assert.deepEqual(linkify('Saisir la CNIL (cnil.fr) ou www.cnil.fr'), [
    { type: 'text', text: 'Saisir la CNIL (cnil.fr) ou www.cnil.fr' },
  ]);
});

test('CA-04 — aucun autre protocole ne devient un lien (javascript:, data:)', () => {
  assert.deepEqual(linkify('javascript:alert(1) data:text/html,x'), [
    { type: 'text', text: 'javascript:alert(1) data:text/html,x' },
  ]);
});

test('CA-04 — du HTML saisi reste du texte (morceaux texte, jamais interprétés)', () => {
  assert.deepEqual(linkify('<b>gras</b> <script>x</script>'), [{ type: 'text', text: '<b>gras</b> <script>x</script>' }]);
});

test('CA-04 — plusieurs liens dans une même ligne', () => {
  const parts = linkify('a@b.fr ou https://x.fr');
  assert.deepEqual(parts.map((p) => p.type), ['link', 'text', 'link']);
  assert.equal(parts[1].text, ' ou ');
});
