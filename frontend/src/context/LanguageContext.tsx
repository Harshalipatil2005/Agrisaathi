import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'http://127.0.0.1:8000';

interface LanguageContextType {
  translate: (text: string) => string;
  changeLanguage: (lang: string) => Promise<void>;
  language: string;
  isTranslating: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  translate: (t) => t,
  changeLanguage: async () => {},
  language: 'en',
  isTranslating: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState('en');
  const [cache, setCache] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(lang => {
      if (lang && lang !== 'en') loadCache(lang);
      else if (lang) setLanguage(lang);
    });
  }, []);

  const loadCache = async (lang: string) => {
    setLanguage(lang);
    const cached = await AsyncStorage.getItem(`cache_${lang}`);
    if (cached) setCache(JSON.parse(cached));
  };

  const changeLanguage = async (lang: string) => {
    await AsyncStorage.setItem('app_language', lang);
    setLanguage(lang);

    if (lang === 'en') {
      setCache({});
      return;
    }

    // Get all text currently cached + any new text
    const existingCache = await AsyncStorage.getItem(`cache_${lang}`);
    if (existingCache) {
      setCache(JSON.parse(existingCache));
      return;
    }

    // Fresh translation — will happen lazily as user navigates
    setCache({});
  };

  // This is called for every UI string
  const translate = (text: string): string => {
    if (language === 'en' || !text) return text;
    // Return cached if available
    if (cache[text]) return cache[text];
    // Trigger lazy translation in background
    lazyTranslate(text);
    return text; // show English while translating
  };

  const lazyTranslate = async (text: string, token?: string) => {
  if (cache[text] || language === 'en') return;

  try {
    const res = await fetch(`${API}/chat/translate-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No auth needed — make translate-text public
      },
      body: JSON.stringify({ text, target_language: language }),
    });
    const data = await res.json();
    if (data.translated) {
      setCache(prev => {
        const newCache = { ...prev, [text]: data.translated };
        AsyncStorage.setItem(`cache_${language}`, JSON.stringify(newCache));
        return newCache;
      });
    }
  } catch (e) {
    console.log('Translation error:', e);
  }
};

  return (
    <LanguageContext.Provider value={{ translate, changeLanguage, language, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);