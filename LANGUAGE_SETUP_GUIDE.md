/**
 * UNIVERSAL LANGUAGE CHANGING SETUP GUIDE
 * 
 * Path: frontend/src/hooks/useLanguageChange.ts
 * Strings Path: frontend/src/constants/strings.ts
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * HOW TO USE IN ANY SCREEN/COMPONENT:
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * STEP 1: Import the hook and strings
 * ────────────────────────────────────
 * import { useLanguageChange } from '../hooks/useLanguageChange';
 * import { STRINGS } from '../constants/strings';
 * 
 * 
 * STEP 2: Use in your component
 * ──────────────────────────────
 * export default function MyScreen() {
 *   const { language, changeLanguage, t } = useLanguageChange();
 *   
 *   return (
 *     <View>
 *       {/* Replace hardcoded strings with t(STRINGS.XXX) */}
 *       <Text>{t(STRINGS.HOME.WEATHER_TITLE)}</Text>
 *       
 *       {/* Change language from anywhere */}
 *       <TouchableOpacity onPress={() => changeLanguage('hi')}>
 *         <Text>Switch to Hindi</Text>
 *       </TouchableOpacity>
 *     </View>
 *   );
 * }
 * 
 * 
 * STEP 3: Replace hardcoded strings
 * ──────────────────────────────────
 * 
 * BEFORE (hardcoded - won't translate):
 *   <Text>🌤️ Weather Overview</Text>
 * 
 * AFTER (translatable):
 *   <Text>{t(STRINGS.HOME.WEATHER_TITLE)}</Text>
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * FILES TO UPDATE (Add useLanguageChange hook):
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * ✅ MUST UPDATE:
 * ────────────────
 * 1. frontend/src/app/(user)/home.tsx
 *    - Import: useLanguageChange instead of useLanguage
 *    - Use t() for ALL hardcoded strings
 *    
 * 2. frontend/src/app/chat.tsx
 *    - Use t(STRINGS.CHAT.XXX) for all UI strings
 *    
 * 3. frontend/src/app/settings.tsx
 *    - Use t(STRINGS.SETTINGS.XXX) for settings
 *    
 * 4. frontend/src/components/PrecisionFarmingModal.tsx
 *    - Use t(STRINGS.PRECISION_FARMING.XXX) for all labels
 *    
 * 5. frontend/src/components/WeatherForecast.tsx
 *    - Use t(STRINGS.WEATHER.XXX) for all labels
 *    
 * 6. Any other screens/components with hardcoded strings
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS:
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * 1. useLanguageChange() hook ensures proper re-renders when language changes
 * 2. t() function translates using LanguageContext
 * 3. When language button is clicked → LanguageContext.changeLanguage() → 
 *    all components using useLanguageChange() re-render with new translations
 * 4. Translations are cached in AsyncStorage
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * EXAMPLE: Update home.tsx
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * // BEFORE:
 * import { useLanguage } from '../../context/LanguageContext';
 * 
 * export default function UserHome() {
 *   const { language } = useLanguage();
 *   
 *   return (
 *     <View>
 *       <Text>🌤️ Weather Overview</Text>
 *       <Text>🌿 Advisory System</Text>
 *     </View>
 *   );
 * }
 * 
 * // AFTER:
 * import { useLanguageChange } from '../../hooks/useLanguageChange';
 * import { STRINGS } from '../../constants/strings';
 * 
 * export default function UserHome() {
 *   const { t, changeLanguage, language } = useLanguageChange();
 *   
 *   return (
 *     <View>
 *       <Text>{t(STRINGS.HOME.WEATHER_TITLE)}</Text>
 *       <Text>{t(STRINGS.HOME.ADVISORY_SYSTEM)}</Text>
 *     </View>
 *   );
 * }
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 * ADDING NEW STRINGS:
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * 1. Add to frontend/src/constants/strings.ts:
 * 
 *    MY_NEW_SCREEN: {
 *      MY_LABEL: 'My Label Text',
 *      MY_BUTTON: 'Click Me',
 *    }
 * 
 * 2. Use in component:
 * 
 *    const { t } = useLanguageChange();
 *    <Text>{t(STRINGS.MY_NEW_SCREEN.MY_LABEL)}</Text>
 * 
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */
