# Cadrage — Admin de Tara

**Date :** 2026-07-15
**Projet :** Maison de Tara — back-office (Phase 2/3, stack V3)
**Statut :** Cadrage validé en session grilling, prêt pour planification
**Méthode :** Interview grilling (une décision à la fois, avec reco)

> Ce document tranche le **périmètre et les besoins de Tara sur son admin**. Il fait
> entrer dans le périmètre du lancement ce que la spec initiale
> [`2026-05-27-stack-front-vitrine-design.md`](2026-05-27-stack-front-vitrine-design.md)
> avait **repoussé** (base de données, auth, dashboard) : le besoin réel de Tara est
> opérationnel, pas seulement éditorial.

---

## Principe directeur

**UN seul admin unifié** pour Tara — fondatrice solo, non-technique, brand-first
(« luxe silencieux »). Elle se connecte à un seul endroit pour tout : résas, agenda,
bons cadeaux, événements, journal, galerie, infos pratiques, newsletter, demandes.

- Base **Postgres**. Piste tech privilégiée : **Payload** (admin fourni + collections
  sur mesure + Live Preview natif) ou un dashboard **TanStack** maison. → à trancher au plan.
- **Garde-fous** partout : Tara ne doit pas pouvoir casser le design premium ni l'ADN.

---

## 1. Réservations — cœur opérationnel

- **Réservation en ligne + acompte**, paiement via **Monetico** (solution Crédit
  Mutuel/CIC de sa banque — **pas Stripe**) : page de paiement hébergée par la banque
  + retour signé (HMAC). Tara a **aussi** un back-office Monetico côté banque (séparé de son admin).
- **Réservable en ligne :**
  - Créneaux d'**atelier libre** — grille hebdo fixe (sessions à horaires fixes, ex.
    mar–dim 10h/14h/17h), capacité X places/session, créneaux **auto-générés** + exceptions
    (fermer un jour, ajouter une session spéciale).
  - **Workshops/événements datés** (section calendrier).
- **Groupes** (EVJF, anniversaires, entreprises, kids) = **formulaire de demande → devis**,
  sans paiement en ligne. Bloquent la capacité une fois posés (voir agenda).
- **Acompte ~6 €/pers** : **déduit de la note finale** sur place ; **conservé si no-show** ;
  **non remboursable**.
- **Annulation / report** : gérés **à la main par Tara** dans l'admin. Pas de self-service,
  **pas de remboursement Monetico** à coder au lancement.
- **Emails** : confirmation client (récap créneau + acompte payé + adresse) + **rappel
  24–48 h avant** + **notif à Tara** à chaque résa. Via Brevo (transactionnel) + une
  tâche planifiée pour le rappel.
- **Agenda unifié** (source unique de vérité, zéro surbooking) : voir les résas jour/semaine
  par session · **ajouter une résa manuelle** (téléphone/sur place) · **bloquer un créneau
  ou une journée** (férié, privatisation) · **ajuster la capacité** ponctuellement.

## 2. Bons cadeaux — en ligne dès le lancement (2ᵉ flux Monetico)

