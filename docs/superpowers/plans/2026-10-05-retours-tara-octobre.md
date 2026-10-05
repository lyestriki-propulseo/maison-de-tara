# Retours Tara du 04-05/10 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger les 8 retours de Tara (agenda, génération des créneaux, réservations, tableau de bord, prix/durée des événements, adresse, bandeau, boutique, section Réalisations) sans casser le paiement ni la suite E2E.

**Architecture:** Deux dépôts de travail. **Admin** = `app/` sur `feat/socle-v3` (TanStack Start + Supabase, Vitest, Playwright contre la prod). **Site** = worktree `C:/mdt-site` branche `site-deploy` (HTML statique `_src` + `_partials` → `node build.mjs`, JS qui lit Supabase en anon). Une migration SQL (vue publique + RPC tableau de bord). Aucun renommage de colonne : `events.deposit_amount_cents` devient sémantiquement « prix par personne » pour les événements.

**Tech Stack:** React 19, TanStack Start, zod v4, Supabase (PostgREST + RPC), Stripe Checkout, Vitest, Playwright ; site vanilla JS + Locomotive Scroll.

**Spec:** décisions prises en conversation le 05/10 (résumées ci-dessous — elles font foi).

## Décisions métier (validées par Lyes/Tara le 05/10)

1. **Atelier libre** : 6 € × personnes payés en ligne (acompte), reste sur place. **Inchangé.**
2. **Événements** : **prix complet par personne payé en ligne**, pas d'acompte. Le champ `deposit_amount_cents` porte ce prix.
3. **Privatisation** : gérée à part par Tara, hors périmètre (on ne touche pas son mécanisme, sauf la re-synchro après génération — bug de cascade).
4. **Adresse** = `22 Place de la Liberté, 92250 La Garenne-Colombes`. Téléphone = `+33 1 80 88 22 35`.
5. **Agenda** : s'ouvre sur la semaine en cours, titre = plage de dates, pas de navigation vers le passé.
6. **Réservations** : à venir par défaut, historique accessible par un filtre « Passées », rien n'est supprimé.
7. **Section « Certaines réalisations »** : masquée temporairement, réactivable.
8. **Boutique** : la page affiche les vignettes 01→06 remplies dans l'admin, masque les vides.

## Global Constraints

- TypeScript strict, jamais `any` ; imports `@/…` (pas de `../../`).
- Toute nouvelle server function admin porte `.middleware([staffMiddleware])`.
- Toute nouvelle fonction SQL `security definer` : `revoke execute … from public, anon, authenticated;` puis `grant … to service_role` (cf. mémoire grants).
- Date « aujourd'hui » = **Europe/Paris**, jamais `toISOString().slice(0,10)`.
- **Ne pas renommer** le h1 « Tableau de bord » (`e2e/auth.setup.e2e.ts:12`, dont dépend toute la suite), ni « Planning de l’atelier », ni « Réservations ».
- **Ne pas changer** le format d'`aria-label` des créneaux (`AgendaManager.tsx:310`, lu par `e2e/support/db.ts`).
- Site : éditer `_src/` et `_partials/`, jamais les `*.html` buildés à la main ; commiter source + sortie du build.
- Site : écrire dans le DOM via `textContent` / `createElement`, jamais `innerHTML`.
- Commits séparés par changement logique (`feat:`/`fix:`…), avec la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Vérifs admin à chaque tâche : `pnpm typecheck && pnpm test:run && pnpm lint` (depuis `app/`).

## Review Focus

1. **Événement payé au mauvais prix** : un événement existant à 600 c (ancien défaut « acompte ») serait vendu 6 € en tout → l'admin doit afficher clairement « Prix par personne », champ obligatoire ≥ 1 €, et Tara re-saisit les prix (2 brouillons : « Scrapbooking… » 6 €, « Vanessa » 40 €). Test : schéma refuse prix absent / < 100 c.
2. **Événement gratuit par accident** : `deposit_enabled=false` ou prix null → checkout branche 0 € = réservation confirmée sans paiement. Test checkout : événement sans prix → 409 « pas réservable », pas de confirmation gratuite.
3. **Créneaux générés pendant un événement privatisé** restent réservables → re-synchro après génération. Test unitaire sur la fonction qui liste les événements à re-synchroniser.
4. **Planning tronqué / E2E cassés** quand l'horizon passe à fin décembre (limites 300 / 120, `pickTestSlot` = créneau le plus lointain, `openSlot` ≤ 20 semaines) → limites relevées + `pickTestSlot` borné à 6 semaines.
5. **Minuit à Paris** : entre 00:00 et 02:00 la date UTC est la veille → helper `parisToday()` testé avec horloge figée.

---

## Structure des fichiers

