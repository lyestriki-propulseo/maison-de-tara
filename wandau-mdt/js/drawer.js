// Drawer (menu mobile) — autonome, sans dépendance.
// Chargé par scripts.html (pages éditoriales) ET scripts-min.html (calendrier / lab).
(function () {
  var drawer = document.getElementById('drawer');
  var burger = document.querySelector('.burger');
  if (!drawer || !burger) return;

  var focusableSelector = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
  var previousFocus = null;

  function open() {
    previousFocus = document.activeElement;
    drawer.hidden = false;
    void drawer.offsetWidth;
    drawer.classList.add('is-open');
    document.body.classList.add('is-drawer-open');
    burger.setAttribute('aria-expanded', 'true');
    var first = drawer.querySelector(focusableSelector);
    if (first) first.focus();
  }
  function close() {
    drawer.classList.remove('is-open');
    document.body.classList.remove('is-drawer-open');
    burger.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      drawer.hidden = true;
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    }, 300);
  }
  burger.addEventListener('click', open);
  drawer.querySelectorAll('[data-drawer-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900 && drawer.classList.contains('is-open')) close();
  });
})();
