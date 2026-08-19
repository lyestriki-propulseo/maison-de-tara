# Intégration Brevo — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Envoyer des emails via Brevo (alertes Tara + confirmations client) déclenchés par une
nouvelle réservation en ligne, une inscription newsletter (double opt-in), ou une demande
contact/privatisation — plus un écran admin listant les inscrits newsletter.

**Architecture:** Le site statique écrit en base via 2 nouveaux guichets SQL `SECURITY DEFINER`
(`subscribe_newsletter`, `submit_request`), même famille que `book_reservation`. Un trigger
Postgres générique (`pg_net`) POSTe `{type, id}` vers un endpoint de l'app admin
(`api/webhooks/brevo`), protégé par un secret partagé (Supabase Vault côté DB, variable d'env
côté app). L'app relit la ligne fraîche en `service_role`, compose l'email en TypeScript, l'envoie
via l'API Brevo. Idempotence par colonne `notified_at` (claim atomique avant envoi).

**Tech Stack:** PostgreSQL/Supabase (pg_net, Vault, PL/pgSQL) · TanStack Start / React 19 / TS
strict / Zod 4 / Vitest (app) · JS vanilla ES modules (site statique, `wandau-mdt`).

**Spec:** `docs/superpowers/specs/2026-08-19-brevo-integration-design.md`

## Global Constraints

- TypeScript strict, jamais de `any` (narrower via `unknown` sinon).
- Path alias `@/...` dans `app/` — jamais d'import relatif `../../`.
- `tsc --noEmit` doit passer après chaque tâche côté `app/`.
- Aucun secret en clair dans une migration versionnée dans git (Vault côté DB, env côté app).
- Le trigger Postgres ne transporte jamais le contenu métier, seulement `{type, id}`.
- Pas de nouvelle dépendance npm pour parler à Brevo — `fetch` natif (comme le reste du projet).
- Chaque nouvelle RPC anon-exécutable est vérifiée par une transaction de test **annulée**
  (`BEGIN` ... `ROLLBACK`) avant d'être considérée faite — jamais de ligne de test laissée en base.

---

## Task 1 : Migration SQL — webhook générique + guichets `subscribe_newsletter` / `submit_request`

**Files:**
- Create: `supabase/migrations/20260819120000_brevo_notifications.sql`

**Interfaces:**
- Produces (consommé par Task 6 site, Task 7 site, Task 4 app) :
  - `public.subscribe_newsletter(p_email text) returns uuid`, anon-exécutable.
  - `public.submit_request(p_request_type public.request_type, p_name text, p_email text, p_phone text, p_message text, p_party_size integer, p_desired_date date, p_event_type public.event_type) returns uuid`, anon-exécutable.
  - Colonnes `notified_at timestamptz` sur `reservations`, `newsletter_subscribers`, `requests`.
  - Triggers qui POSTent vers `https://admin.maisondetara.propulseo-site.com/api/webhooks/brevo`
    avec l'en-tête `x-webhook-secret` (valeur = secret Vault `brevo_webhook_secret`).

- [ ] **Step 1: Écrire la migration**

```sql
-- 0011 — Notifications Brevo : webhook générique (pg_net) + guichets publics newsletter/contact
-- Le trigger ne POSTe jamais le contenu métier, seulement {type, id} — l'app relit la ligne
-- fraîche en service_role avant de composer l'email (cf. spec
-- docs/superpowers/specs/2026-08-19-brevo-integration-design.md). On ne parle jamais à Brevo
-- directement depuis Postgres : uniquement à notre propre app, qui elle-même appelle Brevo.

create extension if not exists pg_net;

-- Secret partagé Postgres → app, jamais en clair ici. Valeur réelle écrasée à l'implémentation
-- (Task 9) via : select vault.update_secret(
--   (select id from vault.secrets where name = 'brevo_webhook_secret'), '<vraie valeur>');
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'brevo_webhook_secret') then
    perform vault.create_secret('CHANGE_ME_AT_DEPLOY', 'brevo_webhook_secret');
  end if;
end $$;

alter table public.reservations add column if not exists notified_at timestamptz;
alter table public.newsletter_subscribers add column if not exists notified_at timestamptz;
alter table public.requests add column if not exists notified_at timestamptz;

create or replace function public.notify_webhook()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_secret text;
  v_url text := 'https://admin.maisondetara.propulseo-site.com/api/webhooks/brevo';
begin
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'brevo_webhook_secret';

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('type', tg_argv[0], 'id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret)
  );
  return new;
end;
$$;

create trigger trg_reservations_notify
  after insert on public.reservations
  for each row when (new.source = 'online')
  execute function public.notify_webhook('reservation');

create trigger trg_newsletter_notify_insert
  after insert on public.newsletter_subscribers
  for each row when (new.status = 'pending')
  execute function public.notify_webhook('newsletter');

-- Un ex-désabonné qui se réinscrit redéclenche l'email de confirmation (cf. subscribe_newsletter).
create trigger trg_newsletter_notify_resubscribe
  after update on public.newsletter_subscribers
  for each row when (old.status = 'unsubscribed' and new.status = 'pending')
  execute function public.notify_webhook('newsletter');

create trigger trg_requests_notify
  after insert on public.requests
  for each row
  execute function public.notify_webhook('request');

-- Guichet public newsletter (anon). Upsert sur email : nouvelle ligne → pending (déclenche
-- l'email) ; ex-unsubscribed → repasse pending + nouveau token + notified_at remis à null
-- (sinon la garde d'idempotence du webhook bloquerait le renvoi) ; déjà pending/confirmed →
-- aucune modification, aucun nouvel email.
create or replace function public.subscribe_newsletter(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_id uuid;
  v_status public.subscriber_status;
begin
  if v_email = '' or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;

  select id, status into v_id, v_status from public.newsletter_subscribers where email = v_email;

  if v_id is null then
    insert into public.newsletter_subscribers (email, status)
    values (v_email, 'pending')
    returning id into v_id;
  elsif v_status = 'unsubscribed' then
    update public.newsletter_subscribers
      set status = 'pending', confirm_token = gen_random_uuid(), confirmed_at = null, notified_at = null
      where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon;

-- Guichet public contact/privatisation (anon). p_phone/p_party_size/p_desired_date/p_event_type
-- sont optionnels (null pour un simple message, remplis pour une privatisation).
create or replace function public.submit_request(
  p_request_type public.request_type,
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_party_size integer,
  p_desired_date date,
  p_event_type public.event_type
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_name is null or btrim(p_name) = '' then
    raise exception 'Nom requis' using errcode = 'check_violation';
  end if;
  if p_email is null or p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Email invalide' using errcode = 'check_violation';
  end if;
  if p_message is null or btrim(p_message) = '' then
    raise exception 'Message requis' using errcode = 'check_violation';
  end if;
  if p_party_size is not null and p_party_size < 1 then
    raise exception 'Nombre de personnes invalide' using errcode = 'check_violation';
  end if;

  insert into public.requests
    (request_type, name, email, phone, message, party_size, desired_date, event_type)
  values
    (p_request_type, btrim(p_name), lower(btrim(p_email)), nullif(btrim(p_phone), ''),
     btrim(p_message), p_party_size, p_desired_date, p_event_type)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_request(
  public.request_type, text, text, text, text, integer, date, public.event_type
) from public;
grant execute on function public.submit_request(
  public.request_type, text, text, text, text, integer, date, public.event_type
) to anon;
```

