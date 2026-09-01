# Paiement Stripe des réservations — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Les réservations en ligne (atelier + événements) sont payées par carte via Stripe Checkout avant d'être créées en base ; remplace le tunnel actuel qui créait la réservation en `pending` sans paiement.

**Architecture:** Le site statique (`wandau-mdt`, aucun serveur) appelle un nouvel endpoint sur l'app admin (seul endroit où la clé secrète Stripe peut vivre) qui crée une session Stripe Checkout et redirige le client. Stripe notifie le paiement réussi via un webhook sur l'app admin, qui crée alors la réservation directement en `confirmed` via une nouvelle fonction Postgres réservée au service_role. `book_reservation` (l'ancien guichet anon) est retiré du chemin public.

**Tech Stack:** TanStack Start (app admin), Supabase/Postgres (RPC SECURITY DEFINER), Stripe (npm `stripe`, Checkout + Webhooks), site statique vanilla JS.

**Spec:** `docs/superpowers/specs/2026-09-01-stripe-reservations-design.md`

## Global Constraints

- Développement et vérification entièrement en **mode test Stripe** (`sk_test_`/`pk_test_`, carte `4242 4242 4242 4242`). Ne jamais utiliser les clés `sk_live_`/`pk_live_` avant une bascule explicite, décidée à part.
- Aucune valeur de clé (test ou live) ne doit jamais apparaître en clair dans une sortie de commande, un commit, ou un fichier suivi par git.
- Pas de remboursement ni de changement de date automatisés — hors périmètre (voir spec).
- `payments` (table Monetico) et `app/src/lib/monetico/` restent en l'état, non touchés.
- Suivre les conventions existantes : fichiers API en `createFileRoute` + `server.handlers` (pas `createServerFn`, réservé aux pages de l'admin elle-même) ; appels API externes en `fetch()` nu sauf justification de sécurité (Stripe : le SDK officiel est utilisé pour la vérification de signature webhook, qui ne doit jamais être réimplémentée à la main).

---

### Task 1: Migration — schéma paiement Stripe + retrait de `book_reservation`

**Files:**
- Create: `supabase/migrations/20260901090000_stripe_reservations.sql`
- Modify: `app/src/types/database.types.ts` (régénéré, pas édité à la main)

**Interfaces:**
- Produces: colonnes `reservations.stripe_checkout_session_id` (text, unique, nullable), `reservations.stripe_payment_intent_id` (text, nullable), `reservations.paid_at` (timestamptz, nullable) ; fonction `public.confirm_reservation_payment(p_session_instance_id uuid, p_event_id uuid, p_party_size integer, p_customer_name text, p_customer_email text, p_customer_phone text, p_stripe_checkout_session_id text, p_stripe_payment_intent_id text, p_amount_cents integer) returns uuid`, exécutable par `service_role` uniquement.

- [ ] **Step 1: Écrire la migration**

```sql
-- 0013 — Paiement Stripe des réservations (remplace Monetico, jamais activé)
-- Voir docs/superpowers/specs/2026-09-01-stripe-reservations-design.md pour le détail des
-- décisions. Résumé : paiement d'abord (Stripe Checkout), réservation créée seulement au
-- webhook confirmé, champs de paiement directement sur `reservations` (pas de table `payments`
-- séparée — aucun autre usage aujourd'hui, `payment_id` n'a jamais été peuplé). book_reservation
-- est retiré du chemin public : remplacé par confirm_reservation_payment, service_role only.

alter table public.reservations drop column payment_id;

alter table public.reservations
  add column stripe_checkout_session_id text unique,
  add column stripe_payment_intent_id text,
  add column paid_at timestamptz;

comment on column public.reservations.stripe_checkout_session_id is
  'Identifiant de la session Stripe Checkout ayant payé cette réservation. Unique : sert de clé '
  'd''idempotence si Stripe renvoie le même événement webhook plusieurs fois.';

create or replace function public.confirm_reservation_payment(
  p_session_instance_id uuid,
  p_event_id uuid,
  p_party_size integer,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_stripe_checkout_session_id text,
  p_stripe_payment_intent_id text,
  p_amount_cents integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_status public.slot_status;
begin
  if (p_session_instance_id is not null)::int + (p_event_id is not null)::int <> 1 then
    raise exception 'Cible de réservation invalide' using errcode = 'check_violation';
  end if;

  if p_party_size is null or p_party_size < 1 or p_party_size > 20 then
    raise exception 'Nombre de personnes invalide' using errcode = 'check_violation';
  end if;

  if p_customer_name is null or btrim(p_customer_name) = '' then
    raise exception 'Nom requis' using errcode = 'check_violation';
  end if;

  if p_customer_email is null or p_customer_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;

  if p_stripe_checkout_session_id is null or btrim(p_stripe_checkout_session_id) = '' then
    raise exception 'Session Stripe manquante' using errcode = 'check_violation';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'Montant invalide' using errcode = 'check_violation';
  end if;

  if p_session_instance_id is not null then
    select status into v_status
      from public.session_instances
      where id = p_session_instance_id and session_date >= current_date;
    if not found or v_status <> 'open' then
      raise exception 'Créneau introuvable ou fermé' using errcode = 'check_violation';
    end if;
  else
    if not exists (
      select 1 from public.events
      where id = p_event_id and published = true and starts_at >= now()
    ) then
      raise exception 'Événement introuvable ou non publié' using errcode = 'check_violation';
    end if;
  end if;

  begin
    insert into public.reservations
      (session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone,
       status, source, deposit_amount_cents,
       stripe_checkout_session_id, stripe_payment_intent_id, paid_at)
    values
      (p_session_instance_id, p_event_id, p_party_size, btrim(p_customer_name),
       lower(btrim(p_customer_email)), nullif(btrim(p_customer_phone), ''),
       'confirmed', 'online', p_amount_cents,
       p_stripe_checkout_session_id, p_stripe_payment_intent_id, now())
    returning id into v_id;
  exception
    when unique_violation then
      -- Webhook Stripe redélivré (at-least-once) : on renvoie l'id déjà créé, sans dupliquer.
      select id into v_id from public.reservations
        where stripe_checkout_session_id = p_stripe_checkout_session_id;
  end;

  return v_id;
end;
$$;

revoke all on function public.confirm_reservation_payment(uuid, uuid, integer, text, text, text, text, text, integer) from public;
grant execute on function public.confirm_reservation_payment(uuid, uuid, integer, text, text, text, text, text, integer) to service_role;

-- book_reservation : retiré du chemin public. Les réservations en ligne payantes passent
-- maintenant par confirm_reservation_payment (webhook uniquement). La fonction reste en base
-- (inoffensive, plus jamais appelable par anon) : la retirer complètement viendra si on est
-- sûr qu'aucun usage résiduel (résa manuelle sans paiement, etc.) n'en dépendra jamais.
revoke execute on function public.book_reservation(uuid, uuid, integer, text, text, text) from anon;
```

- [ ] **Step 2: Appliquer la migration sur la base de développement**

Run: `cd app && node scripts/apply-one-migration.mjs 20260901090000_stripe_reservations.sql`
Expected: le script affiche un succès, sans erreur SQL.

- [ ] **Step 3: Régénérer les types TypeScript**

Run: `cd app && node scripts/gen-types.mjs`
Expected: `src/types/database.types.ts` change — le type `reservations` gagne `stripe_checkout_session_id`, `stripe_payment_intent_id`, `paid_at` et perd `payment_id`.

- [ ] **Step 4: Vérifier que le typecheck du reste du projet passe toujours**

Run: `cd app && pnpm typecheck`
Expected: PASS (si `payment_id` était utilisé ailleurs, ça casse ici — vérifier et corriger avant de continuer).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260901090000_stripe_reservations.sql app/src/types/database.types.ts
git commit -m "feat(db): schéma paiement Stripe des réservations + retrait de book_reservation du chemin public"
```

---

### Task 2: Client Stripe + variables d'environnement

**Files:**
- Modify: `app/package.json` (ajoute `stripe`)
- Modify: `app/src/env.ts`
- Create: `app/src/lib/stripe/client.ts`
- Modify: `app/.env` (local, jamais committé — bascule les clés canoniques sur les valeurs de test)

**Interfaces:**
- Produces: `env.STRIPE_SECRET_KEY`, `env.STRIPE_PUBLISHABLE_KEY`, `env.STRIPE_WEBHOOK_SECRET` (server-only, comme `SUPABASE_SERVICE_ROLE_KEY`) ; `stripeClient(): Stripe` dans `lib/stripe/client.ts`.

- [ ] **Step 1: Ajouter la dépendance**

```bash
cd app && pnpm add stripe@22.6.0
```

- [ ] **Step 2: Étendre le schéma d'environnement**

Modifier `app/src/env.ts` — ajouter dans le bloc `server` (après `BREVO_NEWSLETTER_LIST_ID`) :

```typescript
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_PUBLISHABLE_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
```

- [ ] **Step 3: Créer le client Stripe**

`app/src/lib/stripe/client.ts` :

```typescript
import Stripe from 'stripe'
import { env } from '@/env'

let cached: Stripe | null = null

export function stripeClient(): Stripe {
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY)
  }
  return cached
}
```

- [ ] **Step 4: Basculer `.env` local sur les clés de test (jamais les clés live pendant le développement)**

Éditer `app/.env` à la main : donner à `STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` les mêmes valeurs que `STRIPE_TEST_SECRET` / `STRIPE_TEST_PUBLISHABLE` (déjà présentes). Ajouter une ligne `STRIPE_WEBHOOK_SECRET=` (vide pour l'instant, remplie en Task 7 une fois le webhook enregistré côté Stripe). Garder `STRIPE_TEST_SECRET`/`STRIPE_TEST_PUBLISHABLE` tels quels en réserve, et ne PAS supprimer les valeurs live — elles servent à la bascule finale, hors périmètre de ce plan.

- [ ] **Step 5: Vérifier que l'app démarre toujours**

Run: `cd app && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/pnpm-lock.yaml app/src/env.ts app/src/lib/stripe/client.ts
git commit -m "feat(admin): dépendance et client Stripe"
```

(`app/.env` n'est jamais committé — vérifier `git status` ne le montre pas avant de committer.)

---

### Task 3: Endpoint de création de session Checkout

**Files:**
- Create: `app/src/routes/api.reservations.checkout.ts`
- Test: `app/src/routes/api.reservations.checkout.test.ts`

**Interfaces:**
- Consumes: `stripeClient()` (Task 2), `supabaseAdmin()` (`@/lib/supabase/admin`, existant), RPC Postgres `check_availability(p_session_instance_id, p_event_id, p_party_size)` (existant, anon-callable, `supabaseAdmin` peut aussi l'appeler).
- Produces: `POST /api/reservations/checkout` — body `{ mode: 'atelier'|'evenement', targetId: string, partySize: number, customerName: string, customerEmail: string, customerPhone?: string }`, réponse `{ url: string }` (URL Stripe Checkout à suivre) ou erreur `{ message: string }`.

- [ ] **Step 1: Écrire le fichier**

```typescript
import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'

