import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TextInput, Button } from 'react-native';

type TrackingData = {
  id: string;
  product_id: string;
  location: string;
  temperature: number;
  humidity: number;
  timestamp: string;
};

export default function Tracking() {
  const [trackingData, setTrackingData] = useState<TrackingData[]>([]);
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState('');
  const [location, setLocation] = useState('');
  const [temperature, setTemperature] = useState('');
  const [humidity, setHumidity] = useState('');

  useEffect(() => {
    fetchTracking();
  }, []);

  const fetchTracking = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/tracking/all');
      const data = await res.json();
      setTrackingData(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleAddTracking = async () => {
    if (!productId || !location || !temperature || !humidity) {
      alert('Please fill all fields');
      return;
    }
    try {
      await fetch('http://localhost:8000/tracking/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          location,
          temperature: Number(temperature),
          humidity: Number(humidity),
        }),
      });
      setProductId('');
      setLocation('');
      setTemperature('');
      setHumidity('');
      await fetchTracking();
      alert('Tracking data added');
    } catch (e) {
      alert('Failed to add tracking data');
    }
  };

  const renderTracking = ({ item }: { item: TrackingData }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productId}>📦 Product ID: {item.product_id.substring(0, 8)}...</Text>
        <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>📍 Location:</Text>
          <Text style={styles.value}>{item.location}</Text>
        </View>
        <View style={[styles.detailRow, { backgroundColor: getTemperatureColor(item.temperature) }]}>
          <Text style={styles.label}>🌡️ Temp:</Text>
          <Text style={styles.valueHighlight}>{item.temperature}°C</Text>
        </View>
        <View style={[styles.detailRow, { backgroundColor: getHumidityColor(item.humidity) }]}>
          <Text style={styles.label}>💧 Humidity:</Text>
          <Text style={styles.valueHighlight}>{item.humidity}%</Text>
        </View>
      </View>
    </View>
  );

  const getTemperatureColor = (temp: number) => {
    if (temp < 0) return '#fecaca';
    if (temp > 40) return '#fecaca';
    return '#dcfce7';
  };

  const getHumidityColor = (humidity: number) => {
    if (humidity < 20 || humidity > 80) return '#fecaca';
    return '#dcfce7';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📡 Real-Time Tracking & Monitoring</Text>

      <View style={styles.inputSection}>
        <TextInput
          style={styles.input}
          placeholder="Product ID"
          value={productId}
          onChangeText={setProductId}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Current Location"
          value={location}
          onChangeText={setLocation}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Temperature (°C)"
          keyboardType="numeric"
          value={temperature}
          onChangeText={setTemperature}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.input}
          placeholder="Humidity (%)"
          keyboardType="numeric"
          value={humidity}
          onChangeText={setHumidity}
          placeholderTextColor="#999"
        />
        <Button title="Log Reading" onPress={handleAddTracking} color="#0369a1" />
      </View>

      <Text style={styles.sectionTitle}>📊 Tracking History</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0369a1" style={{ marginTop: 16 }} />
      ) : trackingData.length === 0 ? (
        <Text style={styles.emptyText}>No tracking data yet</Text>
      ) : (
        <FlatList
          data={trackingData}
          renderItem={renderTracking}
          keyExtractor={item => item.id}
          scrollEnabled={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0369a1', marginBottom: 12, textAlign: 'center' },
  inputSection: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#bae6fd' },
  input: { borderWidth: 1, borderColor: '#bae6fd', borderRadius: 6, padding: 10, marginBottom: 8, backgroundColor: '#f9fafb' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#0369a1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  productId: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  timestamp: { fontSize: 10, color: '#999' },
  details: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  value: { fontSize: 12, color: '#333' },
  valueHighlight: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 24 },
});