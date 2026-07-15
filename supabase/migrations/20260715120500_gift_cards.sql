-- 0006 — Bons cadeaux (type « session » ou « montant ») + utilisations
-- Deux types : « session » (expérience à prix fixe, usage unique) et « montant » (utilisable en
-- boutique/café/atelier, avec suivi de solde). Achat en ligne (Monetico), utilisation SUR PLACE
-- (Tara saisit le code dans l'admin → marque utilisé / décompte le solde). Validité légale FR.

create type public.gift_card_type as enum ('session', 'montant');
create type public.gift_card_status as enum ('active', 'used', 'expired', 'cancelled');

create table public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  gift_type public.gift_card_type not null,
  label text,                          -- type 'session' : ex. "Une session atelier"
  initial_amount_cents integer check (initial_amount_cents is null or initial_amount_cents >= 0),
  balance_cents integer check (balance_cents is null or balance_cents >= 0),
  status public.gift_card_status not null default 'active',
  valid_until date not null,           -- durée de validité (obligation légale FR)
  purchaser_name text,
  purchaser_email text,
  recipient_name text,
  message text,
  payment_id uuid references public.payments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_card_shape check (
    (gift_type = 'montant' and initial_amount_cents is not null and balance_cents is not null)
    or (gift_type = 'session' and label is not null)
  )
);

create index gift_cards_status_idx on public.gift_cards (status);

create trigger trg_gift_cards_updated_at
  before update on public.gift_cards
  for each row execute function public.set_updated_at();

create table public.gift_card_redemptions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid not null references public.gift_cards (id) on delete cascade,
  amount_cents integer check (amount_cents is null or amount_cents >= 0), -- null pour type 'session'
  note text,
  redeemed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index gcr_gift_idx on public.gift_card_redemptions (gift_card_id);

alter table public.gift_cards enable row level security;
alter table public.gift_card_redemptions enable row level security;

create policy "gift_cards: le staff gère tout"
  on public.gift_cards for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "gift_card_redemptions: le staff gère tout"
  on public.gift_card_redemptions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
