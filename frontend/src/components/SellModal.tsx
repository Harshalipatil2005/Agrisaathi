import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  FlatList,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

const C = {
  green1: '#dff0e4',
  green2: '#c2deca',
  green3: '#9fcfad',
  green4: '#7ab990',
  green5: '#52a06e',
  green6: '#2d7a4f',
  text: '#1a3328',
  textMid: '#3a5e48',
  textLight: '#7aaa8a',
  white: '#ffffff',
  bg: '#f0f7f2',
  shadow: 'rgba(52,160,110,0.10)',
};

const SELL_CATEGORIES = [
  { id: 'veggies', label: 'Veggies & Fruits', icon: '🥦', color: '#eaf7ee' },
  { id: 'equipment', label: 'Equipment', icon: '🚜', color: '#fef3e0' },
  { id: 'fertilizers', label: 'Fertilizers', icon: '🧴', color: '#e8f4fd' },
  { id: 'services', label: 'Services', icon: '🔧', color: '#f3e8ff' },
  { id: 'seeds', label: 'Seeds', icon: '🌾', color: '#fdf6dc' },
  { id: 'organic', label: 'Organic Products', icon: '🌿', color: '#e4f7e0' },
];

interface ListedItem {
  id: string;
  name: string;
  price: string;
  unit: string;
  category: string;
  qty?: string;
  description?: string;
  status: 'active' | 'sold';
  icon?: string;
}

interface SellModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SellModal({ visible, onClose }: SellModalProps) {
  const [screen, setScreen] = useState<'main' | 'catSelect' | 'form' | 'listed' | 'sold' | 'detail'>('main');
  const [listedItems, setListedItems] = useState<ListedItem[]>([]);
  const [soldItems, setSoldItems] = useState<ListedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<typeof SELL_CATEGORIES[0] | null>(null);
  const [selectedItem, setSelectedItem] = useState<ListedItem | null>(null);
  const [sellTab, setSellTab] = useState<'listed' | 'sold'>('listed');

  // Form states
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('kg');
  const [formDesc, setFormDesc] = useState('');

  const loadItems = async () => {
    try {
      const data = await AsyncStorage.getItem('seller_listings');
      if (data) {
        const parsed = JSON.parse(data);
        setListedItems(parsed.filter((i: ListedItem) => i.status === 'active'));
        setSoldItems(parsed.filter((i: ListedItem) => i.status === 'sold'));
      }
    } catch (e) {
      console.error('Error loading items:', e);
    }
  };

  const handleSubmitListing = async () => {
    if (!formName.trim() || !formPrice.trim()) {
      Alert.alert('Error', 'Please enter product name and price');
      return;
    }

    const newItem: ListedItem = {
      id: `l${Date.now()}`,
      name: formName,
      price: formPrice,
      unit: formUnit,
      category: selectedCategory?.label || '',
      qty: formQty || '1',
      description: formDesc,
      status: 'active',
      icon: selectedCategory?.icon,
    };

    try {
      const allItems = [...listedItems, newItem, ...soldItems];
      await AsyncStorage.setItem('seller_listings', JSON.stringify(allItems));
      setListedItems([newItem, ...listedItems]);

      Alert.alert('Success', 'Product listed successfully!');
      setFormName('');
      setFormPrice('');
      setFormQty('');
      setFormDesc('');
      setScreen('main');
    } catch (e) {
      Alert.alert('Error', 'Failed to save product');
    }
  };

  const handleDeleteItem = async (id: string) => {
    const updated = listedItems.filter(i => i.id !== id);
    try {
      const allItems = [...updated, ...soldItems];
      await AsyncStorage.setItem('seller_listings', JSON.stringify(allItems));
      setListedItems(updated);
      setScreen('main');
      Alert.alert('Success', 'Product deleted');
    } catch (e) {
      Alert.alert('Error', 'Failed to delete product');
    }
  };

