# Multilingual Farming Advisor with Voice Support

## Overview
The farming app now includes a comprehensive multilingual advisor chatbot that responds in:
- **English** (🇬🇧)
- **Hindi** (🇮🇳) - हिन्दी
- **Marathi** (🇮🇳) - मराठी

## Key Features

### 1. **Language Selection**
- **Settings Page**: Users can select their preferred language from `/settings`
- **Chat Page Quick Selector**: Direct language picker in chat header (🇬🇧 🇮🇳 icons)
- **Persistent Storage**: Language preference is saved in AsyncStorage

### 2. **Automatic Translation**
- **UI Strings**: All app UI text is automatically translated using the Groq AI API
- **Lazy Translation**: Strings are translated on-demand and cached for performance
- **Backend System Prompt**: Chatbot tells Groq LLM to respond in selected language

### 3. **Voice Features**

#### Speech-to-Text (Input)
- **Microphone Button**: 🎤 button in chat to record voice messages
- **Auto-Transcription**: Uses Groq Whisper API to convert speech to text
- **Language-Aware**: Transcribes in any language

#### Text-to-Speech (Output)
- **Voice Toggle**: `🔊 ON / 🔇 OFF` button in chat header
- **When Enabled**: Advisor responses are automatically spoken aloud
- **Language-Specific Voices**: Uses native voice for:
  - English: en-IN (Indian English)
  - Hindi: hi-IN (Indian Hindi)
  - Marathi: mr-IN (Indian Marathi)
- **Manual Control**: Click 🔊 button on any message to speak it

### 4. **Farming Advisory Content**
The chatbot is trained to help with:
- Crop selection and seasonal planning
- Soil health and fertilization advice
- Pest and disease management
- Water management and irrigation
- Weather-based farming recommendations
- Equipment and machinery guidance
- Market prices and selling strategies
- Government schemes and subsidies
- Sustainable and organic farming practices

## Technical Implementation

### Frontend Components

#### 1. LanguageContext (`frontend/src/context/LanguageContext.tsx`)
- Manages language state globally
- Handles translation caching
- Lazy-loads translations from backend

#### 2. useT Hook (`frontend/src/hooks/useT.ts`)
- Simple hook returning the translate function
- Used throughout app as: `const t = useT(); <Text>{t('Label text')}</Text>`

#### 3. Chat Screen (`frontend/src/app/chat.tsx`)
**Features:**
- Language selector modal in header
- Voice input (transcription)
- Voice output (speech synthesis)
- Real-time streaming responses
- Message history with markdown support

**Key State:**
```javascript
const { language, changeLanguage } = useLanguage();
const [voiceReply, setVoiceReply] = useState(false);     // Voice ON/OFF
const [showLangModal, setShowLangModal] = useState(false); // Lang picker visibility
```

#### 4. Settings Screen (`frontend/src/app/settings.tsx`)
- Language selection with visual indicator
- Checkmark for current language
- Alert confirmation on language change

### Backend API

#### Chat Endpoint (`backend/app/routers/chat.py`)

**POST `/chat/`**
```json
Request:
{
  "messages": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "language": "English" | "Hindi" | "Marathi"
}

Response: Server-Sent Events (SSE) streaming tokens
```

**System Prompt Includes:**
- Agricultural expertise context
- Language instruction (tells LLM to respond in selected language)
- Encouragement to use local farming terminology

#### Transcription Endpoint (`/chat/transcribe`)
- Uses Groq Whisper API
- Converts audio files to text
- Supports: WebM, Ogg, MP3 formats

#### Translation Endpoint (`/chat/translate-text`)
- POST `/chat/translate-text`
- Translates UI strings on-demand
- Caches translations in AsyncStorage
- Uses Groq LLM for high-quality translation

## User Flow

