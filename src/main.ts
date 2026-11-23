import 'leaflet/dist/leaflet.css';
import { mount } from 'svelte';
import './app.css';
import { initScope } from './lib/scope';

// Dans Unaa OS, on attend de savoir quel membre est connecté avant de lire ses réponses (les siennes seulement).
void initScope().then(async () => {
  const [{ default: App }, { cloud }] = await Promise.all([import('./App.svelte'), import('./lib/cloud.svelte')]);
  mount(App, { target: document.getElementById('app')! });
  cloud.start();
});