const SITE_ORIGIN = 'https://maisondetara.propulseo-site.com'

const bodySchema = z.object({
  mode: z.enum(['atelier', 'evenement']),
  targetId: z.uuid(),
  partySize: z.number().int().min(1).max(20),
  customerName: z.string().trim().min(1),
  customerEmail: z.email(),
  customerPhone: z.string().trim().optional(),
})

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': SITE_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

export async function checkoutHandler(request: Request): Promise<Response> {
  const payload: unknown = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(payload)
  if (!parsed.success) return json({ message: 'Requête invalide' }, 400)
  const { mode, targetId, partySize, customerName, customerEmail, customerPhone } = parsed.data

  const db = supabaseAdmin()
  const sessionInstanceId = mode === 'atelier' ? targetId : null
  const eventId = mode === 'evenement' ? targetId : null

  const { data: available, error: availError } = await db.rpc('check_availability', {
    p_session_instance_id: sessionInstanceId,
    p_event_id: eventId,
    p_party_size: partySize,
  })
  if (availError) return json({ message: 'Impossible de vérifier la disponibilité' }, 500)
  if (!available) {
    return json(
      { message: 'Il ne reste plus assez de places pour ce nombre de personnes. Merci de choisir un autre créneau.' },
      409,
    )
  }

  let amountCents: number
  let label: string
  if (mode === 'atelier') {
    amountCents = 600 * partySize
    label = 'Atelier libre — Maison de Tara'
  } else {
    const { data: event, error: eventError } = await db
      .from('events')
      .select('title, deposit_enabled, deposit_amount_cents')
      .eq('id', targetId)
      .eq('published', true)
      .maybeSingle()
    if (eventError) return json({ message: 'Impossible de charger l\u2019événement' }, 500)
    if (!event) return json({ message: 'Événement introuvable ou non publié' }, 404)
    amountCents = event.deposit_enabled && event.deposit_amount_cents ? event.deposit_amount_cents * partySize : 0
    label = `${event.title} — Maison de Tara`
  }

  const metadata = {
    mode,
    sessionInstanceId: sessionInstanceId ?? '',
    eventId: eventId ?? '',
    partySize: String(partySize),
    customerName,
    customerEmail,
    customerPhone: customerPhone ?? '',
  }

  if (amountCents === 0) {
    // Acompte désactivé sur cet événement : pas de paiement à prendre, réservation confirmée
    // directement (même fonction que le webhook, montant 0).
    const { data: id, error } = await db.rpc('confirm_reservation_payment', {
      p_session_instance_id: sessionInstanceId,
      p_event_id: eventId,
      p_party_size: partySize,
      p_customer_name: customerName,
      p_customer_email: customerEmail,
      p_customer_phone: customerPhone ?? null,
      p_stripe_checkout_session_id: `free-${crypto.randomUUID()}`,
      p_stripe_payment_intent_id: null,
      p_amount_cents: 0,
    })
    if (error) return json({ message: error.message }, 400)
    return json({ url: `${SITE_ORIGIN}/confirmation-reservation.html?id=${id}` })
  }

  const stripe = stripeClient()
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          unit_amount: amountCents,
          product_data: { name: label },
        },
        quantity: 1,
      },
    ],
    customer_email: customerEmail,
    metadata,
    success_url: `${SITE_ORIGIN}/confirmation-reservation.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_ORIGIN}/atelier.html?paiement=annule#reserver`,
  })

  if (!session.url) return json({ message: 'Stripe n\u2019a pas renvoyé de lien de paiement' }, 500)
  return json({ url: session.url })
}

