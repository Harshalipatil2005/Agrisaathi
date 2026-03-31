/**
 * PrecisionFarmingSection
 *
 * Drop this inline into UserHome, replacing the current dashGrid block
 * and the <PrecisionFarmingModal> at the bottom.
 *
 * Usage in UserHome:
 *   import PrecisionFarmingSection from '../../components/PrecisionFarmingSection';
 *   ...
 *   <PrecisionFarmingSection />
 *   (remove: PrecisionFarmingModal import, precisionModalVisible state, and the modal at the bottom)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── SHARED THEME (matches UserHome) ─────────────────────────────────────────
const T = {
  bg:        '#f4faf0',
  white:     '#ffffff',
  green1:    '#d4edda',
  green2:    '#b8dfc4',
  green3:    '#8fca9f',
  green4:    '#6ab583',
  green5:    '#4a9962',
  green6:    '#2e7d45',
  text:      '#1e3a28',
  textMid:   '#3d6b4f',
  textLight: '#6a9e7a',
  warning:   '#fef9e7',
  warnBorder:'#f0c040',
  warnText:  '#7a6210',
  error:     '#fdeaea',
  errBorder: '#f5c2c2',
  errText:   '#e05050',
};

const { width: SW } = Dimensions.get('window');

// ─── CROP METADATA ────────────────────────────────────────────────────────────
interface CropMeta {
  name: string; emoji: string; totalDays: number;
  stageNames: string[]; stageDays: number[]; stageDescs: string[];
  baseYield: number;
}
const CROPS_META: Record<string, CropMeta> = {
  tomato: { name:'Tomato',  emoji:'🍅', totalDays:60,  baseYield:28, stageNames:['Seed','Germination','Vegetative','Flowering','Harvest'],    stageDays:[0,7,30,50,60],   stageDescs:['Seeds planted in soil','Roots forming, first shoots emerge','Rapid leaf and stem growth','Pollination and fruit set','Fruits fully developed, ready to pick'] },
  potato: { name:'Potato',  emoji:'🥔', totalDays:90,  baseYield:22, stageNames:['Seed','Sprout','Vegetative','Tuber Init','Harvest'],         stageDays:[0,10,35,65,90],  stageDescs:['Seed potatoes placed','Eyes sprouting, shoots emerge','Foliage growing rapidly','Underground tubers forming','Skins set, leaves yellowing'] },
  onion:  { name:'Onion',   emoji:'🧅', totalDays:120, baseYield:18, stageNames:['Seed','Germination','Bulbing','Maturation','Harvest'],        stageDays:[0,14,45,90,120], stageDescs:['Sowing in rows','Hair-like sprouts appear','Bulb formation begins','Outer skins drying','Necks fallen, ready to cure'] },
  carrot: { name:'Carrot',  emoji:'🥕', totalDays:75,  baseYield:24, stageNames:['Seed','Germination','Vegetative','Root Dev','Harvest'],       stageDays:[0,14,30,55,75],  stageDescs:['Tiny seeds in shallow rows','Feathery seedlings emerge','Leaf canopy developing','Roots swelling underground','Shoulders at soil level'] },
  wheat:  { name:'Wheat',   emoji:'🌾', totalDays:120, baseYield:4,  stageNames:['Seed','Germination','Tillering','Heading','Harvest'],         stageDays:[0,10,40,80,120], stageDescs:['Grain drilled into soil','Coleoptile emerges','Side shoots developing','Spike fully exerted','Grain hard, moisture low'] },
  rice:   { name:'Rice',    emoji:'🍚', totalDays:150, baseYield:5,  stageNames:['Seed','Germination','Tillering','Panicle','Harvest'],         stageDays:[0,7,35,90,150],  stageDescs:['Flooded seedbed prepared','Green shoots in water','Multiple stems forming','Panicle initiation','Grain golden, field drained'] },
  corn:   { name:'Corn',    emoji:'🌽', totalDays:90,  baseYield:6,  stageNames:['Seed','Germination','V-Stage','Tasseling','Harvest'],         stageDays:[0,7,30,65,90],   stageDescs:['Kernels in furrows','Coleoptile breaking through','Leaf collar stages V1–V18','Pollen shed, silking','Husks dry, kernels dented'] },
  cotton: { name:'Cotton',  emoji:'☁️', totalDays:180, baseYield:2,  stageNames:['Seed','Germination','Vegetative','Boll Dev','Harvest'],       stageDays:[0,10,45,110,180],stageDescs:['Seeds placed in rows','Cotyledons emerge','Square and bloom formation','Boll development and opening','Bolls open, ready to pick'] },
};
const CROP_IDS = Object.keys(CROPS_META);

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface CropData {
  id: string; cropType: string; fieldName: string;
  plantedDate: string; quantity: string; notes: string;
}
interface WeatherData {
  soilMoisturePct: number; soilTempC: number; airTempC: number;
  precipMm: number; humidity: number; evapotranspirationMm: number;
  fetchedAt: number;
}
type HealthStatus = 'good' | 'warning' | 'critical';
type DiseaseRisk  = 'low'  | 'medium' | 'high';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const vwcToPercent = (v: number) => Math.round(Math.min(Math.max((v / 0.5) * 100, 0), 100));
const getDaysAgo   = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function getStageIndex(cropType: string, days: number): number {
  const m = CROPS_META[cropType]; if (!m) return 0;
  let idx = 0;
  for (let i = 0; i < m.stageDays.length; i++) { if (days >= m.stageDays[i]) idx = i; }
  return Math.min(idx, m.stageDays.length - 1);
}
function getHealth(moisture: number, temp: number): HealthStatus {
  if (moisture < 30 || temp > 38) return 'critical';
  if (moisture < 45 || temp > 34) return 'warning';
  return 'good';
}
function getDiseaseRisk(moisture: number, humidity: number): DiseaseRisk {
  if (moisture > 70 && humidity > 75) return 'high';
  if (moisture > 55 || humidity > 65) return 'medium';
  return 'low';
}
function getYield(cropType: string, health: HealthStatus): number {
  const m = CROPS_META[cropType]; if (!m) return 0;
  const mult = health === 'good' ? 1 : health === 'warning' ? 0.82 : 0.65;
  return Math.round(m.baseYield * mult * 10) / 10;
}
function stageDate(planted: string, offset: number): string {
  const d = new Date(planted); d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function harvestDate(planted: string, total: number, w: WeatherData | null): Date {
  const d = new Date(planted); d.setDate(d.getDate() + total);
  if (!w) return d;
  let adj = 0;
  if (w.airTempC > 32) adj -= 3; else if (w.airTempC < 15) adj += 5;
  if (w.soilMoisturePct < 30) adj += 4;
  if (w.evapotranspirationMm > 6) adj += 2;
  d.setDate(d.getDate() + adj);
  return d;
}
function buildTips(cropType: string, stageIdx: number, w: WeatherData): string {
  const tips: string[] = [];
  const hasRain = w.precipMm > 5;
  if (w.soilMoisturePct < 40 && !hasRain) tips.push(`💧 Soil moisture low (${w.soilMoisturePct}%). Irrigate today.`);
  else if (w.soilMoisturePct < 40 && hasRain) tips.push(`🌧️ Rain expected (${w.precipMm} mm). Monitor before irrigating.`);
  else if (w.soilMoisturePct > 75) tips.push(`⚠️ Over-saturated (${w.soilMoisturePct}%). Ensure drainage.`);
  else tips.push(`✅ Soil moisture good at ${w.soilMoisturePct}%.`);
  if (w.airTempC > 35) tips.push(`🌡️ Heat stress risk (${w.airTempC}°C). Consider mulching.`);
  if (w.soilTempC < 15) tips.push(`❄️ Soil temp low (${w.soilTempC}°C). Avoid morning watering.`);
  if (w.evapotranspirationMm > 5 && !hasRain) tips.push(`☀️ High evapotranspiration (${w.evapotranspirationMm} mm/day). Water in the evening.`);
  const ferts = ['None','None','Nitrogen (N)','Phosphorus (P)','Potassium (K)','None'];
  const fert = ferts[stageIdx] || 'None';
  if (fert !== 'None') tips.push(`🧴 Apply ${fert} fertilizer now.`);
  return tips.join('\n\n');
}

// ─── WEATHER FETCH ────────────────────────────────────────────────────────────
const DEFAULT_LAT = 19.9975, DEFAULT_LON = 73.7898;
async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const [fr, sr] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,evapotranspiration&timezone=auto&forecast_days=1`),
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=soil_temperature_0cm,soil_moisture_0_to_1cm&timezone=auto&forecast_days=1`),
  ]);
  if (!fr.ok || !sr.ok) throw new Error('Weather fetch failed');
  const [f, s] = await Promise.all([fr.json(), sr.json()]);
  const hi = Math.min(new Date().getHours(), (s.hourly?.time?.length ?? 1) - 1);
  return {
    soilMoisturePct:     vwcToPercent(s.hourly?.soil_moisture_0_to_1cm?.[hi] ?? 0.25),
    soilTempC:           Math.round((s.hourly?.soil_temperature_0cm?.[hi]    ?? f.current.temperature_2m) * 10) / 10,
    airTempC:            Math.round((f.current.temperature_2m ?? 28)          * 10) / 10,
    precipMm:            Math.round((f.current.precipitation ?? 0)            * 10) / 10,
    humidity:            f.current.relative_humidity_2m ?? 60,
    evapotranspirationMm:Math.round((f.current.evapotranspiration ?? 3)       * 10) / 10,
    fetchedAt:           Date.now(),
  };
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

/** Tiny horizontal stage timeline used on the home card */
function MiniTimeline({ cropType, days }: { cropType: string; days: number }) {
  const m = CROPS_META[cropType]; if (!m) return null;
  const cur = getStageIndex(cropType, days);
  return (
    <View style={d.tlRow}>
      {m.stageNames.map((name, i) => (
        <React.Fragment key={i}>
          <View style={d.tlStep}>
            <View style={[d.tlDot, i < cur && d.tlDotDone, i === cur && d.tlDotCur]} />
            <Text style={[d.tlName, i === cur && d.tlNameCur]} numberOfLines={1}>{name}</Text>
          </View>
          {i < m.stageNames.length - 1 && (
            <View style={[d.tlLine, i < cur && d.tlLineDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

/** Health status pill */
function HealthPill({ status }: { status: HealthStatus }) {
  const cfg = {
    good:     { bg: '#d4f5e2', text: '#2e7d45', label: '● Healthy'  },
    warning:  { bg: '#fef9e7', text: '#9a6800', label: '● Warning'  },
    critical: { bg: '#fdeaea', text: '#c0392b', label: '● Critical' },
  }[status];
  return (
    <View style={[d.pill, { backgroundColor: cfg.bg }]}>
      <Text style={[d.pillText, { color: cfg.text }]}>{cfg.label}</Text>
    </View>
  );
}

/** Horizontal progress bar */
function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <View style={d.barBg}>
      <View style={[d.barFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color ?? T.green5 }]} />
    </View>
  );
}

// ─── HOME CROP CARD ───────────────────────────────────────────────────────────
function CropHomeCard({
  crop, weather, weatherLoading, onPress,
}: { crop: CropData; weather: WeatherData | null; weatherLoading: boolean; onPress: () => void }) {
  const m = CROPS_META[crop.cropType]; if (!m) return null;
  const days     = getDaysAgo(crop.plantedDate);
  const progress = Math.min(Math.round((days / m.totalDays) * 100), 100);
  const stageIdx = getStageIndex(crop.cropType, days);
  const health   = weather ? getHealth(weather.soilMoisturePct, weather.airTempC) : 'good';
  const hDate    = harvestDate(crop.plantedDate, m.totalDays, weather);
  const daysLeft = Math.ceil((hDate.getTime() - Date.now()) / 86400000);

  return (
    <TouchableOpacity style={d.homeCard} onPress={onPress} activeOpacity={0.88}>
      {/* Top row */}
      <View style={d.homeCardTop}>
        <View style={d.homeCardLeft}>
          <View style={d.emojiWrap}><Text style={d.emoji}>{m.emoji}</Text></View>
          <View>
            <Text style={d.cropName}>{m.name}</Text>
            <Text style={d.cropField}>📍 {crop.fieldName}</Text>
          </View>
        </View>
        <HealthPill status={health} />
      </View>

      {/* Progress */}
      <View style={d.progressRow}>
        <Text style={d.progressLabel}>{m.stageNames[stageIdx]}</Text>
        <Text style={d.progressPct}>{progress}%</Text>
      </View>
      <Bar pct={progress} />
      <View style={d.progressMeta}>
        <Text style={d.metaSmall}>Day {days} of {m.totalDays}</Text>
        <Text style={d.metaSmall}>
          {daysLeft > 0 ? `Harvest in ~${daysLeft}d` : daysLeft === 0 ? 'Harvest today!' : `${Math.abs(daysLeft)}d overdue`}
        </Text>
      </View>

      {/* Env pills — only if weather loaded */}
      {weatherLoading ? (
        <ActivityIndicator size="small" color={T.green5} style={{ marginVertical: 6 }} />
      ) : weather ? (
        <View style={d.envRow}>
          <View style={d.envChip}><Text style={d.envChipText}>💧 {weather.soilMoisturePct}%</Text></View>
          <View style={d.envChip}><Text style={d.envChipText}>🌡️ {weather.airTempC}°C</Text></View>
          <View style={d.envChip}><Text style={d.envChipText}>💦 {weather.humidity}%</Text></View>
        </View>
      ) : null}

      {/* Mini stage timeline */}
      <MiniTimeline cropType={crop.cropType} days={days} />

      {/* Tap hint */}
      <View style={d.tapHint}>
        <Text style={d.tapHintText}>Tap for full details & predictions  ›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── ADD CROP MODAL ───────────────────────────────────────────────────────────
function AddCropModal({
  visible, onClose, onSave,
}: { visible: boolean; onClose: () => void; onSave: (c: CropData) => void }) {
  const [cropType, setCropType] = useState(CROP_IDS[0]);
  const [fieldName, setFieldName] = useState('');
  const [daysAgo, setDaysAgo]   = useState(0);
  const [qty, setQty]           = useState('');
  const [notes, setNotes]       = useState('');

  const reset = () => {
    setCropType(CROP_IDS[0]);
    setFieldName('');
    setDaysAgo(0);
    setQty('');
    setNotes('');
  };

  const save = () => {
    if (!fieldName.trim()) {
      Alert.alert('Error', 'Please enter a field / plot name.');
      return;
    }
    const planted = new Date();
    planted.setDate(planted.getDate() - daysAgo);
    onSave({
      id: `crop_${Date.now()}`,
      cropType,
      fieldName: fieldName.trim(),
      plantedDate: planted.toISOString(),
      quantity: qty.trim(),
      notes: notes.trim(),
    });
    reset();
    onClose();
  };

  const plantedDate = new Date();
  plantedDate.setDate(plantedDate.getDate() - daysAgo);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={d.modalContainer}>
        {/* Header */}
        <View style={d.modalHeader}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }}>
            <Text style={d.modalHeaderBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={d.modalHeaderTitle}>🌱 Add Crop</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={d.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={d.formCard}>

            {/* ── Crop type ── */}
            <Text style={d.formLabel}>Select crop *</Text>
            <View style={d.cropTypeGrid}>
              {CROP_IDS.map(id => {
                const m = CROPS_META[id];
                return (
                  <TouchableOpacity
                    key={id}
                    style={[d.cropTypeOpt, cropType === id && d.cropTypeOptActive]}
                    onPress={() => setCropType(id)}
                  >
                    <Text style={d.cropTypeEmoji}>{m.emoji}</Text>
                    <Text style={[d.cropTypeName, cropType === id && { color: T.white }]}>
                      {m.name}
                    </Text>
                    <Text style={[d.cropTypeDays, cropType === id && { color: 'rgba(255,255,255,0.7)' }]}>
                      {m.totalDays}d
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* ── Field name — FIXED: real TextInput ── */}
            <Text style={d.formLabel}>Field / plot name *</Text>
            <View style={d.textInputWrap}>
              <Text style={d.textInputIcon}>📍</Text>
              <TextInput
                style={d.realInput}
                value={fieldName}
                onChangeText={setFieldName}
                placeholder="e.g. North Block, Plot A"
                placeholderTextColor={T.textLight}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>

            {/* ── Quantity (optional) ── */}
            <Text style={d.formLabel}>Quantity (optional)</Text>
            <View style={d.textInputWrap}>
              <Text style={d.textInputIcon}>📦</Text>
              <TextInput
                style={d.realInput}
                value={qty}
                onChangeText={setQty}
                placeholder="e.g. 2 acres, 500 sqm"
                placeholderTextColor={T.textLight}
                returnKeyType="done"
              />
            </View>

            {/* ── Notes (optional) ── */}
            <Text style={d.formLabel}>Notes (optional)</Text>
            <View style={[d.textInputWrap, { alignItems: 'flex-start', paddingTop: 10 }]}>
              <Text style={[d.textInputIcon, { marginTop: 2 }]}>📝</Text>
              <TextInput
                style={[d.realInput, { minHeight: 60 }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor={T.textLight}
                multiline
                returnKeyType="done"
              />
            </View>

            {/* ── Planted date ── */}
            <Text style={d.formLabel}>Planted date *</Text>
            <View style={d.dateOptions}>
              {[
                { label: 'Today',        days: 0  },
                { label: '1 week ago',   days: 7  },
                { label: '2 weeks ago',  days: 14 },
                { label: '1 month ago',  days: 30 },
                { label: '2 months ago', days: 60 },
                { label: '3 months ago', days: 90 },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.days}
                  style={[d.dateOpt, daysAgo === opt.days && d.dateOptActive]}
                  onPress={() => setDaysAgo(opt.days)}
                >
                  <Text style={[d.dateOptText, daysAgo === opt.days && { color: T.white }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={d.dateDisplay}>
              <Text style={d.dateDisplayText}>
                📅 {plantedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>

            {/* ── Save ── */}
            <TouchableOpacity style={d.saveBtn} onPress={save}>
              <Text style={d.saveBtnText}>🌱 Start Tracking</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function CropDetailModal({
  crop, weather, weatherLoading, onRefreshWeather, onDelete, onClose,
}: {
  crop: CropData; weather: WeatherData | null; weatherLoading: boolean;
  onRefreshWeather: () => void; onDelete: () => void; onClose: () => void;
}) {
  const m = CROPS_META[crop.cropType]; if (!m) return null;
  const days     = getDaysAgo(crop.plantedDate);
  const stageIdx = getStageIndex(crop.cropType, days);
  const progress = Math.min(Math.round((days / m.totalDays) * 100), 100);
  const health   = weather ? getHealth(weather.soilMoisturePct, weather.airTempC) : 'good';
  const dr       = weather ? getDiseaseRisk(weather.soilMoisturePct, weather.humidity) : 'low';
  const yld      = getYield(crop.cropType, health);
  const hDate    = harvestDate(crop.plantedDate, m.totalDays, weather);
  const daysLeft = Math.ceil((hDate.getTime() - Date.now()) / 86400000);
  const tips     = weather ? buildTips(crop.cropType, stageIdx, weather) : '⏳ Loading live field data…';

  const drColor  = dr === 'low' ? '#2e7d45' : dr === 'medium' ? '#9a6800' : '#c0392b';
  const drBg     = dr === 'low' ? '#d4f5e2' : dr === 'medium' ? '#fef9e7' : '#fdeaea';

  // Irrigation schedule (4 upcoming sessions)
  const irrigSchedule = [0, 3, 6, 10].map(offset => {
    const dt = new Date(); dt.setDate(dt.getDate() + offset);
    return {
      label:  offset === 0 ? 'Today' : offset === 3 ? 'In 3 days' : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      amount: `${Math.round(22 + (offset * 3))} mm`,
    };
  });

  return (
    <Modal visible animationType="slide" transparent={false}>
      <View style={d.modalContainer}>
        {/* Header */}
        <View style={d.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={d.modalHeaderBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={d.modalHeaderTitle}>{m.emoji} {m.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={d.modalScroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero card ── */}
          <View style={[d.detailHero, { backgroundColor: T.green1 }]}>
            <Text style={d.heroEmoji}>{m.emoji}</Text>
            <Text style={d.heroStage}>{m.stageNames[stageIdx]}</Text>
            <Text style={d.heroDay}>Day {days} of {m.totalDays}-day cycle</Text>
            <View style={{ width: '100%', marginTop: 10 }}>
              <Bar pct={progress} />
            </View>
            <View style={d.heroDates}>
              <Text style={d.heroDateText}>
                Planted {new Date(crop.plantedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
              <HealthPill status={health} />
              <Text style={d.heroDateText}>
                {daysLeft > 0 ? `~${daysLeft}d to harvest` : 'Harvest now!'}
              </Text>
            </View>
          </View>

          {/* ── AI Predictions ── */}
          <Text style={d.sectionTitle}>Predictions</Text>
          <View style={d.aiGrid}>
            <View style={d.aiCard}>
              <Text style={d.aiLabel}>Est. yield</Text>
              <Text style={d.aiValue}>{yld} t/ha</Text>
            </View>
            <View style={[d.aiCard, { backgroundColor: drBg }]}>
              <Text style={d.aiLabel}>Disease risk</Text>
              <Text style={[d.aiValue, { color: drColor }]}>{dr.charAt(0).toUpperCase() + dr.slice(1)}</Text>
            </View>
            <View style={d.aiCard}>
              <Text style={d.aiLabel}>Harvest date</Text>
              <Text style={[d.aiValue, { fontSize: 12 }]}>
                {hDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>

          {/* ── Live conditions ── */}
          <View style={d.detailCard}>
            <View style={d.detailCardHeader}>
              <Text style={d.detailCardTitle}>🌡️ Live Field Conditions</Text>
              {weatherLoading
                ? <ActivityIndicator size="small" color={T.green5} />
                : <TouchableOpacity onPress={onRefreshWeather}>
                    <Text style={d.refreshBtn}>↻ Refresh</Text>
                  </TouchableOpacity>
              }
            </View>
            {weather ? (
              <View style={d.condGrid}>
                {([
                  ['💧 Soil moisture', `${weather.soilMoisturePct}%`],
                  ['🌡️ Soil temp',     `${weather.soilTempC}°C`],
                  ['🌬️ Air temp',      `${weather.airTempC}°C`],
                  ['💦 Humidity',      `${weather.humidity}%`],
                  ['🌧️ Rainfall',     `${weather.precipMm} mm`],
                  ['☀️ Evapotrans.',   `${weather.evapotranspirationMm} mm/d`],
                ] as [string, string][]).map(([label, val], i) => (
                  <View key={i} style={d.condItem}>
                    <Text style={d.condLabel}>{label}</Text>
                    <Text style={d.condVal}>{val}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={d.muted}>No data yet.</Text>
            )}
          </View>

          {/* ── What to do now ── */}
          <View style={[d.detailCard, { backgroundColor: T.warning, borderColor: T.warnBorder }]}>
            <Text style={d.detailCardTitle}>📋 What to do now</Text>
            <Text style={d.tipsText}>{tips}</Text>
          </View>

          {/* ── Future prediction timeline ── */}
          <Text style={d.sectionTitle}>📅 Future Prediction Timeline</Text>
          <View style={d.detailCard}>
            {m.stageNames.map((name, i) => {
              const isDone    = i < stageIdx;
              const isCurrent = i === stageIdx;
              const isLast    = i === m.stageNames.length - 1;
              const fromDate  = stageDate(crop.plantedDate, m.stageDays[i]);
              const toDate    = !isLast ? stageDate(crop.plantedDate, m.stageDays[i + 1]) : null;
              return (
                <View key={i} style={d.ftRow}>
                  <View style={d.ftLeft}>
                    <View style={[d.ftDot, isDone && d.ftDotDone, isCurrent && d.ftDotCur]} />
                    {!isLast && <View style={[d.ftLine, isDone && d.ftLineDone]} />}
                  </View>
                  <View style={d.ftBody}>
                    <Text style={[d.ftStage, isCurrent && { color: T.green5 }]}>
                      {name}{isCurrent ? '  ← current' : ''}
                    </Text>
                    <Text style={d.ftDate}>
                      {fromDate}{toDate ? ` → ${toDate}` : ` (harvest: ${stageDate(crop.plantedDate, m.totalDays)})`}
                    </Text>
                    <Text style={d.ftDesc}>{m.stageDescs[i]}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Irrigation schedule ── */}
          <Text style={d.sectionTitle}>💧 Irrigation Schedule</Text>
          <View style={d.detailCard}>
            {irrigSchedule.map((ir, i) => (
              <View key={i} style={[d.irrigRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.green1 }]}>
                <Text style={d.irrigLabel}>{ir.label}</Text>
                <Text style={d.irrigAmt}>Apply {ir.amount}</Text>
              </View>
            ))}
          </View>

          {/* ── Field info ── */}
          <View style={d.detailCard}>
            {([
              ['📍 Field',    crop.fieldName],
              ['📊 Quantity', crop.quantity || 'Not specified'],
              ['📝 Notes',    crop.notes    || '—'],
            ] as [string, string][]).map(([label, val], i) => (
              <View key={i} style={[d.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: T.green1 }]}>
                <Text style={d.infoLabel}>{label}</Text>
                <Text style={d.infoVal}>{val}</Text>
              </View>
            ))}
          </View>

          {/* ── Delete ── */}
          <TouchableOpacity style={d.deleteBtn} onPress={onDelete}>
            <Text style={d.deleteBtnText}>🗑️ Remove Crop</Text>
          </TouchableOpacity>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function PrecisionFarmingSection() {
  const [crops, setCrops]             = useState<CropData[]>([]);
  const [weather, setWeather]         = useState<WeatherData | null>(null);
  const [weatherLoading, setWLoading] = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [detailCrop, setDetailCrop]   = useState<CropData | null>(null);

  useEffect(() => {
    loadCrops();
    loadWeather();
  }, []);

  // ── Persistence ─────────────────────────────────────────────────────────────
  const loadCrops = async () => {
    try {
      const raw = await AsyncStorage.getItem('pf_crops_v2');
      if (raw !== null) {                       // ← explicit null check
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCrops(parsed);
        }
      }
    } catch (e) {
      console.warn('PF loadCrops error:', e);
    }
  };

  const persistCrops = async (updated: CropData[]) => {
    setCrops(updated);
    try {
      await AsyncStorage.setItem('pf_crops_v2', JSON.stringify(updated));
    } catch (e) {
      console.warn('PF persistCrops error:', e);
    }
  };

  // ── Weather ──────────────────────────────────────────────────────────────────
  const loadWeather = useCallback(async () => {
    if (weather && Date.now() - weather.fetchedAt < 30 * 60 * 1000) return;
    setWLoading(true);
    try {
      let lat = DEFAULT_LAT, lon = DEFAULT_LON;
      try {
        const Geo = require('@react-native-community/geolocation');
        await new Promise<void>(res =>
          Geo.getCurrentPosition(
            (p: any) => { lat = p.coords.latitude; lon = p.coords.longitude; res(); },
            () => res(),
            { timeout: 5000, maximumAge: 60000 },
          )
        );
      } catch {}
      setWeather(await fetchWeather(lat, lon));
    } catch (e) {
      console.warn('PF loadWeather error:', e);
    } finally {
      setWLoading(false);
    }
  }, [weather]);

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleAdd = (c: CropData) => persistCrops([...crops, c]);

  const handleDelete = (id: string) => {
    Alert.alert('Remove Crop', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          persistCrops(crops.filter(c => c.id !== id));
          setDetailCrop(null);
        },
      },
    ]);
  };

  return (
    <View style={d.root}>
      {/* ── Section header ── */}
      <View style={d.sectionHeader}>
        <Text style={d.sectionTitle}>📡 Precision Farming</Text>
        <TouchableOpacity style={d.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={d.addBtnText}>+ Add Crop</Text>
        </TouchableOpacity>
      </View>

      {/* ── Live weather mini-strip ── */}
      {weather && !weatherLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={d.weatherStrip}
          contentContainerStyle={d.weatherStripContent}
        >
          <Text style={d.weatherStripLabel}>Live  </Text>
          {[
            `💧 Soil ${weather.soilMoisturePct}%`,
            `🌡️ ${weather.airTempC}°C`,
            `💦 ${weather.humidity}%`,
            ...(weather.precipMm > 0 ? [`🌧️ ${weather.precipMm}mm`] : []),
          ].map((t, i) => (
            <View key={i} style={d.weatherChip}>
              <Text style={d.weatherChipText}>{t}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      {weatherLoading && (
        <View style={d.weatherStripLoading}>
          <ActivityIndicator size="small" color={T.green5} />
          <Text style={d.muted}>  Fetching live field data…</Text>
        </View>
      )}

      {/* ── Crop cards — horizontal scroll ── */}
      {crops.length === 0 ? (
        <TouchableOpacity style={d.emptyCard} onPress={() => setShowAdd(true)}>
          <Text style={d.emptyEmoji}>🌱</Text>
          <Text style={d.emptyTitle}>No crops tracked yet</Text>
          <Text style={d.emptyDesc}>Tap to add your first crop and get live field insights.</Text>
          <View style={d.emptyBtn}><Text style={d.emptyBtnText}>+ Add Crop</Text></View>
        </TouchableOpacity>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={d.cardsScroll}
        >
          {crops.map(crop => (
            <CropHomeCard
              key={crop.id}
              crop={crop}
              weather={weather}
              weatherLoading={weatherLoading}
              onPress={() => setDetailCrop(crop)}
            />
          ))}
          {/* Add more card */}
          <TouchableOpacity style={d.addMoreCard} onPress={() => setShowAdd(true)}>
            <Text style={d.addMoreIcon}>＋</Text>
            <Text style={d.addMoreText}>Add{'\n'}Crop</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <AddCropModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAdd}
      />

      {detailCrop && (
        <CropDetailModal
          crop={detailCrop}
          weather={weather}
          weatherLoading={weatherLoading}
          onRefreshWeather={loadWeather}
          onDelete={() => handleDelete(detailCrop.id)}
          onClose={() => setDetailCrop(null)}
        />
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CARD_W     = SW * 0.72;
const CARD_W_MIN = 260;

const d = StyleSheet.create({
  root: { paddingVertical: 0 },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: T.green6 },
  addBtn: {
    backgroundColor: T.green5,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addBtnText: { color: T.white, fontWeight: '800', fontSize: 12 },

  // Weather strip
  weatherStrip: { paddingLeft: 16, marginBottom: 8 },
  weatherStripContent: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 16 },
  weatherStripLabel: { fontSize: 11, fontWeight: '800', color: T.green6 },
  weatherChip: { backgroundColor: T.green1, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  weatherChipText: { fontSize: 11, fontWeight: '700', color: T.green6 },
  weatherStripLoading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },

  // Horizontal cards scroll
  cardsScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 12, alignItems: 'flex-start' },

  // Home crop card
  homeCard: {
    width: Math.max(CARD_W, CARD_W_MIN),
    backgroundColor: T.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.green2,
    padding: 14,
    elevation: 3,
  },
  homeCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  homeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  emojiWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: T.green1, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  cropName: { fontSize: 15, fontWeight: '800', color: T.text },
  cropField: { fontSize: 11, color: T.textLight, marginTop: 1 },

  // Progress
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: T.textMid },
  progressPct: { fontSize: 11, fontWeight: '700', color: T.green5 },
  barBg: { height: 5, backgroundColor: T.green1, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 3 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaSmall: { fontSize: 10, color: T.textLight },

  // Env chips
  envRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  envChip: { backgroundColor: T.green1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  envChipText: { fontSize: 11, fontWeight: '700', color: T.green6 },

  // Mini timeline
  tlRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tlStep: { alignItems: 'center', flex: 1 },
  tlDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.green2 },
  tlDotDone: { backgroundColor: T.green5 },
  tlDotCur: { backgroundColor: T.green4, shadowColor: T.green5, shadowRadius: 3, shadowOpacity: 0.5 },
  tlLine: { flex: 1, height: 2, backgroundColor: T.green2, marginTop: 3 },
  tlLineDone: { backgroundColor: T.green5 },
  tlName: { fontSize: 8, color: T.textLight, marginTop: 2, textAlign: 'center' },
  tlNameCur: { color: T.green5, fontWeight: '800' },

  // Tap hint
  tapHint: { alignItems: 'center', paddingTop: 4 },
  tapHintText: { fontSize: 10, color: T.textLight, fontStyle: 'italic' },

  // Health pill
  pill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '800' },

  // Add more card
  addMoreCard: {
    width: 72,
    height: '100%',
    minHeight: 180,
    backgroundColor: T.green1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.green2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addMoreIcon: { fontSize: 22, color: T.green5 },
  addMoreText: { fontSize: 11, fontWeight: '800', color: T.green5, textAlign: 'center' },

  // Empty state
  emptyCard: {
    marginHorizontal: 16,
    backgroundColor: T.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: T.green2,
    borderStyle: 'dashed',
    padding: 28,
    alignItems: 'center',
    elevation: 1,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: T.text, marginBottom: 4 },
  emptyDesc: { fontSize: 12, color: T.textLight, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  emptyBtn: { backgroundColor: T.green5, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 22 },
  emptyBtnText: { color: T.white, fontWeight: '800', fontSize: 13 },

  // ── ADD / DETAIL MODAL SHARED ──
  modalContainer: { flex: 1, backgroundColor: T.bg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.white,
    borderBottomWidth: 1,
    borderBottomColor: T.green2,
  },
  modalHeaderBtn: { fontSize: 13, fontWeight: '800', color: T.green6, width: 60 },
  modalHeaderTitle: { fontSize: 16, fontWeight: '900', color: T.text },
  modalScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Form card
  formCard: {
    backgroundColor: T.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: T.green2,
    marginBottom: 20,
  },
  formLabel: { fontSize: 12, fontWeight: '800', color: T.textMid, marginTop: 14, marginBottom: 8 },

  // Crop type grid
  cropTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cropTypeOpt: {
    width: (SW - 64) / 4,
    backgroundColor: T.green1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: T.green2,
  },
  cropTypeOptActive: { backgroundColor: T.green5, borderColor: T.green5 },
  cropTypeEmoji: { fontSize: 22, marginBottom: 2 },
  cropTypeName: { fontSize: 10, fontWeight: '700', color: T.text, textAlign: 'center' },
  cropTypeDays: { fontSize: 9, color: T.textLight },

  // Text inputs — FIXED: real TextInput styles (replaced fakeInput)
  textInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.green2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  textInputIcon: { fontSize: 14 },
  realInput: {
    flex: 1,
    fontSize: 13,
    color: T.text,
    padding: 0,
    paddingVertical: 4,
  },

  // Date picker
  dateOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dateOpt: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: T.green1,
    borderWidth: 1.5,
    borderColor: T.green2,
  },
  dateOptActive: { backgroundColor: T.green5, borderColor: T.green5 },
  dateOptText: { fontSize: 11, fontWeight: '700', color: T.green6 },
  dateDisplay: {
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: T.green2,
  },
  dateDisplayText: { fontSize: 13, fontWeight: '700', color: T.text },

  // Save button
  saveBtn: {
    backgroundColor: T.green5,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 18,
    alignItems: 'center',
  },
  saveBtnText: { color: T.white, fontWeight: '800', fontSize: 14 },

  // ── DETAIL MODAL ──
  detailHero: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: T.green2,
  },
  heroEmoji: { fontSize: 44, marginBottom: 6 },
  heroStage: { fontSize: 18, fontWeight: '900', color: T.text, marginBottom: 2 },
  heroDay: { fontSize: 12, color: T.textMid, fontWeight: '600' },
  heroDates: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 8 },
  heroDateText: { fontSize: 11, color: T.textMid, fontWeight: '600' },

  aiGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  aiCard: {
    flex: 1,
    backgroundColor: T.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.green2,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
  },
  aiLabel: { fontSize: 10, color: T.textLight, fontWeight: '600', marginBottom: 4 },
  aiValue: { fontSize: 16, fontWeight: '900', color: T.text },

  detailCard: {
    backgroundColor: T.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: T.green2,
    elevation: 1,
  },
  detailCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  detailCardTitle: { fontSize: 13, fontWeight: '800', color: T.green6 },
  refreshBtn: { fontSize: 12, fontWeight: '700', color: T.green5 },

  condGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  condItem: { backgroundColor: T.bg, borderRadius: 8, padding: 10, width: (SW - 60) / 3 },
  condLabel: { fontSize: 9, color: T.textLight, fontWeight: '600', marginBottom: 2 },
  condVal: { fontSize: 13, fontWeight: '800', color: T.green6 },

  tipsText: { fontSize: 12, color: T.warnText, lineHeight: 20, fontWeight: '600', marginTop: 6 },

  // Full prediction timeline
  ftRow: { flexDirection: 'row', gap: 10 },
  ftLeft: { alignItems: 'center', width: 16 },
  ftDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.green2 },
  ftDotDone: { backgroundColor: T.green5 },
  ftDotCur: { backgroundColor: T.green4, shadowColor: T.green5, shadowRadius: 3, shadowOpacity: 0.5, elevation: 3 },
  ftLine: { width: 1.5, flex: 1, backgroundColor: T.green2, marginVertical: 2 },
  ftLineDone: { backgroundColor: T.green5 },
  ftBody: { flex: 1, paddingBottom: 14 },
  ftStage: { fontSize: 13, fontWeight: '700', color: T.text },
  ftDate: { fontSize: 11, color: T.textLight, marginTop: 1 },
  ftDesc: { fontSize: 11, color: T.textMid, marginTop: 2, lineHeight: 16 },

  // Irrigation schedule
  irrigRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  irrigLabel: { fontSize: 13, fontWeight: '700', color: T.text },
  irrigAmt: { fontSize: 12, color: T.textMid },

  // Field info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: T.textLight },
  infoVal: { fontSize: 12, fontWeight: '700', color: T.text, maxWidth: '60%', textAlign: 'right' },

  // Delete button
  deleteBtn: {
    backgroundColor: T.error,
    borderColor: T.errBorder,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteBtnText: { color: T.errText, fontWeight: '800', fontSize: 13 },

  muted: { fontSize: 12, color: T.textLight },
});