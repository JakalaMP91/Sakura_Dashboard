/**
 * Sakura Dashboard App Logic
 * Targeted at private use for a Japan trip.
 * Uses Leaflet for mapping and seeded real-world data points.
 */

// --- SEEDED DATA (Based on deep-research-report.md) ---
// --- SEEDED SPOTS DATA (Granular Pinpoint Forecasts) ---
// Each spot has a specific terrain offset (e.g., altitude) affecting bloom timing
const SPOTS = [
    { name: "Meguro River", city: "Tokyo", lat: 35.6457, lon: 139.7003, offsetDays: -2, type: "river" },
    { name: "Ueno Park", city: "Tokyo", lat: 35.7141, lon: 139.7734, offsetDays: 0, type: "park" },
    { name: "Shinjuku Gyoen", city: "Tokyo", lat: 35.6852, lon: 139.7101, offsetDays: 1, type: "garden" },
    { name: "Chidorigafuchi", city: "Tokyo", lat: 35.6905, lon: 139.7511, offsetDays: 0, type: "moat" },

    { name: "Philosopher's Path", city: "Kyoto", lat: 35.0263, lon: 135.7955, offsetDays: 0, type: "path" },
    { name: "Maruyama Park", city: "Kyoto", lat: 35.0036, lon: 135.7811, offsetDays: -1, type: "park" },
    { name: "Arashiyama", city: "Kyoto", lat: 35.0094, lon: 135.6667, offsetDays: 3, type: "mountain" },
    { name: "Kiyomizu-dera", city: "Kyoto", lat: 34.9949, lon: 135.7850, offsetDays: 2, type: "temple" },

    { name: "Nagoya Castle", city: "Nagoya", lat: 35.1838, lon: 136.8997, offsetDays: 0, type: "castle" },
    { name: "Yamazakigawa", city: "Nagoya", lat: 35.1221, lon: 136.9389, offsetDays: -1, type: "river" },

    { name: "Osaka Castle", city: "Osaka", lat: 34.6873, lon: 135.5262, offsetDays: 0, type: "castle" },
    { name: "Kema Sakuranomiya", city: "Osaka", lat: 34.7055, lon: 135.5222, offsetDays: -2, type: "river" },

    { name: "Korakuen Garden", city: "Okayama", lat: 34.6667, lon: 133.9358, offsetDays: 0, type: "garden" },
    { name: "Asahigawa River", city: "Okayama", lat: 34.6690, lon: 133.9380, offsetDays: -1, type: "river" },

    { name: "Peace Memorial Park", city: "Hiroshima", lat: 34.3928, lon: 132.4525, offsetDays: 0, type: "park" },
    { name: "Shukkeien Garden", city: "Hiroshima", lat: 34.4019, lon: 132.4678, offsetDays: 1, type: "garden" },

    { name: "Kenrokuen Garden", city: "Kanazawa", lat: 36.5621, lon: 136.6627, offsetDays: 0, type: "garden" },
    { name: "Kanazawa Castle", city: "Kanazawa", lat: 36.5645, lon: 136.6592, offsetDays: 0, type: "castle" },

    { name: "Takayama Park", city: "Takayama", lat: 36.1420, lon: 137.2600, offsetDays: 0, type: "park" },
    { name: "Miyagawa River", city: "Takayama", lat: 36.1438, lon: 137.2588, offsetDays: -1, type: "river" },

    { name: "Zenko-ji", city: "Nagano", lat: 36.6617, lon: 138.1877, offsetDays: 2, type: "temple" },
    { name: "Garyu Park", city: "Nagano", lat: 36.6400, lon: 138.3000, offsetDays: 0, type: "park" }
];

