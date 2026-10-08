// js/content-format.js — Mise en forme du texte brut saisi par Tara dans /admin/contenu pour le mode
// data-mdt-mode="texte" (pages légales, US-002) : ligne vide = nouveau paragraphe, retour à la
// ligne = <br>, emails et adresses http(s):// = liens. Fonctions pures testées dans
// tests/content-format.test.mjs ; le rendu DOM n'utilise jamais innerHTML (nœuds texte seulement),
// donc du HTML saisi s'affiche tel quel, sans être interprété.

// Une adresse web http(s) ou un email. Tout autre protocole (javascript:, data:…) reste du texte.
const LINK = /(https?:\/\/[^\s<>"]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g;
// Ponctuation collée à la fin d'une adresse, laissée hors du lien (« écrivez à a@b.fr. »).
const TRAILING = /[.,;:!?)»]+$/;

/** Découpe un texte en paragraphes (séparés par au moins une ligne vide), chacun en lignes. */
export function splitParagraphs(text) {
  const paragraphs = [];
  let current = [];
  for (const line of String(text).split(/\r\n|\r|\n/)) {
    const clean = line.trim();
    if (clean) current.push(clean);
    else if (current.length) {
      paragraphs.push(current);
      current = [];
    }
  }
  if (current.length) paragraphs.push(current);
  return paragraphs;
}

/** Découpe une ligne en morceaux { type: 'text', text } et { type: 'link', text, href }. */
export function linkify(line) {
  const parts = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const address = match[0].replace(TRAILING, '');
    if (match.index > last) parts.push({ type: 'text', text: line.slice(last, match.index) });
    parts.push({ type: 'link', text: address, href: match[1] ? address : 'mailto:' + address });
    last = match.index + address.length;
  }
  if (last < line.length) parts.push({ type: 'text', text: line.slice(last) });
  return parts;
}

/** Remplace le contenu de `el` par le texte mis en forme (paragraphes, <br>, liens). */
export function renderTexte(el, text) {
  const doc = el.ownerDocument;
  const paragraphs = splitParagraphs(text).map((lines) => {
    const p = doc.createElement('p');
    lines.forEach((line, i) => {
      if (i) p.appendChild(doc.createElement('br'));
      for (const part of linkify(line)) {
        if (part.type === 'text') {
          p.appendChild(doc.createTextNode(part.text));
          continue;
        }
        const a = doc.createElement('a');
        a.href = part.href;
        a.textContent = part.text;
        // Marqueur : site-content.js ne réécrit pas ces liens avec l'email des Coordonnées.
        a.dataset.mdtAutolink = '';
        if (!part.href.startsWith('mailto:')) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        p.appendChild(a);
      }
    });
    return p;
  });
  el.replaceChildren(...paragraphs);
}
