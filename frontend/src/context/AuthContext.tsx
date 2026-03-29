import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';

const API = 'http://127.0.0.1:8000';

interface User {
  id: string;
  email: string;
  role: string;
  token: string;
  refresh_token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  getValidToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Load user from storage on app start
  useEffect(() => {
    AsyncStorage.getItem('user').then(data => {
      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        userRef.current = parsed;
      }
      setLoading(false);
    });
  }, []);

  // Auto refresh token every 45 minutes
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.post(`${API}/auth/refresh`, {
          token: user.token
        });
        if (res.data.access_token) {
          const updated = { ...user, token: res.data.access_token };
          await AsyncStorage.setItem('user', JSON.stringify(updated));
          setUser(updated);
          userRef.current = updated;
          console.log('Token refreshed!');
        }
      } catch (e) {
        console.log('Token refresh failed, logging out');
        await doLogout();
      }
    }, 45 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const saveUser = async (userData: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    userRef.current = userData;
  };

  const getValidToken = async (): Promise<string | null> => {
    const current = userRef.current;
    if (!current) return null;

    try {
      const payload = JSON.parse(atob(current.token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const isExpired = Date.now() >= expiry - 60000;

      if (!isExpired) return current.token;

      console.log('Token expired, refreshing...');
      const res = await axios.post(`${API}/auth/refresh`, {
        token: current.token
      });

      const updated: User = {
        ...current,
        token: res.data.access_token,
      };
      await saveUser(updated);
      console.log('Token refreshed!');
      return updated.token;

    } catch (e) {
      console.log('Token refresh failed, logging out:', e);
      await doLogout();
      return null;
    }
  };

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const userData: User = {
      id: res.data.user_id,
      email: res.data.email,
      role: res.data.role,
      token: res.data.access_token,
      refresh_token: res.data.refresh_token,
    };
    await saveUser(userData);
  };

  const register = async (email: string, password: string, full_name: string) => {
    await axios.post(`${API}/auth/register`, { email, password, full_name });
  };

  // Internal logout — clears state and redirects
  const doLogout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null);
    userRef.current = null;
    router.replace('/login' as any);
  };

  // Public logout — same thing
  const logout = async () => {
    await doLogout();
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, getValidToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);