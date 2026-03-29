import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '../context/LanguageContext';
import { useT } from '../hooks/useT';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी — Hindi' },
  { code: 'mr', label: 'मराठी — Marathi' },
];

export default function SettingsScreen() {
  const { language, changeLanguage } = useLanguage();
  const t = useT();

  const handleChange = async (code: string) => {
    await changeLanguage(code);
    Alert.alert('✅', t('Language changed!'));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← {t('Back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('Settings')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('Select Language')}</Text>
        {LANGUAGES.map(lang => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.row, language === lang.code && styles.rowActive]}
            onPress={() => handleChange(lang.code)}
          >
            <Text style={[styles.rowText, language === lang.code && styles.rowTextActive]}>
              {lang.label}
            </Text>
            {language === lang.code && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { backgroundColor: '#1a1a1a', padding: 20, paddingTop: 55, borderBottomWidth: 1, borderBottomColor: '#333' },
  back: { color: '#22c55e', fontSize: 14, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  section: { padding: 20 },
  sectionLabel: { color: '#888', fontSize: 12, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 12, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  rowActive: { borderColor: '#22c55e', backgroundColor: '#0f2a1a' },
  rowText: { color: '#fff', fontSize: 16 },
  rowTextActive: { color: '#22c55e', fontWeight: 'bold' },
  check: { color: '#22c55e', fontSize: 20 },
});