**Admin (`app/`, branche `feat/socle-v3`)**
- Create `src/lib/paris-date.ts` (+ test) — `parisToday()`, `addDaysIso()`, `endOfYearIso()`.
- Modify `src/lib/admin-schedule.ts` — schéma `until`, `daysBetweenInclusive()`.
- Modify `src/lib/admin-data.ts` — horizon, re-synchro privatisation, limites, stats tableau de bord.
- Modify `src/lib/events-data.ts` — exporter `syncPrivatisation`.
- Modify `src/components/admin/ScheduleGridEditor.tsx`, `src/routes/admin/reglages.tsx`.
- Modify `src/components/admin/AgendaManager.tsx` (+ test), `admin-shell.css`.
- Modify `src/lib/reservations-data.ts`, `src/lib/reservations.ts`, `src/routes/admin/reservations.tsx`.
- Modify `src/routes/admin/index.tsx`.
- Modify `src/lib/events.ts` (+ test), `src/components/admin/EventForm.tsx`, `src/routes/admin/programme.tsx`, `src/routes/api.reservations.checkout.ts` (+ test), `src/components/admin/AtelierDepositSetting.tsx`.
- Modify `e2e/support/db.ts`, `e2e/programme.e2e.ts`.
- Create `supabase/migrations/20261005100000_dashboard_counts.sql` et `20261005110000_event_price_view.sql`.
- Modify `scripts/seed-content-boutique.mjs`, `scripts/seed-content-contact.mjs`.

**Site (`C:/mdt-site/wandau-mdt`, branche `site-deploy`)**
- Modify `_partials/head.html`, `_partials/header.html`, `_partials/footer.html`, `_src/contact.html`, `_src/mentions-legales.html`.
- Modify `css/mdt-override.css` (topbar).
- Modify `_src/boutique.html`, `css/premium-boutique.css`, `js/site-content.js` ; supprimer `css/premium-boutique-mep.css` + son script inline.
- Modify `_src/index.html` ; create `_partials/realisations.html` (section conservée, non incluse).
- Modify `js/site-events.js`, `js/home-events.js`, `js/premium-calendrier.js`, `css/premium-calendrier.css`, `js/site-booking.js`, `_src/atelier.html`.

---

## PARTIE ADMIN

### Task 1 : Helper de date Paris

**Files:**
- Create: `app/src/lib/paris-date.ts`
- Test: `app/src/lib/paris-date.test.ts`

**Interfaces:**
- Produces: `parisToday(now?: Date): string` (YYYY-MM-DD), `addDaysIso(iso: string, days: number): string`, `endOfYearIso(iso: string): string`, `daysBetweenInclusive(from: string, to: string): number`.

- [ ] **Step 1: Test qui échoue**

```ts
import { describe, expect, it } from 'vitest'
import { addDaysIso, daysBetweenInclusive, endOfYearIso, parisToday } from '@/lib/paris-date'

describe('parisToday', () => {
  it('renvoie la date de Paris, pas la date UTC, après minuit', () => {
    // 4 oct. 23:30 UTC = 5 oct. 01:30 à Paris (UTC+2)
    expect(parisToday(new Date('2026-10-04T23:30:00Z'))).toBe('2026-10-05')
  })
  it('gère l’heure d’hiver', () => {
    expect(parisToday(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01')
  })
})

describe('calculs de dates ISO', () => {
  it('ajoute des jours en traversant un mois', () => {
    expect(addDaysIso('2026-09-28', 7)).toBe('2026-10-05')
  })
  it('donne le 31 décembre de l’année', () => {
    expect(endOfYearIso('2026-10-05')).toBe('2026-12-31')
  })
  it('compte les jours bornes incluses', () => {
    expect(daysBetweenInclusive('2026-10-05', '2026-10-05')).toBe(1)
    expect(daysBetweenInclusive('2026-10-05', '2026-12-31')).toBe(88)
  })
})
```

- [ ] **Step 2:** `pnpm vitest run src/lib/paris-date.test.ts` → FAIL (module absent).

- [ ] **Step 3: Implémentation**

```ts
const PARIS_DAY = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Date du jour à Paris (YYYY-MM-DD) — le serveur tourne en UTC. */
export function parisToday(now: Date = new Date()): string {
  return PARIS_DAY.format(now)
}

function isoToUtcNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`)
}

