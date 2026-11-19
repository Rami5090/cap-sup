import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  base: './',
  // Numéro de version ajouté aux URL des données : chaque déploiement contourne le cache du navigateur.
  define: { __DATA_VERSION__: JSON.stringify(Date.now().toString(36)) },
  server: { port: 5173, strictPort: true },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