export const Route = createFileRoute('/api/reservations/checkout')({
  server: {
    handlers: {
      POST: ({ request }) => checkoutHandler(request),
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
    },
  },
})
```

- [ ] **Step 2: Écrire les tests**

```typescript
// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
  vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_x')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/supabase/admin')
  vi.doUnmock('@/lib/stripe/client')
})

function request(body: unknown) {
  return new Request('http://localhost/api/reservations/checkout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

const validBody = {
  mode: 'atelier' as const,
  targetId: '11111111-1111-1111-1111-111111111111',
  partySize: 2,
  customerName: 'Alice',
  customerEmail: 'alice@example.com',
}

test('400 sur un body invalide', async () => {
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request({ mode: 'atelier' }))
  expect(res.status).toBe(400)
})

test('409 si plus de disponibilité', async () => {
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: vi.fn().mockResolvedValue({ data: false, error: null }) }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(409)
})

test('200 et url Stripe si disponible (atelier, 6€/pers)', async () => {
  const createMock = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: vi.fn().mockResolvedValue({ data: true, error: null }) }),
  }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({ checkout: { sessions: { create: createMock } } }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(request(validBody))
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.url).toBe('https://checkout.stripe.com/test-session')
  expect(createMock).toHaveBeenCalledTimes(1)
  expect(createMock.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(1200)
})