  const handleMarkSold = async (item: ListedItem) => {
    const soldItem = { ...item, status: 'sold' as const };
    const updated = listedItems.filter(i => i.id !== item.id);
    try {
      const allItems = [...updated, ...soldItems, soldItem];
      await AsyncStorage.setItem('seller_listings', JSON.stringify(allItems));
      setListedItems(updated);
      setSoldItems([...soldItems, soldItem]);
      setScreen('main');
      Alert.alert('Success', 'Product marked as sold');
    } catch (e) {
      Alert.alert('Error', 'Failed to update product');
    }
  };

  const goBack = () => {
    if (screen === 'form') setScreen('catSelect');
    else if (screen === 'catSelect' || screen === 'detail') setScreen('main');
    else setScreen('main');
  };

  React.useEffect(() => {
    if (visible) loadItems();
  }, [visible]);

  // ─── MAIN SCREEN ───
  if (screen === 'main') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={s.container}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.headerBackBtn}>✕ Close</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>🏷️ Sell Your Products</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* Banner */}
            <View style={s.banner}>
              <Text style={s.bannerBadge}>🌾 FARMER MARKETPLACE</Text>
              <Text style={s.bannerTitle}>List & Sell Directly</Text>
              <Text style={s.bannerDesc}>
                List your farm produce, equipment, fertilizers, or services. Reach buyers directly — no middlemen, better prices for you.
              </Text>
              <View style={s.bannerDisclaimer}>
                <Text style={s.disclaimerText}>
                  ⚠️ Ensure correct pricing, quality, and availability before listing. Misleading listings may be removed.
                </Text>
              </View>
              <TouchableOpacity style={s.bannerBtn} onPress={() => setScreen('catSelect')}>
                <Text style={s.bannerBtnText}>+ Start Selling</Text>
              </TouchableOpacity>
            </View>

            {/* Tab bar */}
            <View style={s.tabBar}>
              <TouchableOpacity
                style={[s.tab, sellTab === 'listed' && s.tabActive]}
                onPress={() => setSellTab('listed')}
              >
                <Text style={[s.tabText, sellTab === 'listed' && s.tabTextActive]}>
                  📋 Listed ({listedItems.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, sellTab === 'sold' && s.tabActive]}
                onPress={() => setSellTab('sold')}
              >
                <Text style={[s.tabText, sellTab === 'sold' && s.tabTextActive]}>
                  ✅ Sold ({soldItems.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Items list */}
            {sellTab === 'listed' ? (
              listedItems.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyIcon}>📦</Text>
                  <Text style={s.emptyTitle}>No items listed yet</Text>
                  <Text style={s.emptySub}>Tap 'Start Selling' to add your first product.</Text>
                </View>
              ) : (
                listedItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={s.itemCard}
                    onPress={() => {
                      setSelectedItem(item);
                      setScreen('detail');
                    }}
                  >
                    <View
                      style={[
                        s.itemIcon,
                        { backgroundColor: SELL_CATEGORIES.find(c => c.id === item.category)?.color || C.green1 },
                      ]}
                    >
                      <Text style={s.itemIconText}>{item.icon || '📦'}</Text>
                    </View>
                    <View style={s.itemBody}>
                      <Text style={s.itemName}>{item.name}</Text>
                      <Text style={s.itemPrice}>₹{item.price} / {item.unit}</Text>
                      <View style={s.itemBadges}>
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{item.category}</Text>
                        </View>
                        <View style={[s.badge, { backgroundColor: C.green1 }]}>
                          <Text style={[s.badgeText, { color: C.green5 }]}>● Active</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.chevron}>›</Text>
                  </TouchableOpacity>
                ))
              )
            ) : soldItems.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyIcon}>🛒</Text>
                <Text style={s.emptyTitle}>No sold items yet</Text>
                <Text style={s.emptySub}>Items marked as sold will appear here.</Text>
              </View>
            ) : (
              soldItems.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={s.itemCard}
                  onPress={() => {
                    setSelectedItem(item);
                    setScreen('detail');
                  }}
                >
                  <View style={[s.itemIcon, { backgroundColor: '#ffe8d4' }]}>
                    <Text style={s.itemIconText}>{item.icon || '📦'}</Text>
                  </View>
                  <View style={s.itemBody}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemPrice}>₹{item.price} / {item.unit}</Text>
                    <View style={s.itemBadges}>
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{item.category}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: '#ffe8d4' }]}>
                        <Text style={[s.badgeText, { color: '#c2612a' }]}>● Sold</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.chevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── CATEGORY SELECTION SCREEN ───
  if (screen === 'catSelect') {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBack}>
              <Text style={s.headerBackBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>What are you selling?</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            <Text style={s.helperText}>Choose a category to list your product or service.</Text>

            <View style={s.catGrid}>
              {SELL_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catCard, { backgroundColor: cat.color }]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setScreen('form');
                  }}
                >
                  <Text style={s.catIcon}>{cat.icon}</Text>
                  <Text style={s.catLabel}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── FORM SCREEN ───
  if (screen === 'form' && selectedCategory) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBack}>
              <Text style={s.headerBackBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>{selectedCategory.icon} List {selectedCategory.label}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            {/* <View style={s.uploadBox}>
              <Text style={s.uploadIcon}>📷</Text>
              <Text style={s.uploadText}>Tap to upload product photo</Text>
              <Text style={s.uploadSub}>JPG/PNG · Max 5MB</Text>
            </View> */}

            <View style={s.formCard}>
              <Text style={s.formLabel}>Product/Service Name *</Text>
              <TextInput
                style={s.formInput}
                placeholder="Enter name"
                value={formName}
                onChangeText={setFormName}
                placeholderTextColor={C.textLight}
              />

              <Text style={s.formLabel}>Price (₹) *</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g. 35"
                value={formPrice}
                onChangeText={setFormPrice}
                keyboardType="decimal-pad"
                placeholderTextColor={C.textLight}
              />

              <Text style={s.formLabel}>Unit</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g. kg, piece, day"
                value={formUnit}
                onChangeText={setFormUnit}
                placeholderTextColor={C.textLight}
              />

              <Text style={s.formLabel}>Quantity Available</Text>
              <TextInput
                style={s.formInput}
                placeholder="e.g. 50"
                value={formQty}
                onChangeText={setFormQty}
                keyboardType="decimal-pad"
                placeholderTextColor={C.textLight}
              />

              <Text style={s.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[s.formInput, { minHeight: 75, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Describe your product/service..."
                value={formDesc}
                onChangeText={setFormDesc}
                multiline
                placeholderTextColor={C.textLight}
              />

              <TouchableOpacity style={s.submitBtn} onPress={handleSubmitListing}>
                <Text style={s.submitBtnText}>✅ List Item</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // ─── DETAIL SCREEN ───
  if (screen === 'detail' && selectedItem) {
    return (
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={s.container}>
          <View style={s.header}>
            <TouchableOpacity onPress={goBack}>
              <Text style={s.headerBackBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>Item Details</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.detailCard}>
              <View style={s.detailHeader}>
                <View>
                  <Text style={s.detailTitle}>{selectedItem.name}</Text>
                  <Text style={s.detailPrice}>₹{selectedItem.price} / {selectedItem.unit}</Text>
                </View>
                <View style={s.badge}>
                  <Text style={s.badgeText}>{selectedItem.category}</Text>
                </View>
              </View>

              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Quantity Available</Text>
                <Text style={s.detailValue}>{selectedItem.qty} {selectedItem.unit}</Text>
              </View>

              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Status</Text>
                <Text style={[s.detailValue, { color: C.green5 }]}>● {selectedItem.status === 'active' ? 'Active' : 'Sold'}</Text>
              </View>

              <View style={s.detailRow}>
                <Text style={s.detailLabel}>Listed On</Text>
                <Text style={s.detailValue}>{new Date().toLocaleDateString('en-IN')}</Text>
              </View>

              {selectedItem.description && (
                <View style={s.descBox}>
                  <Text style={s.descText}>{selectedItem.description}</Text>
                </View>
              )}

              {selectedItem.status === 'active' ? (
                <>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: C.green5 }]}
                    onPress={() => handleMarkSold(selectedItem)}
                  >
                    <Text style={s.actionBtnText}>✅ Mark as Sold</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#fdeaea', borderColor: '#f5c2c2', borderWidth: 1 }]}
                    onPress={() => {
                      Alert.alert('Delete Listing?', 'This cannot be undone.', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', onPress: () => handleDeleteItem(selectedItem.id), style: 'destructive' },
                      ]);
                    }}
                  >
                    <Text style={[s.actionBtnText, { color: '#e05050' }]}>🗑️ Delete Listing</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={s.soldTag}>
                  <Text style={s.soldTagText}>✔ Marked as Sold</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return null;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: C.white,
    borderBottomColor: C.green1,
    borderBottomWidth: 1,
  },
  headerBackBtn: {
    fontSize: 13,
    fontWeight: '800',
    color: C.green6,
    width: 60,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: C.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  banner: {
    backgroundColor: 'rgba(200,235,215,0.7)',
    borderColor: C.green2,
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  bannerBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: C.green4,
    letterSpacing: 1,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.green6,
    marginBottom: 10,
  },
  bannerDesc: {
    fontSize: 13,
    color: C.textMid,
    lineHeight: 20,
    marginBottom: 10,
  },
  bannerDisclaimer: {
    backgroundColor: '#fef9e7',
    borderLeftColor: '#f0c040',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  disclaimerText: {
    fontSize: 11,
    color: '#7a6210',
    lineHeight: 16,
  },
  bannerBtn: {
    backgroundColor: C.green5,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 26,
    alignSelf: 'flex-start',
  },
  bannerBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: C.green5,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textLight,
    textAlign: 'center',
  },
  tabTextActive: {
    color: C.white,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderColor: C.green1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    alignItems: 'center',
    gap: 14,
  },
  itemIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemIconText: {
    fontSize: 20,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: C.green5,
    marginBottom: 6,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 7,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: C.green1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.green5,
  },
  chevron: {
    fontSize: 18,
    color: C.textLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.textMid,
    marginBottom: 5,
  },
  emptySub: {
    fontSize: 12,
    color: C.textLight,
  },
  catGrid: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 16,
  },
  catCard: {
    width: '31%',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  catIcon: {
    fontSize: 36,
  },
  catLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: C.text,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: C.textLight,
    marginBottom: 18,
  },
  formCard: {
    backgroundColor: C.white,
    borderColor: C.green1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  uploadBox: {
    height: 150,
    backgroundColor: C.green1,
    borderRadius: 14,
    borderColor: C.green3,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 7,
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadText: {
    fontWeight: '700',
    fontSize: 13,
    color: C.textMid,
  },
  uploadSub: {
    fontSize: 10,
    color: C.textLight,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.textMid,
    marginBottom: 5,
    marginTop: 13,
  },
  formInput: {
    width: '100%',
    backgroundColor: C.bg,
    borderColor: C.green2,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
    color: C.text,
    fontFamily: 'System',
  },
  submitBtn: {
    width: '100%',
    backgroundColor: C.green5,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 14,
  },
  detailCard: {
    backgroundColor: C.white,
    borderColor: C.green1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: C.text,
    marginBottom: 3,
  },
  detailPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: C.green5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: C.green1,
    borderBottomWidth: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: C.textLight,
    fontWeight: '700',
  },
  detailValue: {
    fontSize: 12,
    color: C.text,
    fontWeight: '700',
  },
  descBox: {
    backgroundColor: C.green1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  descText: {
    fontSize: 12,
    color: C.textMid,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: C.white,
    fontWeight: '800',
    fontSize: 13,
  },
  soldTag: {
    marginTop: 12,
    backgroundColor: '#d4f0dc',
    borderRadius: 12,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldTagText: {
    color: '#2e7d45',
    fontWeight: '800',
    fontSize: 13,
  },
});