- [ ] **Step 2: Appliquer sur la base live**

Run (depuis `app/`) : `node scripts/apply-one-migration.mjs 20260819120000_brevo_notifications.sql`
Expected: `✅ 20260819120000_brevo_notifications.sql appliqué.`

- [ ] **Step 3: Vérifier `subscribe_newsletter` (transaction annulée)**

Écrire un script jetable (même modèle que les vérifs `book_reservation` de cette session — lire
`app/.env`, `pg.Client` avec `ssl: { rejectUnauthorized: false }`), l'exécuter puis le supprimer :

```js
// vérif jetable — à supprimer après exécution
await client.query('BEGIN')
const r1 = await client.query("select public.subscribe_newsletter('test@example.com') as id")
console.log('nouvelle inscription id =', r1.rows[0].id)
const r2 = await client.query(
  "select status, notified_at from public.newsletter_subscribers where id = $1",
  [r1.rows[0].id],
)
console.log('statut =', r2.rows[0].status, '(attendu: pending), notified_at =', r2.rows[0].notified_at, '(attendu: null)')
await client.query('ROLLBACK')
```

Expected: `statut = pending (attendu: pending), notified_at = null (attendu: null)`

- [ ] **Step 4: Vérifier `submit_request` (transaction annulée)**

```js
await client.query('BEGIN')
const r = await client.query(
  `select public.submit_request($1, $2, $3, $4, $5, $6, $7, $8) as id`,
  ['privatisation', 'Test Verif', 'test@example.com', '0600000000', 'Anniversaire 20 pers', 20, '2026-12-01', 'soiree'],
)
console.log('demande créée id =', r.rows[0].id)
await client.query('ROLLBACK')
```

Expected: un id est retourné sans erreur.

- [ ] **Step 5: Régénérer les types TypeScript**

Run (depuis `app/`) : `node scripts/gen-types.mjs`
Expected: `✅ Types générés : 16 tables, 14 enums` (les 3 nouvelles colonnes `notified_at`
apparaissent dans `database.types.ts`, les fonctions ne sont jamais introspectées par ce script —
normal, déjà le cas pour `book_reservation`).

---

## Task 2 : Env — variables Brevo validées

**Files:**
- Modify: `app/src/env.ts`
- Modify: `app/.env.example`
- Modify: `app/.env` (valeurs réelles, gitignoré)

**Interfaces:**
- Produces (consommé par Task 3, 4, 5, 6) : `env.BREVO_API_KEY: string`,
  `env.BREVO_SENDER_EMAIL: string`, `env.BREVO_WEBHOOK_SECRET: string`,
  `env.BREVO_NEWSLETTER_LIST_ID: string | undefined`.

- [ ] **Step 1: Étendre le schéma d'environnement**

Modifier `app/src/env.ts` :

```ts
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    SUPABASE_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    BREVO_API_KEY: z.string().min(1),
    BREVO_SENDER_EMAIL: z.string().email(),
    BREVO_WEBHOOK_SECRET: z.string().min(16),
    BREVO_NEWSLETTER_LIST_ID: z.string().min(1).optional(),
  },
  clientPrefix: 'VITE_',
  client: {
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
```

- [ ] **Step 2: Documenter dans `.env.example`**

Remplacer le bloc Brevo existant dans `app/.env.example` :

```
BREVO_API_KEY=
BREVO_SENDER_EMAIL=contact@maisondetara.com
# Générée une fois (ex. openssl rand -hex 32), copiée AUSSI dans Supabase Vault
# (secret 'brevo_webhook_secret', cf. migration 20260819120000).
BREVO_WEBHOOK_SECRET=
# Optionnel : id de liste Brevo pour ajouter les inscrits confirmés. Si vide, la confirmation
# newsletter fonctionne quand même, juste sans sync de liste.
BREVO_NEWSLETTER_LIST_ID=
```

- [ ] **Step 3: Générer le secret et remplir `app/.env` local**

Run : `openssl rand -hex 32`
Copier la sortie dans `app/.env` → `BREVO_WEBHOOK_SECRET=<valeur>`, ainsi que
`BREVO_SENDER_EMAIL=contact@maisondetara.com` (la clé `BREVO_API_KEY` existe déjà dans ce fichier).

- [ ] **Step 4: Reporter la même valeur dans Supabase Vault**

Écrire un script jetable (même connexion `pg` que Task 1) exécutant :

```js
await client.query(
  `select vault.update_secret(
     (select id from vault.secrets where name = 'brevo_webhook_secret'), $1)`,
  [process.env.BREVO_WEBHOOK_SECRET], // lu depuis app/.env
)
```

Expected: aucune erreur. Vérifier : `select name, updated_at from vault.secrets where name = 'brevo_webhook_secret';`
→ `updated_at` vient de changer.

- [ ] **Step 5: Typecheck**

Run (depuis `app/`) : `pnpm typecheck`
Expected: pas de nouvelle erreur liée à `env.ts` (l'erreur préexistante `vite.config.ts` reste,
sans lien avec cette tâche).

---

## Task 3 : Client Brevo (`app/src/lib/brevo/client.ts`)

**Files:**
- Create: `app/src/lib/brevo/client.ts`
- Test: `app/src/lib/brevo/client.test.ts`

**Interfaces:**
- Consumes: `env.BREVO_API_KEY`, `env.BREVO_SENDER_EMAIL`, `env.BREVO_NEWSLETTER_LIST_ID` (Task 2).
- Produces (consommé par Task 5, 6) :
  - `sendTransactionalEmail(params: { to: { email: string; name?: string }; subject: string; html: string }): Promise<void>`
  - `addContactToList(email: string): Promise<void>`
  - `class BrevoError extends Error {}`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// app/src/lib/brevo/client.test.ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const originalFetch = global.fetch

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  global.fetch = originalFetch
  vi.unstubAllEnvs()
})