test('événement avec acompte désactivé : pas de Stripe, réservation confirmée directement', async () => {
  const rpcMock = vi.fn((name: string) => {
    if (name === 'check_availability') return Promise.resolve({ data: true, error: null })
    if (name === 'confirm_reservation_payment') return Promise.resolve({ data: 'resa-1', error: null })
    return Promise.resolve({ data: null, error: null })
  })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { title: 'Brunch', deposit_enabled: false, deposit_amount_cents: null },
      error: null,
    }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({
    supabaseAdmin: () => ({ rpc: rpcMock, from: () => chain }),
  }))
  const { checkoutHandler } = await import('./api.reservations.checkout')
  const res = await checkoutHandler(
    request({ ...validBody, mode: 'evenement', targetId: '22222222-2222-2222-2222-222222222222' }),
  )
  expect(res.status).toBe(200)
  const body = await res.json()
  expect(body.url).toContain('confirmation-reservation.html')
  expect(rpcMock).toHaveBeenCalledWith('confirm_reservation_payment', expect.objectContaining({ p_amount_cents: 0 }))
})
```

- [ ] **Step 3: Lancer les tests**

Run: `cd app && pnpm test:run src/routes/api.reservations.checkout.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Typecheck**

Run: `cd app && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/api.reservations.checkout.ts app/src/routes/api.reservations.checkout.test.ts
git commit -m "feat(admin): endpoint de création de session Stripe Checkout pour les réservations"
```

