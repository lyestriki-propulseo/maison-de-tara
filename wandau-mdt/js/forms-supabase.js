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

export function bindForm(formEl, type) {
  if (!formEl) return;
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = formEl.querySelector('.form-msg') || formEl;
    const btn = formEl.querySelector('[type="submit"]');

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
