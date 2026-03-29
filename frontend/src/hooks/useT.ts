import { useLanguage } from '../context/LanguageContext';

export function useT() {
  const { translate } = useLanguage();
  return translate;
}