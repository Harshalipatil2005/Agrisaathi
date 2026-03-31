import { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useLanguageChange } from '../hooks/useLanguageChange';
import { STRINGS } from '../constants/strings';

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
  purple:     '#6d28d9',
  purpleLight:'#ede9fe',
  purpleBorder:'#c4b5fd',
  teal:       '#0f766e',
  tealLight:  '#ccfbf1',
  tealBorder: '#5eead4',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RecoveryDays = {
  min: number;
  max: number;
  note: string;
};

type DetectionResult = {
  disease: string;
  confidence: number;
  severity: 'Mild' | 'Moderate' | 'Severe' | 'None';
  affected_parts: string[];
  advice: string;
  cause: string;
  precautions: string[];
  recovery_days: RecoveryDays;
};

type AppState =
  | { status: 'idle' }
  | { status: 'image_selected'; uri: string }
  | { status: 'loading'; uri: string }
  | { status: 'success'; uri: string; result: DetectionResult }
  | { status: 'error'; uri: string | null; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<string, string> = {
  None:     C.sage,
  Mild:     '#ca8a04',
  Moderate: '#ea580c',
  Severe:   C.red,
};

const SEVERITY_BG: Record<string, string> = {
  None:     C.sageLight,
  Mild:     '#fef3c7',
  Moderate: '#ffedd5',
  Severe:   C.redLight,
};

const API_BASE = 'http://localhost:8000';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  label, icon, accentColor, accentBg, accentBorder, children,
}: {
  label: string; icon: string;
  accentColor: string; accentBg: string; accentBorder: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.sectionCard, { borderColor: accentBorder, backgroundColor: accentBg }]}>
      <View style={s.sectionCardHeader}>
        <View style={[s.sectionIconBubble, { backgroundColor: accentBorder }]}>
          <Text style={s.sectionIcon}>{icon}</Text>
        </View>
        <Text style={[s.sectionCardLabel, { color: accentColor }]}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