export function addDaysIso(iso: string, days: number): string {
  const date = isoToUtcNoon(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function endOfYearIso(iso: string): string {
  return `${iso.slice(0, 4)}-12-31`
}

export function daysBetweenInclusive(from: string, to: string): number {
  const ms = isoToUtcNoon(to).getTime() - isoToUtcNoon(from).getTime()
  return Math.round(ms / 86_400_000) + 1
}
```

- [ ] **Step 4:** test → PASS. `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(admin): helper de date à l’heure de Paris`

---

### Task 2 : Générer les créneaux jusqu'à une date choisie (+ re-synchro privatisation, limites)

**Files:**
- Modify: `app/src/lib/admin-schedule.ts:39-56` (schéma), `app/src/lib/admin-data.ts:39-41, 56-62, 91-97, 223-334`
- Modify: `app/src/lib/events-data.ts:18-34` (exporter `syncPrivatisation`)
- Modify: `app/src/components/admin/ScheduleGridEditor.tsx:26, 50-53, 156-169`, `app/src/routes/admin/reglages.tsx:26-43`
- Modify: `app/src/lib/reservations-data.ts:88-97` (limite 120 → 400, date Paris)
- Modify: `app/e2e/support/db.ts:22-44`
- Test: `app/src/lib/admin-schedule.test.ts`, `app/src/components/admin/AgendaManager.test.tsx:92-103`

**Interfaces:**
- Consumes: `parisToday`, `endOfYearIso`, `addDaysIso`, `daysBetweenInclusive` (Task 1).
- Produces: `scheduleGridSchema` = `{ slots, until: string }` ; `ScheduleGridEditor` prop `onSave: (slots: ScheduleSlot[], until: string) => Promise<boolean>` ; `saveScheduleGrid` renvoie `{ templates, generated, removed, privatisationConflicts: number }`.

- [ ] **Step 1: Tests qui échouent** (dans `admin-schedule.test.ts`)

```ts
describe('scheduleGridSchema.until', () => {
  const slots = [{ weekday: 2, startTime: '10:00', durationMinutes: 120, capacity: 25 }]
  it('accepte une date dans l’année qui vient', () => {
    expect(scheduleGridSchema.safeParse({ slots, until: '2026-12-31' }).success).toBe(true)
  })
  it('refuse une date au format invalide', () => {
    expect(scheduleGridSchema.safeParse({ slots, until: '31/12/2026' }).success).toBe(false)
  })
})

describe('untilBounds', () => {
  it('refuse une date passée ou à plus d’un an', () => {
    expect(isUntilInRange('2026-10-04', '2026-10-05')).toBe(false)
    expect(isUntilInRange('2027-10-07', '2026-10-05')).toBe(false)
    expect(isUntilInRange('2026-12-31', '2026-10-05')).toBe(true)
  })
})
```

Adapter le test existant `AgendaManager.test.tsx:92-103` : `expect(onSave).toHaveBeenCalledWith(slots, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))`.

- [ ] **Step 2:** `pnpm vitest run src/lib/admin-schedule.test.ts` → FAIL.

- [ ] **Step 3: Implémentation**

`admin-schedule.ts` — ajouter au schéma et exporter le contrôle de bornes :

```ts
export function isUntilInRange(until: string, today: string): boolean {
  return until >= today && until <= addDaysIso(today, 366)
}

export const scheduleGridSchema = z.object({
  slots: /* inchangé */,
  until: z.iso.date(),
})
```

`admin-data.ts` :
- Remplacer `todayString()` par `parisToday()` (lignes 19 et 40 ; supprimer `todayString`).
- Dans `saveScheduleGrid`, avant toute écriture : `if (!isUntilInRange(data.until, today)) throw new Error('Choisissez une date entre aujourd’hui et dans un an.')`.
- Ligne 326 : `buildFutureSessionInstances(activeTemplates, today, daysBetweenInclusive(today, data.until))`.
- Après l'upsert (après la ligne 331), re-synchroniser les privatisations :

```ts
const { data: privatised, error: privatisedError } = await db
  .from('events')
  .select('id')
  .eq('published', true)
  .eq('privatise', true)
  .gte('starts_at', `${today}T00:00:00Z`)
if (privatisedError) throw new Error(privatisedError.message)
let privatisationConflicts = 0
for (const event of privatised) {
  const result = await syncPrivatisation(db, event.id, false)
  privatisationConflicts += result.reservedConflicts
}
return { templates, generated, removed, privatisationConflicts }
```

  (Vérifier la forme exacte de retour de `syncPrivatisation` dans `events-data.ts:18-34` et l'exporter.)
- `getAgendaData` : `.limit(300)` → `.limit(1000)` et découper la requête des réservations par paquets de 100 ids :

```ts
const chunks: string[][] = []
for (let i = 0; i < ids.length; i += 100) chunks.push(ids.slice(i, i + 100))
const rows = (await Promise.all(chunks.map((chunk) =>
  db.from('reservations').select(/* colonnes actuelles */).in('session_instance_id', chunk),
))).flatMap(({ data, error }) => { if (error) throw new Error(error.message); return data })
```

`reservations-data.ts:88-97` : date Paris + `.limit(400)`.

`ScheduleGridEditor.tsx` : champ `<input type="date">` « Générer jusqu’au » (état local initialisé à `endOfYearIso(parisToday())`, `min` = aujourd'hui, `max` = +366 j), passé à `onSave(slots, until)`. Texte d'aide l.50-53 remplacé par :
« Les créneaux sont créés jusqu’à la date choisie. Ceux qui existent déjà gardent leur capacité et leur blocage : pour changer la capacité d’un créneau déjà créé, ouvrez-le dans le Planning. »

`reglages.tsx` : `saveGrid(slots, until)` → `saveScheduleGrid({ data: { slots, until } })` ; message de succès : « Horaires enregistrés, créneaux créés jusqu’au {date longue}. » + si `privatisationConflicts > 0` : « {n} créneau(x) réservé(s) chevauchent un événement privatisé — à vérifier dans le Planning. »

`e2e/support/db.ts:22-44` `pickTestSlot` : borner la recherche à `session_date <= today + 42 jours` (créneau ouvert le plus lointain **dans les 6 semaines**), date du jour via la même formule Paris.

- [ ] **Step 4:** `pnpm typecheck && pnpm test:run && pnpm lint` → PASS.
- [ ] **Step 5: Commit** `feat(admin): générer les créneaux jusqu’à une date choisie` (+ commit séparé `fix(admin): re-bloquer les créneaux des événements privatisés après génération`).

---

### Task 3 : Planning — semaine en cours, titre en plage de dates, pas de passé

**Files:**
- Modify: `app/src/components/admin/AgendaManager.tsx:39-42, 66-81, 90-97, 261-321`
- Modify: `app/src/components/admin/admin-shell.css` (classe jour passé)
- Test: `app/src/components/admin/AgendaManager.test.tsx`

**Interfaces:**
- Consumes: `parisToday`, `addDaysIso` (Task 1).
- Produces: prop optionnelle `today?: string` sur `AgendaManager` (défaut `parisToday()`), pour des tests déterministes et une hydratation stable.

- [ ] **Step 1: Tests qui échouent**

```ts
it('ouvre sur la semaine en cours avec une plage de dates', () => {
  render(<AgendaManager data={dataWith('2026-10-08')} today="2026-10-04" … />)
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('28 sept. – 4 oct. 2026')
})
it('désactive « Semaine précédente » sur la semaine en cours', async () => {
  render(<AgendaManager data={dataWith('2026-10-08')} today="2026-10-05" … />)
  expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Semaine suivante' }))
  expect(screen.getByRole('button', { name: 'Semaine précédente' })).toBeEnabled()
})
it('marque les jours passés de la semaine', () => {
  render(<AgendaManager data={dataWith('2026-10-08')} today="2026-10-07" … />)
  expect(screen.getByText(/lun/i).closest('[data-past]')).not.toBeNull()
})
```

Adapter les tests existants (`:63-74`) qui utilisent un créneau au `2026-07-18` : passer `today="2026-07-13"`.

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implémentation**
  - `const today = props.today ?? parisToday()` ; `useState(() => startOfWeek(today))` ; `selectedId` par défaut = premier créneau de cette semaine, sinon premier créneau.
  - Titre : `formatWeekRange(weekStart)` → `"28 sept. – 4 oct. 2026"` (même mois : `"5 – 11 oct. 2026"`), via `Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })` sur des dates à midi UTC.
  - Bouton précédent : `disabled={weekStart <= startOfWeek(today)}`.
  - « Aujourd’hui » et `isToday` : utiliser `today` au lieu de `toIsoDate(new Date())`.
  - En-tête et cellules d'un jour `< today` : `data-past` + classe `is-past` (CSS : `opacity: .45; background: repeating-linear-gradient(…)` discret, curseur par défaut).
  - Supprimer le bloc mort `hidden` (l.163-187) seulement s'il n'est référencé par aucun test.
- [ ] **Step 4:** PASS + typecheck + lint.
- [ ] **Step 5: Commit** `feat(admin): le planning s’ouvre sur la semaine en cours, sans retour vers le passé`

---

### Task 4 : Réservations — à venir par défaut, filtre « Passées »

**Files:**
- Modify: `app/src/lib/reservations-data.ts:14-66`, `app/src/lib/reservations.ts:21-27`, `app/src/routes/admin/reservations.tsx:35, 68, 99-128`
- Test: `app/src/lib/reservations.test.ts` (créer si absent)

**Interfaces:**
- Produces: `listReservations({ data: { when: 'upcoming' | 'past' } })` ; chaque ligne a `targetDay: string | null` (YYYY-MM-DD Paris) ; fonction pure `isUpcoming(targetDay: string | null, today: string): boolean` dans `reservations.ts`.

- [ ] **Step 1: Test qui échoue**

```ts
describe('isUpcoming', () => {
  it('classe aujourd’hui dans « à venir »', () => expect(isUpcoming('2026-10-05', '2026-10-05')).toBe(true))
  it('classe hier dans « passées »', () => expect(isUpcoming('2026-10-04', '2026-10-05')).toBe(false))
  it('classe une cible supprimée dans « passées »', () => expect(isUpcoming(null, '2026-10-05')).toBe(false))
})
```

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implémentation**
  - Côté serveur, filtrer par la **cible**, pas par `created_at` :
    - `upcoming` : ids des `session_instances` avec `session_date >= parisToday()` + ids des `events` avec `starts_at >= ${today}T00:00:00+02:00` (utiliser `starts_at >= now() - 1 jour` puis filtrer avec `isUpcoming` en mémoire, pour éviter le calcul de fuseau en SQL) ; puis réservations `in` ces ids, par paquets de 100, triées par date de cible croissante.
    - `past` : les 300 dernières par `created_at` desc, filtrées par `!isUpcoming`.
  - `targetDay` : `session_date` pour l'atelier ; `parisToday(new Date(starts_at))` pour un événement.
  - `RESERVATION_DATE_FMT` : ajouter `timeZone: 'Europe/Paris'`.
  - UI : sélecteur « À venir / Passées » au-dessus des onglets de statut (défaut « À venir », valeur dans l'URL `?when=past` via `validateSearch` comme les autres routes) ; compteurs de statut calculés sur la liste affichée ; message vide « Aucune réservation à venir. »
- [ ] **Step 4:** PASS + typecheck + lint.
- [ ] **Step 5: Commit** `feat(admin): réservations à venir par défaut, historique dans « Passées »`

---

### Task 5 : Tableau de bord — « Vue d’ensemble » avec des chiffres justes

**Files:**
- Create: `supabase/migrations/20261005100000_dashboard_counts.sql`
- Modify: `app/src/lib/admin-data.ts:15-37`, `app/src/routes/admin/index.tsx:10-14, 45-50`, `app/src/types/database-rpc.types.ts`

**Interfaces:**
- Produces: RPC `public.dashboard_counts(p_today date)` → `table(upcoming_reservations int, open_sessions_30d int, newsletter_confirmed int)`.

- [ ] **Step 1: Migration (partie RPC)**

```sql
create or replace function public.dashboard_counts(p_today date)
returns table (upcoming_reservations integer, open_sessions_30d integer, newsletter_confirmed integer)
language sql stable security definer set search_path = public as $$
  select
    (select count(*)::int from reservations r
       left join session_instances s on s.id = r.session_instance_id
       left join events e on e.id = r.event_id
      where r.status in ('pending', 'confirmed')
        and coalesce(s.session_date, (e.starts_at at time zone 'Europe/Paris')::date) >= p_today),
    (select count(*)::int from session_instances
      where status = 'open' and session_date between p_today and p_today + 29),
    (select count(*)::int from newsletter_subscribers where status = 'confirmed');
