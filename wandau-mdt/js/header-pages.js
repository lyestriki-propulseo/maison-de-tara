// header-pages.js — pages intérieures (hero clair, scroll natif) :
// header transparent tout en haut de page, fond beige dès qu'on défile.
// Même esprit que l'accueil (scripts.js), mais sans Locomotive ni inversion
// du logo : le hero des pages intérieures est clair, le texte reste encre.
(function () {
  document.body.classList.add('hero-clair');
  function apply() {
    document.body.classList.toggle('is-scrolled', (window.pageYOffset || document.documentElement.scrollTop || 0) > 8);
  }
  window.addEventListener('scroll', apply, { passive: true });
  apply();
})();
