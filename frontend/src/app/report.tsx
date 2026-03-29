import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const API = 'http://127.0.0.1:8000';

const CATEGORIES = [
  { id: 'plastic', label: '🧴 Plastic', color: '#3b82f6' },
  { id: 'food', label: '🍱 Food waste', color: '#f59e0b' },
  { id: 'hazardous', label: '☢️ Hazardous', color: '#ef4444' },
  { id: 'general', label: '🗑️ General', color: '#888' },
];

export default function ReportScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);

  const lat = parseFloat(params.lat as string || '0');
  const lng = parseFloat(params.lng as string || '0');

  const submitReport = async () => {
    if (!title) return Alert.alert('Enter a title');
    setLoading(true);
    try {
      await fetch(`${API}/reports/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          location: { lat, lng },
          data: { reported_via: 'map_click' }
        })
      });
      Alert.alert('Reported!', 'Waste report submitted successfully');
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🗑️ Report Waste</Text>
        {lat !== 0 && (
          <Text style={styles.coords}>📍 {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
        )}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Garbage pile near river"
          placeholderTextColor="#555"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, category === c.id && { backgroundColor: c.color, borderColor: c.color }]}
              onPress={() => setCategory(c.id)}
            >
              <Text style={[styles.chipText, category === c.id && { color: '#fff' }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Describe the waste situation..."
          placeholderTextColor="#555"
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={submitReport} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Submitting...' : '🚨 Submit Report'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { padding: 24, paddingTop: 60, backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#ef4444' },
  coords: { fontSize: 12, color: '#888', marginTop: 4 },
  form: { padding: 20 },
  label: { color: '#888', fontSize: 13, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: '#333' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#1a1a1a' },
  chipText: { color: '#888', fontSize: 13 },
  btn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  backBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  backText: { color: '#888', fontSize: 14 },
});