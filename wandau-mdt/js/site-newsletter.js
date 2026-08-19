// js/site-newsletter.js — Inscription newsletter (double opt-in géré côté Brevo/app admin).
// Remplace forms-supabase.js/submissions (jamais activé) — cf. plan Brevo du 19/08.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

const form = document.getElementById('newsletterForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('[type="submit"]');
    const email = form.email.value.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (msg) msg.textContent = "Merci d'indiquer une adresse email valide.";
      return;
    }
    if (!CONFIGURED) {
      if (msg) msg.textContent = 'Le formulaire sera actif très bientôt.';
      return;
    }

    if (btn) btn.disabled = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/subscribe_newsletter`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_email: email }),
      });
      if (msg) {
        msg.textContent = res.ok
          ? 'Merci ! Vérifiez votre boîte mail pour confirmer votre inscription.'
          : 'Une erreur est survenue, merci de réessayer.';
      }
      if (res.ok) form.reset();
    } catch (err) {
      if (msg) msg.textContent = 'Une erreur est survenue, merci de réessayer.';
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