$$;
revoke execute on function public.dashboard_counts(date) from public, anon, authenticated;
grant execute on function public.dashboard_counts(date) to service_role;
```

  (Vérifier avant d'écrire : noms exacts des statuts `reservation_status` et `newsletter_subscribers.status` dans les migrations.)

- [ ] **Step 2:** Appliquer : `node scripts/apply-one-migration.mjs ../supabase/migrations/20261005100000_dashboard_counts.sql`. Vérifier en anon que l'appel échoue (`/rest/v1/rpc/dashboard_counts` → 401/404).
- [ ] **Step 3: Code**
  - `getDashboardStats` : `db.rpc('dashboard_counts', { p_today: parisToday() })` + garder `newRequests`.
  - `index.tsx` : **h1 « Tableau de bord » inchangé**. Carte : surtitre « En un coup d’œil », titre « Vue d’ensemble », mention « Données en direct ». Lignes : « Réservations à venir » (hors annulées), « Créneaux ouverts — 30 prochains jours », « Abonnés newsletter confirmés ».
- [ ] **Step 4:** typecheck + test:run + lint ; ouvrir `/admin` en dev et vérifier les 3 chiffres contre une requête SQL manuelle.
- [ ] **Step 5: Commit** `fix(admin): le tableau de bord n’annonce plus « aujourd’hui » pour des totaux`

---

### Task 6 : Événements — prix par personne payé en totalité, heure de fin obligatoire

**Files:**
- Modify: `app/src/lib/events.ts:22-38` (+ `events.test.ts`)
- Modify: `app/src/components/admin/EventForm.tsx:12-26, 77-100`
- Modify: `app/src/lib/events-data.ts:43-75`, `app/src/routes/admin/programme.tsx:90-91, 104, 120-139, 157`
- Modify: `app/src/routes/api.reservations.checkout.ts:81-142` (+ test)
- Modify: `app/src/components/admin/AtelierDepositSetting.tsx:6, 46`
- Create: `supabase/migrations/20261005110000_event_price_view.sql`
- Modify: `app/e2e/programme.e2e.ts` (remplir prix + fin)

**Interfaces:**
- Produces: schéma événement `{ …, endsAt: string (obligatoire), priceCents: number (100..100000) }` — **le nom TS change** (`priceCents`), la colonne reste `deposit_amount_cents` ; à l'écriture `deposit_enabled = true`, `deposit_amount_cents = priceCents`. Vue `public_availability_events` gagne `price_cents` (dernière colonne).

- [ ] **Step 1: Tests qui échouent**

`events.test.ts` :
```ts
it('exige un prix d’au moins 1 €', () => {
  expect(eventSchema.safeParse({ ...base, priceCents: 50 }).success).toBe(false)
  expect(eventSchema.safeParse({ ...base, priceCents: undefined }).success).toBe(false)
})
it('exige une heure de fin après le début', () => {
  expect(eventSchema.safeParse({ ...base, endsAt: null }).success).toBe(false)
})
it('accepte 12,50 €', () => {
  expect(eventSchema.safeParse({ ...base, priceCents: 1250 }).success).toBe(true)
})
```
(Remplacer l'ancien test « endsAt null par défaut » l.45-49.)

`api.reservations.checkout.test.ts` — remplacer les cas l.126-181 (`deposit_enabled:false` → gratuit) par :
```ts
it('facture le prix complet par personne pour un événement', async () => {
  mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 4500 })
  const res = await post({ eventId, partySize: 2 })
  expect(stripeCreate).toHaveBeenCalledWith(expect.objectContaining({
    line_items: [expect.objectContaining({ price_data: expect.objectContaining({ unit_amount: 9000 }) })],
  }), expect.anything())
})
it('refuse un événement sans prix au lieu de le confirmer gratuitement', async () => {
  mockEvent({ title: 'Soirée', deposit_enabled: false, deposit_amount_cents: null })
  const res = await post({ eventId, partySize: 2 })
  expect(res.status).toBe(409)
  expect(confirmRpc).not.toHaveBeenCalled()
})
it('garde l’événement présélectionné si le paiement est annulé', async () => {
  mockEvent({ title: 'Soirée', deposit_enabled: true, deposit_amount_cents: 4500 })
  await post({ eventId, partySize: 1 })
  expect(stripeCreate.mock.calls[0][0].cancel_url).toContain(`event=${eventId}`)
})
```
(Adapter aux helpers de mock réellement présents dans le fichier.)

- [ ] **Step 2:** FAIL.
- [ ] **Step 3: Implémentation**
  - `events.ts` : `endsAt: z.string().min(1, 'Indiquez l’heure de fin.')`, `priceCents: z.number().int().min(100, 'Le prix doit être d’au moins 1 €.').max(100000)` ; supprimer `depositEnabled` / `depositAmountCents` ; garder le refine « fin après début » ; le refine privatisation devient inutile (fin toujours présente) — garder son message seulement si un test e2e l'attend (`programme.e2e.ts` test 2 : à adapter, le message devient « Indiquez l’heure de fin. »).
  - `EventForm.tsx` : « Fin » (sans « facultatif ») ; champ « Prix par personne (€) » `type=number step="0.5" min="1"`, conversion `Math.round(Number(v) * 100)` ; aide : « Payé en totalité en ligne au moment de la réservation. » ; supprimer la case « Acompte demandé en ligne » ; défaut vide (pas 600).
  - `events-data.ts` : lecture `priceCents: row.deposit_amount_cents ?? 0`, `endsAt` ; écriture `deposit_enabled: true, deposit_amount_cents: data.priceCents`.
  - `programme.tsx` : `edit` sans `?? 600` ; `togglePublish` — **ne pas revalider le formulaire complet** pour dépublier : si l'événement n'a pas de fin ou de prix, la publication est refusée avec un message clair (« Ajoutez une heure de fin et un prix avant de publier »), la dépublication passe toujours (écrire seulement `published`). Texte l.157 : « …le prix par personne… ». Liste des événements : afficher « 45 € / pers. · 2h ».
  - Checkout l.81-89 :
```ts
if (!event.deposit_enabled || !event.deposit_amount_cents || event.deposit_amount_cents < 100) {
  return json({ error: 'Cet événement n’est pas encore ouvert à la réservation.' }, 409, cors)
}
amountCents = event.deposit_amount_cents * partySize
```
    Libellé Stripe : atelier « Acompte atelier — N pers. », événement « {titre} — N pers. ». `cancel_url` : ajouter `&event=${eventId}` en mode événement. Entourer `stripe.checkout.sessions.create` d'un `try/catch` → 502 avec en-têtes CORS.
  - `AtelierDepositSetting.tsx:46` : « Les événements ont leur propre prix, payé en totalité en ligne. »
  - Migration vue (ajout **en dernière colonne** uniquement) :
```sql
create or replace view public.public_availability_events with (security_barrier = true) as
  select /* colonnes actuelles, même ordre, recopiées de 20260819100000_public_booking.sql:129-158 */,
         case when e.deposit_enabled then e.deposit_amount_cents end as price_cents
  from …;
