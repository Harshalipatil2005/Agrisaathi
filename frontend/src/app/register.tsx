import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
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
};

export default function Register() {
  const { register } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !fullName) return Alert.alert(t('Fill all fields'));
    setLoading(true);
    try {
      await register(email, password, fullName);
      Alert.alert('✅', t('Account created. Please login.'));
      router.replace('/login' as any);
    } catch (e) {
      Alert.alert(t('Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.logo}>Agri<Text style={styles.logoSpan}>Saathi</Text></Text>
          <Text style={styles.tagline}>🌾 Smart Farming Assistant</Text>
        </View>

        {/* GREETING */}
        <View style={styles.greetingBox}>
          <Text style={styles.greetingTitle}>Join AgriSaathi Today!</Text>
          <Text style={styles.greetingDesc}>Create your account to unlock all farming features and advisory services</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>👤 Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Enter your full name')}
              placeholderTextColor="#aaa"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📧 Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Enter your email')}
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🔐 Password</Text>
            <TextInput
              style={styles.input}
              placeholder={t('Create a strong password')}
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* REGISTER BUTTON */}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>✅ Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* LOGIN LINK */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/login' as any)}>
            <Text style={styles.loginLink}>Login Here</Text>
          </TouchableOpacity>
        </View>

        {/* BENEFITS */}
        <View style={styles.benefits}>
          <Text style={styles.benefitsTitle}>🎯 Join Thousands of Farmers</Text>
          <View style={styles.benefitList}>
            <View style={styles.benefitItem}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.benefitText}>Access AI-powered crop advisory 24/7</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.benefitText}>Real-time weather and soil monitoring</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.benefitText}>Direct marketplace for buying & selling</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.checkIcon}>✅</Text>
              <Text style={styles.benefitText}>Government schemes & bank offers info</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingBottom: 20,
  },

  content: {
    padding: 20,
    paddingTop: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 32,
  },

  logo: {
    fontSize: 40,
    fontWeight: '900',
    color: theme.green6,
  },

  logoSpan: {
    color: theme.green4,
  },

  tagline: {
    fontSize: 14,
    color: theme.textMid,
    marginTop: 8,
    fontWeight: '600',
  },

  greetingBox: {
    backgroundColor: 'rgba(180,225,195,0.4)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 28,
    borderWidth: 1.5,
    borderColor: theme.green2,
  },

  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 6,
  },

  greetingDesc: {
    fontSize: 13,
    color: theme.textLight,
    lineHeight: 18,
  },

  form: {
    marginBottom: 24,
  },

  formGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.textMid,
    marginBottom: 8,
  },

  input: {
    backgroundColor: theme.white,
    color: theme.text,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: theme.green2,
  },

  btn: {
    backgroundColor: theme.green4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },

  footer: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 4,
  },

  footerText: {
    fontSize: 13,
    color: theme.textMid,
  },

  loginLink: {
    color: theme.green4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },

  benefits: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: theme.green1,
  },

  benefitsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 12,
  },

  benefitList: {
    gap: 10,
  },

  benefitItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  checkIcon: {
    fontSize: 16,
    marginTop: 2,
  },

  benefitText: {
    fontSize: 12,
    color: theme.textMid,
    fontWeight: '600',
    flex: 1,
  },
});