-- US-002 (docs/us/US-002-pages-legales-editables.md) : pages Mentions légales et Politique de
-- confidentialité éditables section par section dans /admin/contenu (pages « mentions-legales » et
-- « confidentialite », cf. CONTENT_PAGES dans app/src/lib/content.ts). Côté site :
-- data-mdt-page + data-mdt-content dans _src/mentions-legales.html et _src/politique-de-confidentialite.html,
-- mode data-mdt-mode="texte" (js/content-format.js).
--
-- Valeurs de départ = texte statique des pages au 08/10/2026, converti en texte brut (paragraphes
-- séparés par une ligne vide, retours à la ligne conservés, liens réduits à leur adresse : le site
-- les rend de nouveau cliquables). Généré depuis le HTML pour éviter toute erreur de recopie.
-- Champs null = bloc vide, masqué (Tara peut le remplir plus tard).
-- `on conflict do nothing` : ne réécrit jamais un texte déjà saisi.
insert into public.content_blocks
  (page, section, field_key, field_type, label, text_value, sort_order)
values
  ('mentions-legales', $t$Éditeur du site$t$, 'mentions-legales.editeur.titre', 'text', $t$Éditeur du site — titre (vider pour masquer la section)$t$,
   $t$Éditeur du site$t$, 10),
  ('mentions-legales', $t$Éditeur du site$t$, 'mentions-legales.editeur.texte', 'text', $t$Éditeur du site — texte$t$,
   $t$[À COMPLÉTER : raison sociale] · [forme juridique] au capital de [capital]
Siège social : [adresse du siège]
SIRET : [SIRET] · RCS : [ville + numéro RCS] · TVA intracommunautaire : [numéro]
Directrice de la publication : [nom — Tara ?]$t$, 20),
  ('mentions-legales', $t$Hébergement$t$, 'mentions-legales.hebergement.titre', 'text', $t$Hébergement — titre (vider pour masquer la section)$t$,
   $t$Hébergement$t$, 30),
  ('mentions-legales', $t$Hébergement$t$, 'mentions-legales.hebergement.texte', 'text', $t$Hébergement — texte$t$,
   $t$OVH SAS · 2 rue Kellermann, 59100 Roubaix, France · 09 72 10 10 07 · https://www.ovhcloud.com
Diffusion et protection du site : Cloudflare, Inc. · 101 Townsend Street, San Francisco, CA 94107, États-Unis$t$, 40),
  ('mentions-legales', $t$Propriété intellectuelle$t$, 'mentions-legales.propriete.titre', 'text', $t$Propriété intellectuelle — titre (vider pour masquer la section)$t$,
   $t$Propriété intellectuelle$t$, 50),
  ('mentions-legales', $t$Propriété intellectuelle$t$, 'mentions-legales.propriete.texte', 'text', $t$Propriété intellectuelle — texte$t$,
   $t$L'ensemble des contenus de ce site (textes, photographies, illustrations, logo, charte graphique) est la propriété exclusive de la Maison de Tara, sauf mention contraire. Toute reproduction, représentation ou diffusion, totale ou partielle, sans autorisation écrite préalable est interdite.$t$, 60),
  ('mentions-legales', $t$Données personnelles$t$, 'mentions-legales.donnees.titre', 'text', $t$Données personnelles — titre (vider pour masquer la section)$t$,
   $t$Données personnelles$t$, 70),
  ('mentions-legales', $t$Données personnelles$t$, 'mentions-legales.donnees.texte', 'text', $t$Données personnelles — texte$t$,
   $t$Les traitements de données réalisés via ce site sont décrits dans la politique de confidentialité.$t$, 80),
  ('mentions-legales', $t$Cookies$t$, 'mentions-legales.cookies.titre', 'text', $t$Cookies — titre (vider pour masquer la section)$t$,
   $t$Cookies$t$, 90),
  ('mentions-legales', $t$Cookies$t$, 'mentions-legales.cookies.texte', 'text', $t$Cookies — texte$t$,
   $t$Ce site ne dépose lui-même aucun cookie de mesure d'audience ou de publicité. Les services externes qui peuvent utiliser leurs propres cookies (carte Google Maps, page de paiement Stripe) sont détaillés dans la politique de confidentialité.$t$, 100),
  ('mentions-legales', $t$Responsabilité$t$, 'mentions-legales.responsabilite.titre', 'text', $t$Responsabilité — titre (vider pour masquer la section)$t$,
   $t$Responsabilité$t$, 110),
  ('mentions-legales', $t$Responsabilité$t$, 'mentions-legales.responsabilite.texte', 'text', $t$Responsabilité — texte$t$,
   $t$La Maison de Tara s'efforce de maintenir des informations exactes et à jour, sans pouvoir garantir l'absence d'erreurs ou d'omissions. Les informations présentées (horaires, tarifs, événements) sont indicatives et peuvent évoluer.$t$, 120),
  ('confidentialite', $t$Responsable du traitement$t$, 'confidentialite.responsable.titre', 'text', $t$Responsable du traitement — titre (vider pour masquer la section)$t$,
   $t$Responsable du traitement$t$, 10),
  ('confidentialite', $t$Responsable du traitement$t$, 'confidentialite.responsable.texte', 'text', $t$Responsable du traitement — texte$t$,
   $t$[À COMPLÉTER : raison sociale] · Maison de Tara, 22 Place de la Liberté, 92250 La Garenne-Colombes · contact : contact@maisondetara.com$t$, 20),
  ('confidentialite', $t$Données collectées$t$, 'confidentialite.donnees.titre', 'text', $t$Données collectées — titre (vider pour masquer la section)$t$,
   $t$Données collectées$t$, 30),
  ('confidentialite', $t$Données collectées$t$, 'confidentialite.donnees.intro', 'text', $t$Données collectées — introduction$t$,
   $t$Le site collecte uniquement les données que vous renseignez dans ses formulaires :$t$, 40),
  ('confidentialite', $t$Données collectées$t$, 'confidentialite.donnees.liste', 'text', $t$Données collectées — liste (une ligne = une puce)$t$,
   $t$Réservation d'un atelier ou d'un événement : nom, e-mail, téléphone (facultatif), créneau ou événement choisi, nombre de participants.
Paiement en ligne : vos coordonnées bancaires sont saisies directement sur la page sécurisée de notre prestataire de paiement, Stripe. La Maison de Tara n'y a jamais accès ; elle reçoit seulement la confirmation et le montant du paiement.
Contact et demande de privatisation : nom, e-mail, message et, pour une privatisation, téléphone, date souhaitée, nombre de personnes et type d'événement.
Lettre de la maison : adresse e-mail.$t$, 50),
  ('confidentialite', $t$Données collectées$t$, 'confidentialite.donnees.conclusion', 'text', $t$Données collectées — conclusion$t$,
   $t$Le site mesure aussi sa fréquentation de façon anonyme et enregistre ses erreurs techniques (voir « Cookies et mesure d'audience »).$t$, 60),
  ('confidentialite', $t$Finalités et bases légales$t$, 'confidentialite.finalites.titre', 'text', $t$Finalités et bases légales — titre (vider pour masquer la section)$t$,
   $t$Finalités et bases légales$t$, 70),
  ('confidentialite', $t$Finalités et bases légales$t$, 'confidentialite.finalites.texte', 'text', $t$Finalités et bases légales — texte$t$,
   $t$Ces données servent exclusivement à gérer vos réservations et leur paiement (exécution du contrat), à répondre à vos messages et demandes de privatisation (mesures précontractuelles et intérêt légitime), à vous envoyer la lettre de la maison (consentement, retirable à tout moment grâce au lien de désinscription présent dans chaque envoi), à respecter nos obligations comptables (obligation légale) et à assurer le bon fonctionnement et la sécurité du site (intérêt légitime).$t$, 80),
  ('confidentialite', $t$Durée de conservation$t$, 'confidentialite.conservation.titre', 'text', $t$Durée de conservation — titre (vider pour masquer la section)$t$,
   $t$Durée de conservation$t$, 90),
  ('confidentialite', $t$Durée de conservation$t$, 'confidentialite.conservation.intro', 'text', $t$Durée de conservation — introduction$t$,
   null, 100),
  ('confidentialite', $t$Durée de conservation$t$, 'confidentialite.conservation.liste', 'text', $t$Durée de conservation — liste (une ligne = une puce)$t$,
   $t$Réservations et échanges avec nos clients : 3 ans après le dernier contact.
Pièces comptables liées aux paiements : 10 ans, comme l'exige la loi.
Demandes de contact sans suite : 3 ans après le dernier échange.
Lettre de la maison : jusqu'à votre désinscription.$t$, 110),
  ('confidentialite', $t$Durée de conservation$t$, 'confidentialite.conservation.conclusion', 'text', $t$Durée de conservation — conclusion$t$,
   null, 120),
  ('confidentialite', $t$Destinataires et sous-traitants$t$, 'confidentialite.destinataires.titre', 'text', $t$Destinataires et sous-traitants — titre (vider pour masquer la section)$t$,
   $t$Destinataires et sous-traitants$t$, 130),
  ('confidentialite', $t$Destinataires et sous-traitants$t$, 'confidentialite.destinataires.intro', 'text', $t$Destinataires et sous-traitants — introduction$t$,
   $t$Vos données sont destinées à la seule Maison de Tara. Elles ne sont ni vendues, ni transmises à des tiers à des fins commerciales. Pour fonctionner, le site s'appuie sur des prestataires techniques qui les traitent pour notre compte et selon nos instructions :$t$, 140),
  ('confidentialite', $t$Destinataires et sous-traitants$t$, 'confidentialite.destinataires.liste', 'text', $t$Destinataires et sous-traitants — liste (une ligne = une puce)$t$,
   $t$Supabase (base de données) : serveurs situés à Francfort, en Allemagne.
Stripe (paiement en ligne) : Stripe Payments Europe Ltd, Irlande.
Brevo (e-mails de confirmation et lettre de la maison) : Sendinblue SAS, France.
OVHcloud (hébergement du site, mesure d'audience et suivi des erreurs, administrés par notre prestataire web Propul'SEO) : OVH SAS, serveurs en France.
Cloudflare (diffusion et protection du site) : Cloudflare, Inc.$t$, 150),
  ('confidentialite', $t$Destinataires et sous-traitants$t$, 'confidentialite.destinataires.conclusion', 'text', $t$Destinataires et sous-traitants — conclusion$t$,
   null, 160),
  ('confidentialite', $t$Transferts hors UE$t$, 'confidentialite.transferts.titre', 'text', $t$Transferts hors UE — titre (vider pour masquer la section)$t$,
   $t$Transferts hors de l'Union européenne$t$, 170),
  ('confidentialite', $t$Transferts hors UE$t$, 'confidentialite.transferts.texte', 'text', $t$Transferts hors UE — texte$t$,
   $t$Certains prestataires (Stripe, Cloudflare, Supabase, ainsi que Google pour les polices d'écriture et la carte) appartiennent à des groupes américains et peuvent transférer des données aux États-Unis. Ces transferts sont encadrés par le cadre de protection des données UE–États-Unis (Data Privacy Framework) ou par les clauses contractuelles types de la Commission européenne.$t$, 180),
  ('confidentialite', $t$Cookies et mesure d'audience$t$, 'confidentialite.cookies.titre', 'text', $t$Cookies et mesure d'audience — titre (vider pour masquer la section)$t$,
   $t$Cookies et mesure d'audience$t$, 190),
  ('confidentialite', $t$Cookies et mesure d'audience$t$, 'confidentialite.cookies.texte', 'text', $t$Cookies et mesure d'audience — texte$t$,
   $t$Le site lui-même ne dépose aucun cookie publicitaire ni de suivi. Sa fréquentation est mesurée avec Umami, un outil hébergé en France qui n'utilise pas de cookie et ne conserve aucune donnée permettant de vous identifier (seulement la page consultée, la taille de l'écran, la langue et le site d'où vous venez). Les erreurs techniques sont enregistrées avec GlitchTip, après suppression de toute information personnelle.

Deux services externes peuvent en revanche utiliser leurs propres cookies : la carte Google Maps de la page Contact, et la page de paiement Stripe, pour sécuriser les transactions. Les polices d'écriture du site sont chargées depuis les serveurs de Google, qui reçoivent à cette occasion votre adresse IP.$t$, 200),
  ('confidentialite', $t$Vos droits$t$, 'confidentialite.droits.titre', 'text', $t$Vos droits — titre (vider pour masquer la section)$t$,
   $t$Vos droits$t$, 210),
  ('confidentialite', $t$Vos droits$t$, 'confidentialite.droits.texte', 'text', $t$Vos droits — texte$t$,
   $t$Conformément au RGPD et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données. Vous pouvez aussi retirer votre consentement à tout moment (par exemple en vous désinscrivant de la lettre) et définir des directives sur le sort de vos données après votre décès. Pour exercer ces droits, écrivez-nous à contact@maisondetara.com. Si, après nous avoir contactés, vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (cnil.fr).$t$, 220)
on conflict (page, field_key) do nothing;