```
  - `e2e/programme.e2e.ts` : remplir « Fin » et « Prix par personne » dans les tests 1, 2, 4.
- [ ] **Step 4:** `pnpm typecheck && pnpm test:run && pnpm lint` → PASS ; appliquer la migration ; `curl` anon sur `public_availability_events?select=id,price_cents` → 200.
- [ ] **Step 5: Commits** `feat(admin): prix par personne pour les événements, payé en totalité` / `fix(paiement): un événement sans prix n’est plus confirmé gratuitement` / `feat(db): exposer le prix des événements au tunnel public`.

---

### Task 7 : Seeds alignés sur la base (évite un retour en arrière si on les relance)

**Files:** `app/scripts/seed-content-boutique.mjs`, `app/scripts/seed-content-contact.mjs`

- [ ] Boutique : remplacer les entrées galerie par 01→06 (titres/textes = valeurs actuelles en base, 05/06 vides), retirer `interlude`/`accent`, hero photo = `storefront.jpg`.
- [ ] Contact : `contact.hero.intro` avec « 22 Place de la Liberté ».
- [ ] Ajouter en tête de chaque seed : `// ⚠️ Écrase le contenu saisi par Tara. Ne relancer que sur une base vide.`
- [ ] **Commit** `chore(seed): aligner les seeds boutique et contact sur le contenu en ligne`

