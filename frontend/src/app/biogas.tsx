import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type Substrate = { key: string; label: string; category: string };

type BiogasResult = {
  substrate_label: string;
  category: string;
  quantity_kg_day: number;
  biogas_m3_day: number;
  biogas_m3_month: number;
  biogas_m3_year: number;
  methane_m3_day: number;
  cooking_hours_day: number;
  slurry_kg_day: number;
  biogas_income_day: number;
  biogas_income_month: number;
  biogas_income_year: number;
  slurry_income_day: number;
  total_income_day: number;
  total_income_month: number;
  total_income_year: number;
  co2_offset_kg_year: number;
  lpg_cylinders_saved_year: number;
  c_n_ratio: number;
  notes: string;
  optimal_retention_days: number;
};

type MarketRateInfo = {
  estimated_rate_inr_per_m3: number;
  range_low: number;
  range_high: number;
  rationale: string;
  source_note: string;
};

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  sage:       '#4a7c59',
  sageMid:    '#b5d9bf',
  sageLight:  '#e8f5ec',
  sageDark:   '#2d5a3d',
  straw:      '#f5e6a3',
  strawMid:   '#e8c84a',
  strawDark:  '#7a6210',
  sky:        '#bde0f5',
  skyMid:     '#5bacd4',
  skyDark:    '#1e5f82',
  clay:       '#e8a87c',
  clayLight:  '#fdf0e6',
  clayDark:   '#7a3d15',
  cream:      '#faf7f0',
  parchment:  '#f0ead8',
  ink:        '#2c2416',
  inkMid:     '#5a4f3c',
  inkSoft:    '#8a7d68',
  white:      '#ffffff',
  border:     'rgba(74,124,89,0.18)',
  indigo:     '#3d4f8a',
  indigoBg:   '#f5f7fd',
  indigoBorder:'#c8d0ef',
  indigoLight:'#eef1fb',
  amber:      '#e8a020',
  amberLight: '#fff8e6',
  red:        '#c0392b',
  redLight:   '#fdf0f0',
  redBorder:  '#f7c8c8',
  slate:      '#9aacb8',
};

const API = 'http://localhost:8000';
const DEFAULT_STATE = 'Maharashtra';

const CATEGORY_LABELS: Record<string, string> = {
  livestock:    '🐄  Livestock Manure',
  crop_residue: '🌾  Crop & Organic Waste',
};

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