const CITY_FORECASTS = {
    "Tokyo": { firstBloom: "2026-03-20", fullBloom: "2026-03-27", source: "JMA" },
    "Nagoya": { firstBloom: "2026-03-22", fullBloom: "2026-03-30", source: "JWA" },
    "Kyoto": { firstBloom: "2026-03-24", fullBloom: "2026-04-01", source: "JMC" },
    "Osaka": { firstBloom: "2026-03-25", fullBloom: "2026-04-02", source: "JMA" },
    "Okayama": { firstBloom: "2026-03-26", fullBloom: "2026-04-03", source: "JWA" },
    "Hiroshima": { firstBloom: "2026-03-25", fullBloom: "2026-04-02", source: "JMC" },
    "Kanazawa": { firstBloom: "2026-03-31", fullBloom: "2026-04-07", source: "JMA" },
    "Takayama": { firstBloom: "2026-04-08", fullBloom: "2026-04-15", source: "JMC" },
    "Nagano": { firstBloom: "2026-04-10", fullBloom: "2026-04-18", source: "JWA" }
};

// --- SCIENTIFIC CLIMATE NORMS (Daily Max Temps) ---
const CITY_CLIMATE_NORMS = {
    "Tokyo": { 2: 10, 3: 14, 4: 19, 5: 23 },
    "Nagoya": { 2: 10, 3: 14, 4: 20, 5: 24 },
    "Kyoto": { 2: 9, 3: 13, 4: 19, 5: 24 },
    "Osaka": { 2: 10, 3: 14, 4: 20, 5: 25 },
    "Okayama": { 2: 10, 3: 15, 4: 20, 5: 25 },
    "Hiroshima": { 2: 10, 3: 14, 4: 19, 5: 24 },
    "Kanazawa": { 2: 7, 3: 11, 4: 17, 5: 22 },
    "Takayama": { 2: 4, 3: 9, 4: 17, 5: 22 },
    "Nagano": { 2: 5, 3: 11, 4: 17, 5: 23 }
};

// --- APP STATE ---
let map;
let currentMarkers = [];
let heatmapOverlay;
let currentDate = new Date("2026-03-02");
const startDate = new Date("2026-02-01");
const endDate = new Date("2026-05-15");

// --- DYNAMIC DATA & PERSISTENCE ---
const DAILY_MAX_TEMPS = JSON.parse(localStorage.getItem('DAILY_MAX_TEMPS')) || {};
let isLiveSynced = JSON.parse(localStorage.getItem('isLiveSynced')) || false;
let lastSync = localStorage.getItem('lastSync') || null;
const observedKaika = JSON.parse(localStorage.getItem('observedKaika')) || {};

function saveSyncState() {
    localStorage.setItem('isLiveSynced', JSON.stringify(isLiveSynced));
    localStorage.setItem('lastSync', lastSync);
    localStorage.setItem('observedKaika', JSON.stringify(observedKaika));
}

function loadSyncState() {
    const data = localStorage.getItem('observedKaika');
    if (data) Object.assign(observedKaika, JSON.parse(data));
}
loadSyncState();

const weatherIcons = { "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️" };

// --- APP STATE ---
let cityWeather = {}; // Real-time storage

/**
 * Calculates a 7-stage Bloom Progress Index (BPI)
 * Based on pinpoint spot logic and 7-stage scale.
 */
function calculateBPI(spot, date) {
    const base = CITY_FORECASTS[spot.city];
    if (!base) return { val: 0, label: "Unbekannt" };

    let fb = new Date(base.firstBloom);
    let flb = new Date(base.fullBloom);

    // Apply Spot Offset
    fb.setDate(fb.getDate() + spot.offsetDays);
    flb.setDate(flb.getDate() + spot.offsetDays);

    // Override with observed Kaika if synced
    if (isLiveSynced && observedKaika[spot.city]) {
        const obs = new Date(observedKaika[spot.city]);
        const originalBaseFb = new Date(base.firstBloom);
        const drift = obs.getTime() - originalBaseFb.getTime();
        fb = new Date(fb.getTime() + drift);
        flb = new Date(flb.getTime() + drift);
    }

    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    const tStart = fb.getTime();
    const tFull = flb.getTime();
    const tBud = tStart - (7 * 24 * 60 * 60 * 1000);

    if (t < tBud) return { val: 0, label: "Knospe (Tsubomi)" };

    if (t < tStart) {
        const p = (t - tBud) / (tStart - tBud);
        return { val: p * 0.2, label: "Schwellend" };
    }

    if (t <= tFull) {
        const p = (t - tStart) / (tFull - tStart);
        if (p < 0.2) return { val: 0.3, label: "Blühbeginn (Kaika)" };
        if (p < 0.5) return { val: 0.5, label: "30-50% Blüte" };
        if (p < 0.8) return { val: 0.8, label: "70% Blüte" };
        return { val: 0.9, label: "Fast Vollblüte" };
    }

    const daysPast = (t - tFull) / (1000 * 60 * 60 * 24);
    if (daysPast < 5) return { val: 1.0, label: "Vollblüte (Mankai)" };
    if (daysPast < 12) return { val: 0.6, label: "Blütenfall (Hazakura)" };
    return { val: 0.1, label: "Verblüht" };
}