---

## PARTIE SITE (`C:/mdt-site`, branche `site-deploy`)

Avant de commencer : `git -C /c/mdt-site fetch propulseo main && git -C /c/mdt-site merge --ff-only propulseo/main` (3 commits de retard, en avance rapide).

Vérification de chaque tâche site : `node build.mjs && node tools/test-build.mjs` dans `wandau-mdt/`, puis captures Playwright (desktop 1440, tablette 834, mobile 390 en émulation iPhone `isMobile/hasTouch`) des pages touchées, avant/après.

### Task 8 : Adresse et téléphone partout

**Files:** `_partials/head.html:21,26`, `_partials/header.html:53,58,85,119-121`, `_partials/footer.html:17,19`, `_src/contact.html:22,31,42,46,50,54,88-89`, `_src/mentions-legales.html:27`, `js/site-content.js:51-67`

- [ ] Remplacer toutes les valeurs de repli : `+33 6 50 53 51 49` → `+33 1 80 88 22 35`, `tel:+33650535149` → `tel:+33180882235`, `1 Rue Gabriel Péri` → `22 Place de la Liberté` (JSON-LD : `"telephone": "+33180882235"`, `"streetAddress": "22 Place de la Liberté"`).
- [ ] `contact.html:42` : `<p data-mdt-content="global.contact.adresse" data-mdt-mode="lines">22 Place de la Liberté<br>92250 La Garenne-Colombes</p>` ; `:50` et `:54` : ajouter `data-mdt-content="global.contact.email"` / `"global.contact.instagram"`.
- [ ] `site-content.js` `applyText` : mode `lines` = couper à la première `", "` et reconstruire `texte`, `<br>`, `texte` avec `createTextNode`/`createElement('br')`.
- [ ] `syncContactHrefs` : pour `global.contact.adresse`, mettre à jour l'iframe Maps **seulement si l'URL diffère** (évite un rechargement) : `https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed`.
- [ ] Map statique + `title` + `alt` de la devanture avec la nouvelle adresse.
- [ ] Vérif : `grep -rn "Gabriel\|650535149\|50 53 51 49" _src _partials js` → aucune occurrence. Page contact : bloc Coordonnées, carte, bandeau et pied de page affichent tous Liberté.
- [ ] **Commit** `fix(site): une seule adresse (22 place de la Liberté) partout, carte comprise`