- **Deux types :**
  - « **Session / expérience** » — prix fixe, usage unique.
  - « **Montant** » — utilisable en boutique/café/atelier, avec **suivi de solde** et
    usage partiel (parce qu'il y a une boutique chez Maison de Tara).
- **Achat en ligne** (Monetico) → code + PDF envoyés par email.
- **Utilisation sur place** : Tara saisit le code dans l'admin → marque « utilisé » /
  décompte le solde.
- **Durée de validité** à fixer (obligation légale FR).

## 3. Caisse / encaissement — frontière légale (NF525)

- L'admin est un **« chef d'orchestre » NON-fiscal** : il affiche résa + acompte payé
  + solde du bon + **total à encaisser**, et calcule le montant.
- L'**encaissement réel** (carte/espèces) + le **ticket fiscal** passent par un
  **terminal certifié tiers** (SumUp / Square / Zettle — NF525 inclus). Tara tape le total dessus.
- Les bons cadeaux sont suivis dans l'admin (**système de bons ≠ caisse fiscale**).
- → On **évite la certification NF525** tout en donnant à Tara une vue centrale sur place.

## 4. Contenu éditorial — périmètre ciblé

- **Tara édite :** événements/calendrier, Journal, galerie, infos pratiques
  (horaires, adresse, téléphone, réseaux).
- **Verrouillé (Propul'SEO) :** textes de marque (hero, storytelling), structure, design.
- **Journal :** éditeur léger (titre, image de couverture, texte riche, date), **création
  de nouveaux articles**, publication en 1 clic, SEO auto (slug + meta). 2–3 articles seed au lancement.
- **Galerie :** éditeur **visuel** — choisir LA grande photo, régler **taille / mise en
  avant** de chaque vignette, avec **rendu identique au site** ; upload/réordonne en
  glisser-déposer ; optimisation image auto.
- **Événements :** fiches datées (titre, date/heure, type, description, capacité, image,
  acompte oui/non). Pas de récurrence complexe.
- **Aperçu « rendu réel » :** galerie en visuel direct ; journal/événements via bouton
  **« prévisualiser »** (vraie page, brouillon) avant publication. → **Payload Live Preview**
  couvre ce besoin nativement.

## 5. Newsletter

- Le site **collecte** les inscrits (**double opt-in** RGPD) → **synchro auto dans Brevo**.
- Tara **déclenche l'envoi depuis son admin via l'API Brevo** (choix d'un template Brevo
  pré-fait + sa liste). Délivrabilité = infra Brevo (identique à un envoi depuis Brevo, **pas
  plus de risque spam**). Lettres simples ; les templates riches se préparent une fois dans Brevo.

## 6. Demandes / devis

- Formulaires (privatisations groupe + contact) → **fiche dans l'admin** avec **statut**
  (nouvelle / en cours / traitée / devis envoyé) + **notif email** à Tara. Suivi des pistes
  de groupe (= du CA), rien ne se perd.

## 7. Comptes & accès

- **Tara seule** au lancement, mais base **conçue pour évoluer** : ajout de comptes
  employés à droits limités plus tard (voir agenda/résas, pas paramètres/stats).
  Aucune refonte future.

## 8. Tableau de bord d'accueil

- À la connexion, Tara voit l'essentiel du jour : **résas du jour + remplissage** des
  prochaines sessions · **nouvelles demandes de groupe** · **derniers bons cadeaux vendus**
  · **nb d'inscrits newsletter**.

## 9. RGPD & transverses

- Données hébergées **en Europe** (Supabase EU + Brevo FR + Monetico FR).
- Politique de confidentialité + CGV ; double opt-in newsletter.
- Accès/suppression des données **gérés à la main** par Tara au lancement (faible volume) ;
  rétention des résas **~3 ans**.
- **Analytics site** (trafic, sources) suivies par **Propul'SEO** (Plausible), **hors admin
  de Tara** — pour ne pas la noyer. *(défaut retenu — à rediscuter si Tara veut voir le trafic)*
- **Rappels par email uniquement** ; SMS (Brevo SMS) = **option v2** si le no-show reste
  élevé. *(défaut retenu)*
- **FR uniquement** au lancement.

---

## Reporté en v2 (hors périmètre lancement)

- Report / annulation **self-service** côté client.
- **Remboursements Monetico** automatisés.
- Bon cadeau **utilisable en ligne** au checkout (déduit du paiement).
- **Rappels SMS**.
- **Rôles/permissions** multi-employés.
- **Blog complet SEO** (catégories, tags, programmation).
- **E-commerce** boutique.

## ⚠️ Point ouvert — produit Monetico à confirmer

Le premier document fourni (`openapi.json`) était **Monetico Split (plateforme Paysurf)** :
API marketplace multi-marchands (comptes, KYC, wallets, P2P, split obligatoire sur chaque
paiement). **Inadapté** à un commerçant unique comme Tara → mauvais document.

Il faut la doc du **Monetico Paiement classique** (mono-marchand) : page hébergée CM-CIC,
clé de sécurité HMAC (MAC), URL de retour + notification serveur. À récupérer avant tout dev.

**À confirmer auprès de la banque / du conseiller de Tara :**

- Le **produit souscrit** est bien « Monetico Paiement » (et pas Split/Paysurf).
- Les **paramètres TPE** : numéro de TPE, code société, et la **clé de sécurité** (secret
  HMAC). ⚠️ La clé est un secret → variables d'env (`.env` gitignoré), **jamais** commitée.
- Les **URLs** de paiement (test + prod, ex. `https://p.monetico-services.com/paiement.cgi`).
- Les **options** souscrites : paiement comptant, remboursement via API/back-office,
  3-D Secure, paiement fractionné (pas nécessaire au lancement).

## Décisions tech verrouillées

- **Base de l'admin = dashboard sur-mesure TanStack + Supabase** (décidé 2026-07-15).
  React/TanStack partout (site + admin, une seule stack), Supabase = Postgres + Auth +
  Storage + RLS. Contrôle total sur les écrans opérationnels (agenda, caisse, bons, Monetico) ;
  CRUD contenu construit maison. On abandonne Payload et le Sanity séparé.

## Points tech à trancher au plan

- Intégration **Monetico Paiement** (à la main : construction + vérification du MAC HMAC,
  form POST vers la page hébergée, traitement de la notification serveur `url_retour`).
- Où tourne **Postgres** (Supabase managé vs Postgres sur Coolify) — en cohérence avec le
  choix Payload/maison.
- Deux flux de paiement Monetico à fiabiliser : **acompte** et **bon cadeau**.

---

*Cadrage produit en session grilling avec Propul'SEO · 2026-07-15*