---

### Task 4: Webhook Stripe

**Files:**
- Create: `app/src/routes/api.webhooks.stripe.ts`
- Test: `app/src/routes/api.webhooks.stripe.test.ts`

**Interfaces:**
- Consumes: `stripeClient()` (Task 2), `supabaseAdmin()`, RPC `confirm_reservation_payment` (Task 1).
- Produces: `POST /api/webhooks/stripe` — vérifie la signature Stripe, traite `checkout.session.completed`.

- [ ] **Step 1: Écrire le fichier**

```typescript
import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { stripeClient } from '@/lib/stripe/client'

async function handleCheckoutCompleted(session: {
  id: string
  payment_intent: string | null
  amount_total: number | null
  metadata: Record<string, string> | null
}) {
  const m = session.metadata ?? {}
  const db = supabaseAdmin()

  const { error } = await db.rpc('confirm_reservation_payment', {
    p_session_instance_id: m.sessionInstanceId || null,
    p_event_id: m.eventId || null,
    p_party_size: Number(m.partySize) || 0,
    p_customer_name: m.customerName ?? '',
    p_customer_email: m.customerEmail ?? '',
    p_customer_phone: m.customerPhone || null,
    p_stripe_checkout_session_id: session.id,
    p_stripe_payment_intent_id: session.payment_intent,
    p_amount_cents: session.amount_total ?? 0,
  })

  if (error) {
    // La place a été prise entre l'ouverture de la session Stripe et la confirmation du paiement
    // (course rare sur la toute dernière place, cf. spec §2) : on rembourse automatiquement plutôt
    // que de laisser un client payé sans réservation.
    console.error('[webhook:stripe] confirm_reservation_payment a échoué, remboursement :', error.message, {
      sessionId: session.id,
      customerEmail: m.customerEmail,
    })
    if (session.payment_intent) {
      const stripe = stripeClient()
      await stripe.refunds.create({ payment_intent: session.payment_intent }).catch((refundErr) => {
        console.error('[webhook:stripe] échec du remboursement automatique :', refundErr, { sessionId: session.id })
      })
    }
  }
}

export async function webhookHandler(request: Request): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Unauthorized', { status: 401 })

  const rawBody = await request.text()
  const stripe = stripeClient()

  let event: { type: string; data: { object: unknown } }
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook:stripe] signature invalide :', err)
    return new Response('Bad request', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(
      event.data.object as {
        id: string
        payment_intent: string | null
        amount_total: number | null
        metadata: Record<string, string> | null
      },
    )
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}

export const Route = createFileRoute('/api/webhooks/stripe')({
  server: { handlers: { POST: ({ request }) => webhookHandler(request) } },
})
```

- [ ] **Step 2: Écrire les tests**

