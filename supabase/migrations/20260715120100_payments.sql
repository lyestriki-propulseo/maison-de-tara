-- 0002 — Paiements Monetico (acomptes de réservation + achats de bons cadeaux)
-- Table centrale des transactions Monetico. Alimentée par le webhook (phase 2) côté serveur
-- via la clé service_role (qui contourne la RLS). Idempotence : `reference` unique + payload brut.

create type public.payment_kind as enum ('reservation_deposit', 'gift_card');
create type public.payment_status as enum ('pending', 'paid', 'refused');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kind public.payment_kind not null,
  -- Champ Monetico `reference` (≤ 12 caractères alphanum), unique côté commerçant
  reference text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'EUR',
  status public.payment_status not null default 'pending',
  -- Retour Monetico (phase 2)
  monetico_code_retour text,          -- 'paiement' | 'payetest' | 'Annulation' | 'paiement_pfN'...
  monetico_payload jsonb,             -- notification brute reçue (audit + idempotence)
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_status_idx on public.payments (status);
create index payments_kind_idx on public.payments (kind);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

alter table public.payments enable row level security;

-- Aucune écriture par anon/authenticated : tout passe par le serveur (service_role bypass RLS).
create policy "payments: le staff lit"
  on public.payments for select to authenticated
  using (public.is_staff());