function IncomeRow({
  label, value, strong, highlight,
}: { label: string; value: string; strong?: boolean; highlight?: boolean }) {
  return (
    <View style={s.incomeRow}>
      <Text style={[s.incomeLabel, strong && s.incomeStrong]}>{label}</Text>
      <Text style={[
        s.incomeValue,
        strong && s.incomeStrongVal,
        highlight && s.incomeHighlight,
      ]}>{value}</Text>
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

// ─── Market Rate Badge ────────────────────────────────────────────────────────

function MarketRateBadge({
  info, loading, substrate, onRefresh,
}: {
  info: MarketRateInfo | null;
  loading: boolean;
  substrate: string;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <View style={s.rateBadge}>
        <ActivityIndicator size="small" color={C.indigo} />
        <Text style={s.rateBadgeLoading}>  Fetching AI market rate…</Text>
      </View>
    );
  }
  if (!info) return null;
  return (
    <View style={s.rateBadgeCard}>
      <View style={s.rateBadgeHeader}>
        <Text style={s.rateBadgeIcon}>🤖</Text>
        <Text style={s.rateBadgeTitle}>AI-estimated for {substrate}</Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <Text style={s.refreshBtnText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.rateBadgeValue}>
        ₹{info.estimated_rate_inr_per_m3.toFixed(0)}/m³
        <Text style={s.rateBadgeRange}>
          {'  '}(₹{info.range_low.toFixed(0)}–₹{info.range_high.toFixed(0)})
        </Text>
      </Text>
      <Text style={s.rateBadgeRationale}>{info.rationale}</Text>
      <Text style={s.rateBadgeSource}>📊 {info.source_note}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BiogasCalculator() {
  const [substrates, setSubstrates]         = useState<Substrate[]>([]);
  const [selected, setSelected]             = useState('cow');
  const [quantity, setQuantity]             = useState('');
  const [marketRate, setMarketRate]         = useState('50');
  const [marketRateInfo, setMarketRateInfo] = useState<MarketRateInfo | null>(null);
  const [fetchingRate, setFetchingRate]     = useState(false);
  const [rateEdited, setRateEdited]         = useState(false);
  const [includeSlurry, setIncludeSlurry]   = useState(true);
  const [result, setResult]                 = useState<BiogasResult | null>(null);
  const [error, setError]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [loadingSubstrates, setLoadingSubstrates] = useState(true);

  useEffect(() => {
    fetch(`${API}/biogas/substrates`)
      .then(r => r.json())
      .then(setSubstrates)
      .catch(() => setError('Could not load substrates. Is the server running?'))
      .finally(() => setLoadingSubstrates(false));
  }, []);

  useEffect(() => {
    if (selected) fetchMarketRate(selected);
  }, [selected]);

  const fetchMarketRate = async (key: string) => {
    setFetchingRate(true);
    setMarketRateInfo(null);
    setRateEdited(false);
    try {
      const res = await fetch(`${API}/biogas/market-rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ substrate_key: key, state: DEFAULT_STATE }),
      });
      if (!res.ok) throw new Error();
      const data: MarketRateInfo = await res.json();
      setMarketRateInfo(data);
      setMarketRate(data.estimated_rate_inr_per_m3.toFixed(0));
    } catch {
      // silently fall back
    } finally {
      setFetchingRate(false);
    }
  };

  const grouped = substrates.reduce<Record<string, Substrate[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const handleCalculate = async () => {
    if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API}/biogas/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substrate_key: selected,
          quantity_kg_day: Number(quantity),
          market_rate_inr_per_m3: Number(marketRate) || 50,
          include_slurry_value: includeSlurry,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error((e as any).detail ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (e: any) {
      setError(e.message ?? 'Calculation failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedInfo  = substrates.find(s => s.key === selected);
  const isLivestock   = selectedInfo?.category === 'livestock';

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={s.heroDot} />
          <Text style={s.heroBadgeText}>MAHARASHTRA AGRI TOOL</Text>
        </View>
        <Text style={s.heroTitle}>Biogas{'\n'}Calculator</Text>
        <Text style={s.heroSub}>Research-grade yield estimates for livestock manure &amp; crop residues</Text>
        <View style={s.heroPills}>
          {[
            { dot: C.sage,    label: 'Livestock' },
            { dot: C.strawMid, label: 'Crop Residue' },
            { dot: C.skyMid,  label: 'Income Estimate' },
          ].map(p => (
            <View key={p.label} style={s.heroPill}>
              <View style={[s.heroPillDot, { backgroundColor: p.dot }]} />
              <Text style={s.heroPillText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Substrate Selector ── */}
      <View style={s.card}>
        <Text style={s.cardStep}>01</Text>
        <Text style={s.cardTitle}>Choose your substrate</Text>

        {loadingSubstrates ? (
          <ActivityIndicator color={C.sage} style={{ marginVertical: 16 }} />
        ) : (
          Object.entries(grouped).map(([cat, list]) => {
            const isCrop = cat === 'crop_residue';
            return (
              <View key={cat} style={s.catGroup}>
                <Text style={s.catLabel}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                <View style={s.chipRow}>
                  {list.map(sub => {
                    const isActive = selected === sub.key;
                    return (
                      <TouchableOpacity
                        key={sub.key}
                        style={[
                          s.chip,
                          isCrop   ? s.chipCrop   : s.chipLive,
                          isActive && (isCrop ? s.chipCropActive : s.chipLiveActive),
                        ]}
                        onPress={() => {
                          setSelected(sub.key);
                          setResult(null);
                          setError(null);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          s.chipText,
                          isCrop   ? s.chipTextCrop   : s.chipTextLive,
                          isActive && s.chipTextActive,
                        ]}>
                          {sub.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── Input Parameters ── */}
      <View style={s.card}>
        <Text style={s.cardStep}>02</Text>
        <Text style={s.cardTitle}>Enter parameters</Text>

        {/* Quantity */}
        <Text style={s.inputLabel}>
          {isLivestock ? 'Total manure per day (kg/day)' : 'Substrate quantity (kg/day)'}
        </Text>
        <TextInput
          style={s.textInput}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          placeholder={isLivestock ? 'e.g. 5 cows × 10 kg = 50' : 'e.g. 100'}
          placeholderTextColor={C.inkSoft}
        />

        {/* Market Rate */}
        <View style={s.rateHeader}>
          <Text style={s.inputLabel}>Biogas market rate (₹ per m³)</Text>
          {marketRateInfo && !rateEdited && (
            <View style={s.aiPill}>
              <Text style={s.aiPillText}>✨ AI estimated</Text>
            </View>
          )}
          {rateEdited && marketRateInfo && (
            <TouchableOpacity onPress={() => {
              setMarketRate(marketRateInfo.estimated_rate_inr_per_m3.toFixed(0));
              setRateEdited(false);
            }}>
              <Text style={s.resetRate}>↺ Use AI rate</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[s.textInput, marketRateInfo && !rateEdited && s.textInputAi]}
          value={marketRate}
          onChangeText={v => { setMarketRate(v); setRateEdited(true); }}
          keyboardType="numeric"
          placeholder="e.g. 50"
          placeholderTextColor={C.inkSoft}
        />

        <MarketRateBadge
          info={marketRateInfo}
          loading={fetchingRate}
          substrate={selectedInfo?.label ?? ''}
          onRefresh={() => fetchMarketRate(selected)}
        />

        {/* Slurry Toggle */}
        <TouchableOpacity style={s.toggleRow} onPress={() => setIncludeSlurry(v => !v)} activeOpacity={0.8}>
          <View style={[s.toggleTrack, includeSlurry && s.toggleTrackOn]}>
            <View style={[s.toggleThumb, includeSlurry && s.toggleThumbOn]} />
          </View>
          <Text style={s.toggleLabel}>Include biofertiliser (slurry) value in income estimate — ₹2/kg default</Text>
        </TouchableOpacity>

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>⚠  {error}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.calcBtn, loading && s.calcBtnDisabled]} onPress={handleCalculate} disabled={loading} activeOpacity={0.85}>
          {loading
            ? <ActivityIndicator color={C.white} />
            : <Text style={s.calcBtnText}>Calculate Biogas Output  →</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Results ── */}
      {result && (
        <>
          <SectionDivider title="RESULTS" />

          {/* Note card */}
          <View style={s.noteCard}>
            <Text style={s.noteTitle}>📋  {result.substrate_label}</Text>
            <Text style={s.noteBody}>{result.notes}</Text>
            <View style={s.notePillRow}>
              <NotePill>{`C:N ratio ${result.c_n_ratio}`}</NotePill>
              <NotePill>{`Retention ~${result.optimal_retention_days} days`}</NotePill>
            </View>
          </View>

          {/* Biogas Production */}
          <SectionDivider title="🔥  BIOGAS PRODUCTION" />
          <View style={s.statGrid}>
            <StatCard label="Per Day"   value={result.biogas_m3_day.toFixed(2)}    unit="m³/day"     accent={C.sage} />
            <StatCard label="Per Month" value={result.biogas_m3_month.toFixed(1)}  unit="m³/month"   accent={C.sage} />
            <StatCard label="Per Year"  value={result.biogas_m3_year.toFixed(0)}   unit="m³/year"    accent={C.sage} />
            <StatCard label="Methane"   value={result.methane_m3_day.toFixed(2)}   unit="m³ CH₄/day" accent={C.amber} />
            <StatCard label="Cooking"   value={result.cooking_hours_day.toFixed(1)} unit="hrs/day"   accent={C.amber} />
            <StatCard label="Slurry"    value={result.slurry_kg_day.toFixed(1)}    unit="kg/day"     accent={C.slate} />
          </View>

          {/* Income */}
          <SectionDivider title="💰  ESTIMATED INCOME (INR)" />
          <View style={s.incomeCard}>
            <IncomeRow label="Biogas income / day"  value={`₹${result.biogas_income_day.toFixed(0)}`} />
            {includeSlurry && (
              <IncomeRow label="Slurry income / day" value={`₹${result.slurry_income_day.toFixed(0)}`} />
            )}
            <View style={s.incomeDivider} />
            <IncomeRow label="Total / day"   value={`₹${result.total_income_day.toFixed(0)}`}   strong />
            <IncomeRow label="Total / month" value={`₹${result.total_income_month.toFixed(0)}`} strong />
            <IncomeRow label="Total / year"  value={`₹${result.total_income_year.toFixed(0)}`}  strong highlight />
          </View>

          {/* Environmental */}
          <SectionDivider title="🌱  ENVIRONMENTAL IMPACT / YEAR" />
          <View style={s.ecoGrid}>
            <View style={[s.ecoCard, s.ecoGreen]}>
              <Text style={s.ecoLabel}>CO₂ offset</Text>
              <Text style={[s.ecoValue, { color: C.sageDark }]}>{result.co2_offset_kg_year.toFixed(0)}</Text>
              <Text style={s.ecoUnit}>kg CO₂/year</Text>
            </View>
            <View style={[s.ecoCard, s.ecoBlue]}>
              <Text style={s.ecoLabel}>LPG cylinders saved</Text>
              <Text style={[s.ecoValue, { color: C.skyDark }]}>{result.lpg_cylinders_saved_year.toFixed(1)}</Text>
              <Text style={s.ecoUnit}>14.2 kg cylinders</Text>
            </View>
          </View>
        </>
      )}
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
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.sageDark, marginBottom: 16 },

  // Substrate chips
  catGroup: { marginBottom: 14 },
  catLabel: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5 },
  chipLive: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  chipCrop: { backgroundColor: C.straw, borderColor: '#d4a843' },
  chipLiveActive: { backgroundColor: C.sage, borderColor: C.sage },
  chipCropActive: { backgroundColor: C.strawMid, borderColor: C.strawDark },
  chipText: { fontSize: 12, fontWeight: '500' },
  chipTextLive: { color: C.sageDark },
  chipTextCrop: { color: C.strawDark },
  chipTextActive: { color: C.white, fontWeight: '700' },

  // Inputs
  inputLabel: { fontSize: 12, fontWeight: '600', color: C.inkMid, marginBottom: 6, marginTop: 12 },
  textInput: { borderWidth: 1.5, borderColor: C.sageMid, borderRadius: 12, padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream },
  textInputAi: { borderColor: '#c8d0ef', backgroundColor: '#f5f7fd', color: C.indigo },

  rateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 },
  aiPill: { backgroundColor: '#eef1fb', borderWidth: 1, borderColor: '#c8d0ef', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 },
  aiPillText: { fontSize: 10, fontWeight: '700', color: C.indigo },
  resetRate: { fontSize: 11, fontWeight: '600', color: C.indigo },

  // Rate badge
  rateBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  rateBadgeLoading: { fontSize: 12, color: C.indigo },
  rateBadgeCard: { marginTop: 10, backgroundColor: C.indigoBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.indigoBorder },
  rateBadgeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 5 },
  rateBadgeIcon: { fontSize: 13 },
  rateBadgeTitle: { fontSize: 11, fontWeight: '700', color: C.indigo, flex: 1 },
  refreshBtn: { backgroundColor: '#dde3f7', borderRadius: 100, paddingHorizontal: 9, paddingVertical: 3 },
  refreshBtnText: { fontSize: 10, fontWeight: '700', color: C.indigo },
  rateBadgeValue: { fontSize: 20, fontWeight: '800', color: '#2d3d7a', marginBottom: 4 },
  rateBadgeRange: { fontSize: 13, fontWeight: '400', color: '#7b8abb' },
  rateBadgeRationale: { fontSize: 11, color: '#4a5690', lineHeight: 17, marginBottom: 4 },
  rateBadgeSource: { fontSize: 10, color: '#7b8abb', fontStyle: 'italic' },

  // Toggle
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14, marginBottom: 4, backgroundColor: C.clayLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(232,168,124,0.4)' },
  toggleTrack: { width: 34, height: 20, borderRadius: 10, backgroundColor: '#d1d5db', justifyContent: 'center', paddingHorizontal: 3, marginTop: 1 },
  toggleTrackOn: { backgroundColor: C.sage },
  toggleThumb: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.white },
  toggleThumbOn: { alignSelf: 'flex-end' },
  toggleLabel: { fontSize: 12, color: C.clayDark, flex: 1, lineHeight: 18 },

  // Error
  errorBox: { marginTop: 12, backgroundColor: C.redLight, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.redBorder },
  errorText: { fontSize: 12, color: C.red },

  // Calc button
  calcBtn: { marginTop: 16, backgroundColor: C.sageDark, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  calcBtnDisabled: { opacity: 0.55 },
  calcBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

  // Divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8 },

  // Note card
  noteCard: { backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid, borderRadius: 14, padding: 16, marginBottom: 4 },
  noteTitle: { fontSize: 14, fontWeight: '700', color: C.strawDark, marginBottom: 6 },
  noteBody: { fontSize: 12, color: '#5a4810', lineHeight: 19, marginBottom: 10 },
  notePillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  notePill: { backgroundColor: C.white, borderWidth: 1, borderColor: C.strawMid, borderRadius: 100, paddingHorizontal: 11, paddingVertical: 4 },
  notePillText: { fontSize: 11, fontWeight: '600', color: C.strawDark },

  // Stat grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  statCard: { flex: 1, minWidth: '28%', backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 12, overflow: 'hidden' },
  statAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statValue: { fontSize: 22, fontWeight: '800', color: C.ink, marginTop: 10 },
  statUnit: { fontSize: 10, color: C.inkSoft, marginTop: 1 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.inkMid, marginTop: 5 },

  // Income
  incomeCard: { backgroundColor: C.sageLight, borderWidth: 1.5, borderColor: C.sageMid, borderRadius: 14, padding: 16, marginBottom: 4 },
  incomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 5 },
  incomeLabel: { fontSize: 13, color: C.inkMid },
  incomeValue: { fontSize: 14, color: C.ink },
  incomeStrong: { fontWeight: '600', color: C.ink },
  incomeStrongVal: { fontWeight: '700' },
  incomeHighlight: { fontSize: 20, fontWeight: '800', color: C.sageDark },
  incomeDivider: { height: 1, backgroundColor: C.sageMid, marginVertical: 4 },

  // Eco
  ecoGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  ecoCard: { flex: 1, borderRadius: 14, padding: 16, borderWidth: 1.5 },
  ecoGreen: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  ecoBlue: { backgroundColor: C.sky, borderColor: '#8cc8e8' },
  ecoLabel: { fontSize: 11, fontWeight: '600', color: C.inkSoft, marginBottom: 4 },
  ecoValue: { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  ecoUnit: { fontSize: 11, color: C.inkSoft, marginTop: 2 },
});