```typescript
// @vitest-environment node

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_x')
  vi.stubEnv('STRIPE_PUBLISHABLE_KEY', 'pk_test_x')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/supabase/admin')
  vi.doUnmock('@/lib/stripe/client')
})

function request(body: string, signature?: string) {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : {},
    body,
  })
}

test('401 sans en-tête de signature', async () => {
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}'))
  expect(res.status).toBe(401)
})

test('400 si la signature ne vérifie pas', async () => {
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => {
          throw new Error('signature invalide')
        },
      },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-bidon'))
  expect(res.status).toBe(400)
})

test('checkout.session.completed : appelle confirm_reservation_payment puis 200', async () => {
  const rpcMock = vi.fn().mockResolvedValue({ data: 'resa-1', error: null })
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc: rpcMock }) }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_1',
              payment_intent: 'pi_1',
              amount_total: 1200,
              metadata: {
                mode: 'atelier',
                sessionInstanceId: '11111111-1111-1111-1111-111111111111',
                eventId: '',
                partySize: '2',
                customerName: 'Alice',
                customerEmail: 'alice@example.com',
                customerPhone: '',
              },
            },
          },
        }),
      },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-ok'))
  expect(res.status).toBe(200)
  expect(rpcMock).toHaveBeenCalledWith(
    'confirm_reservation_payment',
    expect.objectContaining({ p_stripe_checkout_session_id: 'cs_test_1', p_amount_cents: 1200 }),
  )
})

test('capacité prise entre-temps : rembourse automatiquement', async () => {
  const rpcMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'Capacité dépassée' } })
  const refundMock = vi.fn().mockResolvedValue({})
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ rpc: rpcMock }) }))
  vi.doMock('@/lib/stripe/client', () => ({
    stripeClient: () => ({
      webhooks: {
        constructEvent: () => ({
          type: 'checkout.session.completed',
          data: {
            object: {
              id: 'cs_test_2',
              payment_intent: 'pi_2',
              amount_total: 1200,
              metadata: {
                mode: 'atelier',
                sessionInstanceId: '11111111-1111-1111-1111-111111111111',
                eventId: '',
                partySize: '2',
                customerName: 'Bob',
                customerEmail: 'bob@example.com',
                customerPhone: '',
              },
            },
          },
        }),
      },
      refunds: { create: refundMock },
    }),
  }))
  const { webhookHandler } = await import('./api.webhooks.stripe')
  const res = await webhookHandler(request('{}', 'sig-ok'))
  expect(res.status).toBe(200)
  expect(refundMock).toHaveBeenCalledWith({ payment_intent: 'pi_2' })
})
```

- [ ] **Step 3: Lancer les tests**

Run: `cd app && pnpm test:run src/routes/api.webhooks.stripe.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Typecheck**

Run: `cd app && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/api.webhooks.stripe.ts app/src/routes/api.webhooks.stripe.test.ts
git commit -m "feat(admin): webhook Stripe — confirme la réservation après paiement, rembourse si course sur la capacité"
```

---

### Task 5: Le formulaire de réservation du site passe par Stripe

**Files:**
- Modify: `C:/mdt-site/wandau-mdt/js/site-booking.js`

**Interfaces:**
- Consumes: `POST https://admin.maisondetara.propulseo-site.com/api/reservations/checkout` (Task 3).

- [ ] **Step 1: Remplacer l'appel `book_reservation` par l'appel au nouvel endpoint**

Dans `js/site-booking.js`, remplacer le bloc `form.addEventListener('submit', ...)` (lignes 200-250 actuelles) :

```javascript
  const CHECKOUT_URL = 'https://admin.maisondetara.propulseo-site.com/api/reservations/checkout';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = form.mode.value;
    const targetId = mode === 'atelier'
      ? form.querySelector('input[name="creneau"]:checked')?.value
      : eventsList.dataset.selected;
    const nom = form.nom.value.trim();
    const email = form.email.value.trim();

    if (!targetId) {
      setMsg(mode === 'atelier' ? 'Merci de choisir une date et un créneau.' : 'Merci de choisir un événement.');
      return;
    }
    if (!nom || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setMsg('Merci de compléter votre nom et un email valide.');
      return;
    }

    submitBtn.disabled = true;
    setMsg('Redirection vers le paiement…');
    try {
      const res = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          targetId,
          partySize: Number(form.participants.value),
          customerName: nom,
          customerEmail: email,
          customerPhone: form.telephone.value.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMsg((data && data.message) || 'Une erreur est survenue, merci de réessayer.');
        submitBtn.disabled = false;
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      setMsg('Une erreur est survenue, merci de réessayer.');
      submitBtn.disabled = false;
    }
  });
```

