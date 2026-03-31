import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Modal
} from 'react-native';
import { router } from 'expo-router';
import { useT } from '../hooks/useT';

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
};

export default function SellPage() {
  const t = useT();
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const categories = [
    '🥦 Veggies & Fruits',
    '🧴 Fertilizers',
    '🚜 Equipment',
    '🔧 Services',
    '📦 Other Products'
  ];

  const handleSubmit = async () => {
    if (!productName || !category || !price || !quantity) {
      Alert.alert('Required Fields', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      // TODO: Send to backend API
      Alert.alert('Success ✅', 'Your product has been listed on the marketplace!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to list product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Sell Your Product</Text>
      </View>

      <View style={styles.content}>
        {/* INFO BOX */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>List Your Products Easily</Text>
          <Text style={styles.infoText}>
            Connect with thousands of farmers. Set your price, quantity, and let buyers contact you directly.
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          {/* PRODUCT NAME */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📝 Product Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Fresh Carrots, NPK Fertilizer..."
              placeholderTextColor="#aaa"
              value={productName}
              onChangeText={setProductName}
              editable={!loading}
            />
          </View>

          {/* CATEGORY */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📂 Category *</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setCategoryModal(true)}
            >
              <Text style={category ? styles.selectBtnText : styles.selectBtnPlaceholder}>
                {category || 'Select a category'}
              </Text>
              <Text style={styles.dropdownIcon}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* PRICE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>💰 Price per Unit (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 40, 320, 1200..."
              placeholderTextColor="#aaa"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              editable={!loading}
            />
          </View>

          {/* QUANTITY */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📊 Quantity Available *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 50 kg, 100 bags..."
              placeholderTextColor="#aaa"
              value={quantity}
              onChangeText={setQuantity}
              editable={!loading}
            />
          </View>

          {/* LOCATION */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📍 Location</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Nashik, Maharashtra"
              placeholderTextColor="#aaa"
              value={location}
              onChangeText={setLocation}
              editable={!loading}
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>📄 Description</Text>
            <TextInput
              style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
              placeholder="Describe your product, quality, variety, certifications..."
              placeholderTextColor="#aaa"
              value={description}
              onChangeText={setDescription}
              multiline
              editable={!loading}
            />
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>✅ List Product on Marketplace</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* TIPS */}
        <View style={styles.tipsBox}>
          <Text style={styles.tipsTitle}>💡 Tips for Better Sales</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>✓</Text>
            <Text style={styles.tipText}>Use clear, descriptive product names</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>✓</Text>
            <Text style={styles.tipText}>Set competitive prices for better visibility</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>✓</Text>
            <Text style={styles.tipText}>Mention certifications (organic, non-GMO, etc.)</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipIcon}>✓</Text>
            <Text style={styles.tipText}>Update quantity as items sell</Text>
          </View>
        </View>
      </View>

      {/* CATEGORY MODAL */}
      <Modal
        visible={categoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {categories.map((cat, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.categoryOption}
                  onPress={() => {
                    setCategory(cat);
                    setCategoryModal(false);
                  }}
                >
                  <Text style={styles.categoryOptionText}>{cat}</Text>
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
  },

  infoBox: {
    backgroundColor: 'rgba(180,225,195,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: theme.green2,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    color: theme.textLight,
    lineHeight: 18,
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

  input: {
    backgroundColor: theme.white,
    color: theme.text,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1.5,
    borderColor: theme.green2,
  },

  selectBtn: {
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

  selectBtnText: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '600',
  },

  selectBtnPlaceholder: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },

  dropdownIcon: {
    color: theme.textLight,
    fontSize: 10,
  },

  submitBtn: {
    backgroundColor: theme.green4,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },

  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  tipsBox: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.green1,
    marginBottom: 30,
  },

  tipsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 10,
  },

  tipItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },

  tipIcon: {
    fontSize: 14,
    color: theme.green4,
    fontWeight: '800',
    marginTop: 1,
  },

  tipText: {
    fontSize: 11,
    color: theme.textMid,
    fontWeight: '600',
    flex: 1,
  },

  // MODAL
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
    paddingBottom: 20,
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

  categoryOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: theme.green1,
  },

  categoryOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.text,
  },
});
