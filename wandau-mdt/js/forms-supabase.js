// Soumission des formulaires vers Supabase (table `submissions`, insert-only via RLS).
// Robuste tant que Supabase n'est pas configuré : import dynamique du SDK (aucun appel réseau
// avant configuration) + message clair. À activer en remplaçant les placeholders de supabase-config.js.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED = /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);

let clientPromise = null;
function getClient() {
  if (!clientPromise) {
    clientPromise = import('https://esm.sh/@supabase/supabase-js@2')
      .then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return clientPromise;
}

// Validation douce côté client (les formulaires sont en novalidate) :
// champs requis non vides + email plausible. Retourne le message d'erreur, ou ''.
function validate(formEl) {
  const missing = [...formEl.querySelectorAll('[required]')].filter((el) => {
    if (el.type === 'radio') return !formEl.querySelector(`[name="${el.name}"]:checked`);
    return !el.value.trim();
  });
  // champ date du sélecteur maison (input hidden, required natif inopérant)
  const date = formEl.querySelector('input[name="date"][type="hidden"]');
  if (date && !date.value) missing.push(date);
  if (missing.length) return 'Il manque quelques informations : merci de compléter les champs avant d\'envoyer.';
  const email = formEl.querySelector('input[type="email"]');
  if (email && email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) {
    return 'L\'adresse email ne semble pas valide, pouvez-vous la vérifier ?';
  }
  return '';
}

export function bindForm(formEl, type) {
  if (!formEl) return;
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = formEl.querySelector('.form-msg') || formEl;
    const btn = formEl.querySelector('[type="submit"]');

    const problem = validate(formEl);
    if (problem) {
      msg.textContent = problem;
      return;
    }

    if (!CONFIGURED) {
      msg.textContent = 'Le formulaire sera actif très bientôt. En attendant, écrivez-nous à contact@maisondetara.com.';
      return;
    }

    if (btn) btn.disabled = true;
    try {
      const sb = await getClient();
      const payload = Object.fromEntries(new FormData(formEl).entries());
      const { error } = await sb.from('submissions').insert({ type, payload });
      msg.textContent = error
        ? 'Une erreur est survenue, merci de réessayer.'
        : 'Merci, votre message est bien envoyé.';
      if (!error) formEl.reset();
    } catch (err) {
      msg.textContent = 'Une erreur est survenue, merci de réessayer.';
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
