import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';

// ─── Design Tokens (identical to BiogasCalculator) ────────────────────────────

const C = {
  sage:        '#4a7c59',
  sageMid:     '#b5d9bf',
  sageLight:   '#e8f5ec',
  sageDark:    '#2d5a3d',
  straw:       '#f5e6a3',
  strawMid:    '#e8c84a',
  strawDark:   '#7a6210',
  sky:         '#bde0f5',
  skyMid:      '#5bacd4',
  skyDark:     '#1e5f82',
  clay:        '#e8a87c',
  clayLight:   '#fdf0e6',
  clayDark:    '#7a3d15',
  cream:       '#faf7f0',
  parchment:   '#f0ead8',
  ink:         '#2c2416',
  inkMid:      '#5a4f3c',
  inkSoft:     '#8a7d68',
  white:       '#ffffff',
  border:      'rgba(74,124,89,0.18)',
  indigo:      '#3d4f8a',
  indigoBg:    '#f5f7fd',
  indigoBorder:'#c8d0ef',
  indigoLight: '#eef1fb',
  amber:       '#e8a020',
  amberLight:  '#fff8e6',
  red:         '#c0392b',
  redLight:    '#fdf0f0',
  redBorder:   '#f7c8c8',
  slate:       '#9aacb8',
};

type Scheme = {
  name: string;
  type: 'Government' | 'Bank';
  url: string;
  description: string;
};

// ─── Sub-components (mirrors Biogas style) ────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <View style={s.dividerRow}>
      <View style={s.dividerLine} />
      <Text style={s.dividerText}>{title}</Text>
      <View style={s.dividerLine} />
    </View>
  );
}

// ─── Scheme Card ──────────────────────────────────────────────────────────────