### Task 9 : Bandeau du haut stable

**Files:** `css/mdt-override.css:859-908, 1180-1181`

- [ ] Après la ligne 902, ajouter :
```css
.topbar { overflow: hidden; }
.topbar__inner, .topbar__info { flex-wrap: nowrap; min-width: 0; }
.topbar__info { flex: 1 1 auto; overflow: hidden; }
.topbar__info li { white-space: nowrap; flex: 0 0 auto; }
.topbar__info li:nth-child(2) { flex: 0 1 auto; min-width: 0; }
.topbar__info li:nth-child(2) > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.topbar__opening { white-space: nowrap; flex: 0 0 auto; }
@media (max-width: 1100px) { .topbar__info li:nth-child(3) { display: none; } }
@media (max-width: 820px) { .topbar__opening { display: none; } }
```
- [ ] Ligne 1180-1181 : séparer `.topbar { transition: transform .35s ease, background-color .35s ease, border-color .35s ease; }` de `.mdt-header`.
- [ ] Vérif : navigation accueil → atelier → boutique → contact à 1440, 1024 et 834 px (enregistrement vidéo Playwright) : le bandeau ne change ni de hauteur ni de disposition ; seuils ajustés si l'ellipse coupe à 1440.
- [ ] **Commit** `fix(site): le bandeau du haut ne bouge plus au changement de page`

### Task 10 : Galerie boutique pilotée par l'admin (01→06, vides masquées)

**Files:** `_src/boutique.html:41-101, 136-170`, `css/premium-boutique.css:293-366, 520-555`, `js/site-content.js:103-114`, delete `css/premium-boutique-mep.css`

- [ ] HTML : 6 `<figure class="piece reveal" data-mdt-hide-if-empty="boutique.galerie.0N.titre">` dans l'ordre ; replis statiques 01-04 = textes actuels en base ; 05 et 06 avec l'attribut `hidden` ; `<span class="num" aria-hidden="true"></span>` vide ; formats de cadre : 01 arche, 02 paysage, 03 portrait, 04 paysage, 05 portrait, 06 paysage.
- [ ] `site-content.js` (après `applyRow`) :
```js
const byKey = new Map(rows.map((r) => [r.field_key, r]));
document.querySelectorAll('[data-mdt-hide-if-empty]').forEach((el) => {
  const row = byKey.get(el.dataset.mdtHideIfEmpty);
  if (!row) return;
  if (row.text_value && row.text_value.trim()) el.hidden = false;
  else el.remove();
});
window.__mdtLoco?.update?.();
```
- [ ] CSS : retirer les placements `.piece--0N` et `.piece--interlude/--accent` ; grille générique :
```css
.premium-boutique .murs { counter-reset: piece; }
.premium-boutique .murs > .piece { grid-column: span 6; counter-increment: piece; }
.premium-boutique .murs > .piece:nth-child(even) { margin-top: clamp(2.5rem, 5.5vw, 5rem); }
.premium-boutique .piece .num::before { content: counter(piece, decimal-leading-zero); }
@media (max-width: 900px) { .premium-boutique .murs > .piece { grid-column: span 3; } }
@media (max-width: 560px) {
  .premium-boutique .murs > .piece { grid-column: auto; margin-top: 0; }
  .premium-boutique .murs > .piece:last-child:nth-child(odd) { grid-column: 1 / -1; }
}
```
- [ ] Supprimer `premium-boutique-mep.css` et le script inline `?mep` (l.136-170).
- [ ] Vérif : la page affiche « Décoration & Art de la table », « Textiles & Block print », « Céramiques », « Papeterie & idées cadeaux » numérotées 01-04, avec les photos de l'admin ; pas d'« Art de la table » seul. Remplir temporairement 05 en base → elle apparaît en 05 → revider. Captures 1440/834/390.
- [ ] **Commit** `fix(site): la galerie boutique affiche exactement les vignettes saisies dans l’admin`