test('sendTransactionalEmail appelle /v3/smtp/email avec la bonne charge utile', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
  global.fetch = fetchMock as unknown as typeof fetch

  const { sendTransactionalEmail } = await import('./client')
  await sendTransactionalEmail({ to: { email: 'client@example.com', name: 'Client' }, subject: 'Sujet', html: '<p>Corps</p>' })

  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.brevo.com/v3/smtp/email',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'api-key': 'test-key' }),
    }),
  )
  const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as RequestInit).body as string)
  expect(body).toEqual({
    sender: { name: 'Maison de Tara', email: 'contact@maisondetara.com' },
    to: [{ email: 'client@example.com', name: 'Client' }],
    subject: 'Sujet',
    htmlContent: '<p>Corps</p>',
  })
})

test('sendTransactionalEmail lève BrevoError si Brevo refuse', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  global.fetch = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 })) as unknown as typeof fetch

  const { sendTransactionalEmail, BrevoError } = await import('./client')
  await expect(
    sendTransactionalEmail({ to: { email: 'a@example.com' }, subject: 's', html: 'h' }),
  ).rejects.toBeInstanceOf(BrevoError)
})

test('addContactToList ne fait rien si BREVO_NEWSLETTER_LIST_ID est absent', async () => {
  vi.stubEnv('BREVO_API_KEY', 'test-key')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
  const fetchMock = vi.fn()
  global.fetch = fetchMock as unknown as typeof fetch

  const { addContactToList } = await import('./client')
  await addContactToList('client@example.com')

  expect(fetchMock).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/lib/brevo/client.test.ts`
Expected: FAIL — `Cannot find module './client'`

- [ ] **Step 3: Implémenter**

```ts
// app/src/lib/brevo/client.ts
import { env } from '@/env'

const BREVO_API_URL = 'https://api.brevo.com/v3'
const SENDER_NAME = 'Maison de Tara'

export class BrevoError extends Error {}

type SendEmailParams = {
  to: { email: string; name?: string }
  subject: string
  html: string
}

function brevoHeaders(): Record<string, string> {
  return {
    'api-key': env.BREVO_API_KEY,
    'Content-Type': 'application/json',
    accept: 'application/json',
  }
}

export async function sendTransactionalEmail(params: SendEmailParams): Promise<void> {
  const res = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: 'POST',
    headers: brevoHeaders(),
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: env.BREVO_SENDER_EMAIL },
      to: [{ email: params.to.email, name: params.to.name }],
      subject: params.subject,
      htmlContent: params.html,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new BrevoError(`Brevo a refusé l'envoi (${res.status}) : ${body}`)
  }
}

