import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

// ─── Design Tokens (matching Biogas UI) ──────────────────────────────────────
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
  indigoLight: '#eef1fb',
  indigoBorder:'#c8d0ef',
  amber:       '#e8a020',
  amberLight:  '#fff8e6',
  red:         '#c0392b',
  redLight:    '#fdf0f0',
  redBorder:   '#f7c8c8',
  slate:       '#9aacb8',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface SupplyChainProduct {
  id: string;
  name: string;
  booking_id: string;
  booking_type: 'rent' | 'sell';
  quantity: number;
  total_price: number;
  status: 'farm' | 'transit' | 'market' | 'delivered';
  booking_status: string;
  timestamp: string;
  synced_from_booking: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY  = 'supply_chain_products';
const BOOKINGS_KEY = 'user_bookings';

const STATUS_FLOW: SupplyChainProduct['status'][] = ['farm', 'transit', 'market', 'delivered'];

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string; bg: string; border: string }> = {
  farm:      { label: 'At Farm',     icon: '🌾', color: C.sageDark,  bg: C.sageLight,  border: C.sageMid },
  transit:   { label: 'In Transit',  icon: '🚛', color: C.indigo,    bg: C.indigoLight,border: C.indigoBorder },
  market:    { label: 'At Market',   icon: '🏪', color: C.strawDark, bg: C.straw,      border: C.strawMid },
  delivered: { label: 'Delivered',   icon: '✅', color: C.sageDark,  bg: C.sageLight,  border: C.sageMid },
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.farm;
  return (
    <View style={[s.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={s.statusBadgeIcon}>{cfg.icon}</Text>
      <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function ProgressTrack({ status }: { status: string }) {
  const currentIdx = STATUS_FLOW.indexOf(status as SupplyChainProduct['status']);
  return (
    <View style={s.progressTrack}>
      {STATUS_FLOW.map((step, i) => {
        const cfg       = STATUS_CONFIG[step];
        const done      = i <= currentIdx;
        const isCurrent = i === currentIdx;
        return (
          <View key={step} style={s.progressStepWrapper}>
            {/* Connector line */}
            {i > 0 && (
              <View style={[s.progressLine, done && s.progressLineDone]} />
            )}
            <View style={[
              s.progressDot,
              done && s.progressDotDone,
              isCurrent && s.progressDotCurrent,
            ]}>
              <Text style={s.progressDotIcon}>{cfg.icon}</Text>
            </View>
            <Text style={[s.progressLabel, done && s.progressLabelDone]}>
              {cfg.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  item,
  onAdvance,
  onCancel,
}: {
  item: SupplyChainProduct;
  onAdvance: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const cfg       = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.farm;
  const currentIdx = STATUS_FLOW.indexOf(item.status);
  const isDelivered = item.status === 'delivered';
  const nextStep    = STATUS_FLOW[currentIdx + 1];
  const nextCfg     = nextStep ? STATUS_CONFIG[nextStep] : null;

  return (
    <View style={s.productCard}>
      {/* Accent bar */}
      <View style={[s.productAccent, { backgroundColor: cfg.color }]} />

      {/* Header */}
      <View style={s.productHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.productName}>{item.name}</Text>
          <Text style={s.productMeta}>
            {item.booking_type === 'rent' ? '🔄 Rental' : '🛒 Purchase'}  ·  Qty: {item.quantity}
          </Text>
        </View>
        <View style={s.productHeaderRight}>
          <StatusBadge status={item.status} />
          <TouchableOpacity style={s.cancelBtn} onPress={() => onCancel(item.id)}>
            <Text style={s.cancelBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress tracker */}
      <ProgressTrack status={item.status} />

      {/* Footer */}
      <View style={s.productFooter}>
        <Text style={s.productPrice}>₹{Number(item.total_price).toLocaleString('en-IN')}</Text>
        {!isDelivered && nextCfg && (
          <TouchableOpacity
            style={[s.advanceBtn, { backgroundColor: cfg.color }]}
            onPress={() => onAdvance(item.id)}
            activeOpacity={0.8}
          >
            <Text style={s.advanceBtnText}>
              Mark as {nextCfg.icon} {nextCfg.label}
            </Text>
          </TouchableOpacity>
        )}
        {isDelivered && (
          <View style={s.deliveredBadge}>
            <Text style={s.deliveredBadgeText}>✓ Completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SupplyChainScreen() {
  const [products, setProducts]     = useState<SupplyChainProduct[]>([]);
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTab, setSelectedTab] = useState<'active' | 'history'>('active');

  useFocusEffect(
    useCallback(() => {
      loadAndSyncProducts();
      loadPendingBookings();
    }, [])
  );

  const loadPendingBookings = async () => {
    try {
      const bookingsStr = await AsyncStorage.getItem('user_bookings');
      const bookings = bookingsStr ? JSON.parse(bookingsStr) : [];
      setPendingBookings(bookings.filter((b: any) => b.status === 'pending'));
    } catch (err) {
      console.error('Error loading pending bookings:', err);
    }
  };

  const syncBookingToTracking = async (booking: any) => {
    try {
      const product: SupplyChainProduct = {
        id: booking.id,
        name: booking.productName,
        booking_id: booking.id,
        booking_type: 'rent',
        quantity: booking.quantity,
        total_price: booking.totalPrice,
        status: 'farm',
        booking_status: 'confirmed',
        timestamp: booking.bookingDate,
        synced_from_booking: true,
      };

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [...existing, product];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Update booking status
      const bookingsStr = await AsyncStorage.getItem('user_bookings');
      const bookings = bookingsStr ? JSON.parse(bookingsStr) : [];
      const updatedBookings = bookings.map((b: any) =>
        b.id === booking.id ? { ...b, status: 'confirmed' } : b
      );
      await AsyncStorage.setItem('user_bookings', JSON.stringify(updatedBookings));

      setProducts([...products, product]);
      await loadPendingBookings();
      Alert.alert('Success', 'Booking added to supply chain tracking');
    } catch (err) {
      Alert.alert('Error', 'Failed to sync booking');
    }
  };

  const loadAndSyncProducts = async () => {
    try {
      setLoading(true);
      const stored       = await AsyncStorage.getItem(STORAGE_KEY);
      const bookingsData = await AsyncStorage.getItem(BOOKINGS_KEY);

      let existingProducts: SupplyChainProduct[] = stored ? JSON.parse(stored) : [];
      const bookings = bookingsData ? JSON.parse(bookingsData) : [];
      const activeBookings = bookings.filter((b: any) => b.status !== 'cancelled');

      const syncedProducts: SupplyChainProduct[] = activeBookings.map((booking: any) => {
        const existing = existingProducts.find(p => p.booking_id === booking.id);
        if (existing) return existing;
        return {
          id: `sc-${booking.id}`,
          name: booking.equipment_name || 'Equipment',
          booking_id: booking.id,
          booking_type: booking.booking_type,
          quantity: booking.quantity || 1,
          total_price: booking.total_price || 0,
          status: 'farm' as const,
          booking_status: booking.status,
          timestamp: new Date().toISOString(),
          synced_from_booking: true,
        };
      });

      const finalProducts = syncedProducts.filter(p =>
        activeBookings.some((b: any) => b.id === p.booking_id)
      );

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalProducts));
      setProducts(finalProducts);
    } catch (err) {
      console.error('Error loading/syncing products:', err);
      Alert.alert('Error', 'Failed to load supply chain data');
    } finally {
      setLoading(false);
    }
  };

  const saveProducts = async (updated: SupplyChainProduct[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setProducts(updated);
  };

  const advanceStatus = async (id: string) => {
    const product    = products.find(p => p.id === id);
    if (!product) return;
    const currentIdx = STATUS_FLOW.indexOf(product.status);
    if (currentIdx < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIdx + 1];
      const updated    = products.map(p => p.id === id ? { ...p, status: nextStatus } : p);
      await saveProducts(updated);
    }
  };

  const cancelProduct = async (id: string) => {
    Alert.alert('Remove Product', 'Remove this item from supply chain tracking?', [
      { text: 'Cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = products.filter(p => p.id !== id);
          await saveProducts(updated);
        },
      },
    ]);
  };

  const activeProducts    = products.filter(p => p.status !== 'delivered');
  const historyProducts   = products.filter(p => p.status === 'delivered');
  const displayProducts   = selectedTab === 'active' ? activeProducts : historyProducts;

  // Stats
  const totalActive    = activeProducts.length;
  const totalDelivered = historyProducts.length;
  const totalValue     = products.reduce((sum, p) => sum + Number(p.total_price), 0);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.sage} />
        <Text style={s.loadingText}>Syncing supply chain…</Text>
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <FlatList
        data={displayProducts}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            {/* ── Hero Header ── */}
            <View style={s.hero}>
              <View style={s.heroBadge}>
                <View style={s.heroDot} />
                <Text style={s.heroBadgeText}>FARM TO MARKET</Text>
              </View>
              <Text style={s.heroTitle}>Supply Chain{'\n'}Traceability</Text>
              <Text style={s.heroSub}>Track your booked equipment & produce from farm to delivery</Text>

              {/* Stats row */}
              <View style={s.statsRow}>
                <View style={s.statBox}>
                  <Text style={s.statVal}>{totalActive}</Text>
                  <Text style={s.statLabel}>Active</Text>
                </View>
                <View style={[s.statBox, s.statBoxMid]}>
                  <Text style={[s.statVal, { color: C.sageDark }]}>
                    ₹{totalValue > 0 ? (totalValue / 1000).toFixed(0) + 'K' : '0'}
                  </Text>
                  <Text style={s.statLabel}>Total Value</Text>
                </View>
                <View style={s.statBox}>
                  <Text style={s.statVal}>{totalDelivered}</Text>
                  <Text style={s.statLabel}>Delivered</Text>
                </View>
              </View>
            </View>

            {/* ── Tab Bar ── */}
            <View style={s.tabBar}>
              {([
                { key: 'active',  label: '📦  Active', count: totalActive },
                { key: 'history', label: '✅  Delivered', count: totalDelivered },
              ] as const).map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[s.tab, selectedTab === tab.key && s.tabActive]}
                  onPress={() => setSelectedTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabText, selectedTab === tab.key && s.tabTextActive]}>
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View style={[s.tabCount, selectedTab === tab.key && s.tabCountActive]}>
                      <Text style={[s.tabCountText, selectedTab === tab.key && s.tabCountTextActive]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {displayProducts.length > 0 && (
              <SectionDivider title={selectedTab === 'active' ? '🚛  IN PROGRESS' : '✅  COMPLETED'} />
            )}

            {/* PENDING BOOKINGS SECTION */}
            {selectedTab === 'active' && pendingBookings.length > 0 && (
              <>
                <SectionDivider title="⏳  PENDING BOOKINGS" />
                <View style={s.pendingBookingsContainer}>
                  {pendingBookings.map((booking, i) => (
                    <View key={i} style={s.pendingBookingCard}>
                      <View style={s.pendingBookingHeader}>
                        <View style={s.pendingBookingIcon}>
                          <Text style={{ fontSize: 20 }}>{booking.productIcon || '📦'}</Text>
                        </View>
                        <View style={s.pendingBookingInfo}>
                          <Text style={s.pendingBookingName}>{booking.productName}</Text>
                          <Text style={s.pendingBookingDates}>
                            {booking.startDate} - {booking.endDate}
                          </Text>
                          <Text style={s.pendingBookingQty}>
                            Qty: {booking.quantity} | ₹{Number(booking.totalPrice).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={s.syncBookingBtn}
                        onPress={() => syncBookingToTracking(booking)}
                      >
                        <Text style={s.syncBookingBtnText}>Add to Tracking</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            onAdvance={advanceStatus}
            onCancel={cancelProduct}
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.emptyIconBox}>
              <Text style={s.emptyIconText}>
                {selectedTab === 'active' ? '📭' : '📋'}
              </Text>
            </View>
            <Text style={s.emptyTitle}>
              {selectedTab === 'active' ? 'No active items' : 'No deliveries yet'}
            </Text>
            <Text style={s.emptyDesc}>
              {selectedTab === 'active'
                ? 'Book equipment or produce to start tracking'
                : 'Completed deliveries will appear here'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={s.syncBtn} onPress={loadAndSyncProducts} activeOpacity={0.85}>
            <Text style={s.syncBtnText}>🔄  Sync from Bookings</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },
  listContent: { paddingBottom: 48 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream, gap: 12 },
  loadingText: { fontSize: 13, color: C.inkSoft, fontWeight: '600' },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 36, paddingBottom: 24, paddingHorizontal: 20,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.strawMid },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: C.strawDark, letterSpacing: 1 },
  heroTitle: {
    fontSize: 34, fontWeight: '900', color: C.sageDark,
    textAlign: 'center', lineHeight: 40, marginBottom: 8,
  },
  heroSub: {
    fontSize: 13, color: C.inkSoft, textAlign: 'center',
    lineHeight: 20, maxWidth: 300, marginBottom: 20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: C.sageLight,
    borderRadius: 16, borderWidth: 1.5, borderColor: C.sageMid,
    overflow: 'hidden', alignSelf: 'stretch',
  },
  statBox: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.sageMid },
  statVal: { fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '700', color: C.inkSoft, marginTop: 2, letterSpacing: 0.3 },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14,
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: C.sage },
  tabText: { fontSize: 13, fontWeight: '600', color: C.inkSoft },
  tabTextActive: { color: C.sageDark, fontWeight: '800' },
  tabCount: {
    backgroundColor: C.parchment, borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: C.border,
  },
  tabCountActive: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  tabCountText: { fontSize: 10, fontWeight: '700', color: C.inkSoft },
  tabCountTextActive: { color: C.sageDark },

  // Product card
  productCard: {
    backgroundColor: C.white, borderRadius: 16,
    marginHorizontal: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: C.sageDark, shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  productAccent: { height: 3, width: '100%' },
  productHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, paddingBottom: 10, gap: 10,
  },
  productName: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 3 },
  productMeta: { fontSize: 11, color: C.inkSoft, fontWeight: '500' },
  productHeaderRight: { alignItems: 'flex-end', gap: 8 },

  // Status badge
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1.5,
  },
  statusBadgeIcon: { fontSize: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  // Cancel button
  cancelBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.redLight, borderWidth: 1, borderColor: C.redBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  cancelBtnText: { color: C.red, fontSize: 11, fontWeight: '800' },

  // Progress track
  progressTrack: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: C.cream, borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: C.border,
  },
  progressStepWrapper: { flex: 1, alignItems: 'center', position: 'relative' },
  progressLine: {
    position: 'absolute', top: 12, right: '50%', left: '-50%',
    height: 2, backgroundColor: C.border,
  },
  progressLineDone: { backgroundColor: C.sage },
  progressDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: C.parchment, borderWidth: 1.5, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center', marginBottom: 5, zIndex: 1,
  },
  progressDotDone: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  progressDotCurrent: {
    backgroundColor: C.sageDark, borderColor: C.sageDark,
    shadowColor: C.sageDark, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  progressDotIcon: { fontSize: 13 },
  progressLabel: { fontSize: 9, color: C.inkSoft, fontWeight: '600', textAlign: 'center' },
  progressLabelDone: { color: C.sageDark, fontWeight: '800' },

  // Product footer
  productFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  productPrice: { fontSize: 18, fontWeight: '900', color: C.sageDark, letterSpacing: -0.5 },
  advanceBtn: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  advanceBtnText: { color: C.white, fontWeight: '800', fontSize: 12 },
  deliveredBadge: {
    backgroundColor: C.sageLight, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1.5, borderColor: C.sageMid,
  },
  deliveredBadgeText: { color: C.sageDark, fontWeight: '800', fontSize: 12 },

  // Empty state
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 40 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.sageLight, borderWidth: 2, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyIconText: { fontSize: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: C.inkSoft, textAlign: 'center', lineHeight: 20 },

  // Pending Bookings
  pendingBookingsContainer: { paddingHorizontal: 14, gap: 10, marginVertical: 10 },
  pendingBookingCard: {
    backgroundColor: C.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.indigoBorder,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  pendingBookingHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pendingBookingIcon: {
    width: 50,
    height: 50,
    backgroundColor: C.indigoLight,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBookingInfo: { flex: 1 },
  pendingBookingName: { fontSize: 13, fontWeight: '800', color: C.ink },
  pendingBookingDates: { fontSize: 11, color: C.inkSoft, marginTop: 2 },
  pendingBookingQty: { fontSize: 11, color: C.indigo, fontWeight: '700', marginTop: 2 },
  syncBookingBtn: {
    backgroundColor: C.indigo,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  syncBookingBtnText: { color: C.white, fontWeight: '800', fontSize: 12 },

  // Sync button
  syncBtn: {
    backgroundColor: C.sageDark, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    marginHorizontal: 14, marginTop: 12,
  },
  syncBtnText: { color: C.white, fontWeight: '800', fontSize: 14 },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginVertical: 16, marginHorizontal: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8 },
});