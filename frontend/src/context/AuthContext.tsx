import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface User {
  id: string;
  email: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
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

  // 🔥 AUTO LOGIN (no backend)
  useEffect(() => {
    const loadUser = async () => {
      const data = await AsyncStorage.getItem('user');

      if (data) {
        const parsed = JSON.parse(data);
        setUser(parsed);
        userRef.current = parsed;
      } else {
        // 👉 Default fake user (you can switch role here)
        const fakeUser: User = {
          id: "user-1",
          email: "patilharshali2732@gmail.com",
          role: "user", // change to "seller" if needed
          token: "fake-token",
        };

        await AsyncStorage.setItem('user', JSON.stringify(fakeUser));
        setUser(fakeUser);
        userRef.current = fakeUser;
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const saveUser = async (userData: User) => {
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    userRef.current = userData;
  };

  // 🔥 SIMPLE TOKEN (no JWT logic)
  const getValidToken = async (): Promise<string | null> => {
    return userRef.current?.token || null;
  };

  // 🔥 FAKE LOGIN
  const login = async (email: string, password: string) => {
    let fakeUser: User | null = null;

    if (email === "patilharshali2732@gmail.com") {
      fakeUser = {
        id: "user-1",
        email,
        role: "user",
        token: "fake-token",
      };
    } else if (email === "harshuuu.2732@gmail.com") {
      fakeUser = {
        id: "seller-1",
        email,
        role: "seller",
        token: "fake-token",
      };
    } else {
      throw new Error("Invalid user");
    }

    await saveUser(fakeUser);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    setUser(null);
    userRef.current = null;
    router.replace('/login' as any);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getValidToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);