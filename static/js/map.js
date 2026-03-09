// ══════════════════════════════════════
//  Карта мониторинга — Leaflet
// ══════════════════════════════════════

let leafletMap = null;
let leafletMarkers = [];

async function initMap() {
  try {
    const res     = await fetch('/api/clients');
    const clients = await res.json();

    const active = clients.filter(c => c.status === 'Активный').length;
    const done   = clients.length - active;

    const s = id => document.getElementById(id);
    if (s('mon-all'))    s('mon-all').textContent    = clients.length;
    if (s('mon-active')) s('mon-active').textContent = active;
    if (s('mon-done'))   s('mon-done').textContent   = done;
    if (s('mon-total'))  s('mon-total').textContent  = clients.length + ' подопечных';

    if (!window.L) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src    = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    if (!leafletMap) buildMap();
    else leafletMap.invalidateSize();

    renderMarkers(clients);
  } catch(e) {
    console.error('Map error:', e);
  }
}

function buildMap() {
  const bounds = L.latLngBounds(L.latLng(39.0, 69.0), L.latLng(43.5, 80.5));

  leafletMap = L.map('leafletMap', {
    center: [41.5, 74.5],
    zoom: 6,
    minZoom: 6,
    maxZoom: 12,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 12,
    attribution: '© OpenStreetMap contributors'
  }).addTo(leafletMap);

  // Добавить CSS для анимации
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-dot {
      0%   { box-shadow: 0 0 0 0   rgba(34,197,94,0.5); }
      70%  { box-shadow: 0 0 0 10px rgba(34,197,94,0);   }
      100% { box-shadow: 0 0 0 0   rgba(34,197,94,0);   }
    }
    .leaflet-popup-content-wrapper {
      border-radius: 10px !important;
      padding: 0 !important;
      overflow: hidden;
      box-shadow: 0 8px 28px rgba(0,0,0,0.2) !important;
    }
    .leaflet-popup-content { margin: 0 !important; }
    .leaflet-popup-tip-container { display: none; }
  `;
  document.head.appendChild(style);
}

function renderMarkers(clients) {
  if (!leafletMap || !window.L) return;

  // Удалить старые маркеры
  leafletMarkers.forEach(m => leafletMap.removeLayer(m));
  leafletMarkers = [];

  const regionCount = {};

  clients.forEach(c => {
    if (typeof clientLocations === 'undefined') return;
    const loc = clientLocations.find(l => l.id === c.id);
    if (!loc) return;

    const isActive = c.status === 'Активный';
    regionCount[loc.region] = (regionCount[loc.region] || 0) + 1;

    const color  = isActive ? '#22c55e' : '#94a3b8';
    const border = isActive ? '#15803d' : '#64748b';
    const anim   = isActive ? 'animation:pulse-dot 2s infinite;' : '';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid ${border};box-shadow:0 2px 6px rgba(0,0,0,.3);${anim}"></div>`,
      iconSize:    [16, 16],
      iconAnchor:  [8,  8],
      popupAnchor: [0, -12],
    });

    const catColor = c.cat === 'Условный срок' ? '#1565c0' : c.cat === 'Исправительные работы' ? '#e65100' : '#6a1b9a';
    const stColor  = isActive ? '#15803d' : '#555';

    const popup = `
      <div style="font-family:'DM Sans',sans-serif;width:220px;">
        <div style="background:#0f2744;color:white;padding:10px 14px;font-weight:700;font-size:13px;">${c.name}</div>
        <div style="padding:10px 14px;">
          <table style="font-size:12px;width:100%;border-collapse:collapse;">
            <tr><td style="color:#607080;padding:3px 0;width:85px">Год рожд.:</td><td>${c.born}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Категория:</td><td style="color:${catColor};font-weight:600">${c.cat}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Инспектор:</td><td>${c.insp}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">На учёте с:</td><td>${c.start}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Окончание:</td><td>${c.end}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Статус:</td><td style="color:${stColor};font-weight:700">${c.status}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Город:</td><td>${loc.city}</td></tr>
            <tr><td style="color:#607080;padding:3px 0">Регион:</td><td>${loc.region}</td></tr>
          </table>
        </div>
      </div>`;

    const marker = L.marker([loc.lat, loc.lng], { icon })
      .addTo(leafletMap)
      .bindPopup(popup, { maxWidth: 240, minWidth: 220 });

    leafletMarkers.push(marker);
  });

  // Список регионов
  const el  = document.getElementById('regionList');
  if (!el) return;
  const max = Math.max(...Object.values(regionCount), 1);
  el.innerHTML = Object.entries(regionCount)
    .sort((a, b) => b[1] - a[1])
    .map(([region, cnt]) => `
      <div class="region-row">
        <span style="min-width:200px;font-weight:500;color:var(--ink)">${region}</span>
        <div class="region-bar-wrap"><div class="region-bar" style="width:${Math.round(cnt/max*100)}%"></div></div>
        <span style="min-width:28px;text-align:right;font-weight:700;color:var(--mid)">${cnt}</span>
        <span style="color:var(--muted);font-size:11px;margin-left:4px">чел.</span>
      </div>`).join('');
}
