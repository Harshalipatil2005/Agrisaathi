/**
 * WeatherForecast.tsx
 *
 * Real weather data via Open-Meteo (https://open-meteo.com)
 * ✅ No API key, no signup, completely free for non-commercial use
 * ✅ Live current conditions + past 6 days + next 6 days
 * ✅ CORS supported — works directly from React Native / Expo fetch()
 *
 * Usage in UserHome.tsx:
 *   import WeatherSection from '../../components/WeatherForecast';
 *   // Replace your existing weather <View style={styles.section}> block with:
 *   <WeatherSection />
 */

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect } from 'react';

// ─── Config ────────────────────────────────────────────────────────────────
const NASHIK_LAT = 19.9975;
const NASHIK_LON = 73.7898;
const TIMEZONE   = 'Asia/Kolkata';

// ─── WMO weather code → { label, icon } ───────────────────────────────────
function wmoToInfo(code: number): { label: string; icon: string } {
  if (code === 0)  return { label: 'Clear sky',      icon: '☀️' };
  if (code <= 2)   return { label: 'Partly cloudy',  icon: '⛅' };
  if (code === 3)  return { label: 'Overcast',        icon: '☁️' };
  if (code <= 49)  return { label: 'Foggy',           icon: '🌫️' };
  if (code <= 55)  return { label: 'Drizzle',         icon: '🌦️' };
  if (code <= 65)  return { label: 'Rain',            icon: '🌧️' };
  if (code <= 77)  return { label: 'Snow',            icon: '❄️' };
  if (code <= 82)  return { label: 'Rain showers',    icon: '🌦️' };
  if (code <= 86)  return { label: 'Snow showers',    icon: '🌨️' };
  if (code <= 99)  return { label: 'Thunderstorm',    icon: '⛈️' };
  return { label: 'Unknown', icon: '🌡️' };
}

function humidityColor(h: number) {
  if (h > 75) return '#378add';
  if (h > 60) return '#1d9e75';
  return '#4a9962';
}

// ─── Types ─────────────────────────────────────────────────────────────────
type DayData = {
  date: string;
  label: string;
  type: 'past' | 'today' | 'future';
  icon: string;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  precipitation: number;
};

type CurrentData = {
  temp: number;
  humidity: number;
  wind: number;
  weathercode: number;
};

// ─── Theme ─────────────────────────────────────────────────────────────────
const T = {
  green2: '#b8dfc4',
  green5: '#4a9962',
  green6: '#2e7d45',
  text:      '#1e3a28',
  textMid:   '#3d6b4f',
  textLight: '#6a9e7a',
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Sub-components ────────────────────────────────────────────────────────
function HumidityBar({ value }: { value: number }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min(value, 100)}%` as any, backgroundColor: humidityColor(value) }]} />
    </View>
  );
}

function WindBar({ value }: { value: number }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min((value / 40) * 100, 100)}%` as any, backgroundColor: '#6ab583' }]} />
    </View>
  );
}

function RainBar({ value }: { value: number }) {
  return (
    <View style={s.barTrack}>
      <View style={[s.barFill, { width: `${Math.min((value / 20) * 100, 100)}%` as any, backgroundColor: '#378add' }]} />
    </View>
  );
}

function BadgePill({ type }: { type: DayData['type'] }) {
  const map = {
    past:   { bg: '#e8f4fd', color: '#185fa5', label: 'Past' },
    today:  { bg: '#d4edda', color: '#2e7d45', label: 'Today' },
    future: { bg: '#fef9e7', color: '#854f0b', label: 'Forecast' },
  };
  const b = map[type];
  return (
    <View style={[s.badge, { backgroundColor: b.bg }]}>
      <Text style={[s.badgeText, { color: b.color }]}>{b.label}</Text>
    </View>
  );
}

