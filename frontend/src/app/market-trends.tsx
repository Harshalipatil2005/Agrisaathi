import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  Platform, Alert,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useT } from '../hooks/useT';

const API = 'http://127.0.0.1:8000';

// ─── Design Tokens (mirrored from Biogas screen) ──────────────────────────────

const C = {
  sage:         '#4a7c59',
  sageMid:      '#b5d9bf',
  sageLight:    '#e8f5ec',
  sageDark:     '#2d5a3d',
  straw:        '#f5e6a3',
  strawMid:     '#e8c84a',
  strawDark:    '#7a6210',
  sky:          '#bde0f5',
  skyMid:       '#5bacd4',
  skyDark:      '#1e5f82',
  clay:         '#e8a87c',
  clayLight:    '#fdf0e6',
  clayDark:     '#7a3d15',
  cream:        '#faf7f0',
  parchment:    '#f0ead8',
  ink:          '#2c2416',
  inkMid:       '#5a4f3c',
  inkSoft:      '#8a7d68',
  white:        '#ffffff',
  border:       'rgba(74,124,89,0.18)',
  red:          '#c0392b',
  redLight:     '#fdf0f0',
  redBorder:    '#f7c8c8',
  indigo:       '#3d4f8a',
  indigoBg:     '#f5f7fd',
  indigoBorder: '#c8d0ef',
  amber:        '#e8a020',
  amberLight:   '#fff8e6',
  slate:        '#9aacb8',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CropPrice {
  crop: string;
  current_price: number;
  currency: string;
  region: string;
  unit: string;
  market_trend: 'bullish' | 'bearish' | 'stable';
  demand_level: 'high' | 'medium' | 'low';
  yield_estimate: number | null;
  price_change_percent: number;
  best_season: string;
  insights: string[];
}

interface TrendingCrop {
  crop: string;
  market_demand: 'high' | 'medium' | 'low';
  price_momentum: 'bullish' | 'bearish';
  profitability: 'high' | 'medium' | 'low';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{title}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

function StatCard({
  label, value, unit, accent = C.sage,
}: { label: string; value: string; unit: string; accent?: string }) {
  return (
    <View style={s.statCard}>
      <View style={[s.statAccent, { backgroundColor: accent }]} />
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statUnit}>{unit}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function NotePill({ children }: { children: string }) {
  return (
    <View style={s.notePill}>
      <Text style={s.notePillText}>{children}</Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTrendColor = (trend: string) => {
  switch (trend) {
    case 'bullish': return C.sage;
    case 'bearish': return C.red;
    default: return C.skyMid;
  }
};
const getTrendEmoji = (trend: string) => {
  switch (trend) {
    case 'bullish': return '📈';
    case 'bearish': return '📉';
    default: return '➡️';
  }
};
const getDemandEmoji = (demand: string) => {
  switch (demand) {
    case 'high': return '🔥';
    case 'medium': return '⭐';
    default: return '📌';
  }
};
const getProfitColor = (p: string) =>
  p === 'high' ? C.sage : p === 'medium' ? C.amber : C.slate;

// ─── Market Trends Screen ─────────────────────────────────────────────────────

export default function MarketTrends() {
  // ✅ FIX: useT() takes no arguments — language is consumed internally via context
  const { language } = useLanguage();
  const t = useT();

  const [crop, setCrop]               = useState('');
  const [location, setLocation]       = useState('');
  const [latitude, setLatitude]       = useState('20.5937');
  const [longitude, setLongitude]     = useState('78.9629');
  const [yieldEstimate, setYieldEstimate] = useState('');

  const [priceData, setPriceData]         = useState<CropPrice | null>(null);
  const [trendingCrops, setTrendingCrops] = useState<TrendingCrop[]>([]);
  const [comparePrices, setComparePrices] = useState<CropPrice[]>([]);

  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'search' | 'trending' | 'compare'>('search');

  // Auto-detect geolocation on web
  useEffect(() => {
    if (Platform.OS === 'web' && navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(4));
          setLongitude(pos.coords.longitude.toFixed(4));
        },
        () => {} // silently fall back to defaults
      );
    }
  }, []);

  // ── Fetch single crop price ────────────────────────────────────────────────
  const fetchMarketPrice = async () => {
    if (!crop.trim() || !location.trim()) {
      setError('Please enter both crop name and location.');
      return;
    }
    setLoading(true);
    setError(null);
    setPriceData(null);
    try {
      const res = await fetch(`${API}/market-trends/get-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: crop.trim(),
          location: location.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          yield_estimate: yieldEstimate ? parseFloat(yieldEstimate) : undefined,
          language,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setPriceData(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch market prices.');
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch trending crops ───────────────────────────────────────────────────
  const fetchTrendingCrops = async () => {
    if (!location.trim()) {
      setError('Please enter a location first.');
      return;
    }
    setLoading(true);
    setError(null);
    setTrendingCrops([]);
    try {
      const res = await fetch(
        `${API}/market-trends/trending-crops?location=${encodeURIComponent(location.trim())}&latitude=${latitude}&longitude=${longitude}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTrendingCrops(data.trending_crops ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to fetch trending crops.');
    } finally {
      setLoading(false);
    }
  };

  // ── Compare top crops ──────────────────────────────────────────────────────
  const fetchComparePrices = async () => {
    if (!location.trim()) {
      setError('Please enter a location first.');
      return;
    }
    setLoading(true);
    setError(null);
    setComparePrices([]);
    try {
      const res = await fetch(`${API}/market-trends/compare-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crops: ['wheat', 'rice', 'maize', 'cotton', 'sugarcane'],
          location: location.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComparePrices(data.crops ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Failed to compare prices.');
    } finally {
      setLoading(false);
    }
  };

  const maxComparePrice = Math.max(...comparePrices.map(c => c.current_price), 1);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={s.heroDot} />
          <Text style={s.heroBadgeText}>LIVE AGRI INTELLIGENCE</Text>
        </View>
        <Text style={s.heroTitle}>Market{'\n'}Trends</Text>
        <Text style={s.heroSub}>Real-time crop prices, demand signals &amp; market insights for your region</Text>
        <View style={s.heroPills}>
          {[
            { dot: C.sage,    label: 'Price Lookup' },
            { dot: C.strawMid, label: 'Trending Crops' },
            { dot: C.skyMid,  label: 'Comparison' },
          ].map(p => (
            <View key={p.label} style={s.heroPill}>
              <View style={[s.heroPillDot, { backgroundColor: p.dot }]} />
              <Text style={s.heroPillText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Location Card ── */}
      <View style={s.card}>
        <Text style={s.cardStep}>01</Text>
        <Text style={s.cardTitle}>Set your location</Text>

        <Text style={s.inputLabel}>📍 District / State</Text>
        <TextInput
          style={s.textInput}
          placeholder="e.g. Nashik, Maharashtra"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor={C.inkSoft}
        />

        <View style={s.coordRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.inputLabel}>Latitude</Text>
            <TextInput
              style={s.textInput}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
              placeholderTextColor={C.inkSoft}
            />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={s.inputLabel}>Longitude</Text>
            <TextInput
              style={s.textInput}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
              placeholderTextColor={C.inkSoft}
            />
          </View>
        </View>
      </View>

      {/* ── Tab Bar ── */}
      <View style={s.tabBar}>
        {([
          { key: 'search',   label: '🔍 Search'   },
          { key: 'trending', label: '🔥 Trending'  },
          { key: 'compare',  label: '⚖️ Compare'  },
        ] as const).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tab, selectedTab === tab.key && s.tabActive]}
            onPress={() => { setSelectedTab(tab.key); setError(null); }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, selectedTab === tab.key && s.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Error Box ── */}
      {error && (
        <View style={s.errorBox}>
          <Text style={s.errorText}>⚠  {error}</Text>
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════ SEARCH TAB */}
      {selectedTab === 'search' && (
        <View style={s.card}>
          <Text style={s.cardStep}>02</Text>
          <Text style={s.cardTitle}>Search crop price</Text>

          <Text style={s.inputLabel}>🌾 Crop name</Text>
          <TextInput
            style={s.textInput}
            placeholder="e.g. wheat, rice, cotton"
            value={crop}
            onChangeText={setCrop}
            placeholderTextColor={C.inkSoft}
          />

          <Text style={s.inputLabel}>📦 Yield estimate (optional, quintal/hectare)</Text>
          <TextInput
            style={s.textInput}
            placeholder="e.g. 25"
            value={yieldEstimate}
            onChangeText={setYieldEstimate}
            keyboardType="decimal-pad"
            placeholderTextColor={C.inkSoft}
          />

          <TouchableOpacity
            style={[s.calcBtn, loading && s.calcBtnDisabled]}
            onPress={fetchMarketPrice}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.calcBtnText}>Get Market Price  →</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ── Price Result ── */}
      {selectedTab === 'search' && priceData && !loading && (
        <>
          <SectionDivider title="MARKET PRICE RESULT" />

          {/* Note card */}
          <View style={s.noteCard}>
            <View style={s.noteCardHeader}>
              <Text style={s.noteTitle}>{priceData.crop.toUpperCase()}</Text>
              <Text style={[s.trendBadge, { color: getTrendColor(priceData.market_trend) }]}>
                {getTrendEmoji(priceData.market_trend)}  {priceData.market_trend.toUpperCase()}
              </Text>
            </View>
            <Text style={s.noteBody}>📍 {priceData.region}</Text>
            <View style={s.notePillRow}>
              <NotePill>{priceData.unit}</NotePill>
              <NotePill>{`Best: ${priceData.best_season}`}</NotePill>
              {priceData.yield_estimate != null && (
                <NotePill>{`Yield: ${priceData.yield_estimate} q/ha`}</NotePill>
              )}
            </View>
          </View>

          {/* Stat grid */}
          <SectionDivider title="💹  PRICE BREAKDOWN" />
          <View style={s.statGrid}>
            <StatCard
              label="Current Price"
              value={`₹${priceData.current_price.toFixed(0)}`}
              unit={priceData.unit}
              accent={C.sage}
            />
            <StatCard
              label="Price Change"
              value={`${priceData.price_change_percent > 0 ? '+' : ''}${priceData.price_change_percent}%`}
              unit="vs last period"
              accent={priceData.price_change_percent >= 0 ? C.sage : C.red}
            />
            <StatCard
              label="Demand Level"
              value={getDemandEmoji(priceData.demand_level)}
              unit={priceData.demand_level.toUpperCase()}
              accent={C.amber}
            />
          </View>

          {/* Insights */}
          {priceData.insights.length > 0 && (
            <>
              <SectionDivider title="💡  MARKET INSIGHTS" />
              <View style={s.insightCard}>
                {priceData.insights.map((insight, idx) => (
                  <View key={idx} style={s.insightRow}>
                    <View style={s.insightDot} />
                    <Text style={s.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════ TRENDING TAB */}
      {selectedTab === 'trending' && (
        <View style={s.card}>
          <Text style={s.cardStep}>02</Text>
          <Text style={s.cardTitle}>Top trending crops</Text>
          <Text style={s.cardHint}>Discover which crops are surging in demand in your region right now.</Text>

          <TouchableOpacity
            style={[s.calcBtn, loading && s.calcBtnDisabled]}
            onPress={fetchTrendingCrops}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.calcBtnText}>Load Trending Crops  →</Text>}
          </TouchableOpacity>
        </View>
      )}

      {selectedTab === 'trending' && trendingCrops.length > 0 && (
        <>
          <SectionDivider title="🔥  TRENDING IN YOUR REGION" />
          {trendingCrops.map((tc, idx) => (
            <View key={idx} style={s.trendingCard}>
              <View style={[s.trendingAccent, { backgroundColor: getTrendColor(tc.price_momentum) }]} />
              <View style={s.trendingHeader}>
                <Text style={s.trendingCrop}>{tc.crop.toUpperCase()}</Text>
                <Text style={[s.trendingMomentum, { color: getTrendColor(tc.price_momentum) }]}>
                  {getTrendEmoji(tc.price_momentum)}
                </Text>
              </View>
              <View style={s.trendingStats}>
                <View style={s.trendingStatItem}>
                  <Text style={s.trendingStatLabel}>Demand</Text>
                  <Text style={s.trendingStatValue}>
                    {getDemandEmoji(tc.market_demand)} {tc.market_demand.toUpperCase()}
                  </Text>
                </View>
                <View style={s.trendingStatItem}>
                  <Text style={s.trendingStatLabel}>Profitability</Text>
                  <Text style={[s.trendingStatValue, { color: getProfitColor(tc.profitability) }]}>
                    {tc.profitability.toUpperCase()}
                  </Text>
                </View>
                <View style={s.trendingStatItem}>
                  <Text style={s.trendingStatLabel}>Momentum</Text>
                  <Text style={[s.trendingStatValue, { color: getTrendColor(tc.price_momentum) }]}>
                    {tc.price_momentum.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </>
      )}

      {selectedTab === 'trending' && !loading && trendingCrops.length === 0 && !error && (
        <Text style={s.emptyText}>Enter your location above and tap "Load Trending Crops"</Text>
      )}

      {/* ══════════════════════════════════════════════════════ COMPARE TAB */}
      {selectedTab === 'compare' && (
        <View style={s.card}>
          <Text style={s.cardStep}>02</Text>
          <Text style={s.cardTitle}>Compare major crops</Text>
          <Text style={s.cardHint}>Side-by-side price comparison for wheat, rice, maize, cotton &amp; sugarcane.</Text>

          <TouchableOpacity
            style={[s.calcBtn, loading && s.calcBtnDisabled]}
            onPress={fetchComparePrices}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.calcBtnText}>Compare Prices  →</Text>}
          </TouchableOpacity>
        </View>
      )}

      {selectedTab === 'compare' && comparePrices.length > 0 && (
        <>
          <SectionDivider title="⚖️  PRICE COMPARISON" />
          {comparePrices.map((item, idx) => {
            const barWidth = `${Math.round((item.current_price / maxComparePrice) * 100)}%` as any;
            return (
              <View key={idx} style={s.compareCard}>
                <View style={[s.compareAccent, { backgroundColor: getTrendColor(item.market_trend) }]} />
                <View style={s.compareHeader}>
                  <Text style={s.compareCrop}>{item.crop.toUpperCase()}</Text>
                  <View style={s.comparePriceRow}>
                    <Text style={[s.comparePrice, { color: getTrendColor(item.market_trend) }]}>
                      ₹{item.current_price.toFixed(0)}
                    </Text>
                    <Text style={s.compareTrend}>{getTrendEmoji(item.market_trend)}</Text>
                  </View>
                </View>
                <View style={s.compareBarTrack}>
                  <View style={[s.compareBarFill, {
                    width: barWidth,
                    backgroundColor: getTrendColor(item.market_trend),
                  }]} />
                </View>
                <View style={s.compareFooter}>
                  <Text style={s.compareUnit}>{item.unit}</Text>
                  <Text style={[s.compareChange, {
                    color: item.price_change_percent >= 0 ? C.sage : C.red,
                  }]}>
                    {item.price_change_percent >= 0 ? '+' : ''}{item.price_change_percent}%
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}

      {selectedTab === 'compare' && !loading && comparePrices.length === 0 && !error && (
        <Text style={s.emptyText}>Enter your location above and tap "Compare Prices"</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: C.cream, padding: 16, paddingBottom: 60 },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32, marginBottom: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.strawMid },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: C.strawDark, letterSpacing: 1 },
  heroTitle: { fontSize: 38, fontWeight: '800', color: C.sageDark, textAlign: 'center', lineHeight: 44, marginBottom: 10 },
  heroSub: { fontSize: 13, color: C.inkSoft, textAlign: 'center', lineHeight: 20, maxWidth: 300, marginBottom: 18 },
  heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  heroPillDot: { width: 7, height: 7, borderRadius: 4 },
  heroPillText: { fontSize: 11, color: C.inkMid, fontWeight: '500' },

  // Card
  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14 },
  cardStep: { fontSize: 11, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.5, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.sageDark, marginBottom: 8 },
  cardHint: { fontSize: 12, color: C.inkSoft, lineHeight: 18, marginBottom: 12 },

  // Inputs
  inputLabel: { fontSize: 12, fontWeight: '600', color: C.inkMid, marginBottom: 6, marginTop: 10 },
  textInput: { borderWidth: 1.5, borderColor: C.sageMid, borderRadius: 12, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream },
  coordRow: { flexDirection: 'row', marginTop: 2 },

  // Tab bar
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white, alignItems: 'center' },
  tabActive: { backgroundColor: C.sageDark, borderColor: C.sageDark },
  tabText: { fontSize: 12, fontWeight: '600', color: C.inkSoft },
  tabTextActive: { color: C.white },

  // Error
  errorBox: { backgroundColor: '#fdf0f0', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f7c8c8', marginBottom: 14 },
  errorText: { fontSize: 12, color: C.red },

  // Calc button
  calcBtn: { marginTop: 16, backgroundColor: C.sageDark, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  calcBtnDisabled: { opacity: 0.55 },
  calcBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8 },

  // Note card
  noteCard: { backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid, borderRadius: 14, padding: 16, marginBottom: 4 },
  noteCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  noteTitle: { fontSize: 20, fontWeight: '800', color: C.strawDark },
  trendBadge: { fontSize: 13, fontWeight: '700' },
  noteBody: { fontSize: 12, color: '#5a4810', lineHeight: 18, marginBottom: 10 },
  notePillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  notePill: { backgroundColor: C.white, borderWidth: 1, borderColor: C.strawMid, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 4 },
  notePillText: { fontSize: 11, fontWeight: '600', color: C.strawDark },

  // Stat grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: { flex: 1, minWidth: '28%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, overflow: 'hidden' },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statValue: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 10 },
  statUnit: { fontSize: 10, color: C.inkSoft, marginTop: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.inkMid, marginTop: 5 },

  // Insights
  insightCard: { backgroundColor: C.clayLight, borderWidth: 1.5, borderColor: 'rgba(232,168,124,0.5)', borderRadius: 14, padding: 14, marginBottom: 4 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.clay, marginTop: 5, marginRight: 10 },
  insightText: { flex: 1, fontSize: 12, color: C.inkMid, lineHeight: 19 },

  // Trending cards
  trendingCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, overflow: 'hidden' },
  trendingAccent: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 4 },
  trendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingLeft: 8 },
  trendingCrop: { fontSize: 16, fontWeight: '800', color: C.ink },
  trendingMomentum: { fontSize: 22 },
  trendingStats: { flexDirection: 'row', gap: 0, paddingLeft: 8 },
  trendingStatItem: { flex: 1 },
  trendingStatLabel: { fontSize: 10, fontWeight: '600', color: C.inkSoft, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  trendingStatValue: { fontSize: 13, fontWeight: '700', color: C.ink },

  // Compare cards
  compareCard: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 10, overflow: 'hidden' },
  compareAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  compareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 10 },
  compareCrop: { fontSize: 15, fontWeight: '700', color: C.ink },
  comparePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  comparePrice: { fontSize: 18, fontWeight: '800' },
  compareTrend: { fontSize: 16 },
  compareBarTrack: { height: 8, backgroundColor: 'rgba(74,124,89,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  compareBarFill: { height: '100%', borderRadius: 4 },
  compareFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  compareUnit: { fontSize: 11, color: C.inkSoft },
  compareChange: { fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyText: { textAlign: 'center', color: C.inkSoft, fontSize: 13, marginTop: 20, lineHeight: 20 },
});