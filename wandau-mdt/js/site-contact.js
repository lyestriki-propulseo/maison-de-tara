// js/site-contact.js — Contact + privatisation, un seul formulaire avec sélecteur de mode.
// Remplace forms-supabase.js/submissions (jamais activé) — cf. plan Brevo du 19/08.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const CONFIGURED =
  /^https:\/\/[^<]+\.supabase\.co/.test(SUPABASE_URL) && !/[<>]/.test(SUPABASE_ANON_KEY);
const HEADERS = { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY };

const form = document.getElementById('contactForm');
if (form) initContactForm(form);

function initContactForm(form) {
  const privaBox = document.getElementById('cf-privatisation');
  const msg = form.querySelector('.form-msg');
  const submitBtn = form.querySelector('[type="submit"]');

  function toggleMode() {
    privaBox.hidden = form.mode.value !== 'privatisation';
  }
  form.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', toggleMode));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = form.mode.value;
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();
    const sujet = form.sujet.value.trim();
    const message = form.message.value.trim();

    if (!nom || !message) {
      setMsg('Merci de compléter votre nom et votre message.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setMsg("Merci d'indiquer une adresse email valide.");
      return;
    }
    if (!CONFIGURED) {
      setMsg('Le formulaire sera actif très bientôt.');
      return;
    }

    const fullMessage = sujet ? `${sujet}\n\n${message}` : message;

    submitBtn.disabled = true;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_request`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          p_request_type: mode,
          p_name: nom,
          p_email: email,
          p_phone: mode === 'privatisation' ? form.telephone.value.trim() || null : null,
          p_message: fullMessage,
          p_party_size: mode === 'privatisation' && form.personnes.value ? Number(form.personnes.value) : null,
          p_desired_date: mode === 'privatisation' ? form.date.value || null : null,
          p_event_type: mode === 'privatisation' ? form.typeEvenement.value : null,
        }),
      });
      const data = await res.json().catch(() => null);
      setMsg(
        res.ok
          ? 'Merci, votre message est bien envoyé.'
          : (data && data.message) || 'Une erreur est survenue, merci de réessayer.',
      );
      if (res.ok) {
        form.reset();
        privaBox.hidden = true;
      }
    } catch (err) {
      setMsg('Une erreur est survenue, merci de réessayer.');
    } finally {
      submitBtn.disabled = false;
    }
  });

  function setMsg(text) {
    if (msg) msg.textContent = text;
  }
}
