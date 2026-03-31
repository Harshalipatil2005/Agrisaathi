import { useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
};

export default function ProductBooking() {
  const { productId, productName, productPrice, productIcon, productTag } = useLocalSearchParams();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [timeModal, setTimeModal] = useState(false);
  const [dateType, setDateType] = useState('');

  const times = Array.from({ length: 24 }, (_, i) => {
    const hour = String(i).padStart(2, '0');
    return `${hour}:00`;
  });

  const calculateTotal = () => {
    const price = parseFloat(productPrice as string) || 0;
    const qty = parseFloat(quantity) || 1;
    return (price * qty).toFixed(2);
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !startTime || !endTime) {
      Alert.alert('Missing Fields', 'Please fill in all dates and times');
      return;
    }

    setLoading(true);
    try {
      const bookingData = {
        id: `booking_${Date.now()}`,
        productId,
        productName,
        productIcon,
        productTag,
        quantity: parseInt(quantity),
        unitPrice: parseFloat(productPrice as string),
        startDate,
        endDate,
        startTime,
        endTime,
        totalPrice: parseFloat(calculateTotal()),
        notes,
        bookingDate: new Date().toISOString(),
        status: 'pending'
      };

      // Save booking to AsyncStorage
      const existingBookings = await AsyncStorage.getItem('user_bookings');
      const bookings = existingBookings ? JSON.parse(existingBookings) : [];
      bookings.push(bookingData);
      await AsyncStorage.setItem('user_bookings', JSON.stringify(bookings));

      Alert.alert('Success ✅', 'Booking confirmed! Check Supply Chain for details', [
        {
          text: 'View Supply Chain',
          onPress: () => router.push('/supply-chain' as any)
        },
        {
          text: 'Continue Shopping',
          onPress: () => router.back()
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📋 Book Now</Text>
      </View>

      <View style={styles.content}>
        {/* PRODUCT SUMMARY */}
        <View style={styles.productCard}>
          <View style={styles.productIcon}>
            <Text style={{ fontSize: 40 }}>{productIcon || '📦'}</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{productName}</Text>
            <Text style={styles.productTag}>{productTag}</Text>
            <Text style={styles.productPrice}>₹{productPrice}</Text>
          </View>
        </View>

        {/* BOOKING FORM */}
        <View style={styles.form}>
          {/* START DATE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📅 Start Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDateType('start');
                setDateModal(true);
              }}
            >
              <Text style={startDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                {startDate || 'Select start date'}
              </Text>
              <Text style={styles.icon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* START TIME */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>🕐 Start Time *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDateType('start-time');
                setTimeModal(true);
              }}
            >
              <Text style={startTime ? styles.dateInputText : styles.dateInputPlaceholder}>
                {startTime || 'Select start time'}
              </Text>
              <Text style={styles.icon}>🕐</Text>
            </TouchableOpacity>
          </View>

          {/* END DATE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📅 End Date *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDateType('end');
                setDateModal(true);
              }}
            >
              <Text style={endDate ? styles.dateInputText : styles.dateInputPlaceholder}>
                {endDate || 'Select end date'}
              </Text>
              <Text style={styles.icon}>📅</Text>
            </TouchableOpacity>
          </View>

          {/* END TIME */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>🕐 End Time *</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => {
                setDateType('end-time');
                setTimeModal(true);
              }}
            >
              <Text style={endTime ? styles.dateInputText : styles.dateInputPlaceholder}>
                {endTime || 'Select end time'}
              </Text>
              <Text style={styles.icon}>🕐</Text>
            </TouchableOpacity>
          </View>

          {/* QUANTITY */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📊 Quantity</Text>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity(Math.max(1, parseFloat(quantity) - 1).toString())}
              >
                <Text style={styles.quantityBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtn}
                onPress={() => setQuantity((parseFloat(quantity) + 1).toString())}
              >
                <Text style={styles.quantityBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* NOTES */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📝 Additional Notes</Text>
            <View style={styles.notesInput}>
              <Text style={styles.notesPlaceholder}>
                Any special requirements or details...
              </Text>
            </View>
          </View>

          {/* PRICE SUMMARY */}
          <View style={styles.priceSummary}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Unit Price:</Text>
              <Text style={styles.priceValue}>₹{productPrice}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Quantity:</Text>
              <Text style={styles.priceValue}>{quantity}</Text>
            </View>
            <View style={[styles.priceRow, styles.priceRowTotal]}>
              <Text style={styles.priceLabelTotal}>Total Amount:</Text>
              <Text style={styles.priceValueTotal}>₹{calculateTotal()}</Text>
            </View>
          </View>

          {/* BOOKING BUTTON */}
          <TouchableOpacity
            style={[styles.bookBtn, loading && { opacity: 0.6 }]}
            onPress={handleBooking}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.bookBtnText}>✅ Confirm Booking</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ Booking Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>•</Text>
            <Text style={styles.infoText}>Booking will be added to your Supply Chain</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>•</Text>
            <Text style={styles.infoText}>Seller will contact you for confirmation</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>•</Text>
            <Text style={styles.infoText}>Payment depends on seller's preferences</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>•</Text>
            <Text style={styles.infoText}>Track status in Supply Chain section</Text>
          </View>
        </View>
      </View>

      {/* DATE PICKER MODAL (Simplified) */}
      <Modal
        visible={dateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {dateType === 'start' ? 'Start' : 'End'} Date</Text>
              <TouchableOpacity onPress={() => setDateModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {/* Generate next 30 days */}
              {Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const displayStr = date.toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                return (
                  <TouchableOpacity
                    key={i}
                    style={styles.dateOption}
                    onPress={() => {
                      if (dateType === 'start') setStartDate(dateStr);
                      else setEndDate(dateStr);
                      setDateModal(false);
                    }}
                  >
                    <Text style={styles.dateOptionText}>{displayStr}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TIME PICKER MODAL */}
      <Modal
        visible={timeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {dateType === 'start-time' ? 'Start' : 'End'} Time</Text>
              <TouchableOpacity onPress={() => setTimeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {times.map((time, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.timeOption}
                  onPress={() => {
                    if (dateType === 'start-time') setStartTime(time);
                    else setEndTime(time);
                    setTimeModal(false);
                  }}
                >
                  <Text style={styles.timeOptionText}>{time}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  header: {
    backgroundColor: theme.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.green2,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  backBtn: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.green6,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.green6,
    flex: 1,
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  productCard: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.green1,
  },

  productIcon: {
    width: 60,
    height: 60,
    backgroundColor: theme.green1,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.text,
    marginBottom: 2,
  },

  productTag: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.green5,
    marginBottom: 4,
  },

  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.green6,
  },

  form: {
    marginBottom: 20,
  },

  formGroup: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMid,
    marginBottom: 6,
  },

  dateInput: {
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.green2,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateInputText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '600',
  },

  dateInputPlaceholder: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },

  icon: {
    fontSize: 14,
  },

  quantityControl: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: theme.green2,
  },

  quantityBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.green1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.green6,
  },

  quantityValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.text,
    flex: 1,
    textAlign: 'center',
  },

  notesInput: {
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.green2,
    minHeight: 60,
    display: 'flex',
    justifyContent: 'flex-start',
  },

  notesPlaceholder: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },

  priceSummary: {
    backgroundColor: theme.white,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.green1,
    marginBottom: 14,
  },

  priceRow: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  priceRowTotal: {
    borderTopWidth: 1,
    borderTopColor: theme.green1,
    paddingVertical: 10,
    marginVertical: 4,
  },

  priceLabel: {
    fontSize: 12,
    color: theme.textLight,
    fontWeight: '600',
  },

  priceLabelTotal: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '800',
  },

  priceValue: {
    fontSize: 12,
    color: theme.textMid,
    fontWeight: '700',
  },

  priceValueTotal: {
    fontSize: 16,
    color: theme.green6,
    fontWeight: '900',
  },

  bookBtn: {
    backgroundColor: theme.green4,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 14,
  },

  bookBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  infoBox: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.green1,
  },

  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 8,
  },

  infoItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },

  infoIcon: {
    fontSize: 12,
    color: theme.green4,
    fontWeight: '800',
  },

  infoText: {
    fontSize: 11,
    color: theme.textMid,
    fontWeight: '600',
    flex: 1,
  },

  // MODALS
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },

  modalContent: {
    backgroundColor: theme.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 12,
    maxHeight: '70%',
  },

  modalHeader: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.green1,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.green6,
  },

  modalClose: {
    fontSize: 18,
    color: theme.textLight,
  },

  modalBody: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: theme.green1,
  },

  dateOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },

  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: theme.green1,
  },

  timeOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
});
