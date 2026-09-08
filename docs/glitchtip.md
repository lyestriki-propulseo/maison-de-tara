# GlitchTip — Maison de Tara

- Instance : https://errors.propulseo-site.com
- Organisation : `propulseo` ; projet : `maison-de-tara`.
- Site / hébergement : https://maisondetara.propulseo-site.com.
- Branche à déployer : `main`.
- Couverture : Site statique wandau-mdt ; SDK navigateur 10.73.0 servi localement.

## Activation

Le DSN public du projet est fourni dans le code. Ce DSN permet uniquement
l'envoi d'événements ; ce n'est ni un mot de passe ni un jeton d'administration.
Fusionner la PR puis reconstruire et déployer la branche ci-dessus.

Les neuf pages générées chargent le SDK et `js/glitchtip.js` depuis le site.
Le chargement est ajouté dans `wandau-mdt/_partials/head.html`, puis propagé
avec `node wandau-mdt/build.mjs`. L'envoi est limité au domaine de production.
Le SDK est copié depuis https://browser.sentry-cdn.com/10.73.0/bundle.min.js,
avec sa licence MIT dans `js/vendor/SENTRY-LICENSE.txt`.

## Données et limites

Suivi des erreurs uniquement : pas de sessions, replays ni transactions de
performance. Le filtrage conserve les informations techniques et retire les
données d'identité et les données de requête sensibles. Il ne remplace pas la
prudence dans les messages d'erreur ajoutés par l'application.

Les exceptions interceptées par le code métier doivent être transmises avec
`captureException` si elles doivent apparaître dans GlitchTip.

L'envoi des sourcemaps n'est pas configuré dans cette PR ; les piles du
navigateur peuvent contenir du code minifié.

## Vérification

```sh
node wandau-mdt/build.mjs
```

Les neuf DSN ont répondu HTTP 200 à un événement synthétique le 8 septembre 2026
(environnement `integration-check`, tag `test=dsn-ingestion`).
Cela valide l'acceptation par le collecteur, pas le déploiement du site.

Après déploiement, déclencher une erreur contrôlée dans un environnement de test,
vérifier l'envoi `/api/<id>/envelope/`, puis retrouver l'événement dans le bon
projet GlitchTip. Ne pas ajouter de route publique permettant de faire planter
le serveur pour ce test.
