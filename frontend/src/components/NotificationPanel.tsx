/**
 * NotificationPanel.tsx
 *
 * A bottom-sheet notification panel for AgriSaathi with 3 live sections:
 *  1. 🌦️ Weather Alerts  — fetched live from Open-Meteo (Nashik)
 *  2. 🏛️ Scheme Updates  — curated government scheme notifications
 *  3. 🌱 Farming Tips    — AI-style contextual tips based on the season
 *
 * Usage in UserHome.tsx:
 *   import NotificationPanel from '../../components/NotificationPanel';
 *
 *   // Add state:
 *   const [notifVisible, setNotifVisible] = useState(false);
 *
 *   // Replace the bell button:
 *   <TouchableOpacity style={styles.topbarBtn} onPress={() => setNotifVisible(true)}>
 *     <Text style={styles.topbarBtnText}>🔔</Text>
 *   </TouchableOpacity>
 *
 *   // Add panel anywhere in JSX (outside ScrollView):
 *   <NotificationPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />
 */

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';

// ─── Config ────────────────────────────────────────────────────────────────
const NASHIK_LAT = 19.9975;
const NASHIK_LON = 73.7898;
const TIMEZONE   = 'Asia/Kolkata';

// ─── Theme ─────────────────────────────────────────────────────────────────
const T = {
  bg:        '#f4faf0',
  white:     '#ffffff',
  green1:    '#d4edda',
  green2:    '#b8dfc4',
  green4:    '#6ab583',
  green5:    '#4a9962',
  green6:    '#2e7d45',
  text:      '#1e3a28',
  textMid:   '#3d6b4f',
  textLight: '#6a9e7a',
  amber:     '#fef9e7',
  amberText: '#854f0b',
  blue:      '#e8f4fd',
  blueText:  '#185fa5',
  red:       '#fdecea',
  redText:   '#c0392b',
  purple:    '#f0ebfe',
  purpleText:'#5b3fbf',
};

// ─── WMO code helpers ──────────────────────────────────────────────────────
function wmoToInfo(code: number) {
  if (code === 0)  return { label: 'Clear sky',      icon: '☀️',  severity: 'low' };
  if (code <= 2)   return { label: 'Partly cloudy',  icon: '⛅',  severity: 'low' };
  if (code === 3)  return { label: 'Overcast',        icon: '☁️',  severity: 'low' };
  if (code <= 49)  return { label: 'Foggy',           icon: '🌫️', severity: 'medium' };
  if (code <= 55)  return { label: 'Drizzle',         icon: '🌦️', severity: 'low' };
  if (code <= 65)  return { label: 'Rain',            icon: '🌧️', severity: 'medium' };
  if (code <= 77)  return { label: 'Snow',            icon: '❄️',  severity: 'high' };
  if (code <= 82)  return { label: 'Rain showers',    icon: '🌦️', severity: 'medium' };
  if (code <= 86)  return { label: 'Snow showers',    icon: '🌨️', severity: 'high' };
  if (code <= 99)  return { label: 'Thunderstorm',    icon: '⛈️', severity: 'high' };
  return { label: 'Unknown', icon: '🌡️', severity: 'low' };
}

function severityColor(s: string) {
  if (s === 'high')   return { bg: T.red,    text: T.redText };
  if (s === 'medium') return { bg: T.amber,  text: T.amberText };
  return                     { bg: T.green1, text: T.green6 };
}

