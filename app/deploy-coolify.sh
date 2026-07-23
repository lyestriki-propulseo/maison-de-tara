#!/usr/bin/env bash
# Déclenche un déploiement Coolify via l'API.
# Lit COOLIFY_URL / COOLIFY_TOKEN / COOLIFY_APP_UUID depuis app/.env.
# Le token sert uniquement à l'en-tête Authorization : il n'est jamais affiché.
cd "$(dirname "$0")" || exit 1

val() { grep -E "^$1=" ".env" | head -1 | cut -d= -f2-; }
CU="$(val COOLIFY_URL)"
CT="$(val COOLIFY_TOKEN)"
UU="$(val COOLIFY_APP_UUID)"

if [ -z "$CU" ] || [ -z "$CT" ]; then
  echo "ERREUR : COOLIFY_URL ou COOLIFY_TOKEN vide dans app/.env" >&2
  exit 1
fi

# URL de webhook (contient /deploy) -> appel direct ; sinon endpoint API standard.
if echo "$CU" | grep -q "/deploy"; then
  U="$CU"
else
  if [ -z "$UU" ]; then
    echo "ERREUR : COOLIFY_URL est une URL de base -> COOLIFY_APP_UUID requis (décommente-le dans .env)" >&2
    exit 1
  fi
  U="${CU%/}/api/v1/deploy?uuid=${UU}&force=false"
fi

echo "→ Déclenchement du déploiement Coolify…"
curl -sS --max-time 30 "$U" -H "Authorization: Bearer $CT" -w '\nHTTP %{http_code}\n'
