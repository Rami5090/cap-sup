<script lang="ts">
  import type { Map as LMap, LayerGroup } from 'leaflet';
  import { onMount } from 'svelte';
  import { loadCrous } from '../lib/data';
  import { fmtKm, scoreTone } from '../lib/format';
  import type { Ranked } from '../lib/ranking';
  import type { Place } from '../lib/types';

  interface Props {
    items: Ranked[];
    home: Place | null;
    onopen: (id: string) => void;
  }
  let { items, home, onopen }: Props = $props();

  let el: HTMLDivElement;
  let map: LMap | null = null;
  let L: typeof import('leaflet') | null = null;
  let offersLayer: LayerGroup | null = null;
  let crousLayer: LayerGroup | null = null;
  let showCrous = $state(false);
  let ready = $state(false);

  const TONE_COLORS: Record<string, string> = { great: '#12805c', good: '#4f8f22', fair: '#c98a0b', weak: '#c93a4f', none: '#868ca0' };

  onMount(() => {
    let disposed = false;
    // Leaflet doit recalculer sa taille quand le conteneur change (mise en page, redimensionnement).
    const ro = new ResizeObserver(() => map?.invalidateSize());
    ro.observe(el);
    (async () => {
      L = await import('leaflet');
      if (disposed) return;
      // Zoom à la molette seulement après un clic sur la carte, pour ne pas gêner le défilement de la page.
      map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView([46.6, 2.4], 6);
      map.on('click focus', () => map?.scrollWheelZoom.enable());
      map.on('mouseout blur', () => map?.scrollWheelZoom.disable());
      requestAnimationFrame(() => map?.invalidateSize());
      L.tileLayer(
        'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image/png',
        { maxZoom: 18, minZoom: 5, attribution: '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener">IGN</a> – Plan IGN (Géoplateforme)' }
      ).addTo(map);
      offersLayer = L.layerGroup().addTo(map);
      crousLayer = L.layerGroup();
      ready = true;
    })();
    return () => {
      disposed = true;
      ro.disconnect();
      map?.remove();
      map = null;
    };
  });

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  }

  // Marqueurs des formations (les 300 premières du classement).
  $effect(() => {
    if (!ready || !L || !map || !offersLayer) return;
    const list = items.slice(0, 300);
    offersLayer.clearLayers();
    const bounds: [number, number][] = [];
    for (const r of [...list].reverse()) {
      const o = r.a.offer;
      const color = TONE_COLORS[scoreTone(r.total)];
      const m = L.circleMarker([o.lat, o.lon], { radius: 7 + (r.total / 100) * 5, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.92 });
      const dist = Number.isFinite(r.a.mobility.distanceKm) ? ` · ${fmtKm(r.a.mobility.distanceKm)}` : '';
      const html = document.createElement('div');
      html.innerHTML = `<strong style="color:${color};font-size:1.05rem">${r.total} %</strong><br><strong>${escapeHtml(o.nm)}</strong>${o.pc ? `<br><span style="opacity:.75">${escapeHtml(o.pc)}</span>` : ''}<br><span style="opacity:.75">${escapeHtml(o.etab)} · ${escapeHtml(o.commune.nom)}${dist}</span><br>`;
      const btn = document.createElement('button');
      btn.textContent = 'Voir le détail';
      btn.className = 'btn btn-primary btn-sm';
      btn.style.marginTop = '10px';
      btn.onclick = () => onopen(o.id);
      html.appendChild(btn);
      m.bindPopup(html, { maxWidth: 280 });
      m.addTo(offersLayer);
      bounds.push([o.lat, o.lon]);
    }
    if (home) {
      L.circleMarker([home.lat, home.lon], { radius: 9, color: '#fff', weight: 3, fillColor: '#2f45c5', fillOpacity: 1 })
        .bindTooltip(`Chez toi : ${escapeHtml(home.nom)}`, { direction: 'top' })
        .addTo(offersLayer);
      bounds.push([home.lat, home.lon]);
    }
    map.invalidateSize();
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    else if (bounds.length === 1) map.setView(bounds[0], 10);
  });

  // Résidences Crous (couche optionnelle).
  $effect(() => {
    if (!ready || !L || !map || !crousLayer) return;
    if (!showCrous) {
      map.removeLayer(crousLayer);
      return;
    }
    const Lr = L;
    const layer = crousLayer;
    loadCrous().then((rows) => {
      layer.clearLayers();
      for (const [lat, lon, nom, zone, url] of rows) {
        Lr.circleMarker([lat, lon], { radius: 4, color: '#8a63d2', weight: 1, fillColor: '#8a63d2', fillOpacity: 0.7 })
          .bindPopup(`<strong>${escapeHtml(nom)}</strong><br><span style="opacity:.75">${escapeHtml(zone)}</span><br><a href="${encodeURI(url)}" target="_blank" rel="noopener">Réserver / en savoir plus</a>`)
          .addTo(layer);
      }
      layer.addTo(map!);
    });
  });
</script>

<div class="wrap">
  <div class="map" bind:this={el} role="region" aria-label="Carte des formations"></div>
  <div class="legend card">
    <strong class="small">Compatibilité</strong>
    <span><i style="background:#12805c"></i>75 % et plus</span>
    <span><i style="background:#4f8f22"></i>60 à 74 %</span>
    <span><i style="background:#c98a0b"></i>45 à 59 %</span>
    <span><i style="background:#c93a4f"></i>moins de 45 %</span>
    <label class="cr"><input type="checkbox" bind:checked={showCrous} /> Résidences Crous</label>
    <span class="tiny faint">Les 300 premières formations du classement</span>
  </div>
</div>

<style>
  .wrap {
    position: relative;
  }
  .map {
    height: min(72vh, 760px);
    border-radius: var(--r-lg);
    border: 1px solid var(--border);
    overflow: hidden;
    z-index: 0;
  }
  .legend {
    position: absolute;
    left: 14px;
    bottom: 14px;
    z-index: 500;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    font-size: 0.82rem;
  }
  .legend i {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 8px;
  }
  .cr {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