function formatShortDate(dateStr: string, isToday: boolean) {
  if (isToday) return 'Today';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Types ─────────────────────────────────────────────────────────────────
type WeatherAlert = {
  date: string;
  label: string;
  icon: string;
  condition: string;
  high: number;
  low: number;
  precipitation: number;
  wind: number;
  severity: string;
  isToday: boolean;
};

type SchemeNotif = {
  id: string;
  icon: string;
  title: string;
  body: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
  time: string;
  isNew: boolean;
};

type FarmingTip = {
  id: string;
  icon: string;
  title: string;
  body: string;
  tag: string;
  tagBg: string;
  tagText: string;
  time: string;
};

// ─── Static data ───────────────────────────────────────────────────────────
const SCHEME_NOTIFS: SchemeNotif[] = [
  {
    id: 's1',
    icon: '🆕',
    title: 'New: PM Kisan 19th Installment',
    body: 'The 19th installment of PM-KISAN (₹2,000) has been released. Check your eKYC status to ensure eligibility.',
    badge: 'Just Added',
    badgeBg: T.green1,
    badgeText: T.green6,
    time: 'Today',
    isNew: true,
  },
  {
    id: 's2',
    icon: '📋',
    title: 'Fasal Bima: Enrollment Closing',
    body: 'Pradhan Mantri Fasal Bima Yojana enrollment for Kharif 2025 closes in 5 days. Apply via your nearest bank or CSC.',
    badge: 'Deadline Soon',
    badgeBg: T.red,
    badgeText: T.redText,
    time: '2 days ago',
    isNew: true,
  },
  {
    id: 's3',
    icon: '💳',
    title: 'Kisan Credit Card: Interest Subvention',
    body: 'Short-term crop loans up to ₹3 lakh now available at 4% p.a. effective interest under the interest subvention scheme.',
    badge: 'Active',
    badgeBg: T.blue,
    badgeText: T.blueText,
    time: '3 days ago',
    isNew: false,
  },
  {
    id: 's4',
    icon: '🌱',
    title: 'Soil Health Card Scheme Revamped',
    body: 'Government has revamped the Soil Health Card scheme. Free soil testing available at your nearest KVK. Get crop-specific nutrient recommendations.',
    badge: 'Updated',
    badgeBg: T.purple,
    badgeText: T.purpleText,
    time: '5 days ago',
    isNew: false,
  },
  {
    id: 's5',
    icon: '🚜',
    title: 'SMAM: Farm Equipment Subsidy',
    body: 'Sub-Mission on Agricultural Mechanisation offers 40–50% subsidy on tractors, rotavators, and drip kits for small & marginal farmers.',
    badge: 'Apply Now',
    badgeBg: T.amber,
    badgeText: T.amberText,
    time: '1 week ago',
    isNew: false,
  },
];

const FARMING_TIPS: FarmingTip[] = [
  {
    id: 'f1',
    icon: '🌿',
    title: 'Pre-monsoon soil prep tip',
    body: 'With temperatures rising, deep plough your fields now (15–20 cm). This breaks hard pans, improves water infiltration, and kills soil-borne pests exposed to sun.',
    tag: 'Soil Health',
    tagBg: T.green1,
    tagText: T.green6,
    time: 'Today',
  },
  {
    id: 'f2',
    icon: '💧',
    title: 'Irrigation: Switch to drip before April',
    body: 'Nashik region sees rising evapo-transpiration in April. Converting to drip or sprinkler can save 30–40% water and improve onion & grape quality.',
    tag: 'Water Management',
    tagBg: T.blue,
    tagText: T.blueText,
    time: 'Yesterday',
  },
  {
    id: 'f3',
    icon: '🐛',
    title: 'Thrips alert on onion crops',
    body: 'IMD seasonal data suggests dry & warm conditions ahead — ideal for thrips buildup on onion. Apply spinosad or neem-based sprays preventively. Check undersides of leaves.',
    tag: 'Pest Alert',
    tagBg: T.red,
    tagText: T.redText,
    time: '2 days ago',
  },
  {
    id: 'f4',
    icon: '🌾',
    title: 'Wheat harvest: post-harvest care',
    body: 'After wheat harvest, avoid burning stubble (banned in Maharashtra). Incorporate it as mulch or use a happy seeder for next crop. This improves organic carbon by 0.3–0.5%.',
    tag: 'Post-Harvest',
    tagBg: T.amber,
    tagText: T.amberText,
    time: '3 days ago',
  },
  {
    id: 'f5',
    icon: '🍇',
    title: 'Grape pruning window open',
    body: 'March–April is the ideal 2nd pruning window for Nashik grapes. Maintain 6–8 shoots per vine and apply potassium-rich fertilizer post-pruning for better berry set.',
    tag: 'Horticulture',
    tagBg: T.purple,
    tagText: T.purpleText,
    time: '4 days ago',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={c.sectionHeader}>
      <Text style={c.sectionTitle}>{title}</Text>
      {count !== undefined && (
        <View style={c.countBadge}>
          <Text style={c.countBadgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function WeatherAlertCard({ alert }: { alert: WeatherAlert }) {
  const col = severityColor(alert.severity);
  return (
    <View style={[c.alertCard, { borderLeftColor: col.text, backgroundColor: col.bg }]}>
      <View style={c.alertRow}>
        <Text style={c.alertIcon}>{alert.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={c.alertTitleRow}>
            <Text style={[c.alertDay, { color: col.text }]}>{alert.label}</Text>
            {alert.isToday && (
              <View style={[c.pill, { backgroundColor: col.text }]}>
                <Text style={c.pillTextWhite}>NOW</Text>
              </View>
            )}
          </View>
          <Text style={[c.alertCondition, { color: col.text }]}>{alert.condition}</Text>
          <View style={c.alertStats}>
            <Text style={[c.alertStat, { color: col.text }]}>🌡️ {alert.high}°/{alert.low}°</Text>
            <Text style={[c.alertStat, { color: col.text }]}>🌧️ {alert.precipitation}mm</Text>
            <Text style={[c.alertStat, { color: col.text }]}>💨 {alert.wind}km/h</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function SchemeCard({ notif }: { notif: SchemeNotif }) {
  return (
    <View style={c.card}>
      <View style={c.cardRow}>
        <View style={c.cardIconWrap}>
          <Text style={c.cardIconText}>{notif.icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={c.cardTitleRow}>
            <Text style={c.cardTitle} numberOfLines={1}>{notif.title}</Text>
            {notif.isNew && <View style={c.newDot} />}
          </View>
          <Text style={c.cardBody}>{notif.body}</Text>
          <View style={c.cardFooter}>
            <View style={[c.pill, { backgroundColor: notif.badgeBg }]}>
              <Text style={[c.pillText, { color: notif.badgeText }]}>{notif.badge}</Text>
            </View>
            <Text style={c.cardTime}>{notif.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function FarmingTipCard({ tip }: { tip: FarmingTip }) {
  return (
    <View style={c.card}>
      <View style={c.cardRow}>
        <View style={[c.cardIconWrap, { backgroundColor: tip.tagBg }]}>
          <Text style={c.cardIconText}>{tip.icon}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={c.cardTitle}>{tip.title}</Text>
          <Text style={c.cardBody}>{tip.body}</Text>
          <View style={c.cardFooter}>
            <View style={[c.pill, { backgroundColor: tip.tagBg }]}>
              <Text style={[c.pillText, { color: tip.tagText }]}>{tip.tag}</Text>
            </View>
            <Text style={c.cardTime}>{tip.time}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Tab bar ───────────────────────────────────────────────────────────────
const TABS = [
  { key: 'weather', label: '🌦️ Weather', count: 0 },
  { key: 'schemes', label: '🏛️ Schemes', count: 2 },
  { key: 'farming', label: '🌱 Farming',  count: 0 },
] as const;
type TabKey = typeof TABS[number]['key'];

// ─── Main Panel ────────────────────────────────────────────────────────────
export default function NotificationPanel({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('weather');
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherError, setWeatherError]     = useState<string | null>(null);

  useEffect(() => {
    if (visible && weatherAlerts.length === 0) fetchWeatherAlerts();
  }, [visible]);

  async function fetchWeatherAlerts() {
    try {
      setLoadingWeather(true);
      setWeatherError(null);

      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${NASHIK_LAT}` +
        `&longitude=${NASHIK_LON}` +
        `&daily=temperature_2m_max,temperature_2m_min,weathercode,windspeed_10m_max,precipitation_sum` +
        `&past_days=2` +
        `&forecast_days=5` +
        `&timezone=${encodeURIComponent(TIMEZONE)}`;

      const res  = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const todayStr = json.daily.time[2]; // index 2 = today with past_days=2

      const alerts: WeatherAlert[] = (json.daily.time as string[]).map((dateStr, i) => {
        const isToday = dateStr === todayStr;
        const { label, icon, severity } = wmoToInfo(json.daily.weathercode[i]);
        return {
          date:          dateStr,
          label:         formatShortDate(dateStr, isToday),
          icon,
          condition:     label,
          high:          Math.round(json.daily.temperature_2m_max[i]),
          low:           Math.round(json.daily.temperature_2m_min[i]),
          precipitation: +(json.daily.precipitation_sum[i] ?? 0).toFixed(1),
          wind:          Math.round(json.daily.windspeed_10m_max[i]),
          severity:      isToday && json.daily.weathercode[i] >= 60 ? 'high' : severity,
          isToday,
        };
      });

      setWeatherAlerts(alerts);
    } catch {
      setWeatherError('Could not load weather alerts. Check connection.');
    } finally {
      setLoadingWeather(false);
    }
  }

  const newCount = SCHEME_NOTIFS.filter((s) => s.isNew).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={p.overlay}>
        <TouchableOpacity style={p.dismissArea} onPress={onClose} activeOpacity={1} />

        <View style={p.sheet}>
          {/* Handle */}
          <View style={p.handle} />

          {/* Header */}
          <View style={p.header}>
            <View>
              <Text style={p.headerTitle}>Notifications</Text>
              <Text style={p.headerSub}>Nashik, Maharashtra</Text>
            </View>
            {newCount > 0 && (
              <View style={p.unreadBadge}>
                <Text style={p.unreadText}>{newCount} new</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={p.closeX}>
              <Text style={p.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={p.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const badgeCount = tab.key === 'schemes' ? newCount : 0;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[p.tab, isActive && p.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[p.tabText, isActive && p.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {badgeCount > 0 && (
                    <View style={p.tabBadge}>
                      <Text style={p.tabBadgeText}>{badgeCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          <ScrollView style={p.content} showsVerticalScrollIndicator={false}>

            {/* ── Weather Tab ── */}
            {activeTab === 'weather' && (
              <View style={p.tabContent}>
                <SectionHeader title="🌦️ Weather Forecast — Nashik" />
                <Text style={p.tabDesc}>
                  Live forecast from Open-Meteo. Past 2 days + next 5 days.
                </Text>

                {loadingWeather ? (
                  <View style={p.loadingRow}>
                    <ActivityIndicator color={T.green5} />
                    <Text style={p.loadingText}>Fetching live weather…</Text>
                  </View>
                ) : weatherError ? (
                  <View style={p.errorBox}>
                    <Text style={p.errorText}>{weatherError}</Text>
                    <TouchableOpacity style={p.retryBtn} onPress={fetchWeatherAlerts}>
                      <Text style={p.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  weatherAlerts.map((alert) => (
                    <WeatherAlertCard key={alert.date} alert={alert} />
                  ))
                )}

                <Text style={p.attribution}>Data: Open-Meteo.com · Updated live</Text>
              </View>
            )}

            {/* ── Schemes Tab ── */}
            {activeTab === 'schemes' && (
              <View style={p.tabContent}>
                <SectionHeader title="🏛️ Government Schemes" count={newCount} />
                <Text style={p.tabDesc}>
                  Latest scheme updates, deadlines, and new announcements.
                </Text>
                {SCHEME_NOTIFS.map((n) => (
                  <SchemeCard key={n.id} notif={n} />
                ))}
              </View>
            )}

            {/* ── Farming Tips Tab ── */}
            {activeTab === 'farming' && (
              <View style={p.tabContent}>
                <SectionHeader title="🌱 Farming Tips & Alerts" />
                <Text style={p.tabDesc}>
                  Seasonal advice, pest alerts, and best practices for Nashik region.
                </Text>
                {FARMING_TIPS.map((tip) => (
                  <FarmingTipCard key={tip.id} tip={tip} />
                ))}
              </View>
            )}

            <View style={{ height: 48 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet:       { backgroundColor: T.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%', paddingBottom: 8 },
  handle:      { width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: T.text },
  headerSub:   { fontSize: 11, color: T.textLight, marginTop: 1 },
  unreadBadge: { backgroundColor: T.green5, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 10, marginLeft: 'auto' },
  unreadText:  { color: '#fff', fontSize: 11, fontWeight: '800' },
  closeX:      { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  closeXText:  { fontSize: 13, color: T.textMid, fontWeight: '700' },

  tabBar:      { flexDirection: 'row', borderBottomWidth: 1.5, borderBottomColor: T.green1, marginHorizontal: 16 },
  tab:         { flex: 1, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive:   { borderBottomWidth: 2.5, borderBottomColor: T.green5 },
  tabText:     { fontSize: 12, fontWeight: '600', color: T.textLight },
  tabTextActive:{ color: T.green6, fontWeight: '800' },
  tabBadge:    { backgroundColor: T.redText, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '800' },

  content:     { paddingHorizontal: 16 },
  tabContent:  { paddingTop: 14, gap: 10 },
  tabDesc:     { fontSize: 12, color: T.textLight, marginBottom: 4, lineHeight: 18 },

  loadingRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, justifyContent: 'center' },
  loadingText: { color: T.green6, fontSize: 13 },
  errorBox:    { alignItems: 'center', paddingVertical: 20, gap: 10 },
  errorText:   { color: T.redText, fontSize: 13, textAlign: 'center' },
  retryBtn:    { backgroundColor: T.green5, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 20 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 13 },
  attribution: { fontSize: 10, color: T.textLight, textAlign: 'center', marginTop: 6, marginBottom: 4 },
});

const c = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  sectionTitle:  { fontSize: 14, fontWeight: '800', color: T.green6 },
  countBadge:    { backgroundColor: T.green5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText:{ color: '#fff', fontSize: 11, fontWeight: '800' },

  // Weather alert card
  alertCard:   { borderLeftWidth: 4, borderRadius: 12, padding: 12, marginBottom: 8 },
  alertRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  alertIcon:   { fontSize: 22, marginTop: 2 },
  alertTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  alertDay:    { fontSize: 13, fontWeight: '800' },
  alertCondition:{ fontSize: 12, fontWeight: '600', marginBottom: 4 },
  alertStats:  { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  alertStat:   { fontSize: 11, fontWeight: '600' },

  // Shared card
  card:        { backgroundColor: T.white, borderWidth: 1.5, borderColor: T.green1, borderRadius: 14, padding: 12, marginBottom: 8 },
  cardRow:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: T.green1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardIconText:{ fontSize: 18 },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle:   { fontSize: 13, fontWeight: '700', color: T.text, flex: 1 },
  cardBody:    { fontSize: 12, color: T.textMid, lineHeight: 18 },
  cardFooter:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  cardTime:    { fontSize: 11, color: T.textLight, marginLeft: 'auto' },
  newDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: T.green5 },

  // Pills
  pill:        { borderRadius: 6, paddingVertical: 2, paddingHorizontal: 8 },
  pillText:    { fontSize: 10, fontWeight: '700' },
  pillTextWhite:{ fontSize: 9, fontWeight: '800', color: '#fff' },
});