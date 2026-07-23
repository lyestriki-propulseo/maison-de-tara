import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: {
    fs: {
      allow: ['..'],
    },
  },
  plugins: [
    devtools(),
    nitro({ config: { rollupConfig: { external: [/^@sentry\//] } } }),
    tailwindcss(),
    // Mode SPA : coquille prérendue au build, rendu 100% client à l'exécution
    // (cet admin est une app navigateur — auth Supabase côté client). Supprime
    // le rendu serveur à la volée qui bloquait (AbortError 500).
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
  ],
})

export default config
