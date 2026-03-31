import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useLanguageChange } from '../../hooks/useLanguageChange';
import SellModal from '../../components/SellModal';
import NotificationPanel from '../../components/NotificationPanel';
import WeatherSection from '../../components/WeatherForecast';
import PrecisionFarmingSection from '../../components/PrecisionFarmingSection';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'HI' },
  { code: 'mr', label: 'MR' },
];

const theme = {
  bg: '#f4faf0',
  white: '#ffffff',
  green1: '#d4edda',
  green2: '#b8dfc4',
  green3: '#8fca9f',
  green4: '#6ab583',
  green5: '#4a9962',
  green6: '#2e7d45',
  text: '#1e3a28',
  textMid: '#3d6b4f',
  textLight: '#6a9e7a',
  pastelYellow: '#fef9e7',
  pastelBlue: '#e8f4fd',
  shadow: 'rgba(74,153,98,0.13)',
};

export default function UserHome() {
  const { user, logout } = useAuth();
  const { t, changeLanguage, language } = useLanguageChange();
  const [activeCat, setActiveCat] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [nearby, setNearby] = useState(false);
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);

  // ── Language cycling ─────────────────────────────────────────
  const cycleLanguage = async () => {
    const currentIndex = LANGUAGES.findIndex(l => l.code === language);
    const nextIndex = (currentIndex + 1) % LANGUAGES.length;
    await changeLanguage(LANGUAGES[nextIndex].code);
  };

  // ── All data arrays INSIDE the component so t() is reactive ──

  const advisoryFeatures = [
    { icon: '🌿', name: t('Crop Disease'),       desc: t('AI-powered early detection using image analysis.') },
    { icon: '🧪', name: t('Soil Lab Analysis'),  desc: t('Upload soil reports and get instant recommendations.') },
    { icon: '💡', name: t('Farm Advice'),        desc: t('Personalised advice based on your land & crop.') },
    { icon: '♻️', name: t('Bio Gas Calculator'), desc: t('Estimate biogas production from organic waste.') },
    { icon: '📈', name: t('Market Trends'),      desc: t('Real-time market prices for commodities.') },
  ];

  const categories = [
    { icon: '🥦', label: t('Veggies & Fruits') },
    { icon: '🧴', label: t('Fertilizers') },
    { icon: '🚜', label: t('Equipment') },
    { icon: '🔧', label: t('Services') },
  ];

  const listings = [
    { icon: '🥕', name: t('Fresh Carrots'),   price: '₹40/kg',    tag: t('Veggies & Fruits') },
    { icon: '🧴', name: t('NPK Fertilizer'),  price: '₹320/bag',  tag: t('Fertilizers') },
    { icon: '🚜', name: t('Mini Tractor'),     price: '₹1,20,000', tag: t('Equipment') },
    { icon: '🍅', name: t('Organic Tomatoes'), price: '₹55/kg',    tag: t('Veggies & Fruits') },
    { icon: '💊', name: t('Urea 50kg Bag'),    price: '₹290/bag',  tag: t('Fertilizers') },
    { icon: '🔧', name: t('Irrigation Setup'), price: '₹8,500',    tag: t('Services') },
  ];

  const govSchemes = [
    { name: t('PM-KISAN Samman Nidhi'),     desc: t('₹6000/year direct income support.'),                   badge: t('Active') },
    { name: t('Pradhan Mantri Fasal Bima'), desc: t('Crop insurance scheme for natural calamities.'),        badge: t('Enrollment Open') },
    { name: t('Kisan Credit Card'),         desc: t('Short-term credit at subsidised rates.'),               badge: t('Apply Now') },
  ];

  const bankOffers = [
    { name: t('SBI Agri Gold Loan'),      desc: t('Loans up to ₹50L at 7.5% p.a. with easy EMI.'),         badge: '7.5% p.a.' },
    { name: t('NABARD Crop Loan'),         desc: t('Seasonal crop loans with flexible repayment.'),          badge: t('Low Interest') },
    { name: t('Bank of Maharashtra KCC'), desc: t('Kisan Credit Card with revolving credit limit.'),        badge: t('Zero Fee') },
  ];

  const filteredListings = listings.filter(l => activeCat ? l.tag === activeCat : true);

  return (
    <View style={styles.root}>
      {/* ── TOPBAR ── */}
      <View style={styles.topbar}>
        <Text style={styles.logo}>
          Agri<Text style={styles.logoSpan}>Saathi</Text> 🌾
        </Text>
        <View style={styles.topbarRight}>
          <TouchableOpacity style={styles.topbarBtn} onPress={cycleLanguage}>
            <Text style={styles.topbarBtnText}>
              {LANGUAGES.find(l => l.code === language)?.label ?? 'EN'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.topbarBtn} onPress={() => setNotifVisible(true)}>
            <Text style={styles.topbarBtnText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.topbarBtn, { backgroundColor: theme.green4 }]}
            onPress={() => setSellModalVisible(true)}
          >
            <Text style={[styles.topbarBtnText, { color: '#fff' }]}>+ {t('Sell')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>

        {/* ── WEATHER ── */}
        <WeatherSection />

        {/* ── ADVISORY SYSTEM ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌿 {t('Advisory System')}</Text>
          <View style={styles.advisoryGrid}>
            {advisoryFeatures.map((f, i) => (
              <TouchableOpacity
                key={i}
                style={styles.advisoryCard}
                onPress={() => {
                  if (i === 0) router.push('/crop-health' as any);
                  else if (i === 1) router.push('/soil-lab' as any);
                  else if (i === 2) router.push('/chat' as any);
                  else if (i === 3) router.push('/biogas' as any);
                  else if (i === 4) router.push('/market-trends' as any);
                }}
              >
                <View style={styles.advisoryImg}>
                  <Text style={{ fontSize: 32 }}>{f.icon}</Text>
                </View>
                <Text style={styles.advisoryName}>{f.name}</Text>
                <Text style={styles.advisoryDesc}>{f.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── PRECISION FARMING ── */}
        <PrecisionFarmingSection />

        {/* ── MARKETPLACE ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 {t('Agri Marketplace')}</Text>

          <View style={styles.searchBar}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder={t('Search vegetables, fertilizers...')}
              placeholderTextColor="#aaa"
            />
          </View>

          <View style={styles.catGrid}>
            {categories.map((c, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.catCard,
                  activeCat === c.label ? { backgroundColor: theme.green2, borderColor: theme.green4 } : {},
                ]}
                onPress={() => setActiveCat(activeCat === c.label ? null : c.label)}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={styles.catLabel}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.filterBar}>
            {[
              { key: 'all',        label: t('All') },
              { key: 'price-low',  label: t('Price: Low') },
              { key: 'price-high', label: t('Price: High') },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, activeFilter === f.key ? styles.filterBtnActive : {}]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[
                  styles.filterBtnText,
                  { color: activeFilter === f.key ? '#fff' : theme.green6 },
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.toggle} onPress={() => setNearby(!nearby)}>
              <Text style={styles.toggleLabel}>📍 {t('Nearby')}</Text>
              <View style={[styles.toggleSwitch, { backgroundColor: nearby ? theme.green4 : theme.green2 }]}>
                <View style={[styles.toggleThumb, { left: nearby ? 16 : 2 }]} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.listingGrid}>
            {filteredListings.map((l, i) => (
              <TouchableOpacity
                key={i}
                style={styles.listingCard}
                onPress={() => {
                  const priceStr = l.price.split('/')[0].replace('₹', '').trim();
                  router.push({
                    pathname: '/product-booking',
                    params: {
                      productId: i.toString(),
                      productName: l.name,
                      productPrice: priceStr,
                      productIcon: l.icon,
                      productTag: l.tag,
                    },
                  } as any);
                }}
              >
                <View style={styles.listingImg}>
                  <Text style={{ fontSize: 32 }}>{l.icon}</Text>
                </View>
                <View style={styles.listingBody}>
                  <Text style={styles.listingTag}>{l.tag}</Text>
                  <Text style={styles.listingName}>{l.name}</Text>
                  <Text style={styles.listingPrice}>{l.price}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── GOVT SCHEMES & BANK OFFERS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏛️ {t('Government Schemes & Bank Offers')}</Text>

          <View style={styles.schemesCol}>
            <Text style={styles.schemesColTitle}>🇮🇳 {t('Government Schemes')}</Text>
            {govSchemes.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.schemeCard}
                onPress={() => router.push('/schemes' as any)}
              >
                <Text style={styles.schemeName}>{s.name}</Text>
                <Text style={styles.schemeDesc}>{s.desc}</Text>
                <View style={[styles.schemeBadge, { marginTop: 8 }]}>
                  <Text style={styles.schemeBadgeText}>{s.badge}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.schemesCol, { marginTop: 16 }]}>
            <Text style={styles.schemesColTitle}>🏦 {t('Bank Offers')}</Text>
            {bankOffers.map((b, i) => (
              <TouchableOpacity
                key={i}
                style={styles.schemeCard}
                onPress={() => router.push('/schemes' as any)}
              >
                <Text style={styles.schemeName}>{b.name}</Text>
                <Text style={styles.schemeDesc}>{b.desc}</Text>
                <View style={[styles.schemeBadge, { backgroundColor: theme.pastelYellow, marginTop: 8 }]}>
                  <Text style={[styles.schemeBadgeText, { color: '#b8860b' }]}>{b.badge}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── MAP ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗺️ {t('Geographic Farm Map')}</Text>
          <TouchableOpacity style={styles.mapBox} onPress={() => router.push('/map' as any)}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapText}>{t('Interactive Geographical Map')}</Text>
            <Text style={styles.mapSub}>{t('Your fields, nearby mandis & weather layers')}</Text>
            <View style={styles.mapPins}>
              <View style={styles.mapPin}><Text>📍 {t('Your Farm')}</Text></View>
              <View style={styles.mapPin}><Text>🏪 {t('Nashik Mandi')}</Text></View>
              <View style={styles.mapPin}><Text>🌱 {t('Soil: Black')}</Text></View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── MORE FEATURES ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚀 {t('More Features')}</Text>
          <View style={styles.moreGrid}>
            <TouchableOpacity style={styles.moreCard} onPress={() => router.push('/supply-chain' as any)}>
              <Text style={styles.moreIcon}>🔗</Text>
              <Text style={styles.moreText}>{t('Supply Chain')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>🌾 AgriSaathi · {t('Built for Farmers')} · {t('All rights reserved')}</Text>
          <View style={styles.footerBtns}>
            <TouchableOpacity onPress={() => router.push('/settings' as any)}>
              <Text style={styles.footerLink}>{t('About')}</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.footerLink}>{t('Contact')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout}>
              <Text style={[styles.footerLink, { color: '#e05050' }]}>{t('Logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── FLOATING CHATBOT BUTTON ── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/chat' as any)}>
        <Text style={styles.fabText}>🤖</Text>
      </TouchableOpacity>

      <SellModal visible={sellModalVisible} onClose={() => setSellModalVisible(false)} />
      <NotificationPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  scrollView: { flex: 1 },

  topbar: {
    backgroundColor: 'rgba(244,250,240,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1.5,
    borderBottomColor: theme.green2,
  },
  logo: { fontWeight: '900', fontSize: 20, color: theme.green6, flex: 1 },
  logoSpan: { color: theme.green4 },
  topbarRight: { flexDirection: 'row', gap: 8 },
  topbarBtn: { backgroundColor: theme.green1, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
  topbarBtnText: { color: theme.green6, fontWeight: '700', fontSize: 12 },

  section: { paddingHorizontal: 16, paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: theme.green6, marginBottom: 12 },

  advisoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  advisoryCard: {
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green1,
    borderRadius: 14,
    padding: 12,
    flex: 1,
    minWidth: 160,
    elevation: 2,
  },
  advisoryImg: {
    width: '100%',
    height: 80,
    backgroundColor: theme.green1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  advisoryName: { fontWeight: '800', fontSize: 12, color: theme.text, marginBottom: 4 },
  advisoryDesc: { fontSize: 11, color: theme.textLight, lineHeight: 16 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 12,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.text, padding: 0 },

  catGrid: { flexDirection: 'row', gap: 10, marginBottom: 12, flexWrap: 'wrap' },
  catCard: {
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    gap: 6,
    elevation: 2,
  },
  catIcon: { fontSize: 24 },
  catLabel: { fontSize: 11, fontWeight: '700', color: theme.textMid, textAlign: 'center' },

  filterBar: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' },
  filterBtn: {
    backgroundColor: theme.green1,
    borderWidth: 1.5,
    borderColor: theme.green2,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  filterBtnActive: { backgroundColor: theme.green4, borderColor: theme.green4 },
  filterBtnText: { fontSize: 12, fontWeight: '700' },

  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green2,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleLabel: { fontSize: 12, fontWeight: '700', color: theme.textMid },
  toggleSwitch: { width: 30, height: 16, borderRadius: 8, position: 'relative' },
  toggleThumb: { position: 'absolute', top: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', elevation: 2 },

  listingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  listingCard: {
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green1,
    borderRadius: 14,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
    elevation: 2,
  },
  listingImg: { width: '100%', height: 80, backgroundColor: theme.green1, alignItems: 'center', justifyContent: 'center' },
  listingBody: { padding: 10 },
  listingTag: {
    backgroundColor: theme.green1,
    color: theme.green5,
    fontSize: 9,
    fontWeight: '700',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  listingName: { fontWeight: '700', fontSize: 12, color: theme.text, marginBottom: 3 },
  listingPrice: { fontSize: 13, fontWeight: '800', color: theme.green6 },

  schemesCol: { gap: 8 },
  schemesColTitle: { fontWeight: '800', fontSize: 14, color: theme.green6, marginBottom: 8 },
  schemeCard: {
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    elevation: 1,
  },
  schemeName: { fontWeight: '700', fontSize: 12, color: theme.text, marginBottom: 2 },
  schemeDesc: { fontSize: 11, color: theme.textLight, marginBottom: 6 },
  schemeBadge: { backgroundColor: '#e8f4fd', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 6, alignSelf: 'flex-start' },
  schemeBadgeText: { fontSize: 10, fontWeight: '700', color: '#3a7fc1' },

  mapBox: {
    backgroundColor: theme.green1,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: theme.green2,
    elevation: 3,
  },
  mapIcon: { fontSize: 42, marginBottom: 12 },
  mapText: { fontWeight: '700', color: theme.green6, fontSize: 14, marginBottom: 4 },
  mapSub: { fontSize: 11, color: theme.textLight, marginBottom: 12 },
  mapPins: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  mapPin: { backgroundColor: 'rgba(255,255,255,0.75)', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },

  moreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moreCard: {
    backgroundColor: theme.white,
    borderWidth: 1.5,
    borderColor: theme.green1,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    gap: 8,
    elevation: 2,
  },
  moreIcon: { fontSize: 28 },
  moreText: { fontSize: 12, fontWeight: '700', color: theme.textMid, textAlign: 'center' },

  footer: {
    backgroundColor: theme.green6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  footerText: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  footerBtns: { flexDirection: 'row', gap: 12 },
  footerLink: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' },

  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.green5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { fontSize: 24 },
});