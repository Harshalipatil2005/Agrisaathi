import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';

interface WeatherData {
  windSpeed: number;
  windDirection: number;
  temperature: number;
  humidity: number;
  rainfall: number;
  elevation: number;
  uvIndex: number;
  apparentTemp: number;
  soilMoisture: number;
  soilTemp: number;
  evapotranspiration: number;
  precipitation24h: number;
}

interface TideData {
  time: string;
  height: number;
  type: 'high' | 'low';
}

interface CropSuitability {
  crop: string;
  icon: string;
  suitability: number;
  reason: string;
}

function AgriculturalMap() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [tideData, setTideData] = useState<TideData[]>([]);
  const [cropSuitability, setCropSuitability] = useState<CropSuitability[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLayer, setActiveLayer] = useState<string>('terrain');

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if ((window as any)._agrMapInitialized) return;

    const initMap = async () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadMapAndData(pos.coords.latitude, pos.coords.longitude),
        () => loadMapAndData(20.0059, 73.7897) // Nashik default
      );
    };

    const loadMapAndData = async (lat: number, lng: number) => {
      // Load Leaflet CSS + JS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });

      initializeMap(lat, lng);
      await fetchAllData(lat, lng);
    };

    const initializeMap = (lat: number, lng: number) => {
      const L = (window as any).L;
      const map = L.map('agr-map', { zoomControl: true }).setView([lat, lng], 8);

      // Base terrain layer
      const terrain = L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; Stadia Maps',
        opacity: 0.85,
      });
      terrain.addTo(map);

      // --- EQUATOR LINE ---
      L.polyline([[0, -180], [0, 180]], {
        color: '#ff4444',
        weight: 2,
        dashArray: '8,6',
        opacity: 0.9,
      }).bindTooltip('Equator (0°)', { permanent: false }).addTo(map);

      // Tropic of Cancer
      L.polyline([[23.5, -180], [23.5, 180]], {
        color: '#ff8800',
        weight: 1.5,
        dashArray: '6,4',
        opacity: 0.7,
      }).bindTooltip('Tropic of Cancer (23.5°N)', { permanent: false }).addTo(map);

      // Tropic of Capricorn
      L.polyline([[-23.5, -180], [-23.5, 180]], {
        color: '#ff8800',
        weight: 1.5,
        dashArray: '6,4',
        opacity: 0.7,
      }).bindTooltip('Tropic of Capricorn (23.5°S)', { permanent: false }).addTo(map);

      // --- RAIN LAYER (OpenWeatherMap WMS — no key needed for tile overlay) ---
      // Using Open-Meteo based rain visualization instead
      const rainLayer = L.tileLayer(
        'https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/8/1_1.png',
        { opacity: 0.5, attribution: 'RainViewer' }
      );

      // --- WIND LAYER (Windy tiles) ---
      // Use OpenWeatherMap wind tiles (free, no key for basic)
      // Alternatively use a colored wind speed overlay via canvas

      // --- CLOUD LAYER ---
      const cloudLayer = L.tileLayer(
        'https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=no_key_needed_for_demo',
        { opacity: 0.4, attribution: 'OpenWeatherMap' }
      );

      // Store layers for toggle
      const layerMap: Record<string, any> = {
        terrain,
        rain: rainLayer,
      };
      (window as any)._layers = layerMap;
      (window as any)._agrMap = map;
      (window as any)._L = L;
      (window as any)._agrMapInitialized = true;

      // Add compass rose (SVG-based, no emoji)
      const compassControl = L.Control.extend({
        onAdd: () => {
          const div = L.DomUtil.create('div');
          div.style.cssText = 'background:rgba(10,20,10,0.92);border:1px solid #2d5a27;border-radius:50%;width:70px;height:70px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.5);';
          div.innerHTML = `
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="28" fill="rgba(0,0,0,0.3)" stroke="#2d5a27" stroke-width="1"/>
              <!-- N arrow (red) -->
              <polygon points="30,6 26,30 30,26 34,30" fill="#e74c3c"/>
              <!-- S arrow (white) -->
              <polygon points="30,54 26,30 30,34 34,30" fill="#ecf0f1"/>
              <!-- E -->
              <polygon points="54,30 30,26 34,30 30,34" fill="#bdc3c7"/>
              <!-- W -->
              <polygon points="6,30 30,26 26,30 30,34" fill="#bdc3c7"/>
              <circle cx="30" cy="30" r="3" fill="#e74c3c"/>
              <text x="30" y="16" text-anchor="middle" fill="#e74c3c" font-size="8" font-weight="bold" font-family="monospace">N</text>
              <text x="30" y="48" text-anchor="middle" fill="#ecf0f1" font-size="8" font-weight="bold" font-family="monospace">S</text>
              <text x="46" y="33" text-anchor="middle" fill="#bdc3c7" font-size="8" font-weight="bold" font-family="monospace">E</text>
              <text x="14" y="33" text-anchor="middle" fill="#bdc3c7" font-size="8" font-weight="bold" font-family="monospace">W</text>
            </svg>`;
          return div;
        },
        getPosition: () => 'topleft',
      });
      map.addControl(new compassControl());
    };

    const fetchAllData = async (lat: number, lng: number) => {
      try {
        setLoading(true);

        // Fetch weather + agricultural data from Open-Meteo
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
          `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
          `weather_code,wind_speed_10m,wind_direction_10m,uv_index` +
          `&hourly=soil_moisture_0_to_1cm,soil_temperature_0cm,evapotranspiration` +
          `&daily=precipitation_sum,uv_index_max` +
          `&timezone=auto&forecast_days=1`
        );
        const weatherJson = await weatherRes.json();
        const current = weatherJson.current;
        const hourly = weatherJson.hourly;

        // Get elevation from Open-Meteo
        const elevRes = await fetch(
          `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`
        );
        const elevJson = await elevRes.json();
        const elevation = elevJson.elevation?.[0] || 0;

        const data: WeatherData = {
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          rainfall: current.precipitation || 0,
          windSpeed: current.wind_speed_10m,
          windDirection: current.wind_direction_10m,
          elevation,
          uvIndex: current.uv_index ?? 0,
          apparentTemp: current.apparent_temperature,
          soilMoisture: hourly?.soil_moisture_0_to_1cm?.[0] ?? 0,
          soilTemp: hourly?.soil_temperature_0cm?.[0] ?? current.temperature_2m,
          evapotranspiration: hourly?.evapotranspiration?.[0] ?? 0,
          precipitation24h: weatherJson.daily?.precipitation_sum?.[0] ?? 0,
        };

        setWeatherData(data);

        // Fetch tide data (using WorldTides API-compatible endpoint via Open-Meteo marine)
        // Open-Meteo marine for nearest coastal point
        try {
          const marineRes = await fetch(
            `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
            `&hourly=wave_height,wave_direction,wave_period&timezone=auto&forecast_days=1`
          );
          const marineJson = await marineRes.json();

          if (marineJson.hourly?.wave_height) {
            const heights: number[] = marineJson.hourly.wave_height;
            const times: string[] = marineJson.hourly.time;
            const tides: TideData[] = [];

            for (let i = 1; i < heights.length - 1; i++) {
              if (heights[i] > heights[i - 1] && heights[i] > heights[i + 1]) {
                tides.push({ time: times[i], height: parseFloat(heights[i].toFixed(2)), type: 'high' });
              } else if (heights[i] < heights[i - 1] && heights[i] < heights[i + 1]) {
                tides.push({ time: times[i], height: parseFloat(heights[i].toFixed(2)), type: 'low' });
              }
            }
            setTideData(tides.slice(0, 4));
          }
        } catch (e) {
          console.log('Marine data not available for this location');
        }

        const crops = analyzeCropSuitability(data);
        setCropSuitability(crops);

        displayAllLayers(lat, lng, data);
        setLoading(false);
      } catch (err) {
        console.error('Data fetch error:', err);
        setLoading(false);
      }
    };

    const analyzeCropSuitability = (w: WeatherData): CropSuitability[] => {
      const crops: CropSuitability[] = [];
      const t = w.temperature;
      const h = w.humidity;
      const sm = w.soilMoisture * 100; // convert to %

      // Scoring function
      const score = (base: number, bonuses: boolean[]) =>
        Math.min(99, base + bonuses.filter(Boolean).length * 4);

      if (t >= 20 && t <= 35 && h > 50)
        crops.push({ crop: 'Maize', icon: 'M', suitability: score(82, [sm > 30, w.rainfall > 0, t < 30]), reason: `Temp ${t}°C, Humidity ${h}%` });
      if (t >= 15 && t <= 30)
        crops.push({ crop: 'Wheat', icon: 'W', suitability: score(78, [h > 40, sm > 25, t < 25]), reason: `Ideal temp range` });
      if (t >= 25 && h > 60)
        crops.push({ crop: 'Rice', icon: 'R', suitability: score(80, [sm > 50, w.rainfall > 5, h > 70]), reason: `Warm & moist` });
      if (t >= 10 && t <= 25 && h > 40)
        crops.push({ crop: 'Tomato', icon: 'T', suitability: score(75, [sm > 20, w.soilTemp > 15, t > 15]), reason: `Moderate climate` });
      if (t >= 15 && t <= 28)
        crops.push({ crop: 'Chilli', icon: 'C', suitability: score(72, [h > 50, sm > 25]), reason: `Warm climate suitable` });
      if (t >= 18 && t <= 32 && w.elevation < 600)
        crops.push({ crop: 'Sugarcane', icon: 'S', suitability: score(70, [h > 60, sm > 35, w.precipitation24h > 2]), reason: `Low altitude, warm` });
      if (h > 70 && t > 22)
        crops.push({ crop: 'Banana', icon: 'B', suitability: score(74, [sm > 40, w.rainfall > 0]), reason: `High humidity` });
      if (t >= 10 && t <= 22 && sm > 20)
        crops.push({ crop: 'Potato', icon: 'P', suitability: score(68, [h > 50, w.soilTemp < 20]), reason: `Cool & moist soil` });
      if (t >= 22 && t <= 38 && w.elevation < 300)
        crops.push({ crop: 'Cotton', icon: 'Co', suitability: score(65, [h < 70, sm > 20, w.uvIndex > 4]), reason: `Hot & dry preferred` });
      if (t >= 18 && t <= 30 && sm > 15)
        crops.push({ crop: 'Soybean', icon: 'Sb', suitability: score(70, [h > 55, w.precipitation24h > 1]), reason: `Moderate conditions` });

      return crops.sort((a, b) => b.suitability - a.suitability).slice(0, 6);
    };

    const displayAllLayers = (lat: number, lng: number, w: WeatherData) => {
      const L = (window as any)._L;
      const map = (window as any)._agrMap;
      if (!L || !map) return;

      // ---- WIND DIRECTION ARROW (dynamic, SVG-based) ----
      const windDeg = w.windDirection;
      const windColor = w.windSpeed > 30 ? '#e74c3c' : w.windSpeed > 15 ? '#f39c12' : '#2ecc71';
      const windIcon = L.divIcon({
        html: `<div style="transform:rotate(${windDeg}deg);width:50px;height:50px;display:flex;align-items:center;justify-content:center;">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <polygon points="0 0, 6 3, 0 6" fill="${windColor}"/>
            </marker></defs>
            <circle cx="24" cy="24" r="22" fill="rgba(0,0,0,0.6)" stroke="${windColor}" stroke-width="1.5"/>
            <line x1="24" y1="36" x2="24" y2="10" stroke="${windColor}" stroke-width="2.5" marker-end="url(#ah)"/>
            <circle cx="24" cy="24" r="3" fill="${windColor}"/>
          </svg>
        </div>`,
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25],
      });
      L.marker([lat, lng], { icon: windIcon })
        .addTo(map)
        .bindPopup(`<b>Wind</b><br>Speed: ${w.windSpeed} km/h<br>Direction: ${windDeg}° (${degToCompass(windDeg)})<br>Color: ${w.windSpeed > 30 ? 'High' : w.windSpeed > 15 ? 'Moderate' : 'Low'}`);

      // ---- HUMIDITY ZONE (gradient circle) ----
      const humColor = w.humidity > 75 ? '#1a6bb5' : w.humidity > 55 ? '#3498db' : '#7fb3d3';
      L.circle([lat, lng], {
        color: humColor,
        fillColor: humColor,
        fillOpacity: Math.min(0.45, w.humidity / 150),
        radius: 18000,
        weight: 1.5,
      }).addTo(map).bindPopup(`<b>Humidity Zone</b><br>${w.humidity}% relative humidity`);

      // ---- ALTITUDE MARKER ----
      const altColor = w.elevation > 1000 ? '#8e44ad' : w.elevation > 500 ? '#7f8c8d' : '#27ae60';
      const altLabel = w.elevation > 1000 ? 'High Altitude' : w.elevation > 500 ? 'Mid Altitude' : 'Low Altitude';
      L.marker([lat + 0.08, lng], {
        icon: L.divIcon({
          html: `<div style="background:${altColor};color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;font-family:monospace;border:1px solid rgba(255,255,255,0.3);white-space:nowrap;">
            ALT: ${Math.round(w.elevation)}m (${altLabel})
          </div>`,
          className: '',
        }),
      }).addTo(map).bindPopup(`<b>Elevation</b><br>${Math.round(w.elevation)}m above sea level<br>${altLabel}`);

      // ---- UV INDEX MARKER ----
      const uvColor = w.uvIndex > 8 ? '#c0392b' : w.uvIndex > 5 ? '#e67e22' : '#27ae60';
      const uvLabel = w.uvIndex > 8 ? 'Very High' : w.uvIndex > 5 ? 'High' : w.uvIndex > 2 ? 'Moderate' : 'Low';
      L.marker([lat - 0.08, lng], {
        icon: L.divIcon({
          html: `<div style="background:${uvColor};color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;font-family:monospace;border:1px solid rgba(255,255,255,0.3);white-space:nowrap;">
            UV: ${w.uvIndex.toFixed(1)} (${uvLabel})
          </div>`,
          className: '',
        }),
      }).addTo(map).bindPopup(`<b>UV Index</b>: ${w.uvIndex.toFixed(1)}<br>${uvLabel}<br>Protect crops above UV 6`);

      // ---- TEMPERATURE MARKER ----
      const tempColor = w.temperature > 35 ? '#e74c3c' : w.temperature > 25 ? '#f39c12' : '#3498db';
      L.marker([lat, lng + 0.12], {
        icon: L.divIcon({
          html: `<div style="background:${tempColor};color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;font-family:monospace;border:1px solid rgba(255,255,255,0.3);white-space:nowrap;">
            TEMP: ${w.temperature}°C / Feels ${w.apparentTemp}°C
          </div>`,
          className: '',
        }),
      }).addTo(map).bindPopup(`<b>Temperature</b><br>Air: ${w.temperature}°C<br>Feels like: ${w.apparentTemp}°C<br>Soil: ${w.soilTemp?.toFixed(1)}°C`);

      // ---- RAIN MARKER ----
      const rainColor = w.rainfall > 10 ? '#1a6bb5' : w.rainfall > 0 ? '#3498db' : '#95a5a6';
      L.marker([lat, lng - 0.12], {
        icon: L.divIcon({
          html: `<div style="background:${rainColor};color:#fff;padding:4px 9px;border-radius:4px;font-size:11px;font-weight:bold;font-family:monospace;border:1px solid rgba(255,255,255,0.3);white-space:nowrap;">
            RAIN: ${w.rainfall}mm now / ${w.precipitation24h}mm 24h
          </div>`,
          className: '',
        }),
      }).addTo(map).bindPopup(`<b>Rainfall</b><br>Current: ${w.rainfall}mm<br>Last 24h: ${w.precipitation24h}mm`);

      // ---- RAINFALL CIRCLE (if raining) ----
      if (w.rainfall > 0) {
        L.circle([lat, lng], {
          color: '#0ea5e9',
          fillColor: '#0ea5e9',
          fillOpacity: 0.12,
          radius: Math.max(w.rainfall * 500, 3000),
          weight: 1.5,
          dashArray: '5,5',
        }).addTo(map).bindPopup(`<b>Rain Zone</b><br>${w.rainfall}mm current precipitation`);
      }

      // ---- SOIL MOISTURE RING ----
      const smPct = (w.soilMoisture * 100).toFixed(1);
      const smColor = w.soilMoisture > 0.4 ? '#2980b9' : w.soilMoisture > 0.2 ? '#27ae60' : '#e67e22';
      L.circle([lat, lng], {
        color: smColor,
        fillColor: smColor,
        fillOpacity: 0.08,
        radius: 10000,
        weight: 2,
        dashArray: '3,8',
      }).addTo(map).bindPopup(`<b>Soil Moisture</b><br>${smPct}% volumetric<br>Soil Temp: ${w.soilTemp?.toFixed(1)}°C<br>Evapotranspiration: ${w.evapotranspiration?.toFixed(2)} mm/h`);

      // ---- USER LOCATION MARKER (SVG pin) ----
      const pinIcon = L.divIcon({
        html: `<div style="display:flex;flex-direction:column;align-items:center;">
          <svg width="32" height="40" viewBox="0 0 32 40">
            <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 40 16 40 C16 40 32 28 32 16 C32 7.16 24.84 0 16 0Z" fill="#27ae60"/>
            <circle cx="16" cy="16" r="8" fill="white"/>
            <circle cx="16" cy="16" r="4" fill="#27ae60"/>
          </svg>
        </div>`,
        className: '',
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      });
      L.marker([lat, lng], { icon: pinIcon })
        .addTo(map)
        .bindPopup(`<b>Your Location</b><br>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

      // ---- CARDINAL DIRECTION LABELS around location ----
      const cardinalOffset = 0.25;
      const cardinals: [number, number, string][] = [
        [lat + cardinalOffset, lng, 'N'],
        [lat - cardinalOffset, lng, 'S'],
        [lat, lng + cardinalOffset * 1.4, 'E'],
        [lat, lng - cardinalOffset * 1.4, 'W'],
      ];
      cardinals.forEach(([clat, clng, label]) => {
        L.marker([clat, clng], {
          icon: L.divIcon({
            html: `<div style="background:rgba(0,0,0,0.75);color:#ecf0f1;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;font-family:monospace;border:1.5px solid #aaa;">${label}</div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map);
      });

      // ---- SEA LEVEL REFERENCE LINE (horizontal across map) ----
      L.polyline([[lat, lng - 5], [lat, lng + 5]], {
        color: '#3498db',
        weight: 1.5,
        dashArray: '4,6',
        opacity: 0.5,
      }).bindTooltip(`Sea Level Ref: ${Math.round(w.elevation)}m above`, { permanent: false }).addTo(map);

      // ---- LAYER CONTROL ----
      const L2 = L;
      const rainviewerLayer = L2.tileLayer(
        'https://tilecache.rainviewer.com/v2/radar/nowcast/256/{z}/{x}/{y}/8/1_1.png',
        { opacity: 0.5, attribution: 'RainViewer' }
      );
      const overlays = {
        'Live Rain Radar': rainviewerLayer,
      };
      L2.control.layers({}, overlays, { position: 'topright' }).addTo(map);
    };

    const degToCompass = (deg: number): string => {
      const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      return dirs[Math.round(deg / 22.5) % 16];
    };

    if (Platform.OS === 'web') initMap();
    return () => { (window as any)._agrMapInitialized = false; };
  }, []);

  const getSuitabilityColor = (pct: number) =>
    pct >= 85 ? '#27ae60' : pct >= 70 ? '#f39c12' : '#e74c3c';

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div id="agr-map" style={{ width: '100%', flex: 1 }} />

          {/* Top legend bar */}
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(8,20,8,0.92)', color: '#fff', padding: '6px 16px',
            borderRadius: '20px', fontSize: '11px', fontFamily: 'monospace',
            border: '1px solid #2d5a27', zIndex: 1000, display: 'flex', gap: '14px',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ color: '#ff4444' }}>— Equator</span>
            <span style={{ color: '#ff8800' }}>— Tropics</span>
            <span style={{ color: '#3498db' }}>◯ Humidity Zone</span>
            <span style={{ color: '#27ae60' }}>◯ Soil Moisture</span>
            <span style={{ color: '#e74c3c' }}>⊕ Rainfall</span>
          </div>

          {/* Side panel */}
          {loading ? (
            <div style={{ position: 'absolute', bottom: 20, right: 10, background: 'rgba(8,20,8,0.95)', color: '#7fba00', padding: '20px', borderRadius: '10px', fontSize: '13px', zIndex: 1000, fontFamily: 'monospace', border: '1px solid #2d5a27' }}>
              Loading live agricultural data...
            </div>
          ) : weatherData ? (
            <div style={{
              position: 'absolute', bottom: 10, right: 10,
              background: 'rgba(6,14,6,0.96)', color: '#e8f5e9',
              padding: '14px', borderRadius: '10px', maxWidth: '270px',
              fontSize: '11px', border: '1px solid #2d5a27', zIndex: 1000,
              maxHeight: '80vh', overflowY: 'auto', fontFamily: 'monospace',
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#7fba00', fontSize: '13px', letterSpacing: '1px' }}>
                AGRI-MAP LIVE DATA
              </div>

              {/* Weather grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #1a3a1a' }}>
                {[
                  ['TEMP', `${weatherData.temperature}°C`],
                  ['FEELS', `${weatherData.apparentTemp}°C`],
                  ['HUMIDITY', `${weatherData.humidity}%`],
                  ['WIND', `${weatherData.windSpeed} km/h`],
                  ['WIND DIR', `${weatherData.windDirection}° ${windDegToLabel(weatherData.windDirection)}`],
                  ['RAIN NOW', `${weatherData.rainfall}mm`],
                  ['RAIN 24H', `${weatherData.precipitation24h}mm`],
                  ['ALTITUDE', `${Math.round(weatherData.elevation)}m`],
                  ['UV INDEX', weatherData.uvIndex.toFixed(1)],
                  ['SOIL TEMP', `${weatherData.soilTemp?.toFixed(1)}°C`],
                  ['SOIL MOIST', `${(weatherData.soilMoisture * 100).toFixed(1)}%`],
                  ['EVAPOTRANS', `${weatherData.evapotranspiration?.toFixed(2)}mm/h`],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 6px', borderRadius: '4px' }}>
                    <div style={{ color: '#4caf50', fontSize: '9px' }}>{label}</div>
                    <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Tides */}
              {tideData.length > 0 && (
                <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #1a3a1a' }}>
                  <div style={{ color: '#7fba00', fontWeight: 'bold', marginBottom: '6px', fontSize: '11px' }}>TIDE FORECAST</div>
                  {tideData.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                      <span style={{ color: t.type === 'high' ? '#3498db' : '#95a5a6' }}>
                        {t.type === 'high' ? 'HIGH' : 'LOW'} TIDE
                      </span>
                      <span>{t.time.split('T')[1]?.slice(0, 5)}</span>
                      <span style={{ color: '#e8f5e9' }}>{t.height}m</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Crop suitability */}
              <div style={{ color: '#7fba00', fontWeight: 'bold', marginBottom: '8px', fontSize: '11px' }}>
                CROP SUITABILITY (LIVE)
              </div>
              {cropSuitability.map((crop, i) => (
                <div key={i} style={{ marginBottom: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{crop.crop}</span>
                    <span style={{ color: getSuitabilityColor(crop.suitability), fontWeight: 'bold' }}>
                      {crop.suitability}%
                    </span>
                  </div>
                  <div style={{ background: '#1a3a1a', borderRadius: '3px', height: '4px', marginTop: '3px' }}>
                    <div style={{ background: getSuitabilityColor(crop.suitability), height: '4px', borderRadius: '3px', width: `${crop.suitability}%` }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{crop.reason}</div>
                </div>
              ))}

              <div style={{ marginTop: '8px', borderTop: '1px solid #1a3a1a', paddingTop: '8px', fontSize: '10px', color: '#555' }}>
                Data: Open-Meteo API • Updated live
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <View style={styles.mobileContainer}>
          <Text style={styles.mobileText}>Map view available on web only</Text>
          {weatherData && (
            <Text style={styles.mobileText}>
              {(weatherData as WeatherData).temperature}°C, {(weatherData as WeatherData).humidity}% humidity
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function windDegToLabel(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  mobileContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a140a' },
  mobileText: { color: '#7fba00', fontSize: 14, marginVertical: 10, textAlign: 'center', fontFamily: 'monospace' },
});

export default AgriculturalMap;