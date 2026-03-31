/**
 * hooks/useLanguageChange.ts
 * 
 * Universal language changing hook that triggers app-wide re-renders.
 * Use this in ANY component to get language switching + automatic re-renders.
 * 
 * Usage:
 *   const { language, changeLanguage, t } = useLanguageChange();
 *   
 *   // Change language
 *   await changeLanguage('hi');
 *   
 *   // Translate text
 *   <Text>{t('Hello World')}</Text>
 */

import { useLanguage } from '../context/LanguageContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useLanguageChange() {
  const { language, changeLanguage, translate } = useLanguage();
  const [, setRefresh] = useState(0);

  // Force re-render when language changes
  useEffect(() => {
    setRefresh(prev => prev + 1);
  }, [language]);

  return {
    language,
    changeLanguage,
    t: translate,
    forceRefresh: () => setRefresh(prev => prev + 1),
  };
}