function RecoveryTimeline({ recovery }: { recovery: RecoveryDays }) {
  const isHealthy = recovery.min === 0 && recovery.max === 0;
  return (
    <SectionCard
      label="RECOVERY TIMELINE"
      icon="⏱"
      accentColor={C.teal}
      accentBg={C.tealLight}
      accentBorder={C.tealBorder}
    >
      {isHealthy ? (
        <Text style={[s.causeText, { color: C.teal }]}>No treatment needed — crop is healthy.</Text>
      ) : (
        <>
          <View style={s.recoveryPillRow}>
            <View style={[s.recoveryPill, { backgroundColor: C.white, borderColor: C.tealBorder }]}>
              <Text style={[s.recoveryPillNum, { color: C.teal }]}>{recovery.min}</Text>
              <Text style={[s.recoveryPillLabel, { color: C.teal }]}>days min</Text>
            </View>
            <View style={s.recoveryDash}>
              <View style={[s.recoveryDashLine, { backgroundColor: C.tealBorder }]} />
            </View>
            <View style={[s.recoveryPill, { backgroundColor: C.white, borderColor: C.tealBorder }]}>
              <Text style={[s.recoveryPillNum, { color: C.teal }]}>{recovery.max}</Text>
              <Text style={[s.recoveryPillLabel, { color: C.teal }]}>days max</Text>
            </View>
          </View>
          <View style={s.timelineBar}>
            <View style={[s.timelineFill, { backgroundColor: C.teal, width: `${Math.min((recovery.max / 90) * 100, 100)}%` as any }]} />
          </View>
          {recovery.note ? (
            <Text style={[s.recoveryNote, { color: C.teal }]}>ℹ {recovery.note}</Text>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CropHealth() {
  const { t } = useLanguageChange();
  const [state, setState] = useState<AppState>({ status: 'idle' });

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled && res.assets?.length) {
      setState({ status: 'image_selected', uri: res.assets[0].uri });
    }
  };

  const analyseImage = async () => {
    const uri =
      state.status === 'image_selected' || state.status === 'success' || state.status === 'error'
        ? state.uri : null;
    if (!uri) return;

    setState({ status: 'loading', uri });

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, 'crop.jpg');
    } else {
      formData.append('file', { uri, name: 'crop.jpg', type: 'image/jpeg' } as any);
    }

    try {
      const res = await fetch(`${API_BASE}/crop-health/detect`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
      }
      const data: DetectionResult = await res.json();
      setState({ status: 'success', uri, result: data });
    } catch (e: any) {
      setState({ status: 'error', uri, message: e.message ?? 'Detection failed.' });
    }
  };

  const reset = () => setState({ status: 'idle' });

  const imageUri   = state.status !== 'idle' ? state.uri : null;
  const result     = state.status === 'success' ? state.result : null;
  const isLoading  = state.status === 'loading';
  const canAnalyse =
    state.status === 'image_selected' ||
    state.status === 'success' ||
    (state.status === 'error' && !!state.uri);

  return (
    <>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>← {t(STRINGS.COMMON.BACK)}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={s.heroBadgeDot} />
        </View>
        <Text style={s.heroTitle}>{t(STRINGS.CROP_HEALTH.TITLE)}</Text>
        <Text style={s.heroSub}>{t(STRINGS.CROP_HEALTH.DESCRIPTION)}</Text>
      </View>

      <TouchableOpacity
        style={[s.imageBox, imageUri ? s.imageBoxFilled : s.imageBoxEmpty]}
        onPress={pickImage}
        activeOpacity={0.85}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.placeholder}>
            <View style={s.placeholderIcon}>
              <View style={s.cameraLens} />
            </View>
            <Text style={s.placeholderText}>{t(STRINGS.CROP_HEALTH.TAP_IMAGE)}</Text>
            <Text style={s.placeholderHint}>{t(STRINGS.CROP_HEALTH.FORMATS)}</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={s.actions}>
        {imageUri && (
          <TouchableOpacity style={s.btnSecondary} onPress={pickImage} activeOpacity={0.8}>
            <Text style={s.btnSecondaryText}>{t(STRINGS.CROP_HEALTH.CHANGE_PHOTO)}</Text>
          </TouchableOpacity>
        )}
        {canAnalyse && (
          <TouchableOpacity
            style={[s.btnPrimary, isLoading && s.btnDisabled]}
            onPress={analyseImage}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading
              ? <ActivityIndicator color={C.white} />
              : <Text style={s.btnPrimaryText}>{t(STRINGS.CROP_HEALTH.ANALYSE_CROP)}</Text>}
          </TouchableOpacity>
        )}
        {state.status === 'idle' && (
          <TouchableOpacity style={s.btnPrimary} onPress={pickImage} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>{t(STRINGS.CROP_HEALTH.GET_STARTED)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && (
        <Text style={s.loadingText}>{t(STRINGS.CROP_HEALTH.ANALYSING)}</Text>
      )}

      {state.status === 'error' && (
        <View style={s.errorCard}>
          <Text style={s.errorTitle}>{t(STRINGS.CROP_HEALTH.DETECTION_FAILED)}</Text>
          <Text style={s.errorMessage}>{state.message}</Text>
          <TouchableOpacity onPress={reset} style={s.btnReset}>
            <Text style={s.btnResetText}>{t(STRINGS.CROP_HEALTH.START_OVER)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {result && (
        <View style={s.resultCard}>

          {/* Disease + severity */}
          <View style={s.resultHeader}>
            <View style={s.resultTitleRow}>
              <Text style={s.diseaseLabel}>{result.disease}</Text>
              <View style={[
                s.severityBadge,
                {
                  backgroundColor: SEVERITY_BG[result.severity] ?? C.sageLight,
                  borderColor: SEVERITY_COLOR[result.severity] ?? C.sage,
                },
              ]}>
                <Text style={[s.severityText, { color: SEVERITY_COLOR[result.severity] ?? C.sage }]}>
                  {result.severity}
                </Text>
              </View>
            </View>
            <View style={s.confRow}>
              <View style={s.confLabelRow}>
                <Text style={s.confLabel}>Confidence</Text>
                <Text style={[s.confPct, { color: SEVERITY_COLOR[result.severity] ?? C.sage }]}>
                  {(result.confidence * 100).toFixed(0)}%
                </Text>
              </View>
              <View style={s.confBarBg}>
                <View
                  style={[
                    s.confBarFill,
                    {
                      width: `${(result.confidence * 100).toFixed(0)}%` as any,
                      backgroundColor: SEVERITY_COLOR[result.severity] ?? C.sage,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Affected parts */}
          {result.affected_parts?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>{t(STRINGS.CROP_HEALTH.AFFECTED_PARTS)}</Text>
              <View style={s.tagsRow}>
                {result.affected_parts.map(part => (
                  <View key={part} style={s.tag}>
                    <Text style={s.tagText}>{part}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recommended Action */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t(STRINGS.CROP_HEALTH.RECOMMENDED_ACTION)}</Text>
            <View style={s.adviceBox}>
              <Text style={s.adviceText}>{result.advice}</Text>
            </View>
          </View>

          <View style={s.divider} />

          {/* Why did this happen? */}
          {result.cause ? (
            <SectionCard
              label="WHY DID THIS HAPPEN?"
              icon="🔬"
              accentColor={C.purple}
              accentBg={C.purpleLight}
              accentBorder={C.purpleBorder}
            >
              <Text style={[s.causeText, { color: C.inkMid }]}>{result.cause}</Text>
            </SectionCard>
          ) : null}

          {/* Precautions */}
          {result.precautions?.length > 0 && (
            <SectionCard
              label="PRECAUTIONS"
              icon="🛡️"
              accentColor={C.amber}
              accentBg={C.amberLight}
              accentBorder={C.amberBorder}
            >
              <View style={s.precautionList}>
                {result.precautions.map((item, idx) => (
                  <View key={idx} style={s.precautionRow}>
                    <View style={[s.precautionBullet, { backgroundColor: C.amber }]}>
                      <Text style={s.precautionBulletText}>{idx + 1}</Text>
                    </View>
                    <Text style={[s.precautionText, { color: C.inkMid }]}>{item}</Text>
                  </View>
                ))}
              </View>
            </SectionCard>
          )}

          {/* Recovery Timeline */}
          {result.recovery_days && (
            <RecoveryTimeline recovery={result.recovery_days} />
          )}

          <TouchableOpacity style={s.btnSecondary} onPress={pickImage} activeOpacity={0.8}>
            <Text style={s.btnSecondaryText}>{t(STRINGS.CROP_HEALTH.SCAN_ANOTHER)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header: { backgroundColor: C.cream, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { fontSize: 14, color: C.sage, fontWeight: '700' },

  scroll: { flexGrow: 1, padding: 16, backgroundColor: C.cream, paddingBottom: 48 },

  hero: { alignItems: 'center', paddingVertical: 28, marginBottom: 8 },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 14,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.strawMid },
  heroTitle: { fontSize: 32, fontWeight: '800', color: C.sageDark, marginBottom: 8 },
  heroSub: { fontSize: 13, color: C.inkSoft, textAlign: 'center', maxWidth: 300, lineHeight: 20 },

  imageBox: { borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  imageBoxEmpty: {
    height: 210, borderWidth: 2, borderStyle: 'dashed', borderColor: C.sageMid,
    backgroundColor: C.sageLight, justifyContent: 'center', alignItems: 'center',
  },
  imageBoxFilled: { height: 250 },
  image: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: 10 },
  placeholderIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: C.white,
    borderWidth: 2, borderColor: C.sageMid, justifyContent: 'center', alignItems: 'center',
  },
  cameraLens: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.sageMid },
  placeholderText: { fontSize: 14, color: C.inkMid, fontWeight: '600' },
  placeholderHint: { fontSize: 11, color: C.inkSoft },

  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  btnPrimary: { flex: 1, backgroundColor: C.sageDark, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnPrimaryText: { color: C.white, fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.55 },
  btnSecondary: {
    flex: 1, backgroundColor: C.white, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: C.sageMid,
  },
  btnSecondaryText: { color: C.sage, fontWeight: '600', fontSize: 13 },

  loadingText: { textAlign: 'center', color: C.inkSoft, fontSize: 13, marginBottom: 8 },

  errorCard: {
    backgroundColor: C.redLight, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.redBorder, marginBottom: 16,
  },
  errorTitle: { fontWeight: '700', color: C.red, marginBottom: 4, fontSize: 14 },
  errorMessage: { color: '#7f1d1d', fontSize: 13, lineHeight: 20 },
  btnReset: { marginTop: 10, alignSelf: 'flex-start' },
  btnResetText: { color: C.red, fontWeight: '600', fontSize: 13 },

  resultCard: {
    backgroundColor: C.white, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, padding: 18, gap: 16,
  },
  resultHeader: { gap: 12 },
  resultTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
  },
  diseaseLabel: { fontSize: 18, fontWeight: '800', color: C.sageDark, flexShrink: 1 },
  severityBadge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100, borderWidth: 1.5 },
  severityText: { fontSize: 11, fontWeight: '700' },

  confRow: { gap: 6 },
  confLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  confLabel: { fontSize: 11, fontWeight: '600', color: C.inkSoft },
  confPct: { fontSize: 11, fontWeight: '700' },
  confBarBg: { height: 7, backgroundColor: C.parchment, borderRadius: 99 },
  confBarFill: { height: '100%', borderRadius: 99 },

  section: { gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: C.inkSoft, textTransform: 'uppercase', letterSpacing: 0.8 },
  adviceBox: { backgroundColor: C.sageLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.sageMid },
  adviceText: { fontSize: 13, color: C.sageDark, lineHeight: 21 },

  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: { backgroundColor: C.straw, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1.5, borderColor: C.strawMid },
  tagText: { color: C.strawDark, fontSize: 11, fontWeight: '600' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },

  // SectionCard
  sectionCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 10 },
  sectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBubble: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionIcon: { fontSize: 14 },
  sectionCardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },

  // Cause
  causeText: { fontSize: 13, lineHeight: 21 },

  // Precautions
  precautionList: { gap: 10 },
  precautionRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  precautionBullet: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  precautionBulletText: { color: C.white, fontSize: 10, fontWeight: '800' },
  precautionText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Recovery Timeline
  recoveryPillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recoveryPill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  recoveryPillNum: { fontSize: 22, fontWeight: '800' },
  recoveryPillLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  recoveryDash: { alignItems: 'center', justifyContent: 'center', width: 24 },
  recoveryDashLine: { height: 2, width: 20, borderRadius: 1 },
  timelineBar: { height: 6, backgroundColor: C.white, borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: C.tealBorder, marginTop: 4 },
  timelineFill: { height: '100%', borderRadius: 99 },
  recoveryNote: { fontSize: 12, lineHeight: 18, fontStyle: 'italic' },
});