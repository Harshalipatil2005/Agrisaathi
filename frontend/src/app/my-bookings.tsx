import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  indigo:     '#3d4f8a',
  indigoLight:'#eef1fb',
  indigoBorder:'#c8d0ef',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#b45309',
  confirmed: '#4a7c59',
  completed: '#3d4f8a',
  cancelled: '#c0392b',
};
const STATUS_BG: Record<string, string> = {
  pending:   '#fef3c7',
  confirmed: '#e8f5ec',
  completed: '#eef1fb',
  cancelled: '#fdf0f0',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  equipment_id: string;
  seller_id: string;
  booking_type: 'rent' | 'purchase';
  start_date: string;
  end_date: string | null;
  quantity: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  created_at: string;
  equipment?: { name: string; category: string; type: string; image_url: string | null };
  sellers?: { name: string; phone: string; address: string };
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function MyBookings() {
  const [bookings, setBookings]     = useState<Booking[]>([]);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  useFocusEffect(useCallback(() => { fetchBookings(); }, []));

  const getAuthHeader = async (): Promise<HeadersInit> => {
    const token = await AsyncStorage.getItem('supabase_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`${API}/bookings/user/me`, { headers });
      if (!res.ok) throw new Error('Unauthorised');
      setBookings(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
    setRefreshing(false);
  };

  const handleCancel = async (bookingId: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API}/bookings/${bookingId}/cancel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(await getAuthHeader()) } as HeadersInit,
            });
            if (!res.ok) throw new Error(await res.text());
            fetchBookings(true);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to cancel booking');
          }
        },
      },
    ]);
  };

  const filtered = activeFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === activeFilter);

  const renderBooking = ({ item }: { item: Booking }) => (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.cardTopLeft}>
          <View style={[
            s.typePill,
            { backgroundColor: item.booking_type === 'rent' ? '#e0f2fe' : C.sageLight },
          ]}>
            <Text style={[
              s.typePillText,
              { color: item.booking_type === 'rent' ? '#1e5f82' : C.sageDark },
            ]}>
              {item.booking_type === 'rent' ? 'Rental' : 'Purchase'}
            </Text>
          </View>
          {item.equipment && (
            <Text style={s.equipName}>{item.equipment.name}</Text>
          )}
        </View>
        <View style={[
          s.statusBadge,
          { backgroundColor: STATUS_BG[item.status] ?? C.parchment },
        ]}>
          <Text style={[s.statusText, { color: STATUS_COLOR[item.status] ?? C.inkMid }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={s.detailsBlock}>
        {item.sellers && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>Seller</Text>
            <Text style={s.detailValue}>{item.sellers.name}</Text>
          </View>
        )}
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>From</Text>
          <Text style={s.detailValue}>{new Date(item.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
        </View>
        {item.end_date && (
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>To</Text>
            <Text style={s.detailValue}>{new Date(item.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
          </View>
        )}
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Qty</Text>
          <Text style={s.detailValue}>{item.quantity}</Text>
        </View>
        <View style={[s.detailRow, s.totalRow]}>
          <Text style={s.totalLabel}>Total</Text>
          <Text style={s.totalValue}>₹{item.total_price.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      <View style={s.actionsRow}>
        {item.sellers && (
          <TouchableOpacity
            style={s.msgBtn}
            onPress={() => router.push({
              pathname: '/chat/[seller_id]',
              params: { seller_id: item.seller_id, seller_name: item.sellers!.name },
            } as any)}
            activeOpacity={0.8}
          >
            <Text style={s.msgBtnText}>Message Seller</Text>
          </TouchableOpacity>
        )}
        {item.status === 'pending' && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => handleCancel(item.id)}
            activeOpacity={0.8}
          >
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        {item.status === 'completed' && item.booking_type === 'purchase' && item.equipment_id && (
          <TouchableOpacity
            style={s.trackBtn}
            onPress={() => router.push({
              pathname: '/supply-chain',
              params: { equipment_id: item.equipment_id },
            } as any)}
            activeOpacity={0.8}
          >
            <Text style={s.trackBtnText}>Track Journey</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerBadge}>
          <View style={s.headerBadgeDot} />
          <Text style={s.headerBadgeText}>ORDER HISTORY</Text>
        </View>
        <Text style={s.headerTitle}>My Bookings</Text>
        <Text style={s.headerSub}>Track and manage your equipment orders</Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[s.filterPill, activeFilter === f && s.filterPillActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[s.filterText, activeFilter === f && s.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={C.sage} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderBooking}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchBookings(); }}
              tintColor={C.sage}
            />
          }
          ListEmptyComponent={
            <View style={s.emptyContainer}>
              <View style={s.emptyIconBox}>
                <View style={s.emptyIconInner} />
              </View>
              <Text style={s.emptyTitle}>No bookings found</Text>
              <TouchableOpacity onPress={() => router.push('/equipment' as any)} activeOpacity={0.8}>
                <Text style={s.browseLink}>Browse Marketplace  →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  header: {
    backgroundColor: C.white,
    paddingTop: 52, paddingBottom: 18, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  headerBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.strawMid },
  headerBadgeText: { fontSize: 9, fontWeight: '700', color: C.strawDark, letterSpacing: 0.8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.sageDark, marginBottom: 3 },
  headerSub: { fontSize: 12, color: C.inkSoft },

  filterScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  filterRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 7 },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100,
    backgroundColor: C.parchment, borderWidth: 1.5, borderColor: 'transparent',
  },
  filterPillActive: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  filterText: { fontSize: 12, color: C.inkMid, fontWeight: '600' },
  filterTextActive: { color: C.sageDark },

  listContent: { padding: 14, gap: 12 },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', padding: 14, paddingBottom: 0,
  },
  cardTopLeft: { flex: 1 },
  typePill: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 100, marginBottom: 6,
  },
  typePillText: { fontSize: 10, fontWeight: '700' },
  equipName: { fontSize: 15, fontWeight: '800', color: C.ink },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginLeft: 8 },
  statusText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },

  detailsBlock: {
    margin: 14, marginTop: 12,
    backgroundColor: C.cream, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.border, gap: 6,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: 12, color: C.inkSoft },
  detailValue: { fontSize: 12, color: C.ink, fontWeight: '500' },
  totalRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.sageMid },
  totalLabel: { fontSize: 13, fontWeight: '700', color: C.ink },
  totalValue: { fontSize: 15, fontWeight: '800', color: C.sageDark },

  actionsRow: {
    flexDirection: 'row', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: 14, paddingBottom: 14,
  },
  msgBtn: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.indigoLight, borderWidth: 1.5, borderColor: C.indigoBorder,
  },
  msgBtnText: { fontSize: 12, color: C.indigo, fontWeight: '600' },
  cancelBtn: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.redLight, borderWidth: 1.5, borderColor: C.redBorder,
  },
  cancelBtnText: { fontSize: 12, color: C.red, fontWeight: '600' },
  trackBtn: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.sageLight, borderWidth: 1.5, borderColor: C.sageMid,
  },
  trackBtnText: { fontSize: 12, color: C.sageDark, fontWeight: '600' },

  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.sageLight, borderWidth: 2, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyIconInner: { width: 24, height: 24, borderRadius: 4, backgroundColor: C.sageMid },
  emptyTitle: { fontSize: 16, color: C.inkMid, marginBottom: 12, fontWeight: '600' },
  browseLink: { fontSize: 13, color: C.sage, fontWeight: '700' },
});