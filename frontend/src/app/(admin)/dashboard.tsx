import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboard() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚙️ Admin Panel</Text>
      <Text style={styles.welcome}>Welcome, {user?.email}</Text>
      <Text style={styles.role}>Role: {user?.role}</Text>

      <TouchableOpacity style={styles.btn} onPress={logout}>
        <Text style={styles.btnText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#f59e0b', textAlign: 'center', marginBottom: 16 },
  welcome: { fontSize: 18, color: '#fff', textAlign: 'center', marginBottom: 8 },
  role: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 32 },
  btn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});