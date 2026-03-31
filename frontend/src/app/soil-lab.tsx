import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';

const API = 'http://localhost:8000';

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
  cream:      '#faf7f0',
  parchment:  '#f0ead8',
  ink:        '#2c2416',
  inkMid:     '#5a4f3c',
  inkSoft:    '#8a7d68',
  white:      '#ffffff',
  border:     'rgba(74,124,89,0.18)',
  red:        '#c0392b',
  redLight:   '#fdf0f0',
  redBorder:  '#f7c8c8',
  amber:      '#b45309',
  amberLight: '#fef3c7',
  amberBorder:'#fcd34d',
  teal:       '#0e7490',
  tealLight:  '#e0f2fe',
  tealMid:    '#bae6fd',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RecommendedCrop = {
  name: string;
  local_name?: string;
  suitability: 'High' | 'Medium';
  reason: string;
  expected_yield: string;
  season: string;
};

type AvoidCrop = { name: string; reason: string };

type FertilizerRec = {
  fertilizer: string;
  dose: string;
  timing: string;
  reason: string;
};

type NutrientStatus = {
  nitrogen: string;
  phosphorus: string;
  potassium: string;
};

type AIAnalysis = {
  soil_health_score: number;
  soil_health_label: string;
  ph_status: string;
  ph_advice: string;
  nutrient_status: NutrientStatus;
  recommended_crops: RecommendedCrop[];
  avoid_crops: AvoidCrop[];
  fertilizer_recommendations: FertilizerRec[];
  soil_improvement_tips: string[];
  biogas_slurry_advice: string;
  warnings: string[];
  summary: string;
};

type SoilReport = {
  id: string;
  ph: number;
  n: number;
  p: number;
  k: number;
  sulfur?: number;
  zinc?: number;
  iron?: number;
  organic_carbon?: number;
  electrical_conductivity?: number;
  texture?: string;
  state?: string;
  season?: string;
  no2?: number;
  recommendation: string[];
  ai_analysis: AIAnalysis;
  timestamp: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const nutrientColor = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'adequate' || s === 'high') return C.sage;
  if (s === 'low')                      return C.amber;
  if (s === 'deficient')                return C.red;
  return C.teal;
};
const nutrientBg = (status: string) => {
  const s = (status || '').toLowerCase();
  if (s === 'adequate' || s === 'high') return C.sageLight;
  if (s === 'low')                      return C.amberLight;
  if (s === 'deficient')                return C.redLight;
  return C.tealLight;
};
const healthScoreColor = (score: number) =>
  score >= 75 ? C.sage : score >= 50 ? C.amber : C.red;
const getPhBg = (ph: number) =>
  ph >= 6 && ph <= 7.5 ? C.sageLight : C.amberLight;
const getPhTextColor = (ph: number) =>
  ph >= 6 && ph <= 7.5 ? C.sageDark : C.amber;

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <View style={s.sectionTitleDot} />
      <Text style={s.sectionTitleText}>{title}</Text>
      <View style={s.sectionTitleLine} />
    </View>
  );
}

function NutrientChip({ label, value, status }: { label: string; value: number; status: string }) {
  const color = nutrientColor(status);
  const bg    = nutrientBg(status);
  return (
    <View style={[s.nutrientChip, { backgroundColor: bg, borderColor: color }]}>
      <Text style={[s.nutrientChipLabel, { color }]}>{label}</Text>
      <Text style={[s.nutrientChipValue, { color }]}>{value}</Text>
      <Text style={[s.nutrientChipStatus, { color }]}>{status || '—'}</Text>
    </View>
  );
}

function CropCard({ crop }: { crop: RecommendedCrop }) {
  const color = crop.suitability === 'High' ? C.sage : C.amber;
  return (
    <View style={[s.cropCard, { borderLeftColor: color }]}>
      <View style={s.cropCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.cropName}>{crop.name}</Text>
          {crop.local_name && <Text style={s.cropLocalName}>{crop.local_name}</Text>}
        </View>
        <View style={[s.suitabilityBadge, { backgroundColor: color + '20', borderColor: color }]}>
          <Text style={[s.suitabilityText, { color }]}>{crop.suitability}</Text>
        </View>
      </View>
      <Text style={s.cropReason}>{crop.reason}</Text>
      <View style={s.cropMeta}>
        <Text style={s.cropMetaItem}>{crop.expected_yield}</Text>
        <Text style={s.cropMetaSep}>·</Text>
        <Text style={s.cropMetaItem}>{crop.season}</Text>
      </View>
    </View>
  );
}

