import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem('app_language').then(lang => {
      if (lang && lang !== 'en') {
        setLanguage(lang);
        loadCache(lang);
      } else if (lang) {
        setLanguage(lang);
      }
    });
  }, []);

  const loadCache = async (lang: string) => {
    const cached = await AsyncStorage.getItem(`cache_${lang}`);
    if (cached) setCache(JSON.parse(cached));
  };

  const lazyTranslate = useCallback(async (text: string, lang: string) => {
    if (!text || lang === 'en') return;
    
    try {
      const res = await fetch(`${API}/chat/translate-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, target_language: lang }),
      });
      const data = await res.json();
      if (data.translated) {
        setCache(prev => {
          const newCache = { ...prev, [text]: data.translated };
          AsyncStorage.setItem(`cache_${lang}`, JSON.stringify(newCache));
          // Trigger re-renders by incrementing refresh counter
          setRefreshTrigger(t => t + 1);
          return newCache;
        });
      }
    } catch (e) {
      console.log('Translation error:', e);
    }
  }, []);

  const changeLanguage = async (lang: string) => {
    setLanguage(lang);
    await AsyncStorage.setItem('app_language', lang);

    if (lang === 'en') {
      setCache({});
      setRefreshTrigger(t => t + 1);
      return;
    }

    const existingCache = await AsyncStorage.getItem(`cache_${lang}`);
    if (existingCache) {
      setCache(JSON.parse(existingCache));
    } else {
      setCache({});
    }
    setRefreshTrigger(t => t + 1);
  };

  const translate = useCallback((text: string): string => {
    if (language === 'en' || !text) return text;
    if (cache[text]) return cache[text];
    lazyTranslate(text, language);
    return text;
  }, [language, cache, lazyTranslate, refreshTrigger]);

  return (
    <LanguageContext.Provider value={{ translate, changeLanguage, language, isTranslating }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);