function DayRow({ day }: { day: DayData }) {
  return (
    <View style={m.dayRow}>
      <View style={m.dayLeft}>
        <Text style={m.dayLabel}>{day.label}</Text>
        <BadgePill type={day.type} />
      </View>
      <Text style={m.dayIcon}>{day.icon}</Text>
      <Text style={m.dayCond}>{day.condition}</Text>
      <Text style={m.dayHigh}>{day.high}°</Text>
      <Text style={m.dayLow}>{day.low}°</Text>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function WeatherSection() {
  const [current, setCurrent] = useState<CurrentData | null>(null);
  const [days, setDays]       = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => { fetchWeather(); }, []);

  async function fetchWeather() {
    try {
      setLoading(true);
      setError(null);

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${NASHIK_LAT}` +
        `&longitude=${NASHIK_LON}` +
        `&current=temperature_2m,relative_humidity_2m,windspeed_10m,weathercode` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,precipitation_sum,relative_humidity_2m_max` +
        `&past_days=6` +
        `&forecast_days=7` +
        `&timezone=${encodeURIComponent(TIMEZONE)}`;

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // Current conditions
      const c = json.current;
      setCurrent({
        temp:        Math.round(c.temperature_2m),
        humidity:    c.relative_humidity_2m,
        wind:        Math.round(c.windspeed_10m),
        weathercode: c.weathercode,
      });

      // Daily data: index 0-5 = past 6 days, index 6 = today, index 7-12 = next 6 days
      const todayStr = json.daily.time[6];
      const builtDays: DayData[] = (json.daily.time as string[]).map((dateStr, i) => {
        const isToday = dateStr === todayStr;
        const { label, icon } = wmoToInfo(json.daily.weathercode[i]);
        return {
          date:          dateStr,
          label:         formatLabel(dateStr, isToday),
          type:          isToday ? 'today' : i < 6 ? 'past' : 'future',
          icon,
          condition:     label,
          high:          Math.round(json.daily.temperature_2m_max[i]),
          low:           Math.round(json.daily.temperature_2m_min[i]),
          humidity:      json.daily.relative_humidity_2m_max[i] ?? 0,
          wind:          Math.round(json.daily.windspeed_10m_max[i]),
          precipitation: +(json.daily.precipitation_sum[i] ?? 0).toFixed(1),
        };
      });

      setDays(builtDays);
    } catch {
      setError('Could not load weather. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  const todayData   = days.find((d) => d.type === 'today');
  const { label: currentLabel, icon: currentIcon } = current
    ? wmoToInfo(current.weathercode)
    : { label: '—', icon: '⛅' };

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>🌤️ Weather Overview</Text>

      {/* ── Weather card ── */}
      <TouchableOpacity
        style={s.weatherBox}
        onPress={() => { if (!loading && !error) setModalVisible(true); }}
        activeOpacity={0.85}
      >
        {loading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator color={T.green6} />
            <Text style={s.loadingText}>Fetching live weather…</Text>
          </View>
        ) : error ? (
          <View style={s.errorRow}>
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchWeather} style={s.retryBtn}>
              <Text style={s.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={s.weatherHeader}>
              <View>
                <Text style={s.weatherTemp}>{current?.temp ?? '—'}°C</Text>
                <Text style={s.weatherCity}>Nashik, Maharashtra</Text>
                <Text style={s.weatherDesc}>
                  {currentIcon}  {currentLabel}
                </Text>
              </View>
              <View style={s.tapHint}>
                <Text style={s.tapHintText}>📅 13-day forecast</Text>
              </View>
            </View>
            <View style={s.weatherDetails}>
              {[
                { label: 'Humidity', val: `${current?.humidity ?? '—'}%` },
                { label: 'Wind',     val: `${current?.wind ?? '—'} km/h` },
                { label: 'Rain',     val: `${todayData?.precipitation ?? 0} mm` },
              ].map((stat) => (
                <View key={stat.label} style={s.weatherStat}>
                  <Text style={s.weatherStatLabel}>{stat.label}</Text>
                  <Text style={s.weatherStatVal}>{stat.val}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* ── Forecast Modal (bottom sheet) ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={m.overlay}>
          <View style={m.sheet}>
            <View style={m.handle} />

            <Text style={m.city}>Nashik, Maharashtra</Text>
            <Text style={m.bigTemp}>{current?.temp ?? '—'}°C</Text>
            <Text style={m.currentDesc}>
              {currentIcon}  {currentLabel}  ·  Humidity {current?.humidity}%  ·  Wind {current?.wind} km/h
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={m.sectionLabel}>Past 6 days</Text>
              {days.filter((d) => d.type === 'past').map((d) => (
                <DayRow key={d.date} day={d} />
              ))}

              <Text style={m.sectionLabel}>Today & next 6 days</Text>
              {days.filter((d) => d.type !== 'past').map((d) => (
                <DayRow key={d.date} day={d} />
              ))}

              <Text style={m.sectionLabel}>Humidity (%)</Text>
              {days.map((d) => (
                <View key={d.date} style={m.barRow}>
                  <Text style={m.barLabel}>{d.label}</Text>
                  <HumidityBar value={d.humidity} />
                  <Text style={m.barVal}>{d.humidity}%</Text>
                </View>
              ))}

              <Text style={m.sectionLabel}>Wind speed (km/h)</Text>
              {days.map((d) => (
                <View key={d.date} style={m.barRow}>
                  <Text style={m.barLabel}>{d.label}</Text>
                  <WindBar value={d.wind} />
                  <Text style={m.barVal}>{d.wind}</Text>
                </View>
              ))}

              <Text style={m.sectionLabel}>Rainfall (mm)</Text>
              {days.map((d) => (
                <View key={d.date} style={m.barRow}>
                  <Text style={m.barLabel}>{d.label}</Text>
                  <RainBar value={d.precipitation} />
                  <Text style={m.barVal}>{d.precipitation}</Text>
                </View>
              ))}

              
              <TouchableOpacity style={m.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={m.closeBtnText}>Close</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  section:       { paddingHorizontal: 16, paddingVertical: 20 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: T.green6, marginBottom: 12 },
  weatherBox:    { backgroundColor: 'rgba(180,225,195,0.65)', borderRadius: 16, padding: 16, borderWidth: 1.5, borderColor: T.green2 },
  weatherHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  weatherTemp:   { fontSize: 42, fontWeight: '900', color: T.green6, lineHeight: 46 },
  weatherCity:   { fontSize: 14, color: T.textMid, fontWeight: '700', marginTop: 4 },
  weatherDesc:   { fontSize: 12, color: T.textLight, marginTop: 2 },
  tapHint:       { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  tapHintText:   { fontSize: 11, fontWeight: '700', color: T.green5 },
  weatherDetails:{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  weatherStat:   { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', flex: 1, minWidth: 60 },
  weatherStatLabel: { fontSize: 10, color: T.textLight, fontWeight: '600' },
  weatherStatVal:   { fontSize: 15, fontWeight: '800', color: T.green5 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText:{ color: T.green6, fontSize: 13, fontWeight: '600' },
  errorRow:   { alignItems: 'center', paddingVertical: 12, gap: 8 },
  errorText:  { color: '#c0392b', fontSize: 13, textAlign: 'center' },
  retryBtn:   { backgroundColor: T.green5, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 16 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 12 },
  badge:      { borderRadius: 5, paddingVertical: 1, paddingHorizontal: 5, alignSelf: 'flex-start', marginTop: 2 },
  badgeText:  { fontSize: 9, fontWeight: '700' },
  barTrack:   { flex: 1, height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  barFill:    { height: 6, borderRadius: 3 },
});

const m = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '92%' },
  handle:      { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  city:        { fontSize: 16, fontWeight: '700', color: T.text },
  bigTemp:     { fontSize: 52, fontWeight: '900', color: T.green6, lineHeight: 58 },
  currentDesc: { fontSize: 13, color: T.textLight, marginBottom: 6 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: T.textLight, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },
  dayRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee', gap: 8 },
  dayLeft:     { width: 82, flexShrink: 0 },
  dayLabel:    { fontSize: 13, fontWeight: '600', color: T.text },
  dayIcon:     { fontSize: 18, width: 26, textAlign: 'center' },
  dayCond:     { flex: 1, fontSize: 12, color: T.textLight },
  dayHigh:     { fontSize: 14, fontWeight: '700', color: T.text, width: 32, textAlign: 'right' },
  dayLow:      { fontSize: 13, color: T.textLight, width: 28, textAlign: 'right' },
  barRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  barLabel:    { fontSize: 12, color: T.textLight, width: 72, flexShrink: 0 },
  barVal:      { fontSize: 12, fontWeight: '600', color: T.text, width: 40, textAlign: 'right' },
  attribution: { fontSize: 10, color: T.textLight, textAlign: 'center', marginTop: 16 },
  closeBtn:    { backgroundColor: T.green5, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  closeBtnText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