function ReportCard({
  item, expanded, onToggle,
}: { item: SoilReport; expanded: boolean; onToggle: () => void }) {
  const ai    = item.ai_analysis;
  const color = ai ? healthScoreColor(ai.soil_health_score) : C.teal;

  return (
    <View style={s.reportCard}>
      {/* Header */}
      <TouchableOpacity onPress={onToggle} activeOpacity={0.8} style={s.reportCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.reportCardTitle}>Soil Report</Text>
          <Text style={s.reportCardDate}>
            {new Date(item.timestamp).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </Text>
        </View>
        {ai && (
          <View style={[s.scoreBadge, { borderColor: color }]}>
            <Text style={[s.scoreNumber, { color }]}>{ai.soil_health_score}</Text>
            <Text style={[s.scoreLabel, { color }]}>{ai.soil_health_label}</Text>
            <Text style={s.scoreMax}>/100</Text>
          </View>
        )}
        <View style={[s.chevron, expanded && s.chevronUp]} />
      </TouchableOpacity>

      {/* Quick params */}
      <View style={s.quickParams}>
        {[
          { label: 'pH', value: item.ph.toFixed(1), bg: getPhBg(item.ph), color: getPhTextColor(item.ph) },
          { label: 'N',  value: String(item.n),     bg: C.tealLight, color: C.teal },
          { label: 'P',  value: String(item.p),     bg: C.tealLight, color: C.teal },
          { label: 'K',  value: String(item.k),     bg: C.tealLight, color: C.teal },
          ...(item.sulfur != null ? [{ label: 'S',  value: String(item.sulfur), bg: C.tealLight, color: C.teal }] : []),
          ...(item.zinc   != null ? [{ label: 'Zn', value: String(item.zinc),   bg: C.tealLight, color: C.teal }] : []),
        ].map(p => (
          <View key={p.label} style={[s.quickParam, { backgroundColor: p.bg }]}>
            <Text style={[s.quickParamLabel, { color: p.color }]}>{p.label}</Text>
            <Text style={[s.quickParamValue, { color: p.color }]}>{p.value}</Text>
          </View>
        ))}
      </View>

      {/* Expanded */}
      {expanded && ai && (
        <View style={s.aiSection}>

          {ai.warnings?.length > 0 && (
            <View style={s.warningBox}>
              <Text style={s.warningTitle}>Warnings</Text>
              {ai.warnings.map((w, i) => (
                <Text key={i} style={s.warningText}>· {w}</Text>
              ))}
            </View>
          )}

          <View style={s.summaryBox}>
            <View style={s.summaryAccent} />
            <Text style={s.summaryText}>{ai.summary}</Text>
          </View>

          <View style={s.phRow}>
            <Text style={s.phLabel}>pH Status</Text>
            <Text style={s.phValue}>{ai.ph_status}</Text>
          </View>
          {ai.ph_advice ? <Text style={s.phAdvice}>{ai.ph_advice}</Text> : null}

          <SectionTitle title="Nutrient Status" />
          <View style={s.nutrientRow}>
            <NutrientChip label="N" value={item.n} status={ai.nutrient_status?.nitrogen ?? ''} />
            <NutrientChip label="P" value={item.p} status={ai.nutrient_status?.phosphorus ?? ''} />
            <NutrientChip label="K" value={item.k} status={ai.nutrient_status?.potassium ?? ''} />
          </View>

          <SectionTitle title="Recommended Crops" />
          {ai.recommended_crops?.map((crop, i) => <CropCard key={i} crop={crop} />)}

          {ai.avoid_crops?.length > 0 && (
            <>
              <SectionTitle title="Crops to Avoid" />
              <View style={s.avoidBox}>
                {ai.avoid_crops.map((c, i) => (
                  <View key={i} style={s.avoidRow}>
                    <Text style={s.avoidName}>{c.name}</Text>
                    <Text style={s.avoidReason}>{c.reason}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <SectionTitle title="Fertilizer Recommendations" />
          {ai.fertilizer_recommendations?.map((f, i) => (
            <View key={i} style={s.fertCard}>
              <View style={s.fertHeader}>
                <Text style={s.fertName}>{f.fertilizer}</Text>
                <Text style={s.fertDose}>{f.dose}</Text>
              </View>
              <Text style={s.fertTiming}>{f.timing}</Text>
              <Text style={s.fertReason}>{f.reason}</Text>
            </View>
          ))}

          <SectionTitle title="Soil Improvement Tips" />
          <View style={s.tipsBox}>
            {ai.soil_improvement_tips?.map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipBullet} />
                <Text style={s.tipText}>{tip}</Text>
              </View>
            ))}
          </View>

          {ai.biogas_slurry_advice && (
            <View style={s.biogasBox}>
              <Text style={s.biogasTitle}>Biogas Slurry Advice</Text>
              <Text style={s.biogasText}>{ai.biogas_slurry_advice}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SoilLab() {
  const [reports, setReports]           = useState<SoilReport[]>([]);
  const [loading, setLoading]           = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const [ph, setPh]                         = useState('');
  const [nitrogen, setNitrogen]             = useState('');
  const [phosphorus, setPhosphorus]         = useState('');
  const [potassium, setPotassium]           = useState('');
  const [no2, setNo2]                       = useState('');
  const [sulfur, setSulfur]                 = useState('');
  const [zinc, setZinc]                     = useState('');
  const [iron, setIron]                     = useState('');
  const [organicCarbon, setOrganicCarbon]   = useState('');
  const [ec, setEc]                         = useState('');
  const [texture, setTexture]               = useState('');
  const [state, setState]                   = useState('');
  const [season, setSeason]                 = useState('');

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/soil-lab/all`);
      const data = await res.json();
      setReports(Array.isArray(data) ? data.reverse() : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!ph || !nitrogen || !phosphorus || !potassium) {
      setError('Please fill in pH, Nitrogen, Phosphorus and Potassium.');
      return;
    }
    setSubmitting(true);
    try {
      const body: any = {
        user_id: 'current-user-id',
        ph: Number(ph), n: Number(nitrogen), p: Number(phosphorus), k: Number(potassium),
        no2: no2 ? Number(no2) : null,
      };
      if (sulfur)        body.sulfur = Number(sulfur);
      if (zinc)          body.zinc = Number(zinc);
      if (iron)          body.iron = Number(iron);
      if (organicCarbon) body.organic_carbon = Number(organicCarbon);
      if (ec)            body.electrical_conductivity = Number(ec);
      if (texture)       body.texture = texture;
      if (state)         body.state = state;
      if (season)        body.season = season;

      const res = await fetch(`${API}/soil-lab/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? `Server error ${res.status}`);
      }
      const newReport: SoilReport = await res.json();
      setPh(''); setNitrogen(''); setPhosphorus(''); setPotassium('');
      setNo2(''); setSulfur(''); setZinc(''); setIron('');
      setOrganicCarbon(''); setEc(''); setTexture(''); setState(''); setSeason('');
      setReports(prev => [newReport, ...prev]);
      setExpandedId(newReport.id);
    } catch (e: any) {
      setError(e.message ?? 'Failed to analyse soil. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

      {/* ── Hero Header (centered, matching biogas/equipment pattern) ── */}
      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={s.heroBadgeDot} />
          <Text style={s.heroBadgeText}>AI-POWERED ANALYSIS</Text>
        </View>
        <Text style={s.heroTitle}>Soil Lab</Text>
        <Text style={s.heroSub}>Enter your soil parameters for crop recommendations and fertilizer advice</Text>
        <View style={s.heroPills}>
          {[
            { dot: C.sage,    label: 'Crop Advice' },
            { dot: C.teal,    label: 'Nutrients' },
            { dot: C.strawMid,label: 'Fertilizers' },
          ].map(p => (
            <View key={p.label} style={s.heroPill}>
              <View style={[s.heroPillDot, { backgroundColor: p.dot }]} />
              <Text style={s.heroPillText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Form */}
      <View style={s.formCard}>
        <Text style={s.cardStep}>01</Text>
        <Text style={s.formTitle}>Soil Parameters</Text>
        <Text style={s.formSub}>Fields marked * are required</Text>

        <View style={s.fieldRow}>
          <View style={s.fieldHalf}>
            <Text style={s.fieldLabel}>pH Level *</Text>
            <TextInput style={s.input} placeholder="e.g. 6.5" keyboardType="decimal-pad"
              value={ph} onChangeText={setPh} placeholderTextColor={C.inkSoft} />
          </View>
          <View style={s.fieldHalf}>
            <Text style={s.fieldLabel}>Nitrogen kg/ha *</Text>
            <TextInput style={s.input} placeholder="e.g. 200" keyboardType="numeric"
              value={nitrogen} onChangeText={setNitrogen} placeholderTextColor={C.inkSoft} />
          </View>
        </View>
        <View style={s.fieldRow}>
          <View style={s.fieldHalf}>
            <Text style={s.fieldLabel}>Phosphorus kg/ha *</Text>
            <TextInput style={s.input} placeholder="e.g. 18" keyboardType="numeric"
              value={phosphorus} onChangeText={setPhosphorus} placeholderTextColor={C.inkSoft} />
          </View>
          <View style={s.fieldHalf}>
            <Text style={s.fieldLabel}>Potassium kg/ha *</Text>
            <TextInput style={s.input} placeholder="e.g. 250" keyboardType="numeric"
              value={potassium} onChangeText={setPotassium} placeholderTextColor={C.inkSoft} />
          </View>
        </View>

        <TouchableOpacity style={s.advancedToggle} onPress={() => setShowAdvanced(v => !v)} activeOpacity={0.8}>
          <Text style={s.advancedToggleText}>
            {showAdvanced ? 'Hide advanced fields' : 'Add more parameters (optional)'}
          </Text>
          <View style={[s.toggleChevron, showAdvanced && s.toggleChevronUp]} />
        </TouchableOpacity>

        {showAdvanced && (
          <View>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Sulfur (ppm)</Text>
                <TextInput style={s.input} placeholder="e.g. 12" keyboardType="decimal-pad"
                  value={sulfur} onChangeText={setSulfur} placeholderTextColor={C.inkSoft} />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Zinc (ppm)</Text>
                <TextInput style={s.input} placeholder="e.g. 0.8" keyboardType="decimal-pad"
                  value={zinc} onChangeText={setZinc} placeholderTextColor={C.inkSoft} />
              </View>
            </View>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Iron (ppm)</Text>
                <TextInput style={s.input} placeholder="e.g. 5.2" keyboardType="decimal-pad"
                  value={iron} onChangeText={setIron} placeholderTextColor={C.inkSoft} />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Organic Carbon (%)</Text>
                <TextInput style={s.input} placeholder="e.g. 0.8" keyboardType="decimal-pad"
                  value={organicCarbon} onChangeText={setOrganicCarbon} placeholderTextColor={C.inkSoft} />
              </View>
            </View>
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>EC (dS/m)</Text>
                <TextInput style={s.input} placeholder="e.g. 0.5" keyboardType="decimal-pad"
                  value={ec} onChangeText={setEc} placeholderTextColor={C.inkSoft} />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Nitrate NO2 (ppm)</Text>
                <TextInput style={s.input} placeholder="Optional" keyboardType="decimal-pad"
                  value={no2} onChangeText={setNo2} placeholderTextColor={C.inkSoft} />
              </View>
            </View>
            <Text style={s.fieldLabel}>Soil Texture</Text>
            <TextInput style={s.input} placeholder="Sandy / Loamy / Clay / Silt / Sandy Loam"
              value={texture} onChangeText={setTexture} placeholderTextColor={C.inkSoft} />
            <View style={s.fieldRow}>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>State</Text>
                <TextInput style={s.input} placeholder="e.g. Maharashtra"
                  value={state} onChangeText={setState} placeholderTextColor={C.inkSoft} />
              </View>
              <View style={s.fieldHalf}>
                <Text style={s.fieldLabel}>Season</Text>
                <TextInput style={s.input} placeholder="Kharif / Rabi / Zaid"
                  value={season} onChangeText={setSeason} placeholderTextColor={C.inkSoft} />
              </View>
            </View>
          </View>
        )}

        {error && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>⚠  {error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.analyzeBtn, submitting && s.analyzeBtnDisabled]}
          onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}
        >
          {submitting ? (
            <View style={s.analyzeBtnInner}>
              <ActivityIndicator color={C.white} size="small" />
              <Text style={s.analyzeBtnText}>  Analysing with AI…</Text>
            </View>
          ) : (
            <Text style={s.analyzeBtnText}>Analyse Soil  →</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Reports header */}
      <View style={s.reportsHeaderRow}>
        <Text style={s.reportsHeader}>Soil Reports</Text>
        <View style={s.reportsCount}>
          <Text style={s.reportsCountText}>{reports.length}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={C.sage} style={{ marginTop: 24 }} />
      ) : reports.length === 0 ? (
        <View style={s.emptyBox}>
          <Text style={s.emptyText}>No soil reports yet.</Text>
          <Text style={s.emptySubText}>Submit your first analysis above.</Text>
        </View>
      ) : (
        reports.map(item => (
          <ReportCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },
  scrollContent: { paddingBottom: 48 },

  // ── Hero (centered, matching biogas pattern) ──────────────────────────────
  hero: {
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 28,
    paddingHorizontal: 20,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.strawMid },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: C.strawDark, letterSpacing: 1 },
  heroTitle: {
    fontSize: 38, fontWeight: '800', color: C.sageDark,
    textAlign: 'center', lineHeight: 44, marginBottom: 10,
  },
  heroSub: {
    fontSize: 13, color: C.inkSoft, textAlign: 'center',
    lineHeight: 20, maxWidth: 300, marginBottom: 18,
  },
  heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.cream, borderWidth: 1, borderColor: C.border,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroPillDot: { width: 7, height: 7, borderRadius: 4 },
  heroPillText: { fontSize: 11, color: C.inkMid, fontWeight: '600' },

  // ── Form card ─────────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: C.white, borderRadius: 18,
    padding: 18, margin: 16, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  cardStep: { fontSize: 11, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.5, marginBottom: 2 },
  formTitle: { fontSize: 16, fontWeight: '800', color: C.sageDark, marginBottom: 2 },
  formSub: { fontSize: 11, color: C.inkSoft, marginBottom: 14 },

  fieldRow: { flexDirection: 'row', gap: 10, marginBottom: 2 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: C.inkMid, marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1.5, borderColor: C.sageMid, borderRadius: 10,
    padding: 11, fontSize: 13, color: C.ink, backgroundColor: C.cream,
  },

  advancedToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 14, marginBottom: 2, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  advancedToggleText: { color: C.sage, fontSize: 12, fontWeight: '700' },
  toggleChevron: {
    width: 8, height: 8, borderRightWidth: 2, borderBottomWidth: 2,
    borderColor: C.sage, transform: [{ rotate: '45deg' }], marginBottom: 4,
  },
  toggleChevronUp: { transform: [{ rotate: '-135deg' }], marginBottom: -2 },

  errorBox: {
    backgroundColor: C.redLight, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.redBorder, marginTop: 10,
  },
  errorText: { color: C.red, fontSize: 12 },

  analyzeBtn: {
    backgroundColor: C.sageDark, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginTop: 14,
  },
  analyzeBtnDisabled: { opacity: 0.55 },
  analyzeBtnInner: { flexDirection: 'row', alignItems: 'center' },
  analyzeBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

  // ── Reports section ───────────────────────────────────────────────────────
  reportsHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 12, marginTop: 8, paddingHorizontal: 16,
  },
  reportsHeader: { fontSize: 15, fontWeight: '800', color: C.ink },
  reportsCount: {
    backgroundColor: C.sageLight, borderRadius: 100,
    paddingHorizontal: 9, paddingVertical: 2,
    borderWidth: 1, borderColor: C.sageMid,
  },
  reportsCountText: { fontSize: 11, fontWeight: '700', color: C.sageDark },

  emptyBox: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 14, fontWeight: '700', color: C.inkMid, marginBottom: 4 },
  emptySubText: { fontSize: 12, color: C.inkSoft },

  // ── Report cards ──────────────────────────────────────────────────────────
  reportCard: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  reportCardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: C.border, gap: 8,
  },
  reportCardTitle: { fontSize: 13, fontWeight: '700', color: C.ink },
  reportCardDate: { fontSize: 11, color: C.inkSoft, marginTop: 2 },
  chevron: {
    width: 8, height: 8, borderRightWidth: 2, borderBottomWidth: 2,
    borderColor: C.inkSoft, transform: [{ rotate: '45deg' }], marginBottom: 4,
  },
  chevronUp: { transform: [{ rotate: '-135deg' }], marginBottom: -2 },
  scoreBadge: {
    alignItems: 'center', borderRadius: 10, borderWidth: 2,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  scoreNumber: { fontSize: 20, fontWeight: '900' },
  scoreLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreMax: { fontSize: 8, color: C.inkSoft },

  quickParams: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.cream,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  quickParam: {
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    alignItems: 'center', minWidth: 42,
  },
  quickParamLabel: { fontSize: 9, fontWeight: '700' },
  quickParamValue: { fontSize: 13, fontWeight: '800' },

  aiSection: { padding: 14 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18, marginBottom: 10 },
  sectionTitleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.sage },
  sectionTitleText: { fontSize: 11, fontWeight: '800', color: C.inkMid, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionTitleLine: { flex: 1, height: 1, backgroundColor: C.border },

  warningBox: {
    backgroundColor: C.redLight, borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: C.redBorder,
  },
  warningTitle: { fontSize: 12, fontWeight: '800', color: C.red, marginBottom: 5 },
  warningText: { fontSize: 12, color: C.red, lineHeight: 18 },

  summaryBox: {
    flexDirection: 'row', backgroundColor: C.tealLight, borderRadius: 10,
    padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.tealMid, gap: 10,
  },
  summaryAccent: { width: 3, borderRadius: 2, backgroundColor: C.teal },
  summaryText: { flex: 1, fontSize: 13, color: '#1e3a4a', lineHeight: 20 },

  phRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  phLabel: { fontSize: 12, fontWeight: '700', color: C.inkMid },
  phValue: { fontSize: 12, fontWeight: '700', color: C.teal },
  phAdvice: { fontSize: 12, color: C.inkSoft, lineHeight: 18, marginBottom: 4 },

  nutrientRow: { flexDirection: 'row', gap: 8 },
  nutrientChip: { flex: 1, borderRadius: 10, borderWidth: 1.5, padding: 10, alignItems: 'center' },
  nutrientChipLabel: { fontSize: 11, fontWeight: '800' },
  nutrientChipValue: { fontSize: 16, fontWeight: '900', marginVertical: 2 },
  nutrientChipStatus: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  cropCard: {
    backgroundColor: C.cream, borderRadius: 10, padding: 12,
    marginBottom: 8, borderLeftWidth: 3, borderWidth: 1, borderColor: C.border,
  },
  cropCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 },
  cropName: { fontSize: 13, fontWeight: '800', color: C.ink },
  cropLocalName: { fontSize: 11, color: C.inkSoft, fontStyle: 'italic', marginTop: 1 },
  suitabilityBadge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  suitabilityText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  cropReason: { fontSize: 12, color: C.inkMid, lineHeight: 17, marginBottom: 6 },
  cropMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cropMetaItem: { fontSize: 11, color: C.inkSoft, fontWeight: '600' },
  cropMetaSep: { color: C.inkSoft, fontSize: 11 },

  avoidBox: {
    backgroundColor: C.redLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.redBorder,
  },
  avoidRow: { marginBottom: 8 },
  avoidName: { fontSize: 12, fontWeight: '800', color: C.red },
  avoidReason: { fontSize: 11, color: C.inkSoft, marginTop: 2 },

  fertCard: {
    backgroundColor: C.amberLight, borderRadius: 10, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: C.amberBorder,
  },
  fertHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  fertName: { fontSize: 13, fontWeight: '800', color: '#78350f' },
  fertDose: { fontSize: 12, fontWeight: '700', color: C.amber },
  fertTiming: { fontSize: 11, color: '#92400e', marginBottom: 3 },
  fertReason: { fontSize: 11, color: '#78350f', lineHeight: 16 },

  tipsBox: {
    backgroundColor: C.sageLight, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: C.sageMid, gap: 8,
  },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  tipBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.sage, marginTop: 6 },
  tipText: { flex: 1, fontSize: 12, color: C.sageDark, lineHeight: 18 },

  biogasBox: {
    marginTop: 10, backgroundColor: C.sageLight, borderRadius: 10,
    padding: 12, borderWidth: 1, borderColor: C.sageMid,
  },
  biogasTitle: { fontSize: 12, fontWeight: '800', color: C.sageDark, marginBottom: 4 },
  biogasText: { fontSize: 12, color: C.sageDark, lineHeight: 17 },
});