function SchemeCard({ item, onOpen }: { item: Scheme; onOpen: (url: string) => void }) {
  const isGov       = item.type === 'Government';
  const accentColor = isGov ? C.indigo  : C.skyDark;
  const lightBg     = isGov ? C.indigoLight : '#e0f2fe';
  const badgeBorder = isGov ? C.indigoBorder : '#8cc8e8';

  return (
    <View style={[s.schemeCard, { borderTopColor: accentColor }]}>
      <View style={s.schemeCardBody}>
        {/* Header row */}
        <View style={s.cardHeaderRow}>
          <View style={[s.cardIconCircle, { backgroundColor: lightBg, borderColor: badgeBorder }]}>
            <View style={[s.cardIconInner, { backgroundColor: accentColor }]} />
          </View>
          <View style={[s.typeBadge, { backgroundColor: lightBg, borderColor: badgeBorder }]}>
            <Text style={[s.typeBadgeText, { color: accentColor }]}>
              {item.type.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Name */}
        <Text style={s.cardName}>{item.name}</Text>

        {/* Description */}
        <Text style={s.cardDesc}>{item.description}</Text>

        <View style={s.cardDivider} />

        {/* CTA */}
        <TouchableOpacity
          style={[s.applyBtn, { backgroundColor: accentColor }]}
          onPress={() => onOpen(item.url)}
          activeOpacity={0.85}
        >
          <Text style={s.applyBtnText}>Learn More & Apply</Text>
          <Text style={s.applyArrow}>→</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Schemes() {
  const [schemes, setSchemes]           = useState<Scheme[]>([]);
  const [loading, setLoading]           = useState(false);
  const [activeFilter, setActiveFilter] = useState<'All' | 'Government' | 'Bank'>('All');

  useEffect(() => { fetchSchemes(); }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const res  = await fetch('http://localhost:8000/schemes/');
      const data = await res.json();
      setSchemes(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleOpenLink = (url: string) =>
    Linking.openURL(url).catch(err => console.error('Failed to open URL', err));

  const filtered  = activeFilter === 'All' ? schemes : schemes.filter(s => s.type === activeFilter);
  const govCount  = schemes.filter(s => s.type === 'Government').length;
  const bankCount = schemes.filter(s => s.type === 'Bank').length;

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Hero (matches Biogas hero pattern exactly) ── */}
      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={s.heroDot} />
          <Text style={s.heroBadgeText}>MAHARASHTRA AGRI TOOL</Text>
        </View>
        <Text style={s.heroTitle}>Farmer{'\n'}Schemes</Text>
        <Text style={s.heroSub}>
          Government benefits and bank programs designed to empower your farm
        </Text>
        <View style={s.heroPills}>
          {[
            { dot: C.indigo,   label: 'Government' },
            { dot: C.skyDark,  label: 'Bank' },
            { dot: C.sage,     label: 'Financial Aid' },
          ].map(p => (
            <View key={p.label} style={s.heroPill}>
              <View style={[s.heroPillDot, { backgroundColor: p.dot }]} />
              <Text style={s.heroPillText}>{p.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Filter / Selector card (mirrors Biogas step card) ── */}
      <View style={s.card}>
        <Text style={s.cardStep}>01</Text>
        <Text style={s.cardTitle}>Choose a category</Text>

        {/* Stats inline */}
        <View style={s.statsRow}>
          <View style={[s.statChip, { backgroundColor: C.indigoLight }]}>
            <Text style={[s.statNumber, { color: C.indigo }]}>{govCount}</Text>
            <Text style={[s.statLabel, { color: C.indigo }]}>GOVT</Text>
          </View>
          <View style={s.statDivider} />
          <View style={[s.statChip, { backgroundColor: '#e0f2fe' }]}>
            <Text style={[s.statNumber, { color: C.skyDark }]}>{bankCount}</Text>
            <Text style={[s.statLabel, { color: C.skyDark }]}>BANK</Text>
          </View>
          <View style={s.statDivider} />
          <View style={[s.statChip, { backgroundColor: C.sageLight }]}>
            <Text style={[s.statNumber, { color: C.sageDark }]}>{schemes.length}</Text>
            <Text style={[s.statLabel, { color: C.sageDark }]}>TOTAL</Text>
          </View>
        </View>

        {/* Filter chips */}
        <Text style={s.catLabel}>FILTER BY TYPE</Text>
        <View style={s.chipRow}>
          {(['All', 'Government', 'Bank'] as const).map(f => {
            const isActive = activeFilter === f;
            const isGovt   = f === 'Government';
            const isBank   = f === 'Bank';
            const activeBg = isGovt ? C.indigo : isBank ? C.skyDark : C.sageDark;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  s.chip,
                  f === 'Government' ? s.chipGovt : f === 'Bank' ? s.chipBank : s.chipAll,
                  isActive && { backgroundColor: activeBg, borderColor: activeBg },
                ]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.75}
              >
                <Text style={[
                  s.chipText,
                  f === 'Government' ? s.chipTextGovt : f === 'Bank' ? s.chipTextBank : s.chipTextAll,
                  isActive && s.chipTextActive,
                ]}>
                  {f === 'All' ? 'All Schemes' : f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Results ── */}
      <SectionDivider title="📋  AVAILABLE SCHEMES" />

      {loading ? (
        <ActivityIndicator size="large" color={C.sage} style={{ marginVertical: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No schemes found for this filter.</Text>
        </View>
      ) : (
        <View style={s.cardList}>
          {filtered.map((item, idx) => (
            <SchemeCard key={idx} item={item} onOpen={handleOpenLink} />
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flexGrow: 1, backgroundColor: C.cream, padding: 16, paddingBottom: 60 },

  // Hero — identical structure to Biogas
  hero: { alignItems: 'center', paddingVertical: 32, marginBottom: 8 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 16,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.strawMid },
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
    backgroundColor: C.white, borderWidth: 1, borderColor: C.border,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5,
  },
  heroPillDot: { width: 7, height: 7, borderRadius: 4 },
  heroPillText: { fontSize: 11, color: C.inkMid, fontWeight: '500' },

  // Step card — matches Biogas card
  card: {
    backgroundColor: C.white, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginBottom: 14,
  },
  cardStep: {
    fontSize: 11, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.5, marginBottom: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.sageDark, marginBottom: 16 },

  // Stats row — same as Biogas stat chips
  statsRow: {
    flexDirection: 'row', backgroundColor: C.cream,
    borderRadius: 14, padding: 12, alignItems: 'center', marginBottom: 18,
    borderWidth: 1, borderColor: C.border,
  },
  statChip: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 10 },
  statNumber: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.8 },
  statDivider: { width: 1, height: 30, backgroundColor: C.border, marginHorizontal: 6 },

  // Category label + chip row — mirrors Biogas substrate selector
  catLabel: {
    fontSize: 10, fontWeight: '700', color: C.inkSoft,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1.5 },
  chipAll:  { backgroundColor: C.sageLight, borderColor: C.sageMid },
  chipGovt: { backgroundColor: C.indigoLight, borderColor: C.indigoBorder },
  chipBank: { backgroundColor: '#e0f2fe', borderColor: '#8cc8e8' },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextAll:  { color: C.sageDark },
  chipTextGovt: { color: C.indigo },
  chipTextBank: { color: C.skyDark },
  chipTextActive: { color: C.white, fontWeight: '700' },

  // Divider — identical to Biogas
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8 },

  // Scheme cards list
  cardList: { gap: 14 },

  schemeCard: {
    backgroundColor: C.white, borderRadius: 18,
    overflow: 'hidden', borderTopWidth: 4,
    borderWidth: 1, borderColor: C.border,
  },
  schemeCardBody: { padding: 18 },

  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  cardIconCircle: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  cardIconInner: { width: 16, height: 16, borderRadius: 8 },
  typeBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 100, borderWidth: 1.5,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },

  cardName: {
    fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8, lineHeight: 24,
  },
  cardDesc: { fontSize: 13, color: C.inkMid, lineHeight: 21, marginBottom: 14 },
  cardDivider: { height: 1, backgroundColor: C.border, marginBottom: 14 },

  applyBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 14,
    borderRadius: 12, gap: 8,
  },
  applyBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },
  applyArrow: { color: C.white, fontSize: 16, fontWeight: '900' },

  // Empty state
  emptyCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
  },
  emptyText: { fontSize: 14, color: C.inkSoft, fontStyle: 'italic' },
});