/**
 * constants/strings.ts
 * 
 * Centralized hardcoded strings for the entire app.
 * Replace hardcoded strings with these constants and wrap with t() function.
 * 
 * Usage:
 *   import { STRINGS } from '../constants/strings';
 *   const { t } = useLanguageChange();
 *   
 *   <Text>{t(STRINGS.HOME.WEATHER_TITLE)}</Text>
 */

export const STRINGS = {
  // ─── HOME SCREEN ───────────────────────────────────────────────────────
  HOME: {
    WEATHER_TITLE: '🌤️ Weather Overview',
    ADVISORY_SYSTEM: '🌿 Advisory System',
    PRECISION_DASHBOARD: '📡 Precision Farming Dashboard',
    MARKETPLACE: '🛒 Agri Marketplace',
    GOVT_SCHEMES: '🏛️ Government Schemes & Bank Offers',
    MAP_TITLE: '🗺️ Geographic Farm Map',
    MORE_FEATURES: '🚀 More Features',
    
    // Advisory features
    CROP_DISEASE: 'Crop Disease',
    CROP_DISEASE_DESC: 'AI-powered early detection using image analysis.',
    SOIL_LAB: 'Soil Lab Analysis',
    SOIL_LAB_DESC: 'Upload soil reports and get instant recommendations.',
    FARM_ADVICE: 'Farm Advice',
    FARM_ADVICE_DESC: 'Personalised advice based on your land & crop.',
    BIOGAS: 'Bio Gas Calculator',
    BIOGAS_DESC: 'Estimate biogas production from organic waste.',
    MARKET_TRENDS: 'Market Trends',
    MARKET_TRENDS_DESC: 'Real-time market prices for commodities.',
    
    // Dashboard stats
    SOIL_MOISTURE: 'Soil Moisture',
    FIELD_TEMP: 'Field Temp',
    WIND_SPEED: 'Wind Speed',
    CROP_HEALTH: 'Crop Health',
    IRRIGATION: 'Irrigation',
    PUMP_STATUS: 'Pump Status',
    
    // Marketplace
    SEARCH_PLACEHOLDER: 'Search vegetables, fertilizers...',
    VEGGIES_FRUITS: 'Veggies & Fruits',
    FERTILIZERS: 'Fertilizers',
    EQUIPMENT: 'Equipment',
    SERVICES: 'Services',
    PRICE_LOW: 'Price: Low',
    PRICE_HIGH: 'Price: High',
    NEARBY: '📍 Nearby',
    ALL: 'All',
    
    // Map
    MAP_DESC: 'Interactive Geographical Map',
    MAP_SUB: 'Your fields, nearby mandis & weather layers',
    YOUR_FARM: '📍 Your Farm',
    NASHIK_MANDI: '🏪 Nashik Mandi',
    SOIL_BLACK: '🌱 Soil: Black',
    
    // Features
    SUPPLY_CHAIN: 'Supply Chain',
    
    // Footer
    FOOTER_TEXT: '🌾 AgriSaathi · Built for Farmers · All rights reserved',
    ABOUT: 'About',
    CONTACT: 'Contact',
  },

  // ─── CHAT SCREEN ───────────────────────────────────────────────────────
  CHAT: {
    TITLE: '🌾 Agri Advisory',
    CHAT_PLACEHOLDER: 'Ask about crops, weather, schemes...',
    SEND: 'Send',
    SPEAK: 'Speak',
    REPLY_COPY: 'Copy',
    REPLY_SPEAK: 'Speak',
    LANGUAGE: 'Language',
    LANGUAGE_CHANGED: 'Language changed!',
    NO_TRANSCRIPTION: 'Could not transcribe audio',
  },

  // ─── SETTINGS SCREEN ───────────────────────────────────────────────────
  SETTINGS: {
    TITLE: 'Settings',
    BACK: 'Back',
    SELECT_LANGUAGE: 'Select Language',
    ENGLISH: 'English',
    HINDI: 'हिन्दी — Hindi',
    MARATHI: 'मराठी — Marathi',
    LANGUAGE_CHANGED: 'Language changed!',
  },

  // ─── PRECISION FARMING ─────────────────────────────────────────────────
  PRECISION_FARMING: {
    TITLE: '📡 Precision Farming',
    VIEW: 'View',
    ADD: 'Add',
    DETAIL: 'Detail',
    NO_CROPS: 'No crops tracked yet',
    ADD_CROP: '+ Add Crop',
    CROP_TYPE: 'Crop Type',
    FIELD_NAME: 'Field/Plot Name',
    QUANTITY: 'Quantity (kg)',
    NOTES: 'Notes (optional)',
    SAVE: 'Save',
    DELETE: 'Delete',
    CANCEL: 'Cancel',
    CONFIRM_DELETE: 'Delete this crop?',
    CROP_INFO: 'Crop Information',
    GROWTH_STAGE: 'Growth Stage',
    PLANTING_DATE: 'Planting Date',
    GROWTH_TIMELINE: 'Growth Timeline',
    RECOMMENDATIONS: '📋 What to do now',
    GERMINATION: 'Germination',
    VEGETATIVE: 'Vegetative Growth',
    FLOWERING: 'Flowering',
    FRUITING: 'Fruiting',
    MATURITY: 'Harvest Ready',
  },

  // ─── WEATHER ───────────────────────────────────────────────────────────
  WEATHER: {
    LOADING: 'Fetching live weather…',
    ERROR: 'Could not load weather. Check your connection.',
    RETRY: 'Retry',
    FORECAST: '📅 13-day forecast',
    HUMIDITY: 'Humidity',
    WIND: 'Wind',
    RAIN: 'Rain',
    CLOSE: 'Close',
    PAST_DAYS: 'Past 6 days',
    TODAY_NEXT: 'Today & next 6 days',
    HUMIDITY_PERCENT: 'Humidity (%)',
    WIND_SPEED: 'Wind speed (km/h)',
    RAINFALL: 'Rainfall (mm)',
  },

  // ─── CROP HEALTH ───────────────────────────────────────────────────────
  CROP_HEALTH: {
    TITLE: 'CropScan AI',
    DESCRIPTION: 'Upload a photo of your crop for instant AI-powered disease detection',
    TAP_IMAGE: 'Tap to select a crop image',
    FORMATS: 'JPG · PNG · WebP supported',
    CHANGE_PHOTO: 'Change Photo',
    ANALYSE_CROP: 'Analyse Crop  →',
    GET_STARTED: 'Get Started  →',
    ANALYSING: 'Analysing...',
    DETECTION_FAILED: 'Detection Failed',
    START_OVER: 'Start Over',
    AFFECTED_PARTS: 'Affected Parts',
    RECOMMENDED_ACTION: 'Recommended Action',
    SCAN_ANOTHER: 'Scan Another Crop',
    CONFIDENCE: 'Confidence',
  },

  // ─── GENERIC ───────────────────────────────────────────────────────────
  COMMON: {
    LOADING: 'Loading...',
    ERROR: 'Error',
    SUCCESS: 'Success',
    OK: 'OK',
    CANCEL: 'Cancel',
    YES: 'Yes',
    NO: 'No',
    SAVE: 'Save',
    DELETE: 'Delete',
    EDIT: 'Edit',
    BACK: 'Back',
    CLOSE: 'Close',
  },
};
