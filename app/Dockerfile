FROM node:24-slim AS build
RUN corepack enable
WORKDIR /app
# pnpm-workspace.yaml inclus : il porte onlyBuiltDependencies (esbuild, unrs-resolver),
# lu PENDANT l'install → sans lui, pnpm 11 sort en erreur (ERR_PNPM_IGNORED_BUILDS).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Les variables VITE_* sont figées dans le bundle client AU BUILD (Vite) → il faut les fournir
# en build args (Coolify : Build Arguments). La clé anon est publique : OK de la bundler.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN pnpm build

FROM node:24-slim AS runtime
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