### Scenario: Hindi-speaking Farmer
1. Opens app → Lands on home page
2. Navigates to Settings → Selects "हिन्दी"
3. Returns to home page → All UI now in Hindi
4. Clicks "🤖 AI Farmer Advisory"
5. Chat header shows: "🇮🇳 HI" (language indicator)
6. Toggles voice to: "🔊 ON"
7. Types/speaks question about crop disease (or uses 🎤)
8. Advisor responds in Hindi
9. Response is automatically spoken aloud in Hindi voice
10. Can switch languages anytime via language selector in chat header

## API Keys Required

Set these in `.env` file:
```
GROQ_API_KEY=xxxx  # Groq API key for LLM, transcription, and translation
```

## How It Works Behind the Scenes

1. **User selects language** → Stored in AsyncStorage
2. **UI strings pass through t()** → If not English, sent to `/chat/translate-text`
3. **Translated text cached** → For faster subsequent loads
4. **Chat message sent** → Includes `language: "Hindi"` parameter
5. **Backend tells Groq** → "Always respond in Hindi"
6. **Groq responds in Hindi** → Streams back texttoken by token
7. **Text-to-speech activated** → Browser's Web Speech API speaks in hi-IN
8. **Response cached** → Translations and transcriptions stored locally

## Multilingual String Coverage

All these strings are automatically translated:
- "Farming Advisor" → "खेती सलाहकार" / "शेतीमाल सल्लागार"
- "Expert Agricultural Assistant" → Translated
- "Advisor is thinking..." → Translated
- "Ask your farming question..." → Translated
- "Select Language" → Translated
- "Close" → Translated
- "Back" → Translated
- "Settings" → Translated
- And many more...

## Testing the Feature

### Test 1: Language Switching
1. Open app
2. Settings → Change to Hindi
3. Verify UI text changes
4. Go back to home
5. Verify Hindi appears throughout

### Test 2: Voice Input
1. Open Chat page
2. Tap 🎤 button
3. Speak a farming question in any language
4. Should transcribe to text automatically

### Test 3: Voice Output
1. In Chat, toggle 🔊 ON
2. Ask a question
3. When advisor responds, listen for voice
4. Should hear Hindi/Marathi depending on selected language

### Test 4: Language-Specific Conversation
1. Set language to Hindi
2. Ask: "मेरे खेत में फसल की बीमारी है" (My crop has disease)
3. Should respond in Hindi with agricultural advice
4. Voice should speak Hindi

## Future Enhancements

- [ ] Add more languages (Gujarati, Tamil, Telugu)
- [ ] Voice input language detection
- [ ] Regional dialect support
- [ ] Farming terminology database with translations
- [ ] Offline translation capabilities
- [ ] Voice synthesis quality improvements

## Troubleshooting

### Voice Not Working?
- Check browser permissions for microphone/speaker
- Ensure Groq API key is valid
- Try restarting the browser/app

### Translations Showing English?
- Wait a moment for lazy translation to complete
- Hard refresh the app (clear cache)
- Verify /chat/translate-text endpoint is working

### Language Not Persisting?
- Clear AsyncStorage and try again
- Check Settings page to confirm language is set

## Code Examples

### Using Translation Hook in a Component
```typescript
import { useT } from '../hooks/useT';

export default function MyComponent() {
  const t = useT();
  
  return (
    <View>
      <Text>{t('My Label')}</Text>
    </View>
  );
}
```

### Changing Language Programmatically
```typescript
import { useLanguage } from '../context/LanguageContext';

export default function MyComponent() {
  const { changeLanguage, language } = useLanguage();
  
  const switchToHindi = async () => {
    await changeLanguage('hi');
  };
  
  return <TouchableOpacity onPress={switchToHindi}>
    <Text>Switch to Hindi</Text>
  </TouchableOpacity>;
}
```

### Backend Language-Aware Response
The backend now sends `language` parameter to Groq:
```python
"messages": [
    {
        "role": "system",
        "content": f"Always respond in {body.language}..."
    },
    ...
]
```

## Supported Language Codes
- `en` → English
- `hi` → हिन्दी (Hindi)
- `mr` → मराठी (Marathi)

---

**Updated**: March 30, 2026
**Status**: ✅ Fully Implemented with Voice Support