function getBPIColor(val) {
    if (val === 1.0) return "#ff69b4"; // Mankai - Hot Pink
    if (val >= 0.8) return "#ffb7c5";  // 70%
    if (val >= 0.5) return "#ffd1dc";  // 30-50%
    if (val >= 0.3) return "#ffe4e1";  // Kaika
    if (val >= 0.1) return "#fdf2f4";  // Swelling
    return "#4caf50";                  // Bud
}

// --- IDW HEATMAP PLUGIN (Self-contained) ---
L.IdwLayer = L.Layer.extend({
    options: { opacity: 0.6, radius: 100, cellSize: 5, gradient: { 0.0: '#4caf5000', 0.1: '#fdf2f455', 0.3: '#ffe4e188', 0.5: '#ffd1dcAA', 0.8: '#ffb7c5CC', 1.0: '#ff69b4EE' } },
    initialize: function (data, options) {
        this._data = data;
        L.setOptions(this, options);
    },
    setData: function (data) {
        this._data = data;
        return this.redraw();
    },
    redraw: function () {
        if (this._map) {
            this._onMove();
        }
        return this;
    },
    onAdd: function (map) {
        this._map = map;
        if (!this._canvas) this._initCanvas();
        map.getContainer().appendChild(this._canvas);
        map.on('move zoom viewreset', this._onMove, this);
        this._reset();
    },
    onRemove: function (map) {
        this._map.getContainer().removeChild(this._canvas);
        this._map.off('move zoom viewreset', this._onMove, this);
        if (this._frameId) cancelAnimationFrame(this._frameId);
    },
    _initCanvas: function () {
        this._canvas = L.DomUtil.create('canvas', 'leaflet-idw-layer leaflet-layer');
        this._canvas.style.position = 'absolute';
        this._canvas.style.top = '0';
        this._canvas.style.left = '0';
        this._canvas.style.zIndex = '400';
        this._canvas.style.opacity = this.options.opacity;
        this._canvas.style.pointerEvents = 'none';
        this._frameId = null;
    },
    _onMove: function () {
        if (!this._frameId) {
            this._frameId = requestAnimationFrame(() => {
                this._reset();
                this._frameId = null;
            });
        }
    },
    _reset: function () {
        const size = this._map.getSize();
        if (this._canvas.width !== size.x || this._canvas.height !== size.y) {
            this._canvas.width = size.x;
            this._canvas.height = size.y;
        }
        this._draw();
    },
    _draw: function () {
        if (!this._map || !this._data) return;
        const ctx = this._canvas.getContext('2d');
        const size = this._map.getSize();
        ctx.clearRect(0, 0, size.x, size.y);

        const zoom = this._map.getZoom();
        const baseRadius = this.options.radius || 100;
        const radius = baseRadius * Math.pow(2, Math.min(zoom, 12) - 10);
        if (radius < 1) return;

        const cellSize = this.options.cellSize || 12;
        const cols = Math.ceil(size.x / cellSize);
        const rows = Math.ceil(size.y / cellSize);

        // Grid accumulators (Point-to-Grid strategy)
        const vGrid = new Float32Array(cols * rows);
        const wGrid = new Float32Array(cols * rows);

        const margin = radius * 3;
        const rSq = radius * radius;

        this._data.forEach(p => {
            if (p.val <= 0.01) return;
            const cp = this._map.latLngToContainerPoint([p.lat, p.lon]);

            // Skip points far outside viewport
            if (cp.x < -margin || cp.x > size.x + margin || cp.y < -margin || cp.y > size.y + margin) return;

            // Update only nearby cells
            const startX = Math.max(0, Math.floor((cp.x - margin) / cellSize));
            const endX = Math.min(cols - 1, Math.floor((cp.x + margin) / cellSize));
            const startY = Math.max(0, Math.floor((cp.y - margin) / cellSize));
            const endY = Math.min(rows - 1, Math.floor((cp.y + margin) / cellSize));

            for (let cx = startX; cx <= endX; cx++) {
                for (let cy = startY; cy <= endY; cy++) {
                    const dx = (cx * cellSize + cellSize / 2) - cp.x;
                    const dy = (cy * cellSize + cellSize / 2) - cp.y;
                    const dSq = dx * dx + dy * dy;
                    if (dSq < rSq * 9) {
                        const w = 1 / (dSq / rSq + 0.1);
                        const idx = cy * cols + cx;
                        vGrid[idx] += p.val * w;
                        wGrid[idx] += w;
                    }
                }
            }
        });

        // Final Render Pass
        for (let i = 0; i < vGrid.length; i++) {
            if (wGrid[i] > 0) {
                const val = vGrid[i] / wGrid[i];
                if (val > 0.05) {
                    const cx = i % cols;
                    const cy = Math.floor(i / cols);
                    ctx.fillStyle = this._getColor(val);
                    ctx.fillRect(cx * cellSize, cy * cellSize, cellSize + 1, cellSize + 1);
                }
            }
        }
    },
    _getColor: function (v) {
        const g = this.options.gradient, keys = Object.keys(g).map(Number).sort((a, b) => a - b);
        if (v <= keys[0]) return g[keys[0]];
        if (v >= keys[keys.length - 1]) return g[keys[keys.length - 1]];
        for (let i = 0; i < keys.length - 1; i++) {
            if (v >= keys[i] && v <= keys[i + 1]) {
                const c1 = this._hexToRgb(g[keys[i]]), c2 = this._hexToRgb(g[keys[i + 1]]);
                const f = (v - keys[i]) / (keys[i + 1] - keys[i]);
                return `rgba(${Math.round(c1.r + (c2.r - c1.r) * f)}, ${Math.round(c1.g + (c2.g - c1.g) * f)}, ${Math.round(c1.b + (c2.b - c1.b) * f)}, ${c1.a + (c2.a - c1.a) * f})`;
            }
        }
        return 'transparent';
    },
    _hexToRgb: function (hex) {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
        return { r, g, b, a };
    }
});
L.idwLayer = function (data, options) { return new L.IdwLayer(data, options); };

