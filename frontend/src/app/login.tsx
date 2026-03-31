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

export default function Login() {
  const { login } = useAuth();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert(t('Fill all fields'));
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert(t('Login failed'), t('Invalid email or password'));
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
          <Text style={styles.greetingTitle}>Welcome Back, Farmer!</Text>
          <Text style={styles.greetingDesc}>Login to access your farming dashboard and advisory system</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
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
              placeholder={t('Enter your password')}
              placeholderTextColor="#aaa"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>🚀 Login</Text>
            )}
          </TouchableOpacity>

          {/* FORGOT PASSWORD */}
          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* REGISTER LINK */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <TouchableOpacity onPress={() => router.push('/register' as any)}>
            <Text style={styles.registerLink}>Create Account Now</Text>
          </TouchableOpacity>
        </View>

        {/* FEATURES */}
        <View style={styles.features}>
          <Text style={styles.featuresTitle}>Why AgriSaathi?</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✨</Text>
              <Text style={styles.featureText}>AI-Powered Crop Advisory</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📊</Text>
              <Text style={styles.featureText}>Precision Farming Dashboard</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🛒</Text>
              <Text style={styles.featureText}>Direct Marketplace Access</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🏦</Text>
              <Text style={styles.featureText}>Government Schemes Info</Text>
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

  forgot: {
    color: theme.green6,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
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

  registerLink: {
    color: theme.green4,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
  },

  features: {
    backgroundColor: theme.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: theme.green1,
  },

  featuresTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.green6,
    marginBottom: 12,
  },

  featureList: {
    gap: 10,
  },

  featureItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  featureIcon: {
    fontSize: 18,
  },

  featureText: {
    fontSize: 12,
    color: theme.textMid,
    fontWeight: '600',
    flex: 1,
  },
});