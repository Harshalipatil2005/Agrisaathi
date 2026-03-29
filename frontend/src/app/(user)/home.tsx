import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../hooks/useT';

export default function UserHome() {
  const { user, logout } = useAuth();
  const t = useT();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌱 {t('EcoApp')}</Text>
      <Text style={styles.welcome}>{t('Welcome')}, {user?.email}</Text>

      <TouchableOpacity style={styles.mapBtn} onPress={() => router.push('/map' as any)}>
        <Text style={styles.btnText}>🗺️ {t('Open Eco Map')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/chat' as any)}>
        <Text style={styles.btnText}>🤖 {t('Ask EcoBot')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings' as any)}>
        <Text style={styles.btnText}>⚙️ {t('Settings')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.btnText}>🚪 {t('Logout')}</Text>
      </TouchableOpacity>

      {/* Floating chat button */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/chat' as any)}>
        <Text style={styles.fabText}>🤖</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#22c55e', textAlign: 'center', marginBottom: 8 },
  welcome: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 32 },
  mapBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  chatBtn: { backgroundColor: '#8b5cf6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  settingsBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  logoutBtn: { backgroundColor: '#ef4444', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 32, right: 24, backgroundColor: '#22c55e', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabText: { fontSize: 28 },
});