export async function addContactToList(email: string): Promise<void> {
  if (!env.BREVO_NEWSLETTER_LIST_ID) return
  const res = await fetch(`${BREVO_API_URL}/contacts`, {
    method: 'POST',
    headers: brevoHeaders(),
    body: JSON.stringify({
      email,
      listIds: [Number(env.BREVO_NEWSLETTER_LIST_ID)],
      updateEnabled: true,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new BrevoError(`Brevo a refusé l'ajout à la liste (${res.status}) : ${body}`)
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/lib/brevo/client.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Typecheck puis commit**

Run: `pnpm typecheck`

```bash
git add app/src/lib/brevo/client.ts app/src/lib/brevo/client.test.ts
git commit -m "feat(brevo): client d'envoi transactionnel + ajout à une liste"
```

---

## Task 4 : Templates d'emails (`app/src/lib/brevo/templates.ts`)

**Files:**
- Create: `app/src/lib/brevo/templates.ts`
- Test: `app/src/lib/brevo/templates.test.ts`

**Interfaces:**
- Produces (consommé par Task 5) :
  - `reservationAlertForTara(params): { subject: string; html: string }`
  - `reservationConfirmationForCustomer(params): { subject: string; html: string }`
  - `newsletterConfirmation(params: { confirmUrl: string }): { subject: string; html: string }`
  - `requestAlertForTara(params): { subject: string; html: string }`
  - `requestConfirmationForCustomer(params: { name: string; requestType: 'contact' | 'privatisation' }): { subject: string; html: string }`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// app/src/lib/brevo/templates.test.ts
import { expect, test } from 'vitest'
import {
  newsletterConfirmation,
  reservationAlertForTara,
  reservationConfirmationForCustomer,
  requestAlertForTara,
  requestConfirmationForCustomer,
} from './templates'

test('reservationAlertForTara inclut le nom du client et le lien admin', () => {
  const { subject, html } = reservationAlertForTara({
    customerName: 'Jeanne Martin',
    partySize: 4,
    targetLabel: 'Atelier libre · 2026-09-01 10:00',
    customerEmail: 'jeanne@example.com',
    customerPhone: '0600000000',
  })
  expect(subject).toContain('Jeanne Martin')
  expect(html).toContain('Jeanne Martin')
  expect(html).toContain('4')
  expect(html).toContain('jeanne@example.com')
  expect(html).toContain('0600000000')
  expect(html).toContain('/admin/reservations')
})

test('reservationConfirmationForCustomer mentionne le rappel acompte', () => {
  const { html } = reservationConfirmationForCustomer({
    customerName: 'Jeanne',
    targetLabel: 'Atelier libre · 2026-09-01 10:00',
  })
  expect(html).toContain('acompte')
})

test('newsletterConfirmation contient le lien de confirmation', () => {
  const { html } = newsletterConfirmation({ confirmUrl: 'https://admin.maisondetara.propulseo-site.com/newsletter/confirm?token=abc' })
  expect(html).toContain('https://admin.maisondetara.propulseo-site.com/newsletter/confirm?token=abc')
})

test('requestAlertForTara distingue contact et privatisation', () => {
  const { subject } = requestAlertForTara({
    requestType: 'privatisation',
    name: 'Paul',
    email: 'paul@example.com',
    phone: null,
    message: 'Anniversaire',
    partySize: 15,
    desiredDate: '2026-12-01',
    eventType: 'soiree',
  })
  expect(subject.toLowerCase()).toContain('privatisation')
})

test('requestConfirmationForCustomer accuse réception', () => {
  const { html } = requestConfirmationForCustomer({ name: 'Paul', requestType: 'contact' })
  expect(html).toContain('bien reçu')
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/lib/brevo/templates.test.ts`
Expected: FAIL — `Cannot find module './templates'`

- [ ] **Step 3: Implémenter**

```ts
// app/src/lib/brevo/templates.ts
const ADMIN_URL = 'https://admin.maisondetara.propulseo-site.com'

function wrap(bodyHtml: string): string {
  return `<div style="font-family:sans-serif;color:#1A1815;line-height:1.6;max-width:520px">${bodyHtml}</div>`
}

export function reservationAlertForTara(params: {
  customerName: string
  partySize: number
  targetLabel: string
  customerEmail: string
  customerPhone: string | null
}): { subject: string; html: string } {
  return {
    subject: `Nouvelle réservation en ligne — ${params.customerName}`,
    html: wrap(`
      <p><strong>${params.customerName}</strong> vient de réserver via le site.</p>
      <p>${params.targetLabel} — ${params.partySize} personne(s)</p>
      <p>Email : ${params.customerEmail}${params.customerPhone ? ` · Tél : ${params.customerPhone}` : ''}</p>
      <p><a href="${ADMIN_URL}/admin/reservations">Voir dans l'admin</a></p>
    `),
  }
}

export function reservationConfirmationForCustomer(params: {
  customerName: string
  targetLabel: string
}): { subject: string; html: string } {
  return {
    subject: 'Votre demande de réservation — Maison de Tara',
    html: wrap(`
      <p>Bonjour ${params.customerName},</p>
      <p>Votre demande de réservation pour <strong>${params.targetLabel}</strong> est bien enregistrée.</p>
      <p>Tara vous recontacte pour confirmer et prendre l'acompte.</p>
      <p>À très vite,<br>Maison de Tara</p>
    `),
  }
}

export function newsletterConfirmation(params: { confirmUrl: string }): { subject: string; html: string } {
  return {
    subject: 'Confirmez votre inscription à la lettre de la Maison de Tara',
    html: wrap(`
      <p>Bonjour,</p>
      <p>Un clic pour confirmer votre inscription à la lettre de la maison :</p>
      <p><a href="${params.confirmUrl}">Confirmer mon inscription</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
    `),
  }
}

export function requestAlertForTara(params: {
  requestType: 'contact' | 'privatisation'
  name: string
  email: string
  phone: string | null
  message: string
  partySize: number | null
  desiredDate: string | null
  eventType: string | null
}): { subject: string; html: string } {
  const label = params.requestType === 'privatisation' ? 'Nouvelle demande de privatisation' : 'Nouveau message'
  return {
    subject: `${label} — ${params.name}`,
    html: wrap(`
      <p><strong>${params.name}</strong> (${params.email}${params.phone ? `, ${params.phone}` : ''})</p>
      ${params.partySize ? `<p>${params.partySize} personne(s)${params.desiredDate ? ` · ${params.desiredDate}` : ''}${params.eventType ? ` · ${params.eventType}` : ''}</p>` : ''}
      <p>${params.message}</p>
    `),
  }
}

export function requestConfirmationForCustomer(params: {
  name: string
  requestType: 'contact' | 'privatisation'
}): { subject: string; html: string } {
  return {
    subject: 'Votre message — Maison de Tara',
    html: wrap(`
      <p>Bonjour ${params.name},</p>
      <p>Nous avons bien reçu votre ${params.requestType === 'privatisation' ? 'demande de privatisation' : 'message'}, on vous recontacte rapidement.</p>
      <p>À très vite,<br>Maison de Tara</p>
    `),
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/lib/brevo/templates.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Typecheck puis commit**

```bash
pnpm typecheck
git add app/src/lib/brevo/templates.ts app/src/lib/brevo/templates.test.ts
git commit -m "feat(brevo): templates des 5 emails transactionnels"
```

---

## Task 5 : Endpoint webhook (`app/src/routes/api.webhooks.brevo.ts`)

**Files:**
- Create: `app/src/routes/api.webhooks.brevo.ts`
- Test: `app/src/routes/api.webhooks.brevo.test.ts`

**Interfaces:**
- Consumes: `sendTransactionalEmail`, `addContactToList` (Task 3) ; les 5 fonctions de templates
  (Task 4) ; `env.BREVO_WEBHOOK_SECRET`, `env.BREVO_NEWSLETTER_LIST_ID` (Task 2) ; `supabaseAdmin()`
  (`@/lib/supabase/admin`, existant).
- Produces: `webhookHandler(request: Request): Promise<Response>`, exporté pour test direct (même
  pattern que `healthHandler` dans `api.health.ts`).

- [ ] **Step 1: Écrire le test qui échoue**

```ts
// app/src/routes/api.webhooks.brevo.test.ts
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('BREVO_API_KEY', 'k')
  vi.stubEnv('BREVO_SENDER_EMAIL', 'contact@maisondetara.com')
  vi.stubEnv('BREVO_WEBHOOK_SECRET', 'le-vrai-secret')
  vi.stubEnv('SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'x')
  vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'x')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('@/lib/supabase/admin')
  vi.doUnmock('@/lib/brevo/client')
})

function request(body: unknown, secret?: string) {
  return new Request('http://localhost/api/webhooks/brevo', {
    method: 'POST',
    headers: secret ? { 'x-webhook-secret': secret } : {},
    body: JSON.stringify(body),
  })
}

test('401 sans en-tête secret', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'reservation', id: '1' }))
  expect(res.status).toBe(401)
})

test('401 avec un mauvais secret', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'reservation', id: '1' }, 'faux-secret'))
  expect(res.status).toBe(401)
})

test('400 avec une charge utile invalide', async () => {
  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'inconnu', id: '1' }, 'le-vrai-secret'))
  expect(res.status).toBe(400)
})

test('newsletter : claim atomique puis envoi, 200', async () => {
  const sendMock = vi.fn().mockResolvedValue(undefined)
  vi.doMock('@/lib/brevo/client', () => ({
    sendTransactionalEmail: sendMock,
    addContactToList: vi.fn(),
  }))
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { id: 'nl-1', email: 'client@example.com', confirm_token: 'tok-123' },
    error: null,
  })
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle,
  }
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ from: () => chain }) }))

  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'newsletter', id: 'nl-1' }, 'le-vrai-secret'))

  expect(res.status).toBe(200)
  expect(sendMock).toHaveBeenCalledTimes(1)
  expect(sendMock.mock.calls[0]?.[0].to.email).toBe('client@example.com')
})

test('newsletter déjà notifiée (claim renvoie null) : aucun envoi, 200', async () => {
  const sendMock = vi.fn()
  vi.doMock('@/lib/brevo/client', () => ({ sendTransactionalEmail: sendMock, addContactToList: vi.fn() }))
  const chain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
  vi.doMock('@/lib/supabase/admin', () => ({ supabaseAdmin: () => ({ from: () => chain }) }))

  const { webhookHandler } = await import('./api.webhooks.brevo')
  const res = await webhookHandler(request({ type: 'newsletter', id: 'nl-1' }, 'le-vrai-secret'))

  expect(res.status).toBe(200)
  expect(sendMock).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run src/routes/api.webhooks.brevo.test.ts`
Expected: FAIL — `Cannot find module './api.webhooks.brevo'`

- [ ] **Step 3: Implémenter**

```ts
// app/src/routes/api.webhooks.brevo.ts
import type {} from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { env } from '@/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addContactToList, sendTransactionalEmail } from '@/lib/brevo/client'
import {
  newsletterConfirmation,
  reservationAlertForTara,
  reservationConfirmationForCustomer,
  requestAlertForTara,
  requestConfirmationForCustomer,
} from '@/lib/brevo/templates'

const ADMIN_URL = 'https://admin.maisondetara.propulseo-site.com'

type WebhookType = 'reservation' | 'newsletter' | 'request'
type WebhookPayload = { type: WebhookType; id: string }

function isWebhookPayload(value: unknown): value is WebhookPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (v.type === 'reservation' || v.type === 'newsletter' || v.type === 'request') && typeof v.id === 'string'
}

function logFailures(results: PromiseSettledResult<void>[], context: string) {
  for (const r of results) {
    if (r.status === 'rejected') console.error(`[webhook:${context}]`, r.reason)
  }
}

type Db = ReturnType<typeof supabaseAdmin>

async function handleReservation(db: Db, id: string) {
  const { data: claimed } = await db
    .from('reservations')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, session_instance_id, event_id, party_size, customer_name, customer_email, customer_phone')
    .maybeSingle()
  if (!claimed) return

  let targetLabel = 'Atelier libre'
  if (claimed.event_id) {
    const { data: event } = await db.from('events').select('title, starts_at').eq('id', claimed.event_id).maybeSingle()
    if (event) targetLabel = `${event.title} · ${new Date(event.starts_at).toLocaleDateString('fr-FR')}`
  } else if (claimed.session_instance_id) {
    const { data: session } = await db
      .from('session_instances')
      .select('session_date, start_time')
      .eq('id', claimed.session_instance_id)
      .maybeSingle()
    if (session) targetLabel = `Atelier libre · ${session.session_date} ${session.start_time.slice(0, 5)}`
  }

  const toTara = reservationAlertForTara({
    customerName: claimed.customer_name,
    partySize: claimed.party_size,
    targetLabel,
    customerEmail: claimed.customer_email,
    customerPhone: claimed.customer_phone,
  })
  const toCustomer = reservationConfirmationForCustomer({ customerName: claimed.customer_name, targetLabel })

  const results = await Promise.allSettled([
    sendTransactionalEmail({ to: { email: env.BREVO_SENDER_EMAIL }, subject: toTara.subject, html: toTara.html }),
    sendTransactionalEmail({
      to: { email: claimed.customer_email, name: claimed.customer_name },
      subject: toCustomer.subject,
      html: toCustomer.html,
    }),
  ])
  logFailures(results, 'reservation')
}

async function handleNewsletter(db: Db, id: string) {
  const { data: claimed } = await db
    .from('newsletter_subscribers')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, email, confirm_token')
    .maybeSingle()
  if (!claimed) return

  const confirmUrl = `${ADMIN_URL}/newsletter/confirm?token=${claimed.confirm_token}`
  const { subject, html } = newsletterConfirmation({ confirmUrl })
  const results = await Promise.allSettled([sendTransactionalEmail({ to: { email: claimed.email }, subject, html })])
  logFailures(results, 'newsletter')
}

async function handleRequest(db: Db, id: string) {
  const { data: claimed } = await db
    .from('requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', id)
    .is('notified_at', null)
    .select('id, request_type, name, email, phone, message, party_size, desired_date, event_type')
    .maybeSingle()
  if (!claimed) return

  const toTara = requestAlertForTara({
    requestType: claimed.request_type,
    name: claimed.name,
    email: claimed.email,
    phone: claimed.phone,
    message: claimed.message,
    partySize: claimed.party_size,
    desiredDate: claimed.desired_date,
    eventType: claimed.event_type,
  })
  const toCustomer = requestConfirmationForCustomer({ name: claimed.name, requestType: claimed.request_type })

  const results = await Promise.allSettled([
    sendTransactionalEmail({ to: { email: env.BREVO_SENDER_EMAIL }, subject: toTara.subject, html: toTara.html }),
    sendTransactionalEmail({ to: { email: claimed.email, name: claimed.name }, subject: toCustomer.subject, html: toCustomer.html }),
  ])
  logFailures(results, 'request')
}

export async function webhookHandler(request: Request): Promise<Response> {
  const secret = request.headers.get('x-webhook-secret')
  if (!secret || secret !== env.BREVO_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload: unknown = await request.json().catch(() => null)
  if (!isWebhookPayload(payload)) {
    return new Response('Bad request', { status: 400 })
  }

  const db = supabaseAdmin()
  if (payload.type === 'reservation') await handleReservation(db, payload.id)
  else if (payload.type === 'newsletter') await handleNewsletter(db, payload.id)
  else await handleRequest(db, payload.id)

  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
}

export const Route = createFileRoute('/api/webhooks/brevo')({
  server: { handlers: { POST: ({ request }) => webhookHandler(request) } },
})
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run src/routes/api.webhooks.brevo.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: Régénérer les routes, typecheck, commit**

Run: `pnpm generate-routes && pnpm typecheck`

```bash
git add app/src/routes/api.webhooks.brevo.ts app/src/routes/api.webhooks.brevo.test.ts app/src/routeTree.gen.ts
git commit -m "feat(brevo): endpoint webhook — dispatch réservation/newsletter/demande vers Brevo"
```

---

## Task 6 : Page de confirmation newsletter (`app/src/routes/newsletter.confirm.tsx`)

**Files:**
- Create: `app/src/routes/newsletter.confirm.tsx`

**Interfaces:**
- Consumes: `addContactToList` (Task 3), `env.BREVO_NEWSLETTER_LIST_ID` (Task 2), `supabaseAdmin()`.
- Produces: route publique `GET /newsletter/confirm?token=<uuid>`.

- [ ] **Step 1: Implémenter**

```tsx
// app/src/routes/newsletter.confirm.tsx
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { addContactToList } from '@/lib/brevo/client'

const confirmNewsletter = createServerFn({ method: 'GET' })
  .validator(z.object({ token: z.uuid() }))
  .handler(async ({ data }) => {
    const db = supabaseAdmin()
    const { data: subscriber, error } = await db
      .from('newsletter_subscribers')
      .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
      .eq('confirm_token', data.token)
      .eq('status', 'pending')
      .select('email')
      .maybeSingle()
    if (error) throw new Error("Impossible de confirmer l'inscription.")

    if (subscriber) {
      try {
        await addContactToList(subscriber.email)
      } catch (err) {
        console.error('[newsletter-confirm]', err)
      }
    }
    return { confirmed: Boolean(subscriber) }
  })

const searchSchema = z.object({ token: z.uuid().optional() })

export const Route = createFileRoute('/newsletter/confirm')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ deps }) => {
    if (!deps.token) return { confirmed: false }
    return confirmNewsletter({ data: { token: deps.token } })
  },
  component: NewsletterConfirmPage,
})

function NewsletterConfirmPage() {
  const { confirmed } = Route.useLoaderData()
  return (
    <div className="mx-auto mt-24 max-w-md px-6 text-center">
      {confirmed ? (
        <>
          <h1 className="text-2xl font-semibold text-[#1A1815]">Inscription confirmée</h1>
          <p className="mt-3 text-neutral-600">Merci ! Vous recevrez désormais les nouvelles de la Maison de Tara.</p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold text-[#1A1815]">Lien invalide</h1>
          <p className="mt-3 text-neutral-600">
            Ce lien de confirmation n'est plus valide. Réinscrivez-vous depuis le site si besoin.
          </p>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Régénérer les routes**

Run: `pnpm generate-routes`
Expected: `routeTree.gen.ts` inclut `/newsletter/confirm`.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: pas de nouvelle erreur.

- [ ] **Step 4: Vérification manuelle**

Run: `pnpm dev`, puis dans le navigateur `http://localhost:3000/newsletter/confirm?token=00000000-0000-0000-0000-000000000000`
Expected: page "Lien invalide" (aucun abonné avec ce token). Garder pour la vérification finale
(Task 10) avec un vrai token créé via `subscribe_newsletter`.

- [ ] **Step 5: Commit**

```bash
git add app/src/routes/newsletter.confirm.tsx app/src/routeTree.gen.ts
git commit -m "feat(brevo): page publique de confirmation newsletter"
```

---

## Task 7 : Écran admin `/admin/newsletter`

**Files:**
- Create: `app/src/lib/newsletter-data.ts`
- Create: `app/src/routes/admin/newsletter.tsx`
- Modify: `app/src/routes/admin/route.tsx`

**Interfaces:**
- Produces: `listNewsletterSubscribers(): Promise<Array<{ id, email, status, confirmedAt, createdAt }>>`.

- [ ] **Step 1: Implémenter le server function**

```ts
// app/src/lib/newsletter-data.ts
import { createServerFn } from '@tanstack/react-start'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { staffMiddleware } from '@/lib/auth-middleware'

export const listNewsletterSubscribers = createServerFn({ method: 'GET' })
  .middleware([staffMiddleware])
  .handler(async () => {
    const db = supabaseAdmin()
    const { data, error } = await db
      .from('newsletter_subscribers')
      .select('id, email, status, confirmed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message || 'Impossible de charger les inscrits à la newsletter')

    return (data ?? []).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      confirmedAt: row.confirmed_at,
      createdAt: row.created_at,
    }))
  })
```

- [ ] **Step 2: Implémenter l'écran**

```tsx
// app/src/routes/admin/newsletter.tsx
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { listNewsletterSubscribers } from '@/lib/newsletter-data'

const STATUS_LABEL: Record<string, string> = {
  pending: 'En attente de confirmation',
  confirmed: 'Confirmé',
  unsubscribed: 'Désabonné',
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

export const Route = createFileRoute('/admin/newsletter')({
  loader: () => listNewsletterSubscribers(),
  component: NewsletterPage,
})

type SubscriberRow = Awaited<ReturnType<typeof listNewsletterSubscribers>>[number]

function NewsletterPage() {
  const subscribers = Route.useLoaderData()
  const [filter, setFilter] = useState<string>('confirmed')

  const visible = filter === 'all' ? subscribers : subscribers.filter((s) => s.status === filter)
  const counts = {
    all: subscribers.length,
    pending: subscribers.filter((s) => s.status === 'pending').length,
    confirmed: subscribers.filter((s) => s.status === 'confirmed').length,
    unsubscribed: subscribers.filter((s) => s.status === 'unsubscribed').length,
  }

  return (
    <div className="tara-admin-page">
      <div className="tara-page-heading">
        <div>
          <p className="text-sm font-medium text-[#4A5D2E]">Le suivi</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.025em] text-[#1A1815]">Newsletter</h1>
          <p className="tara-page-intro">Les personnes inscrites à la lettre de la maison, pour les contacter au besoin.</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterTab active={filter === 'confirmed'} onClick={() => setFilter('confirmed')}>
          Confirmés ({counts.confirmed})
        </FilterTab>
        <FilterTab active={filter === 'pending'} onClick={() => setFilter('pending')}>
          En attente ({counts.pending})
        </FilterTab>
        <FilterTab active={filter === 'unsubscribed'} onClick={() => setFilter('unsubscribed')}>
          Désabonnés ({counts.unsubscribed})
        </FilterTab>
        <FilterTab active={filter === 'all'} onClick={() => setFilter('all')}>
          Tous ({counts.all})
        </FilterTab>
      </div>

      <section className="mt-4 overflow-hidden rounded-xl border border-[#4A5D2E]/15 bg-white">
        {visible.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-600">Aucun inscrit pour ce filtre.</p>
        ) : (
          <ul className="divide-y divide-[#4A5D2E]/12">
            {visible.map((s: SubscriberRow) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#1A1815]">{s.email}</p>
                  <p className="text-xs text-neutral-500">
                    Inscrit le {DATE_FMT.format(new Date(s.createdAt))}
                    {s.confirmedAt ? ` · confirmé le ${DATE_FMT.format(new Date(s.confirmedAt))}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-[#E4ECD8] px-2.5 py-0.5 text-xs font-semibold text-[#31421E]">
                  {STATUS_LABEL[s.status] ?? s.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-9 rounded-full px-3.5 text-xs font-semibold transition-colors ${
        active ? 'bg-[#4A5D2E] text-white' : 'bg-[#4A5D2E]/8 text-[#31421E] hover:bg-[#4A5D2E]/15'
      }`}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Ajouter le lien de nav (desktop + mobile) et le type de route**

Dans `app/src/routes/admin/route.tsx` :

1. Ajouter `Mail` à l'import `lucide-react` (ligne 1) : `import { CalendarDays, Clock3, Home, Image, Mail, Sparkles, Users } from 'lucide-react'`
2. Dans le `<nav>` mobile (après la ligne `<AdminLink to="/admin/horaires">Horaires</AdminLink>`) :
   ```tsx
   <AdminLink to="/admin/newsletter">Newsletter</AdminLink>
   ```
3. Dans le `<nav>` desktop (après le bloc `Link to="/admin/horaires"`) :
   ```tsx
   <Link
     to="/admin/newsletter"
     className="tara-admin-nav-link"
     activeProps={{ className: 'tara-admin-nav-link is-active' }}
   >
     <Mail size={17} aria-hidden="true" />
     Newsletter
   </Link>
   ```
4. Étendre le type `to:` de `AdminLink` :
   ```ts
   to: '/admin' | '/admin/agenda' | '/admin/programme' | '/admin/reservations' | '/admin/contenu' | '/admin/horaires' | '/admin/newsletter'
   ```

- [ ] **Step 4: Régénérer les routes, typecheck**

Run: `pnpm generate-routes && pnpm typecheck`
Expected: pas de nouvelle erreur.

- [ ] **Step 5: Vérification manuelle par l'utilisateur**

Run: `pnpm dev`, se connecter à `/admin`, ouvrir `/admin/newsletter` depuis la nav.
Expected (à confirmer par l'utilisateur) : l'écran s'affiche, filtres fonctionnels, aucune erreur console.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/newsletter-data.ts app/src/routes/admin/newsletter.tsx app/src/routes/admin/route.tsx app/src/routeTree.gen.ts
git commit -m "feat(admin): écran Newsletter — liste des inscrits"
```

---

## Task 8 : Site — newsletter rebranchée sur `subscribe_newsletter`

**Files:**
- Create: `C:/mdt-site/wandau-mdt/js/site-newsletter.js`
- Modify: `C:/mdt-site/wandau-mdt/_src/index.html`

**Interfaces:**
- Consumes: RPC `public.subscribe_newsletter(p_email text)` (Task 1), `SUPABASE_URL`/`SUPABASE_ANON_KEY` (`js/supabase-config.js`, existant).

- [ ] **Step 1: Écrire le module**

```js
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
```

- [ ] **Step 2: Rebrancher `index.html`**

Dans `_src/index.html`, remplacer :

```html
<script type="module">
  import { bindForm } from './js/forms-supabase.js';
  bindForm(document.getElementById('newsletterForm'), 'newsletter');
</script>
```

par :

```html
<script type="module" src="js/site-newsletter.js"></script>
```

- [ ] **Step 3: Vérifier la syntaxe et reconstruire**

Run (depuis `C:/mdt-site/wandau-mdt`) : `node --check js/site-newsletter.js && node build.mjs`
Expected: `site-newsletter.js: OK` puis `9 page(s) assemblée(s).`

- [ ] **Step 4: Vérification manuelle par l'utilisateur**

Servir le site localement, ouvrir `index.html`, s'inscrire avec un vrai email de test.
Expected (à confirmer par l'utilisateur) : message "Vérifiez votre boîte mail..." affiché, ligne
`pending` visible dans `/admin/newsletter`, email de confirmation reçu, clic sur le lien →
`/newsletter/confirm` affiche "Inscription confirmée", statut passe à `confirmed` dans l'admin.

- [ ] **Step 5: Commit**

```bash
git add wandau-mdt/js/site-newsletter.js wandau-mdt/_src/index.html wandau-mdt/index.html
git commit -m "feat(site): newsletter branchée sur le guichet subscribe_newsletter"
```

---

## Task 9 : Site — formulaire contact + toggle privatisation, rebranché sur `submit_request`

**Files:**
- Create: `C:/mdt-site/wandau-mdt/js/site-contact.js`
- Modify: `C:/mdt-site/wandau-mdt/_src/contact.html`
- Modify: `C:/mdt-site/wandau-mdt/css/premium-contact.css`

**Interfaces:**
- Consumes: RPC `public.submit_request(...)` (Task 1), `js/mdt-datepicker.js` (existant, mode
  popup non-inline — déjà compatible sans modification).

- [ ] **Step 1: Étendre le formulaire dans `_src/contact.html`**

Remplacer le `<form id="contactForm" novalidate>` existant (nom/email/sujet/message) par :

```html
<form id="contactForm" novalidate>
  <div class="pills" role="radiogroup" aria-label="Type de demande">
    <label class="pill"><input type="radio" name="mode" value="contact" checked><span>Message</span></label>
    <label class="pill"><input type="radio" name="mode" value="privatisation"><span>Privatisation</span></label>
  </div>

  <div class="field--row">
    <div class="field">
      <label for="cf-nom">Votre nom</label>
      <input id="cf-nom" name="nom" type="text" autocomplete="name" required>
    </div>
    <div class="field">
      <label for="cf-email">Votre email</label>
      <input id="cf-email" name="email" type="email" autocomplete="email" required>
    </div>
  </div>

  <div class="field">
    <label for="cf-sujet">Sujet</label>
    <input id="cf-sujet" name="sujet" type="text">
  </div>

  <div id="cf-privatisation" hidden>
    <div class="field--row">
      <div class="field">
        <label for="cf-tel">Téléphone <span class="opt">(facultatif)</span></label>
        <input id="cf-tel" name="telephone" type="tel" autocomplete="tel">
      </div>
      <div class="field">
        <label for="cf-personnes">Nombre de personnes</label>
        <input id="cf-personnes" name="personnes" type="number" min="1" max="60">
      </div>
    </div>
    <div class="field--row">
      <div class="field">
        <label for="cf-date-btn">Date souhaitée</label>
        <div class="dp">
          <button type="button" class="dp__field" id="cf-date-btn" aria-haspopup="dialog" aria-expanded="false">Choisir une date</button>
          <input type="hidden" id="cf-date" name="date">
          <div class="dp__pop" hidden></div>
        </div>
      </div>
      <div class="field">
        <label for="cf-type">Type d'événement</label>
        <select id="cf-type" name="typeEvenement">
          <option value="workshop">Atelier</option>
          <option value="soiree">Soirée</option>
          <option value="kids">Enfants</option>
          <option value="collaboration">Collaboration</option>
          <option value="autre">Autre</option>
        </select>
      </div>
    </div>
  </div>

  <div class="field">
    <label for="cf-message">Votre message</label>
    <textarea id="cf-message" name="message" required></textarea>
  </div>
  <button type="submit" class="btn">Envoyer</button>
  <p class="form-msg" role="status" aria-live="polite"></p>
</form>
```

Puis, avant le `<script type="module">` de fin de page, ajouter le chargement du datepicker
(absent jusqu'ici sur cette page) :

```html
<script src="js/mdt-datepicker.js"></script>
```

Et remplacer le bloc de binding existant :

```html
<script type="module">
  import './js/site-hours.js';
  import { bindForm } from './js/forms-supabase.js';
  bindForm(document.getElementById('contactForm'), 'contact');
</script>
```

par :

```html
<script type="module">
  import './js/site-hours.js';
</script>
<script type="module" src="js/site-contact.js"></script>
```

- [ ] **Step 2: Ajouter le CSS du toggle + de l'agenda popup**

Ajouter à la fin de `css/premium-contact.css` :

```css
/* Sélecteur Message / Privatisation + agenda (mêmes composants que le tunnel de réservation,
   portés ici avec les tokens de cette page) */
.premium-contact .pills{display:flex;flex-wrap:wrap;gap:.55rem;margin-bottom:1.4rem}
.premium-contact .pill{position:relative;cursor:pointer;margin:0}
.premium-contact .pill input{position:absolute;opacity:0;width:1px;height:1px;margin:0;pointer-events:none}
.premium-contact .pill span{
  display:inline-block;font-size:.85rem;letter-spacing:.03em;color:var(--encre);
  padding:.5rem 1rem;border:1px solid color-mix(in srgb, var(--laiton) 55%, transparent);
  border-radius:999px;background:var(--blanc);
  transition:background .25s ease, border-color .25s ease, color .25s ease;
}
.premium-contact .pill:hover span{border-color:var(--laiton)}
.premium-contact .pill input:checked + span{background:var(--terracotta);border-color:var(--terracotta);color:var(--blanc);font-weight:500}
.premium-contact .pill input:focus-visible + span{outline:2px solid var(--laiton);outline-offset:2px}

.premium-contact .field select{
  font-family:inherit;font-size:1rem;color:var(--encre);width:100%;
  background:transparent;border:0;border-bottom:1px solid color-mix(in srgb, var(--laiton) 55%, transparent);
  padding:.6rem .1rem;border-radius:0;cursor:pointer;
}

.premium-contact .dp{position:relative}
.premium-contact .dp__field{
  font-family:inherit;font-size:1rem;color:color-mix(in srgb, var(--encre) 55%, transparent);text-align:left;
  width:100%;background:transparent;border:0;border-bottom:1px solid color-mix(in srgb, var(--laiton) 55%, transparent);
  padding:.6rem .1rem;cursor:pointer;
}
.premium-contact .dp__field.has-value{color:var(--encre)}
.premium-contact .dp__pop{
  position:absolute;top:calc(100% + 8px);left:0;z-index:30;width:18rem;max-width:86vw;
  background:var(--blanc);border:1px solid var(--laiton);box-shadow:0 14px 32px rgba(44,36,25,.16);
  padding:1rem 1rem .75rem;
}
.premium-contact .dp__head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem}
.premium-contact .dp__month{font-weight:500;color:var(--encre)}
.premium-contact .dp__nav{
  background:transparent;border:1px solid color-mix(in srgb, var(--laiton) 50%, transparent);border-radius:999px;
  width:1.9rem;height:1.9rem;color:var(--terracotta);cursor:pointer;
  display:inline-flex;align-items:center;justify-content:center;padding:0;
}
.premium-contact .dp__nav:disabled{opacity:.3;cursor:default}
.premium-contact .dp__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.premium-contact .dp__weekdays span{font-size:.6rem;text-transform:uppercase;color:var(--laiton);padding:.25rem 0}
.premium-contact .dp__day{
  background:transparent;border:0;border-radius:999px;cursor:pointer;font-size:.85rem;color:var(--encre);
  width:2.1rem;height:2.1rem;margin:0 auto;display:inline-flex;align-items:center;justify-content:center;
}
.premium-contact .dp__day:hover:not(:disabled){background:var(--sable)}
.premium-contact .dp__day:disabled{color:color-mix(in srgb, var(--encre) 28%, transparent);cursor:default}
.premium-contact .dp__day.is-selected{background:var(--terracotta);color:var(--blanc)}
.premium-contact .dp__note{font-size:.72rem;font-style:italic;color:color-mix(in srgb, var(--encre) 55%, transparent);margin-top:.5rem;text-align:center}
```

- [ ] **Step 2: Écrire `js/site-contact.js`**

```js
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
```

- [ ] **Step 3: Vérifier la syntaxe et reconstruire**

Run (depuis `C:/mdt-site/wandau-mdt`) : `node --check js/site-contact.js && node build.mjs`
Expected: `9 page(s) assemblée(s).`

- [ ] **Step 4: Vérification manuelle par l'utilisateur**

Ouvrir `contact.html` : tester le mode "Message" (nom/email/sujet/message) et le mode
"Privatisation" (champs supplémentaires visibles, agenda cliquable). Soumettre les deux.
Expected (à confirmer par l'utilisateur) : ligne visible dans `requests` (vérifiable via
`/admin/reservations` non — cette table n'a pas encore d'écran admin, hors scope ici ; à défaut
vérifier via une requête SQL ponctuelle), email d'alerte reçu par Tara, email d'accusé de
réception reçu par le client.

- [ ] **Step 5: Commit**

```bash
git add wandau-mdt/js/site-contact.js wandau-mdt/_src/contact.html wandau-mdt/contact.html wandau-mdt/css/premium-contact.css
git commit -m "feat(site): contact + privatisation branchés sur le guichet submit_request"
```

---

## Task 10 : Déploiement — variables Coolify + vérification bout en bout

**Files:** aucun fichier (checklist opérationnelle).

- [ ] **Step 1: Ajouter les variables Coolify (app admin)**

Dans Coolify → app admin → Environment Variables (runtime, pas Build Variables) :
`BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_WEBHOOK_SECRET` (même valeur que Task 2 Step 3),
`BREVO_NEWSLETTER_LIST_ID` (si utilisé). Redéployer l'app.

- [ ] **Step 2: Vérifier l'endpoint webhook en prod**

Run : `curl -s -o /dev/null -w "%{http_code}" -X POST https://admin.maisondetara.propulseo-site.com/api/webhooks/brevo -H "x-webhook-secret: mauvaise-valeur" -d '{}'`
Expected: `401`

- [ ] **Step 3: Test bout en bout réel — newsletter**

S'inscrire via `index.html` avec une vraie adresse email accessible. Vérifier : email de
confirmation reçu, clic sur le lien confirme bien (page "Inscription confirmée"), la ligne passe
à `confirmed` dans `/admin/newsletter`.

- [ ] **Step 4: Test bout en bout réel — réservation en ligne**

Réserver un créneau atelier via `atelier.html#reserver`. Vérifier : email reçu à
`contact@maisondetara.com` (alerte) et à l'adresse de test utilisée (confirmation), réservation
visible dans `/admin/reservations`.

- [ ] **Step 5: Test bout en bout réel — contact et privatisation**

Envoyer un message via `contact.html` en mode "Message" puis en mode "Privatisation". Vérifier
dans chaque cas : email d'alerte à Tara + email d'accusé de réception au client.

- [ ] **Step 6: Nettoyage**

Supprimer tout script de vérification jetable créé pendant les Tasks 1 et 2 (`app/scripts/_tmp-*`)
s'il en reste. Vérifier `git status` propre à l'exception des fichiers de ce chantier.
