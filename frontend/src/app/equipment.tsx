import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, FlatList,
  ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
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
  amber:      '#b45309',
  amberLight: '#fef3c7',
  indigo:     '#3d4f8a',
  indigoLight:'#eef1fb',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type Equipment = {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  category: string;
  type: 'rent' | 'sell';
  price: number;
  quantity?: number;
  unit?: string;
  image_url?: string;
  available: boolean;
  sellers?: {
    name: string;
    phone: string;
    address: string;
    latitude?: number;
    longitude?: number;
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TOP_TABS    = ['Available', 'Booked'] as const;
type TopTab       = typeof TOP_TABS[number];
const SECTION_TABS = ['Equipment', 'Products'] as const;
type SectionTab   = typeof SECTION_TABS[number];

const EQUIPMENT_TYPE_FILTERS = [
  { label: 'All',    value: 'all' },
  { label: 'Rental', value: 'rent' },
  { label: 'Buy',    value: 'sell' },
];

const EQUIPMENT_CATEGORIES = [
  { label: 'All',       value: 'all' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Manpower',  value: 'manpower' },
  { label: 'Tools',     value: 'tools' },
];

const PRODUCT_CATEGORIES = [
  { label: 'All',         value: 'all' },
  { label: 'Fruits',      value: 'fruit' },
  { label: 'Vegetables',  value: 'vegetable' },
  { label: 'Fertilizers', value: 'fertilizer' },
  { label: 'Farming',     value: 'farming' },
];

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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function EquipmentScreen() {
  const [topTab, setTopTab]         = useState<TopTab>('Available');
  const [sectionTab, setSectionTab] = useState<SectionTab>('Equipment');
  const [typeFilter, setTypeFilter] = useState('all');
  const [category, setCategory]     = useState('all');
  const [search, setSearch]         = useState('');
  const [items, setItems]           = useState<Equipment[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleSectionChange = (s: SectionTab) => {
    setSectionTab(s);
    setCategory('all');
    setTypeFilter('all');
  };

  const fetchEquipment = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const sectionParam = sectionTab === 'Equipment' ? 'equipment' : 'products';
      params.set('section', sectionParam);
      if (category !== 'all') { params.delete('section'); params.set('category', category); }
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search.trim()) params.set('search', search.trim());
      const res  = await fetch(`${API}/equipment/?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Error', 'Could not load listings');
    }
    setLoading(false);
  }, [sectionTab, category, typeFilter, search]);

  const fetchMyBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AsyncStorage.getItem('user_bookings');
      const bookings = data ? JSON.parse(data) : [];
      setMyBookings(Array.isArray(bookings) ? bookings : []);
    } catch { setMyBookings([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (topTab === 'Available') fetchEquipment();
    else fetchMyBookings();
  }, [topTab, fetchEquipment, fetchMyBookings]);

  useEffect(() => { if (topTab === 'Booked') fetchMyBookings(); }, [topTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (topTab === 'Available') await fetchEquipment();
    else await fetchMyBookings();
    setRefreshing(false);
  };

  useEffect(() => { if (topTab === 'Available') fetchEquipment(); }, [sectionTab, category, typeFilter, search]);

  const categories = sectionTab === 'Equipment' ? EQUIPMENT_CATEGORIES : PRODUCT_CATEGORIES;

  return (
    <View style={s.screen}>

      {/* Top tab bar */}
      <View style={s.topTabBar}>
        {TOP_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.topTab, topTab === tab && s.topTabActive]}
            onPress={() => setTopTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[s.topTabText, topTab === tab && s.topTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {topTab === 'Booked' ? (
        <BookingsTab
          bookings={myBookings} loading={loading}
          onRefresh={onRefresh} refreshing={refreshing}
        />
      ) : (
        <ScrollView
          style={s.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />}
          keyboardShouldPersistTaps="handled"
          stickyHeaderIndices={[0]}
          showsVerticalScrollIndicator={false}
        >
          {/* Sticky header */}
          <View style={s.stickyHeader}>
            {/* Search */}
            <View style={s.searchRow}>
              <TextInput
                style={s.searchInput}
                placeholder="Search equipment or products…"
                placeholderTextColor={C.inkSoft}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
                  <Text style={s.clearBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Section tabs */}
            <View style={s.sectionTabRow}>
              {SECTION_TABS.map(sec => (
                <TouchableOpacity
                  key={sec}
                  style={[s.sectionTab, sectionTab === sec && s.sectionTabActive]}
                  onPress={() => handleSectionChange(sec)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.sectionTabText, sectionTab === sec && s.sectionTabTextActive]}>
                    {sec === 'Equipment' ? 'Equipment' : 'Products'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Type filter (Equipment only) */}
            {sectionTab === 'Equipment' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
                {EQUIPMENT_TYPE_FILTERS.map(f => (
                  <TouchableOpacity
                    key={f.value}
                    style={[s.filterChip, typeFilter === f.value && s.filterChipActive]}
                    onPress={() => setTypeFilter(f.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.filterChipText, typeFilter === f.value && s.filterChipTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Category chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[s.categoryChip, category === cat.value && s.categoryChipActive]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.categoryChipText, category === cat.value && s.categoryChipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={C.sage} style={{ marginTop: 60 }} />
          ) : items.length === 0 ? (
            <EmptyState section={sectionTab} />
          ) : (
            <View style={s.listContainer}>
              {items.map(item => <EquipmentCard key={item.id} item={item} />)}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Equipment Card ───────────────────────────────────────────────────────────

function EquipmentCard({ item }: { item: Equipment }) {
  const isRent = item.type === 'rent';

  const handleChat = () => {
    router.push({
      pathname: '/chat/[seller_id]',
      params: { seller_id: item.seller_id, equipment_id: item.id },
    } as any);
  };

  return (
    <TouchableOpacity
      style={s.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/equipment-detail/${item.id}` as any)}
    >
      {/* Thumb */}
      <View style={s.cardThumb}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={s.cardImage} resizeMode="cover" />
        ) : (
          <View style={s.cardThumbPlaceholder}>
            <Text style={s.cardThumbLetter}>{item.name[0]?.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.cardBody}>
        <View style={s.cardTopRow}>
          <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={[s.typePill, isRent ? s.rentPill : s.buyPill]}>
            <Text style={[s.typePillText, { color: isRent ? C.skyDark : C.sageDark }]}>
              {isRent ? 'Rent' : 'Buy'}
            </Text>
          </View>
        </View>

        <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>

        {item.sellers?.address ? (
          <Text style={s.cardLocation} numberOfLines={1}>{item.sellers.address}</Text>
        ) : null}

        <View style={s.cardFooter}>
          <Text style={s.cardPrice}>
            ₹{item.price.toLocaleString('en-IN')}
            {item.unit ? `/${item.unit}` : isRent ? '/day' : ''}
          </Text>
          <View style={s.cardActions}>
            <TouchableOpacity
              style={s.bookBtn}
              onPress={() => router.push(`/equipment-detail/${item.id}` as any)}
              activeOpacity={0.85}
            >
              <Text style={s.bookBtnText}>Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.chatBtn} onPress={handleChat} activeOpacity={0.8}>
              <Text style={s.chatBtnText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Bookings Tab ─────────────────────────────────────────────────────────────

function BookingsTab({
  bookings, loading, onRefresh, refreshing,
}: { bookings: any[]; loading: boolean; onRefresh: () => void; refreshing: boolean }) {
  if (loading) return <ActivityIndicator size="large" color={C.sage} style={{ marginTop: 60 }} />;

  if (bookings.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={s.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />}
      >
        <Text style={s.emptyTitle}>No bookings yet</Text>
        <Text style={s.emptyDesc}>Your orders and rentals will appear here.</Text>
      </ScrollView>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={b => b.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.sage} />}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item: b }) => (
        <View style={s.bookingCard}>
          <View style={s.bookingHeader}>
            <Text style={s.bookingName} numberOfLines={1}>
              {b.equipment_name ?? b.equipment?.name ?? 'Equipment'}
            </Text>
            <View style={[
              s.statusPill,
              { backgroundColor: STATUS_BG[b.status] ?? C.parchment },
            ]}>
              <Text style={[s.statusPillText, { color: STATUS_COLOR[b.status] ?? C.inkMid }]}>
                {b.status}
              </Text>
            </View>
          </View>
          <Text style={s.bookingMeta}>
            {b.booking_type === 'rent' ? 'Rental' : 'Purchase'}  ·  Qty: {b.quantity}
          </Text>
          <Text style={s.bookingMeta}>
            {b.start_date}{b.end_date ? ` → ${b.end_date}` : ''}
          </Text>
          <Text style={s.bookingPrice}>₹{Number(b.total_price).toLocaleString('en-IN')}</Text>
        </View>
      )}
    />
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ section }: { section: SectionTab }) {
  return (
    <View style={s.emptyContainer}>
      <View style={s.emptyIconBox}>
        <Text style={s.emptyIconText}>{section[0]}</Text>
      </View>
      <Text style={s.emptyTitle}>No {section.toLowerCase()} found</Text>
      <Text style={s.emptyDesc}>Try adjusting your filters or search term.</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cream },

  topTabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  topTab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomWidth: 2.5, borderBottomColor: 'transparent',
  },
  topTabActive: { borderBottomColor: C.sage },
  topTabText: { fontSize: 14, fontWeight: '500', color: C.inkSoft },
  topTabTextActive: { color: C.sageDark, fontWeight: '700' },

  container: { flex: 1 },
  stickyHeader: {
    backgroundColor: C.white, paddingTop: 12, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },

  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.cream, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.sageMid, marginHorizontal: 14, marginBottom: 10,
    paddingHorizontal: 12, height: 42,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.ink },
  clearBtn: { padding: 4 },
  clearBtnText: { fontSize: 13, color: C.inkSoft },

  sectionTabRow: {
    flexDirection: 'row', marginHorizontal: 14, marginBottom: 8,
    backgroundColor: C.parchment, borderRadius: 10, padding: 3,
  },
  sectionTab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  sectionTabActive: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  sectionTabText: { fontSize: 12, fontWeight: '500', color: C.inkSoft },
  sectionTabTextActive: { color: C.sageDark, fontWeight: '700' },

  chipRow: { paddingHorizontal: 14, marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 100,
    backgroundColor: C.parchment, marginRight: 7,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  filterChipActive: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  filterChipText: { fontSize: 12, color: C.inkMid, fontWeight: '500' },
  filterChipTextActive: { color: C.sageDark, fontWeight: '700' },

  categoryChip: {
    paddingHorizontal: 13, paddingVertical: 6, borderRadius: 100,
    backgroundColor: C.parchment, marginRight: 7,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  categoryChipActive: { backgroundColor: C.sage, borderColor: C.sage },
  categoryChipText: { fontSize: 12, color: C.inkMid, fontWeight: '500' },
  categoryChipTextActive: { color: C.white, fontWeight: '700' },

  listContainer: { padding: 14, gap: 12 },

  card: {
    backgroundColor: C.white, borderRadius: 16,
    flexDirection: 'row', overflow: 'hidden',
    borderWidth: 1, borderColor: C.border, marginBottom: 2,
  },
  cardThumb: { width: 88, backgroundColor: C.sageLight, justifyContent: 'center', alignItems: 'center' },
  cardImage: { width: 88, height: '100%' },
  cardThumbPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.sageMid, justifyContent: 'center', alignItems: 'center' },
  cardThumbLetter: { fontSize: 18, fontWeight: '800', color: C.sageDark },
  cardBody: { flex: 1, padding: 12 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink },
  typePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, marginLeft: 6 },
  rentPill: { backgroundColor: C.sky },
  buyPill:  { backgroundColor: C.sageLight },
  typePillText: { fontSize: 10, fontWeight: '700' },
  cardDesc: { fontSize: 11, color: C.inkSoft, lineHeight: 16, marginBottom: 4 },
  cardLocation: { fontSize: 10, color: C.inkSoft, marginBottom: 6 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardPrice: { fontSize: 15, fontWeight: '800', color: C.sageDark },
  cardActions: { flexDirection: 'row', gap: 7 },
  bookBtn: {
    backgroundColor: C.sage, paddingHorizontal: 11,
    paddingVertical: 7, borderRadius: 8,
  },
  bookBtnText: { color: C.white, fontSize: 11, fontWeight: '700' },
  chatBtn: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8,
    backgroundColor: C.indigoLight, borderWidth: 1, borderColor: '#c8d0ef',
  },
  chatBtnText: { color: C.indigo, fontSize: 11, fontWeight: '700' },

  bookingCard: {
    backgroundColor: C.white, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  bookingName: { flex: 1, fontSize: 14, fontWeight: '700', color: C.ink },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  statusPillText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  bookingMeta: { fontSize: 12, color: C.inkSoft, marginBottom: 3 },
  bookingPrice: { fontSize: 16, fontWeight: '800', color: C.sageDark, marginTop: 6 },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIconBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.sageLight, borderWidth: 2, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyIconText: { fontSize: 24, fontWeight: '800', color: C.sage },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 },
  emptyDesc: { fontSize: 13, color: C.inkSoft, textAlign: 'center', paddingHorizontal: 40 },
});