### Task 11 : Masquer « Certaines réalisations »

**Files:** `_src/index.html:244-301`, create `_partials/realisations.html`

- [ ] Déplacer le bloc `<section … id="realisations">…</section>` tel quel dans `_partials/realisations.html` (en tête : `<!-- Section masquée le 05/10 à la demande de Tara. Pour la réafficher : remettre l’include dans _src/index.html à la place du commentaire. -->`) et, dans `index.html`, laisser seulement `<!-- Section « Certaines réalisations » masquée — voir _partials/realisations.html -->`. **Pas de commentaire HTML autour du bloc** (il contient des `-->` internes).
- [ ] Vérifier que `build.mjs` n'inclut pas automatiquement tous les partials (il ne traite que les marqueurs `include` présents).
- [ ] Les champs `accueil.realisations.*` restent en base et dans l'admin (pour la réactivation) — on ne les supprime pas.
- [ ] Vérif : accueil desktop (Locomotive actif) défilé jusqu'au pied de page sans blanc ni coupure ; mobile 390 OK.
- [ ] **Commit** `feat(site): masquer la section « Certaines réalisations » avant l’ouverture`

### Task 12 : Durée et prix des événements sur l'accueil, le calendrier et le tunnel

**Files:** `js/site-events.js:37-50, 70-73`, `js/home-events.js:45-72`, `js/premium-calendrier.js:59-95`, `css/premium-calendrier.css`, `js/site-booking.js:49-61, 103-148`, `_src/atelier.html:176`

- [ ] `site-events.js` : `select=…,ends_at,deposit_enabled,deposit_amount_cents` ; `mapRow` ajoute :
```js
duree: row.ends_at ? formatDuree(new Date(row.ends_at) - new Date(row.starts_at)) : '',
prix: row.deposit_enabled && row.deposit_amount_cents ? formatEuros(row.deposit_amount_cents) + ' / pers.' : '',
```
  avec `formatDuree(ms)` → `"2h"`, `"1h30"` et `formatEuros(c)` → `"45 €"`, `"12,50 €"` (espace insécable). Repli `events.json` : champs absents tolérés.
- [ ] `home-events.js` : ligne horaire = `Jeudi 26 novembre 2026 · 18h30 · 2h` puis `<strong>` prix (classe existante `.event-row__time strong`) ; la description reste dessous.
- [ ] `premium-calendrier.js` : dans `.prog-meta`, ajouter `<span class="prog-duree">2h</span>` et `<span class="prog-prix">45 € / pers.</span>` (CSS calqué sur `.prog-time`).
- [ ] `site-booking.js` : lire `price_cents` dans `public_availability_events` ; afficher dans `.evt-pick__meta` ; quand un événement est choisi, écrire dans un **`<span id="rf-prix-evenement">` enfant séparé** (pas l'élément `data-mdt-content`) : « Paiement en ligne de 45 € par personne, en totalité, par carte bancaire. » ; `_src/atelier.html:176` : texte de repli « Le prix de l’événement est réglé en totalité en ligne, par carte bancaire. » + le `<span>`.
- [ ] Vérif : publier un événement de test (prix 45 €, 18h30-20h30) via l'admin local → accueil, calendrier, tunnel `atelier.html?event=<id>#reserver` affichent « 2h » et « 45 € / pers. » ; Stripe test → 90 € pour 2 personnes ; annulation Stripe → retour avec l'événement présélectionné ; supprimer l'événement de test.
- [ ] **Commit** `feat(site): durée et prix par personne des événements`

---

## Vérification finale et déploiement

- [ ] Admin : `pnpm typecheck && pnpm test:run && pnpm lint` ; `pnpm e2e` en local contre la prod (29+ tests verts) ; contrôle `content_blocks` / `events` / `session_instances` inchangés après E2E.
- [ ] Revue de code finale (agent reviewer distinct) sur les deux branches.
- [ ] Déploiement admin (memory deploy-site-coolify) : `fetch propulseo main` + merge + build + push + deploy Coolify API `force=true` ; **appliquer les migrations AVANT** (la nouvelle admin appelle `dashboard_counts`).
- [ ] Déploiement site : merge `propulseo/main` → push `site-deploy:main` (auto-deploy) ; vérifier en prod les 4 pages touchées (contact, boutique, accueil, atelier).
- [ ] `E2E_BASE_URL=https://admin.maisondetara.propulseo-site.com pnpm e2e` contre la prod.
- [ ] Message à Tara : (1) cliquer « Enregistrer et générer » avec « jusqu’au 31/12 » dans Réglages ; (2) saisir **prix par personne + heure de fin** sur ses 2 événements brouillons (« Scrapbooking » est à 6 €, « Vanessa » à 40 € : à confirmer) ; (3) les vignettes 05/06 vides restent cachées tant qu'elle ne les remplit pas.

## Ordre d'exécution et dépendances

```
Task 1 ─┬─ Task 2 ── Task 3
        ├─ Task 4
        └─ Task 5
Task 6 (migration vue) ── Task 12 (tunnel lit price_cents)
Task 7, 8, 9, 10, 11 : indépendantes
```
