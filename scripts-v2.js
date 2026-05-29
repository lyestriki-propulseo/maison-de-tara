/* ============================================================================
   MAISON DE TARA — V2 SCRIPTS
   ----------------------------------------------------------------------------
   Changelog V0 → V1 :
   - JS modularisé en IIFEs (mobileMenu, heroTabs, scrollObserver, newsletter)
   - Mobile menu : drawer overlay avec trap focus + fermeture clavier (Échap)
   - Hero tabs ambitieux : changement complet d'univers (titre + lead + booking
     variant + data-attribute pour CSS pilote du background)
   - Scroll observer : ajoute .is-visible à .fade-in dans le viewport
   - Newsletter : feedback simulé (succès) sans backend
   - Toutes les fonctions respectent prefers-reduced-motion via CSS
   ============================================================================ */

(function () {
  'use strict';

  document.documentElement.classList.add('js-active');

  /* ==========================================================================
     MOBILE MENU — drawer overlay avec trap focus + Échap
     ========================================================================== */
  const mobileMenu = (() => {
    const drawer = document.getElementById('drawer');
    const burger = document.querySelector('.burger');
    if (!drawer || !burger) return { init() {} };

    const focusableSelector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    let previousFocus = null;

    function open() {
      previousFocus = document.activeElement;
      drawer.hidden = false;
      // force reflow so the transition kicks in
      void drawer.offsetWidth;
      drawer.classList.add('is-open');
      document.body.classList.add('is-drawer-open');
      burger.setAttribute('aria-expanded', 'true');

      // Focus first link in drawer
      const firstFocusable = drawer.querySelector(focusableSelector);
      if (firstFocusable) firstFocusable.focus();
    }

    function close() {
      drawer.classList.remove('is-open');
      document.body.classList.remove('is-drawer-open');
      burger.setAttribute('aria-expanded', 'false');

      // Wait for transition then hide entirely (a11y)
      setTimeout(() => {
        drawer.hidden = true;
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
      }, 300);
    }

    function trapFocus(e) {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key !== 'Tab') return;

      const focusables = drawer.querySelectorAll(focusableSelector);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    return {
      init() {
        burger.addEventListener('click', open);

        drawer.querySelectorAll('[data-drawer-close]').forEach(el => {
          el.addEventListener('click', close);
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
        });

        document.addEventListener('keydown', trapFocus);

        // Close on resize to desktop (avoid stuck drawer)
        window.addEventListener('resize', () => {
          if (window.innerWidth > 900 && drawer.classList.contains('is-open')) close();
        });
      }
    };
  })();

  /* ==========================================================================
     HERO TABS — changement complet d'univers (titre, lead, booking, background)
     ========================================================================== */
  const heroTabs = (() => {
    const hero = document.querySelector('.hero');
    const content = hero ? hero.querySelector('.hero__content') : null;
    const tabs = document.querySelectorAll('.hero__tab');
    const titleEl = document.querySelector('.hero__title');
    const leadEl = document.querySelector('.hero__lead');
    const bookingVariants = document.querySelectorAll('[data-booking-variant]');

    if (!hero || !content || !tabs.length || !titleEl || !leadEl) {
      return { init() {} };
    }

    const variants = {
      atelier: {
        title: 'Atelier céramique, café & boutique <em>d\'inspiration indienne</em>.',
        lead: 'Maison de Tara réunit peinture sur céramique, café de quartier et objets choisis dans une maison vivante à La Garenne-Colombes.'
      },
      cafe: {
        title: 'Un café de quartier, <em>sans réservation</em>.',
        lead: 'Cafés, thés, pâtisseries du jour et petites assiettes artisanales. On s\'y attable pendant qu\'une pièce sèche, ou simplement pour ralentir.'
      },
      boutique: {
        title: 'Des objets choisis pour <em>prolonger la Maison</em>.',
        lead: 'Textiles block print, lampes, céramiques et pièces de décoration indienne. Une sélection confidentielle à découvrir sur place, saison après saison.'
      }
    };

    function showVariant(tabKey) {
      // Fade out title + lead
      content.classList.add('is-fading');

      // Switch background via data attribute (CSS handles transition)
      hero.setAttribute('data-tab', tabKey);

      // Switch booking variant immediately (it's offscreen-ish)
      bookingVariants.forEach(el => {
        el.hidden = el.getAttribute('data-booking-variant') !== tabKey;
      });

      // After fade out, swap content + fade in
      setTimeout(() => {
        const v = variants[tabKey];
        if (v) {
          titleEl.innerHTML = v.title;
          leadEl.textContent = v.lead;
        }
        content.classList.remove('is-fading');
      }, 280);
    }

    function activate(tab) {
      tabs.forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      showVariant(tab.dataset.tab);
    }

    return {
      init() {
        tabs.forEach(tab => {
          tab.addEventListener('click', () => activate(tab));
          tab.addEventListener('keydown', (e) => {
            // Arrow keys navigation between tabs (a11y)
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              e.preventDefault();
              const arr = Array.from(tabs);
              const idx = arr.indexOf(tab);
              const next = e.key === 'ArrowRight'
                ? (idx + 1) % arr.length
                : (idx - 1 + arr.length) % arr.length;
              arr[next].focus();
              activate(arr[next]);
            }
          });
        });
      }
    };
  })();

  /* ==========================================================================
     SCROLL OBSERVER — fade-in au scroll
     (le stagger est piloté côté CSS via --stagger-index)
     ========================================================================== */
  const scrollObserver = (() => {
    const targets = document.querySelectorAll('.fade-in');
    if (!targets.length || !('IntersectionObserver' in window)) {
      // Fallback : tout visible immédiatement
      targets.forEach(t => t.classList.add('is-visible'));
      return { init() {} };
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target); // animation one-shot
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -80px 0px'
    });

    return {
      init() {
        targets.forEach(t => observer.observe(t));
      }
    };
  })();

  /* ==========================================================================
     NEWSLETTER — feedback simulé (pas de backend en V1)
     ========================================================================== */
  const newsletter = (() => {
    const form = document.querySelector('.newsletter__form');
    const feedback = document.querySelector('.newsletter__feedback');
    if (!form || !feedback) return { init() {} };

    return {
      init() {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const input = form.querySelector('input[type="email"]');
          const value = input.value.trim();
          const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

          if (!isValid) {
            feedback.textContent = 'Cette adresse ne semble pas valide — pouvez-vous vérifier ?';
            feedback.style.color = 'var(--mdt-terracotta)';
            feedback.classList.add('is-visible');
            return;
          }

          feedback.textContent = 'Merci. Vous recevrez notre première lettre très bientôt.';
          feedback.style.color = '';
          feedback.classList.add('is-visible');
          input.value = '';
        });
      }
    };
  })();

  /* ==========================================================================
     INIT
     ========================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    mobileMenu.init();
    heroTabs.init();
    scrollObserver.init();
    newsletter.init();
  });

})();

/* ============================================================================
   TODO V2 (hors scope V1) :
   - Backend booking (le formulaire est non-fonctionnel, juste visuel)
   - Backend newsletter (intégration Brevo/Resend prévue en stack V3)
   - Lightbox sur la galerie (clic = ouverture image en grand)
   - Calendrier complet (cliquer sur "Voir tout le calendrier")
   - Form de réservation : validation côté serveur + emails de confirmation
   ============================================================================ */
