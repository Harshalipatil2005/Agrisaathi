import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  ActivityIndicator, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
type Equipment = {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  price: number;
  quantity?: number;
  unit?: string;
};

type Seller = {
  seller_id: string;
  name: string;
  phone: string;
  address: string;
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EquipmentDetail() {
  const { id } = useLocalSearchParams();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [seller, setSeller]       = useState<Seller | null>(null);
  const [loading, setLoading]     = useState(false);
  const [booking, setBooking]     = useState(false);
  const [bookingQuantity, setBookingQuantity] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  useEffect(() => {
    if (id) fetchEquipmentDetail();
  }, [id]);

  const fetchEquipmentDetail = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`http://localhost:8000/equipment/${id}`);
      const data = await res.json();
      setEquipment(data.equipment);
      setSeller(data.seller);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load equipment details');
    }
    setLoading(false);
  };

  const handleBooking = async () => {
    if (!equipment || !seller) return;
    const isRent = equipment.type === 'rent';
    if (!startDate || !bookingQuantity) {
      Alert.alert('Missing Fields', 'Please fill all required fields');
      return;
    }
    if (isRent && !endDate) {
      Alert.alert('Missing Fields', 'Please enter an end date for rental');
      return;
    }
    setBooking(true);
    try {
      const totalPrice = equipment.price * Number(bookingQuantity);
      const newBooking = {
        id: Date.now().toString(),
        user_id: 'current-user-id',
        equipment_id: equipment.id,
        equipment_name: equipment.name,
        equipment_category: equipment.category,
        seller_id: seller.seller_id,
        seller_name: seller.name,
        booking_type: equipment.type,
        start_date: startDate,
        end_date: endDate,
        quantity: Number(bookingQuantity),
        total_price: totalPrice,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      const existing = await AsyncStorage.getItem('user_bookings');
      const bookings = existing ? JSON.parse(existing) : [];
      bookings.push(newBooking);
      await AsyncStorage.setItem('user_bookings', JSON.stringify(bookings));
      Alert.alert('Success', `${isRent ? 'Booking' : 'Order'} placed successfully!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', 'Could not complete booking. Please try again.');
    }
    setBooking(false);
  };

  const handleContactSeller = () => {
    if (seller) {
      router.push(`/chat/${seller.seller_id}` as any);
    }
  };

  const isRent = equipment?.type === 'rent';
  const qty    = Number(bookingQuantity) || 0;
  const total  = (equipment?.price ?? 0) * qty;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.sage} />
        <Text style={s.loadingText}>Loading details…</Text>
      </View>
    );
  }

  if (!equipment || !seller) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.errorText}>Equipment not found</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

      {/* ── Hero Header ── */}
      <View style={s.hero}>
        <View style={s.heroBadge}>
          <View style={[s.heroDot, { backgroundColor: isRent ? C.skyMid : C.strawMid }]} />
          <Text style={s.heroBadgeText}>{isRent ? 'FOR RENT' : 'FOR SALE'}</Text>
        </View>
        <Text style={s.heroTitle}>{equipment.name}</Text>
        <Text style={s.heroSub}>{equipment.category}</Text>
        <View style={s.heroPriceRow}>
          <Text style={s.heroPrice}>
            ₹{equipment.price.toLocaleString('en-IN')}
          </Text>
          <Text style={s.heroPriceUnit}>
            {equipment.unit ? `per ${equipment.unit}` : isRent ? 'per day' : ''}
          </Text>
        </View>
      </View>

      {/* ── Description Card ── */}
      <View style={s.card}>
        <Text style={s.cardStep}>ABOUT</Text>
        <Text style={s.cardTitle}>Description</Text>
        <View style={s.descBox}>
          <View style={s.descAccent} />
          <Text style={s.descText}>{equipment.description}</Text>
        </View>
        <View style={s.detailGrid}>
          <View style={s.detailChip}>
            <Text style={s.detailChipLabel}>Category</Text>
            <Text style={s.detailChipVal}>{equipment.category}</Text>
          </View>
          <View style={[s.detailChip, isRent ? s.detailChipBlue : s.detailChipGreen]}>
            <Text style={s.detailChipLabel}>Type</Text>
            <Text style={[s.detailChipVal, { color: isRent ? C.skyDark : C.sageDark }]}>
              {isRent ? 'Rental' : 'Purchase'}
            </Text>
          </View>
          {equipment.quantity !== undefined && (
            <View style={s.detailChip}>
              <Text style={s.detailChipLabel}>Stock</Text>
              <Text style={s.detailChipVal}>{equipment.quantity}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Seller Card ── */}
      <SectionDivider title="🧑‍🌾  SELLER INFORMATION" />
      <View style={s.card}>
        <View style={s.sellerHeader}>
          <View style={s.sellerAvatar}>
            <Text style={s.sellerAvatarText}>{seller.name[0]?.toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.sellerName}>{seller.name}</Text>
            <View style={s.sellerVerified}>
              <Text style={s.sellerVerifiedText}>✓ Verified Seller</Text>
            </View>
          </View>
          <TouchableOpacity style={s.contactBtn} onPress={handleContactSeller} activeOpacity={0.8}>
            <Text style={s.contactBtnText}>💬 Chat</Text>
          </TouchableOpacity>
        </View>
        <View style={s.sellerInfoBox}>
          <InfoRow label="📍 Address" value={seller.address} />
          <View style={s.infoSep} />
          <InfoRow label="📱 Phone" value={seller.phone} />
        </View>
      </View>

      {/* ── Booking Card ── */}
      <SectionDivider title={isRent ? '📅  RENTAL BOOKING' : '🛒  ORDER DETAILS'} />
      <View style={s.card}>
        <Text style={s.cardStep}>02</Text>
        <Text style={s.cardTitle}>{isRent ? 'Book a Rental Period' : 'Place Your Order'}</Text>

        {isRent ? (
          <>
            <Text style={s.inputLabel}>Start Date</Text>
            <TextInput
              style={s.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.inkSoft}
              value={startDate}
              onChangeText={setStartDate}
            />
            <Text style={s.inputLabel}>End Date</Text>
            <TextInput
              style={s.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.inkSoft}
              value={endDate}
              onChangeText={setEndDate}
            />
          </>
        ) : (
          <>
            <Text style={s.inputLabel}>Delivery Date</Text>
            <TextInput
              style={s.textInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={C.inkSoft}
              value={startDate}
              onChangeText={setStartDate}
            />
          </>
        )}

        <Text style={s.inputLabel}>Quantity</Text>
        <TextInput
          style={s.textInput}
          placeholder="e.g. 1"
          keyboardType="numeric"
          placeholderTextColor={C.inkSoft}
          value={bookingQuantity}
          onChangeText={setBookingQuantity}
        />

        {/* Price summary */}
        {qty > 0 && (
          <View style={s.priceSummary}>
            <View style={s.priceSummaryRow}>
              <Text style={s.priceSummaryLabel}>Unit price</Text>
              <Text style={s.priceSummaryVal}>₹{equipment.price.toLocaleString('en-IN')}</Text>
            </View>
            <View style={s.priceSummaryRow}>
              <Text style={s.priceSummaryLabel}>Quantity</Text>
              <Text style={s.priceSummaryVal}>× {qty}</Text>
            </View>
            <View style={s.priceSummarySep} />
            <View style={s.priceSummaryRow}>
              <Text style={s.priceSummaryTotal}>Total</Text>
              <Text style={s.priceSummaryTotalVal}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.chatFullBtn} onPress={handleContactSeller} activeOpacity={0.8}>
            <Text style={s.chatFullBtnText}>📞 Contact Seller</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.bookBtn, booking && s.bookBtnDisabled]}
          onPress={handleBooking}
          disabled={booking}
          activeOpacity={0.85}
        >
          {booking ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.bookBtnText}>
              {isRent ? '📅 Confirm Booking' : '🛒 Place Order'} — ₹{total.toLocaleString('en-IN')}
            </Text>
          )}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: C.cream },
  scrollContent: { paddingBottom: 48 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream, gap: 12 },
  loadingText: { fontSize: 13, color: C.inkSoft, fontWeight: '600' },
  errorText: { fontSize: 16, color: C.red, fontWeight: '700', marginBottom: 12 },
  backBtn: { backgroundColor: C.sageLight, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10, borderWidth: 1.5, borderColor: C.sageMid },
  backBtnText: { color: C.sageDark, fontWeight: '700', fontSize: 13 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingTop: 36, paddingBottom: 28, paddingHorizontal: 20,
    backgroundColor: C.white,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.straw, borderWidth: 1.5, borderColor: C.strawMid,
    borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginBottom: 14,
  },
  heroDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 10, fontWeight: '700', color: C.strawDark, letterSpacing: 1 },
  heroTitle: {
    fontSize: 30, fontWeight: '900', color: C.sageDark,
    textAlign: 'center', lineHeight: 36, marginBottom: 6,
  },
  heroSub: {
    fontSize: 13, color: C.inkSoft, textAlign: 'center', marginBottom: 14,
    fontWeight: '600', letterSpacing: 0.3,
  },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroPrice: { fontSize: 36, fontWeight: '900', color: C.sageDark, letterSpacing: -1 },
  heroPriceUnit: { fontSize: 14, color: C.inkSoft, fontWeight: '600' },

  // Card
  card: {
    backgroundColor: C.white, borderRadius: 18,
    borderWidth: 1, borderColor: C.border,
    padding: 18, marginHorizontal: 14, marginBottom: 2,
    shadowColor: C.sageDark, shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardStep: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.5, marginBottom: 2 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: C.sageDark, marginBottom: 14 },

  // Description
  descBox: {
    flexDirection: 'row', backgroundColor: C.cream,
    borderRadius: 10, padding: 12, gap: 10, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  descAccent: { width: 3, borderRadius: 2, backgroundColor: C.sage },
  descText: { flex: 1, fontSize: 13, color: C.inkMid, lineHeight: 20 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailChip: {
    backgroundColor: C.parchment, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', minWidth: 80,
  },
  detailChipGreen: { backgroundColor: C.sageLight, borderColor: C.sageMid },
  detailChipBlue: { backgroundColor: C.sky, borderColor: '#8cc8e8' },
  detailChipLabel: { fontSize: 9, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.3, marginBottom: 3 },
  detailChipVal: { fontSize: 13, fontWeight: '800', color: C.ink },

  // Seller
  sellerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  sellerAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: C.sageDark, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.sageMid,
  },
  sellerAvatarText: { fontSize: 20, fontWeight: '900', color: C.white },
  sellerName: { fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 3 },
  sellerVerified: {
    backgroundColor: C.sageLight, borderRadius: 100,
    paddingHorizontal: 8, paddingVertical: 2,
    alignSelf: 'flex-start', borderWidth: 1, borderColor: C.sageMid,
  },
  sellerVerifiedText: { fontSize: 10, fontWeight: '700', color: C.sageDark },
  contactBtn: {
    backgroundColor: C.indigoLight, borderWidth: 1.5, borderColor: C.indigoBorder,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9,
  },
  contactBtnText: { fontSize: 12, fontWeight: '800', color: C.indigo },
  sellerInfoBox: {
    backgroundColor: C.cream, borderRadius: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11,
  },
  infoLabel: { fontSize: 12, fontWeight: '700', color: C.inkSoft },
  infoValue: { fontSize: 12, fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right', marginLeft: 12 },
  infoSep: { height: 1, backgroundColor: C.border },

  // Inputs
  inputLabel: { fontSize: 12, fontWeight: '700', color: C.inkMid, marginBottom: 6, marginTop: 12 },
  textInput: {
    borderWidth: 1.5, borderColor: C.sageMid, borderRadius: 12,
    padding: 12, fontSize: 14, color: C.ink, backgroundColor: C.cream,
    fontWeight: '500',
  },

  // Price summary
  priceSummary: {
    marginTop: 14, backgroundColor: C.sageLight,
    borderRadius: 12, padding: 14,
    borderWidth: 1.5, borderColor: C.sageMid,
  },
  priceSummaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  priceSummaryLabel: { fontSize: 12, color: C.inkSoft, fontWeight: '600' },
  priceSummaryVal: { fontSize: 13, color: C.ink, fontWeight: '700' },
  priceSummarySep: { height: 1, backgroundColor: C.sageMid, marginVertical: 8 },
  priceSummaryTotal: { fontSize: 13, fontWeight: '800', color: C.sageDark },
  priceSummaryTotalVal: { fontSize: 20, fontWeight: '900', color: C.sageDark, letterSpacing: -0.5 },

  // Action buttons
  actionRow: { marginTop: 16 },
  chatFullBtn: {
    backgroundColor: C.indigoLight, borderWidth: 1.5, borderColor: C.indigoBorder,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  chatFullBtnText: { color: C.indigo, fontWeight: '800', fontSize: 14 },
  bookBtn: {
    backgroundColor: C.sageDark, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  bookBtnDisabled: { opacity: 0.55 },
  bookBtnText: { color: C.white, fontWeight: '800', fontSize: 15 },

  // Divider
  dividerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginVertical: 16, marginHorizontal: 14,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerText: { fontSize: 10, fontWeight: '700', color: C.inkSoft, letterSpacing: 0.8 },
});