const CITY_COORDS = {
    "Tokyo": { lat: 35.6895, lon: 139.6917 },
    "Nagoya": { lat: 35.1815, lon: 136.9066 },
    "Kyoto": { lat: 35.0116, lon: 135.7681 },
    "Osaka": { lat: 34.6937, lon: 135.5023 },
    "Okayama": { lat: 34.6618, lon: 133.9344 },
    "Hiroshima": { lat: 34.3853, lon: 132.4553 },
    "Kanazawa": { lat: 36.5613, lon: 136.6562 },
    "Takayama": { lat: 36.1408, lon: 137.2583 },
    "Nagano": { lat: 36.6485, lon: 138.1942 }
};

const THERMAL_ACCUMULATION = {};

async function syncLiveStatus() {
    const btn = document.getElementById('sync-button');
    if (!btn) return;

    btn.textContent = "⌛ Lade Wetterdaten...";
    btn.disabled = true;

    try {
        const feb1 = "2026-02-01";

        // Fetch data for all cities in parallel using the forecast API which handles past + future
        await Promise.all(Object.keys(CITY_COORDS).map(async city => {
            const coords = CITY_COORDS[city];
            // Get past 31 days + forecast + current weather
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max&current_weather=true&timezone=Asia%2FTokyo&past_days=31&forecast_days=7`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.current_weather) {
                cityWeather[city] = {
                    temp: Math.round(data.current_weather.temperature),
                    code: data.current_weather.weathercode
                };
            }

            if (data.daily && data.daily.temperature_2m_max) {
                DAILY_MAX_TEMPS[city] = {};
                const temps = data.daily.temperature_2m_max;
                const dates = data.daily.time;

                let thermalSum = 0;
                let bloomDateFound = null;

                for (let i = 0; i < dates.length; i++) {
                    const dStr = dates[i];
                    if (dStr < feb1) continue;

                    const tMax = (temps[i] !== null && temps[i] !== undefined) ? temps[i] : 0;
                    const effectiveTemp = Math.max(0, tMax);

                    DAILY_MAX_TEMPS[city][dStr] = tMax;

                    thermalSum += effectiveTemp;
                    if (thermalSum >= 600 && !bloomDateFound) {
                        bloomDateFound = dStr;
                    }
                }
                console.log(`Synced ${city}: ${Object.keys(DAILY_MAX_TEMPS[city]).length} days, Sum: ${thermalSum}`);

                if (bloomDateFound) {
                    observedKaika[city] = bloomDateFound;
                } else {
                    // Phase 3: Scientific Projection using Climate Norms
                    let projectionSum = thermalSum;
                    let projectionDate = new Date(dates[dates.length - 1]);
                    const norms = CITY_CLIMATE_NORMS[city];

                    // Guard: Maximum 60 days projection to avoid infinite loops
                    for (let d = 1; d <= 60; d++) {
                        projectionDate.setDate(projectionDate.getDate() + 1);
                        const month = projectionDate.getMonth() + 1; // 1-indexed
                        const dailyTemp = norms[month] || 15; // Fallback to 15C

                        projectionSum += dailyTemp;
                        if (projectionSum >= 600) {
                            break;
                        }
                    }
                    observedKaika[city] = projectionDate.toISOString().split('T')[0];
                }
            }
        }));

        isLiveSynced = true;
        lastSync = new Date().toLocaleString('de-DE');
        saveSyncState();
        btn.textContent = "✅ Echtzeit-Synchronisiert";
        updateUI();

    } catch (err) {
        console.error("Sync failed:", err);
        btn.textContent = "❌ Fehler beim Sync";
        setTimeout(() => {
            btn.textContent = "Daten synchronisieren";
            btn.disabled = false;
        }, 3000);
    }
}

function clearData() {
    if (confirm("Möchtest du alle synchronisierten Daten löschen?")) {
        localStorage.clear();
        location.reload();
    }
}

function saveSyncState() {
    localStorage.setItem('isLiveSynced', JSON.stringify(isLiveSynced));
    localStorage.setItem('lastSync', lastSync);
    localStorage.setItem('observedKaika', JSON.stringify(observedKaika));
    localStorage.setItem('DAILY_MAX_TEMPS', JSON.stringify(DAILY_MAX_TEMPS));
}

function drawHeatmap() {
    const points = SPOTS.map(spot => {
        const bpi = calculateBPI(spot, currentDate);
        return { lat: spot.lat, lon: spot.lon, val: bpi.val };
    });

    if (heatmapOverlay) {
        heatmapOverlay.setData(points);
    } else {
        heatmapOverlay = L.idwLayer(points, {
            opacity: 0.55,
            radius: 180, // Refined base radius
            cellSize: 12, // Performance-optimized cell size
            gradient: {
                0.0: '#4caf5000',
                0.1: '#fdf2f433',
                0.3: '#ffd1dc66',
                0.6: '#ffb7c599',
                1.0: '#ff69b4CC'
            }
        }).addTo(map);
    }
}

function updateUI() {
    const formattedDate = new Intl.DateTimeFormat('de-DE', {
        day: 'numeric', month: 'long', year: 'numeric'
    }).format(currentDate);
    const dateEl = document.getElementById('current-view-date');
    if (dateEl) dateEl.textContent = formattedDate;

    const syncLabel = document.getElementById('last-sync-time');
    if (lastSync && syncLabel) syncLabel.textContent = `Zuletzt synchronisiert: ${lastSync}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const modeLabel = document.getElementById('view-mode-label');
    const isCurrentActualToday = currentDate.toDateString() === today.toDateString();

    if (modeLabel) {
        if (isLiveSynced && isCurrentActualToday) {
            modeLabel.textContent = "LIVE: Pinpoint Status";
            modeLabel.style.color = "#4caf50";
        } else {
            modeLabel.textContent = currentDate > today ? "Vorhersage" : "Historisch";
            modeLabel.style.color = "var(--sakura-pink)";
        }
    }

    const bounds = map.getBounds();

    SPOTS.forEach((spot, index) => {
        const bpi = calculateBPI(spot, currentDate);
        const base = CITY_FORECASTS[spot.city] || { confidence: "low" };
        const card = document.getElementById(`spot-card-${index}`);

        // View-based Filter: Is spot in current bounds?
        const isInView = bounds.contains([spot.lat, spot.lon]);

        if (card) {
            if (isInView) {
                card.style.display = "block";
                card.style.opacity = "1";
            } else {
                card.style.display = "none";
                card.style.opacity = "0";
            }

            const statusEl = card.querySelector('.city-status');
            const nameEl = card.querySelector('.city-name');

            // Sync Status Text & Color (Fixes "Lade..." bug)
            if (statusEl) {
                statusEl.textContent = bpi.label;
                statusEl.style.color = bpi.val > 0.1 ? getBPIColor(bpi.val) : "#888";
                statusEl.style.fontSize = "0.85rem";
                statusEl.style.marginBottom = "8px";
            }

            // Scientific Confidence Calculation
            let confidence = "low";
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (currentDate <= today) {
                // Past is observed/archived -> High Confidence
                confidence = "high";
            } else if (isLiveSynced) {
                // Future with Live Data (Open-Meteo Forecast)
                const daysDiff = (currentDate - today) / (1000 * 60 * 60 * 24);
                if (daysDiff <= 7) confidence = "high"; // Accurate 7-day forecast
                else if (daysDiff <= 14) confidence = "med"; // Tendency
                else confidence = "low"; // Statistical average
            }

            // Restore Confidence Badge
            let badge = card.querySelector('.confidence-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = `confidence-badge`;
                nameEl.appendChild(badge);
            }
            badge.textContent = confidence.toUpperCase();
            badge.className = `confidence-badge confidence-${confidence}`;

            // --- NEW: SOURCE & OFFSET METADATA ---
            let metaRow = card.querySelector('.meta-row');
            if (!metaRow) {
                metaRow = document.createElement('div');
                metaRow.className = 'meta-row';
                metaRow.style.cssText = "font-size: 0.65rem; opacity: 0.8; display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; border-left: 2px solid #444; padding-left: 6px;";
                card.insertBefore(metaRow, card.querySelector('.thermal-container') || card.querySelector('.stage-scale'));
            }

            const sourceName = isLiveSynced ? "Echtzeit (Thermal-Modell)" : `Seed (${base.source || 'Statistik'})`;

            // Calculate Drift (Weather-based shift)
            let driftDays = 0;
            if (isLiveSynced && observedKaika[spot.city]) {
                const originalBaseFb = new Date(base.firstBloom);
                const obs = new Date(observedKaika[spot.city]);
                driftDays = Math.round((obs.getTime() - originalBaseFb.getTime()) / (1000 * 60 * 60 * 24));
            }

            const driftSign = driftDays >= 0 ? "+" : "";
            const offsetSign = spot.offsetDays >= 0 ? "+" : "";

            metaRow.innerHTML = `
                    <div style="color: ${isLiveSynced ? '#4caf50' : '#888'}; display: flex; align-items: center; gap: 4px;">
                        <i class="fas fa-database"></i> 
                        <span>Quelle: ${sourceName}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 2px; margin-top: 4px;">
                        <span><i class="fas fa-mountain"></i> Gelände-Effekt: ${offsetSign}${spot.offsetDays}d (mikroklima)</span>
                        ${isLiveSynced ? `
                        <div style="color: ${driftDays !== 0 ? 'var(--sakura-pink)' : '#4caf50'};">
                            <i class="fas fa-chart-line"></i> Wetter-Trend: ${driftSign}${driftDays}d 
                            <span style="font-size: 0.6rem; opacity: 0.6;">(Hybrid-Modell: Live + Forecast + Klimanormen)</span>
                        </div>` : ''}
                    </div>
                `;

            // Dynamic Thermal & Progress Bar
            if (isLiveSynced && DAILY_MAX_TEMPS[spot.city]) {
                const feb1 = new Date("2026-02-01");
                let currentSum = 0;
                const cityData = DAILY_MAX_TEMPS[spot.city];
                const dates = Object.keys(cityData).sort();

                dates.forEach(dStr => {
                    const d = new Date(dStr);
                    if (d >= feb1 && d <= currentDate) {
                        currentSum += Math.max(0, cityData[dStr]);
                    }
                });

                // Ensure Container
                let container = card.querySelector('.thermal-container');
                if (!container) {
                    container = document.createElement('div');
                    container.className = 'thermal-container';
                    container.style.marginTop = "10px";

                    // We will insert before the stage scale (if exists) or at the end
                    const scale = card.querySelector('.stage-scale');
                    if (scale) card.insertBefore(container, scale);
                    else card.appendChild(container);
                }

                // 1. Thermal Text (Now ABOVE bars)
                let accEl = container.querySelector('.thermal-sum');
                if (!accEl) {
                    accEl = document.createElement('div');
                    accEl.className = 'thermal-sum';
                    accEl.style.fontSize = "0.75rem";
                    accEl.style.fontWeight = "bold";
                    accEl.style.marginBottom = "4px";
                    accEl.style.color = "var(--sakura-pink)";
                    container.appendChild(accEl);
                }
                accEl.textContent = `${Math.round(currentSum)}°C / 600°C`;

                // 2. Thermal Progress Bar (NEW)
                let barWrapper = container.querySelector('.thermal-bar-bg');
                if (!barWrapper) {
                    barWrapper = document.createElement('div');
                    barWrapper.className = 'thermal-bar-bg';
                    barWrapper.style.cssText = "height: 6px; background: #222; border-radius: 3px; overflow: hidden; margin-bottom: 8px; width: 100%;";

                    const barInner = document.createElement('div');
                    barInner.className = 'thermal-bar-inner';
                    barInner.style.cssText = "height: 100%; width: 0%; transition: width 0.3s ease; background: linear-gradient(to right, #3498db, #2ecc71, #f1c40f, #e67e22, #e74c3c);";
                    barWrapper.appendChild(barInner);
                    container.appendChild(barWrapper);
                }

                const barInner = container.querySelector('.thermal-bar-inner');
                const progress = Math.min(100, (currentSum / 600) * 100);

                if (barInner) {
                    barInner.style.width = `${progress}%`;
                    // Anchor gradient to 100% container width:
                    // If progress is 50%, background-size must be 200% to show only the first half.
                    if (progress > 0) {
                        const bgSize = (100 / progress) * 100;
                        barInner.style.backgroundSize = `${bgSize}% 100%`;
                    }
                }
            }

            // 7-Stage Visual Scale (Bloom)
            let scale = card.querySelector('.stage-scale');
            if (!scale) {
                scale = document.createElement('div');
                scale.className = 'stage-scale';
                scale.style.cssText = "display: flex; gap: 2px; height: 4px; margin-top: 4px;";
                for (let i = 0; i < 7; i++) {
                    const step = document.createElement('div');
                    step.style.flex = "1";
                    step.style.borderRadius = "2px";
                    step.style.background = "#333";
                    scale.appendChild(step);
                }
                card.appendChild(scale);
            }

            // Map BPI to 7 segments (0 to 6)
            let segments = 0;
            if (bpi.val >= 1.0) segments = 6;
            else if (bpi.val >= 0.8) segments = 5;
            else if (bpi.val >= 0.5) segments = 4;
            else if (bpi.val >= 0.3) segments = 3;
            else if (bpi.val >= 0.2) segments = 2; // Kaika start
            else if (bpi.val >= 0.1) segments = 1;

            const steps = scale.children;
            const colors = ["#4caf50", "#fdf2f4", "#ffe4e1", "#ffd1dc", "#ffb7c5", "#ff69b4", "#ae0052"];
            for (let i = 0; i < 7; i++) {
                steps[i].style.background = i <= segments ? colors[i] : "#333";
            }
        }
        const marker = currentMarkers[index];
        if (marker) {
            marker.setOpacity(bpi.val > 0 ? 1 : 0.3);

            const weather = cityWeather[spot.city];
            if (weather) {
                const icon = weather.code <= 1 ? "☀️" : weather.code <= 3 ? "☁️" : "🌧️";
                marker.setPopupContent(`<strong>${spot.name}</strong><br>${spot.city}<br><span style="font-size: 0.8rem; opacity: 0.8;">Aktuell: ${weather.temp}°C ${icon}</span>`);
            }
        }
    });

    drawHeatmap();
}

// --- COORDINATION ---
function init() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js');
    }

    map = L.map('map', {
        center: [35.5, 137.5],
        zoom: 7,
        zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
    }).addTo(map);

    // Filter list on move
    map.on('moveend', updateUI);

    const listEl = document.getElementById('city-list');
    if (listEl) {
        listEl.innerHTML = '';
        SPOTS.forEach((spot, index) => {
            const card = document.createElement('div');
            card.className = 'city-card';
            card.id = `spot-card-${index}`;
            card.innerHTML = `
                <div class="city-name">
                    <span>${spot.name}</span>
                    <span style="font-size: 0.7rem; opacity: 0.6;">${spot.city}</span>
                </div>
                <div class="city-status">Lade...</div>
            `;
            card.onclick = () => map.flyTo([spot.lat, spot.lon], 12);
            listEl.appendChild(card);

            const marker = L.marker([spot.lat, spot.lon], {
                icon: L.divIcon({
                    className: 'sakura-marker',
                    html: `<div style="font-size: ${spot.type === 'park' || spot.type === 'castle' ? '24px' : '18px'};">🌸</div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12]
                })
            }).addTo(map);

            marker.bindPopup(`<strong>${spot.name}</strong><br>${spot.city}`);
            currentMarkers.push(marker);
        });
    }

    const syncBtn = document.getElementById('sync-button');
    if (syncBtn) syncBtn.onclick = syncLiveStatus;

    const clearBtn = document.getElementById('clear-data-button');
    if (clearBtn) clearBtn.onclick = clearData;

    const slider = document.getElementById('timeline-slider');
    if (slider) {
        slider.oninput = (e) => {
            const days = parseInt(e.target.value);
            currentDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
            updateUI();
        };
    }

    const resetBtn = document.getElementById('reset-to-now') || document.getElementById('reset-now-button');
    if (resetBtn) {
        resetBtn.onclick = () => {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const days = Math.floor((now - startDate) / (24 * 60 * 60 * 1000));
            if (slider) {
                slider.max = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000));
                slider.value = days;
            }
            currentDate = now;
            updateUI();
        };
    }

    // Set slider range dynamically
    if (slider) {
        slider.max = Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000));
        const initialDays = Math.floor((currentDate - startDate) / (24 * 60 * 60 * 1000));
        slider.value = initialDays;
    }

    // 4. Map Controls (GPS & Resize)
    document.getElementById('locate-button').onclick = () => {
        if (!navigator.geolocation) return alert("Geolocation wird nicht unterstützt.");

        const btn = document.getElementById('locate-button');
        btn.style.color = "var(--sakura-pink)";

        navigator.geolocation.getCurrentPosition(pos => {
            const { latitude, longitude } = pos.coords;
            map.flyTo([latitude, longitude], 13);

            // Add a temporary marker for the user
            L.circleMarker([latitude, longitude], {
                radius: 8,
                fillColor: "#3498db",
                color: "#fff",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map)
                .bindPopup("Du bist hier")
                .openPopup();

            setTimeout(() => btn.style.color = "", 2000);
        }, err => {
            console.error(err);
            alert("Standort konnte nicht ermittelt werden.");
            btn.style.color = "";
        });
    };

    document.getElementById('resize-map-button').onclick = () => {
        const container = document.querySelector('.app-container');
        const isMaximized = container.classList.toggle('map-maximized');

        // Update icon
        const icon = document.querySelector('#resize-map-button i');
        if (icon) {
            icon.className = isMaximized ? 'fas fa-compress' : 'fas fa-expand';
        }

        // Leaflet needs to know if the container resized
        setTimeout(() => {
            map.invalidateSize();
        }, 350);
    };

    updateUI();
}

window.onload = init;