- [ ] **Step 2: Gérer le retour `?paiement=annule`**

Ajouter, dans `initBooking(form)`, juste après la déclaration de `preselectEvent` :

```javascript
  if (new URLSearchParams(location.search).get('paiement') === 'annule') {
    setMsg('Paiement annulé — vous pouvez réessayer quand vous voulez.');
  }
```

(`setMsg` est définie plus bas dans le fichier ; JavaScript hoiste les déclarations de fonction, l'appel avant la définition fonctionne.)

- [ ] **Step 3: Vérifier manuellement dans le navigateur**

- Lancer le site local (`cd /c/mdt-site && python -m http.server 8892`).
- Ouvrir `http://127.0.0.1:8892/wandau-mdt/atelier.html#reserver`, remplir le formulaire, soumettre.
- Vérifier dans les DevTools (Network) que la requête part bien vers `/api/reservations/checkout` (elle échouera en local tant que Task 3 n'est pas déployée — normal à ce stade, on vérifie juste que le JS appelle la bonne URL avec le bon payload).

- [ ] **Step 4: Commit** (dépôt site, worktree `C:/mdt-site`)

```bash
cd /c/mdt-site && git add wandau-mdt/js/site-booking.js
git commit -m "feat(site): le formulaire de réservation redirige vers Stripe au lieu de créer une résa en attente"
```

---

### Task 6: Page de confirmation + build du site

**Files:**
- Create: `C:/mdt-site/wandau-mdt/_src/confirmation-reservation.html`
- Modify: (généré) `C:/mdt-site/wandau-mdt/confirmation-reservation.html`

**Interfaces:**
- Consumes: aucune donnée dynamique (voir spec §7 — contenu volontairement statique, l'email de confirmation Brevo porte les détails).

- [ ] **Step 1: Regarder une page existante courte pour reprendre le même squelette d'includes**

Lire `C:/mdt-site/wandau-mdt/_src/404.html` en entier (structure minimale : `<!-- include: head/header/footer/scripts-min -->`) avant d'écrire le fichier ci-dessous, pour être sûr de reprendre exactement les mêmes balises d'include et la même structure de `<head>`.

- [ ] **Step 2: Écrire la page**

```html
<!doctype html>
<html lang="fr">
<head>
<!-- include: head -->
<title>Réservation confirmée · Maison de Tara</title>
<meta name="robots" content="noindex,nofollow">
<link rel="stylesheet" href="css/mdt-pages.css">
</head>
<body data-mdt-page="confirmation-reservation">
<!-- include: header -->
<main id="main" class="mdt-natural-scroll">
  <section class="hero floral">
    <div class="container">
      <div class="hero-head reveal">
        <h1><span class="ligne1">Merci</span> <span class="ligne2">à vous</span></h1>
      </div>
      <div class="recit">
        <p class="recit-lead reveal" data-delay="1">
          Votre réservation est confirmée. Vous allez recevoir un email récapitulant tous les
          détails dans quelques instants.
        </p>
        <p class="recit-suite reveal" data-delay="2">
          À très bientôt à la maison !
        </p>
        <a href="boutique.html" class="btn reveal" data-delay="3">Découvrir la boutique en attendant</a>
      </div>
    </div>
  </section>
</main>
<!-- include: footer -->
<!-- include: scripts-min -->
</body>
</html>
```

- [ ] **Step 3: Générer les pages statiques**

Run: `cd /c/mdt-site/wandau-mdt && node build.mjs`
Expected: `✓ confirmation-reservation.html` dans la sortie, `confirmation-reservation.html` créé à la racine de `wandau-mdt/`.

- [ ] **Step 4: Vérifier visuellement**

- `cd /c/mdt-site && python -m http.server 8892` puis ouvrir `http://127.0.0.1:8892/wandau-mdt/confirmation-reservation.html`.
- Vérifier : header/footer identiques aux autres pages, pas de texte qui déborde, le bouton mène bien vers la boutique.

- [ ] **Step 5: Commit**

```bash
cd /c/mdt-site && git add wandau-mdt/_src/confirmation-reservation.html wandau-mdt/confirmation-reservation.html
git commit -m "feat(site): page de confirmation après paiement de réservation"
```

---

### Task 7: Déploiement + enregistrement du webhook Stripe (mode test), vérification bout en bout

**Files:** aucun nouveau fichier — déploiement et configuration Stripe uniquement.

- [ ] **Step 1: Déployer l'app admin et le site**

Suivre exactement la procédure déjà utilisée cette session (fetch/merge `propulseo/main` si divergence, rebuild, smoke test `/login` `/admin` en local avant de pousser, `git push propulseo <branche>:main` avec le compte `Propulseo`, puis déclencher le déploiement admin via `POST {COOLIFY_URL}/api/v1/deploy?uuid=cxf5sd9czuo8u17exbbk0k9i&force=true`). Attendre la fin des deux déploiements (vérifier `/api/health` = 200 sur `https://admin.maisondetara.propulseo-site.com` et un hash de bundle qui correspond au build local, comme fait précédemment).

- [ ] **Step 2: Pousser les variables Stripe de test sur Coolify**

Même méthode que pour l'ajout initial des clés (POST individuel sur `/api/v1/applications/{uuid}/envs`, jamais bulk) : `STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` = les valeurs de **test** (`sk_test_...`/`pk_test_...`), pas les valeurs live actuellement sur Coolify. Vérifier après coup que les 17 variables attendues sont présentes (comme fait précédemment), sans jamais afficher une valeur en clair.

- [ ] **Step 3: Enregistrer le webhook auprès de Stripe via l'API (mode test)**

Utiliser la clé secrète de **test** pour créer l'endpoint webhook via l'API Stripe (`POST https://api.stripe.com/v1/webhook_endpoints`, authentifié `Authorization: Bearer sk_test_...`, corps `url=https://admin.maisondetara.propulseo-site.com/api/webhooks/stripe&enabled_events[]=checkout.session.completed`). La réponse contient `secret` (le `whsec_...`) — le capturer sans jamais l'imprimer en clair, l'ajouter à `app/.env` local (`STRIPE_WEBHOOK_SECRET=`) et le pousser sur Coolify (variable individuelle, comme Step 2), puis redéployer l'admin pour qu'il prenne la nouvelle variable en compte.

- [ ] **Step 4: Test réel de bout en bout, en mode test Stripe**

- Ouvrir `https://maisondetara.propulseo-site.com/atelier.html#reserver`, réserver une place d'atelier.
- Sur la page Stripe, payer avec la carte de test `4242 4242 4242 4242`, date/CVC quelconques futurs.
- Vérifier : redirection vers `confirmation-reservation.html`, la réservation apparaît dans `/admin/reservations` avec `status=confirmed`, `stripe_checkout_session_id` rempli.
- Vérifier dans les logs Coolify de l'app admin qu'aucune erreur n'est survenue dans `/api/webhooks/stripe`.

- [ ] **Step 5: Nettoyer**

Annuler/rembourser la réservation de test créée à l'étape précédente (webhook Stripe test → aucun argent réel n'a bougé, mais nettoyer la ligne dans `/admin/reservations` pour ne pas polluer les vraies données).

---

## Auto-relecture du plan

- **Couverture spec** : les 10 décisions de la spec sont chacune couvertes (Task 1 → #4,#5,#8,#9 ; Task 2 → #10 ; Task 3 → #3,#6,#8 ; Task 4 → #2,#9 ; Task 5/6 → #1,#7 ; Task 7 → #10 + mise en prod).
- **Signatures cohérentes** : `confirm_reservation_payment` a la même liste de paramètres dans la migration (Task 1), l'endpoint checkout (Task 3) et le webhook (Task 4).
- **Pas de placeholder** : chaque étape contient du code réel, aucun TBD.
