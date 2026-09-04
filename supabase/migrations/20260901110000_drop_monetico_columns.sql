-- 0015 — Retrait de Monetico (jamais activé, remplacé par Stripe le 01/09)
-- app/src/lib/monetico/ (signature HMAC) est supprimé du dépôt dans le même commit. La table
-- `payments` reste : conçue dès l'origine pour deux usages (kind: reservation_deposit |
-- gift_card, voir 0002), les acomptes de réservation sont maintenant sur reservations
-- directement (0013) mais les bons cadeaux restent un usage prévu (cadrage admin Tara §2) —
-- seules les deux colonnes propres à Monetico disparaissent, le reste (id/kind/reference/
-- amount_cents/currency/status/paid_at) est générique et réutilisable pour Stripe.

alter table public.payments
  drop column monetico_code_retour,
  drop column monetico_payload;

comment on table public.payments is
  'Ledger de paiements générique (acomptes de réservation historiques + bons cadeaux). '
  'Monetico retiré le 01/09 (jamais activé, remplacé par Stripe) ; les acomptes de réservation '
  'payés en ligne vivent désormais directement sur reservations (stripe_checkout_session_id).';
