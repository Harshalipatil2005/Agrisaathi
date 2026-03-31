import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Modal,
} from 'react-native';

// ── Change to your machine's local IP when testing on a physical device ──────
const API = 'http://127.0.0.1:8000';

// ── Language definitions ──────────────────────────────────────────────────────
interface Language {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
  placeholder: string;
  voiceLocale: string;
  greeting: string;
}

const LANGUAGES: Language[] = [
  {
    code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧',
    placeholder: 'Ask KrishiBot about farming…',
    voiceLocale: 'en-IN',
    greeting: '🌾 Hi! I am KrishiBot, your farming assistant. Ask me anything about crops, soil, irrigation, pests, or fertilizers!',
  },
  {
    code: 'hi', label: 'Hindi', nativeLabel: 'हिंदी', flag: '🇮🇳',
    placeholder: 'खेती के बारे में KrishiBot से पूछें…',
    voiceLocale: 'hi-IN',
    greeting: '🌾 नमस्ते! मैं KrishiBot हूं, आपका कृषि सहायक। फसल, मिट्टी, सिंचाई, कीट या खाद के बारे में कुछ भी पूछें!',
  },
  {
    code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', flag: '🌾',
    placeholder: 'KrishiBot ला शेतीबद्दल विचारा…',
    voiceLocale: 'mr-IN',
    greeting: '🌾 नमस्कार! मी KrishiBot आहे, तुमचा कृषी सहाय्यक. पिके, माती, सिंचन, कीड किंवा खतांबद्दल विचारा!',
  },
  {
    code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', flag: '🌿',
    placeholder: 'விவசாயம் பற்றி KrishiBot-ஐ கேளுங்கள்…',
    voiceLocale: 'ta-IN',
    greeting: '🌾 வணக்கம்! நான் KrishiBot, உங்கள் விவசாய உதவியாளர். பயிர்கள், மண், நீர்ப்பாசனம் பற்றி கேளுங்கள்!',
  },
  {
    code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', flag: '🌱',
    placeholder: 'వ్యవసాయం గురించి KrishiBot ని అడగండి…',
    voiceLocale: 'te-IN',
    greeting: '🌾 నమస్కారం! నేను KrishiBot, మీ వ్యవసాయ సహాయకుడిని. పంటలు, నేల, నీటిపారుదల గురించి అడగండి!',
  },
  {
    code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', flag: '🍃',
    placeholder: 'ಕೃಷಿ ಬಗ್ಗೆ KrishiBot ಅನ್ನು ಕೇಳಿ…',
    voiceLocale: 'kn-IN',
    greeting: '🌾 ನಮಸ್ಕಾರ! ನಾನು KrishiBot, ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ಬೆಳೆಗಳು, ಮಣ್ಣು, ನೀರಾವರಿ ಬಗ್ಗೆ ಕೇಳಿ!',
  },
  {
    code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🌻',
    placeholder: 'ખેતી વિશે KrishiBot ને પૂછો…',
    voiceLocale: 'gu-IN',
    greeting: '🌾 નમસ્તે! હું KrishiBot છું, તમારો કૃષિ સહાયક. પાક, માટી, સિંચાઈ વિશે પૂછો!',
  },
  {
    code: 'pa', label: 'Punjabi', nativeLabel: 'ਪੰਜਾਬੀ', flag: '🌾',
    placeholder: 'ਖੇਤੀ ਬਾਰੇ KrishiBot ਨੂੰ ਪੁੱਛੋ…',
    voiceLocale: 'pa-IN',
    greeting: '🌾 ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ KrishiBot ਹਾਂ, ਤੁਹਾਡਾ ਖੇਤੀ ਸਹਾਇਕ। ਫ਼ਸਲਾਂ, ਮਿੱਟੀ, ਸਿੰਚਾਈ ਬਾਰੇ ਪੁੱਛੋ!',
  },
];

// ── Quick topic suggestions per language ──────────────────────────────────────
const QUICK_TOPICS: Record<string, { emoji: string; label: string; query: string }[]> = {
  en: [
    { emoji: '🌾', label: 'Crop Selection',  query: 'Which crops should I grow in summer?' },
    { emoji: '🪱', label: 'Soil Health',      query: 'How to improve soil fertility naturally?' },
    { emoji: '🐛', label: 'Pest Control',     query: 'How to control pests on wheat organically?' },
    { emoji: '💧', label: 'Irrigation',       query: 'Best irrigation method for cotton?' },
    { emoji: '🌿', label: 'Fertilizers',      query: 'Best fertilizers for rice cultivation?' },
    { emoji: '📅', label: 'Seasonal Tips',    query: 'What farming activities in monsoon season?' },
  ],
  hi: [
    { emoji: '🌾', label: 'फसल चुनाव',       query: 'गर्मियों में कौन सी फसल उगानी चाहिए?' },
    { emoji: '🪱', label: 'मिट्टी स्वास्थ्य', query: 'मिट्टी की उर्वरता कैसे बढ़ाएं?' },
    { emoji: '🐛', label: 'कीट नियंत्रण',    query: 'गेहूं की फसल में कीटों को कैसे नियंत्रित करें?' },
    { emoji: '💧', label: 'सिंचाई',          query: 'कपास के लिए सबसे अच्छी सिंचाई विधि?' },
    { emoji: '🌿', label: 'उर्वरक',          query: 'धान की खेती के लिए कौन से उर्वरक?' },
    { emoji: '📅', label: 'मौसमी सुझाव',     query: 'मानसून में कौन से कृषि कार्य करें?' },
  ],
  mr: [
    { emoji: '🌾', label: 'पीक निवड',        query: 'उन्हाळ्यात कोणती पिके घ्यावी?' },
    { emoji: '🪱', label: 'माती आरोग्य',     query: 'जमिनीची सुपीकता कशी वाढवावी?' },
    { emoji: '🐛', label: 'कीड नियंत्रण',   query: 'गहू पिकावरील कीड कशी नियंत्रित करावी?' },
    { emoji: '💧', label: 'सिंचन',           query: 'कपाशीसाठी सर्वोत्तम सिंचन पद्धत?' },
    { emoji: '🌿', label: 'खते',             query: 'भात लागवडीसाठी कोणती खते?' },
    { emoji: '📅', label: 'हंगामी टिप्स',   query: 'पावसाळ्यात कोणते शेती कार्य करावे?' },
  ],
  ta: [
    { emoji: '🌾', label: 'பயிர் தேர்வு',   query: 'கோடையில் என்ன பயிர் வளர்க்கலாம்?' },
    { emoji: '🪱', label: 'மண் ஆரோக்கியம்', query: 'மண் வளத்தை எப்படி மேம்படுத்துவது?' },
    { emoji: '🐛', label: 'பூச்சி கட்டுப்பாடு', query: 'கோதுமையில் பூச்சியை எப்படி கட்டுப்படுத்துவது?' },
    { emoji: '💧', label: 'நீர்ப்பாசனம்',  query: 'பருத்திக்கு சிறந்த நீர்ப்பாசன முறை?' },
    { emoji: '🌿', label: 'உரங்கள்',        query: 'நெல் சாகுபடிக்கு சிறந்த உரம்?' },
    { emoji: '📅', label: 'பருவ குறிப்புகள்', query: 'மழை காலத்தில் என்ன விவசாய வேலைகள்?' },
  ],
  te: [
    { emoji: '🌾', label: 'పంట ఎంపిక',      query: 'వేసవిలో ఏ పంటలు వేయాలి?' },
    { emoji: '🪱', label: 'నేల ఆరోగ్యం',    query: 'నేల సంతానోత్పత్తిని సహజంగా ఎలా మెరుగుపరచాలి?' },
    { emoji: '🐛', label: 'పురుగు నియంత్రణ', query: 'గోధుమలో పురుగులను ఎలా నియంత్రించాలి?' },
    { emoji: '💧', label: 'నీటిపారుదల',     query: 'పత్తికి అత్యుత్తమ నీటిపారుదల పద్ధతి?' },
    { emoji: '🌿', label: 'ఎరువులు',        query: 'వరి సాగుకు మంచి ఎరువులు?' },
    { emoji: '📅', label: 'కాలానుగుణ చిట్కాలు', query: 'వర్షాకాలంలో ఏ వ్యవసాయ పనులు చేయాలి?' },
  ],
  kn: [
    { emoji: '🌾', label: 'ಬೆಳೆ ಆಯ್ಕೆ',     query: 'ಬೇಸಿಗೆಯಲ್ಲಿ ಯಾವ ಬೆಳೆ ಬೆಳೆಯಬೇಕು?' },
    { emoji: '🪱', label: 'ಮಣ್ಣು ಆರೋಗ್ಯ',   query: 'ಮಣ್ಣಿನ ಫಲವತ್ತತೆ ಹೇಗೆ ಸುಧಾರಿಸಬಹುದು?' },
    { emoji: '🐛', label: 'ಕೀಟ ನಿಯಂತ್ರಣ',  query: 'ಗೋಧಿಯಲ್ಲಿ ಕೀಟಗಳನ್ನು ಹೇಗೆ ನಿಯಂತ್ರಿಸಬಹುದು?' },
    { emoji: '💧', label: 'ನೀರಾವರಿ',        query: 'ಹತ್ತಿಗೆ ಉತ್ತಮ ನೀರಾವರಿ ವಿಧಾನ?' },
    { emoji: '🌿', label: 'ಗೊಬ್ಬರ',         query: 'ಭತ್ತದ ಬೇಸಾಯಕ್ಕೆ ಉತ್ತಮ ಗೊಬ್ಬರ?' },
    { emoji: '📅', label: 'ಕಾಲೋಚಿತ ಸಲಹೆ',  query: 'ಮಾನ್ಸೂನ್‌ನಲ್ಲಿ ಯಾವ ಕೃಷಿ ಕೆಲಸ ಮಾಡಬೇಕು?' },
  ],
  gu: [
    { emoji: '🌾', label: 'પાક પસંદગી',     query: 'ઉનાળામાં કયો પાક ઉગાડવો?' },
    { emoji: '🪱', label: 'માટી આરોગ્ય',    query: 'માટીની ફળદ્રૂપતા કેવી રીતે સુધારવી?' },
    { emoji: '🐛', label: 'જીવાત નિયંત્રણ', query: 'ઘઉંમાં જીવાત કેવી રીતે નિયંત્રિત કરવી?' },
    { emoji: '💧', label: 'સિંચાઈ',          query: 'કપાસ માટે શ્રેષ્ઠ સિંચાઈ પદ્ધતિ?' },
    { emoji: '🌿', label: 'ખાતર',            query: 'ડાંગરની ખેતી માટે શ્રેષ્ઠ ખાતર?' },
    { emoji: '📅', label: 'મોસમી સૂચનો',    query: 'ચોમાસામાં કયા ખેતી કામ કરવા?' },
  ],
  pa: [
    { emoji: '🌾', label: 'ਫ਼ਸਲ ਚੋਣ',        query: 'ਗਰਮੀਆਂ ਵਿੱਚ ਕਿਹੜੀ ਫ਼ਸਲ ਉਗਾਉਣੀ ਚਾਹੀਦੀ?' },
    { emoji: '🪱', label: 'ਮਿੱਟੀ ਸਿਹਤ',      query: 'ਮਿੱਟੀ ਦੀ ਉਪਜਾਊ ਸ਼ਕਤੀ ਕਿਵੇਂ ਵਧਾਈਏ?' },
    { emoji: '🐛', label: 'ਕੀਟ ਨਿਯੰਤਰਣ',   query: 'ਕਣਕ ਵਿੱਚ ਕੀਟਾਂ ਨੂੰ ਕਿਵੇਂ ਕੰਟਰੋਲ ਕਰੀਏ?' },
    { emoji: '💧', label: 'ਸਿੰਚਾਈ',          query: 'ਕਪਾਹ ਲਈ ਸਭ ਤੋਂ ਵਧੀਆ ਸਿੰਚਾਈ ਵਿਧੀ?' },
    { emoji: '🌿', label: 'ਖਾਦ',             query: 'ਝੋਨੇ ਦੀ ਖੇਤੀ ਲਈ ਕਿਹੜੀ ਖਾਦ?' },
    { emoji: '📅', label: 'ਮੌਸਮੀ ਸੁਝਾਅ',    query: 'ਮੌਨਸੂਨ ਵਿੱਚ ਕਿਹੜੇ ਖੇਤੀ ਕੰਮ ਕਰਨੇ ਚਾਹੀਦੇ?' },
  ],
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Strip markdown the LLM sneaks in ─────────────────────────────────────────
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s*/g, '')
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/^\s*[-•]\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stopSpeaking() {
  if (Platform.OS !== 'web') return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export default function ChatScreen() {
  const [selectedLang, setSelectedLang] = useState<Language>(LANGUAGES[0]);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const [messages, setMessages]               = useState<Message[]>([]);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    { role: 'assistant', content: LANGUAGES[0].greeting },
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [streaming, setStreaming] = useState(false);

  const [recording, setRecording]       = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceReply, setVoiceReply]     = useState(false);
  const [speaking, setSpeaking]         = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const scrollRef        = useRef<ScrollView>(null);
  const messagesRef      = useRef<Message[]>([]);

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Reset chat when language changes
  useEffect(() => {
    setMessages([]);
    setDisplayMessages([{ role: 'assistant', content: selectedLang.greeting }]);
    setInput('');
    stopSpeaking();
    setSpeaking(false);
  }, [selectedLang]);

  useEffect(() => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => stopSpeaking();
  }, []);

  // ── VOICE INPUT ──────────────────────────────────────────────────────────
  const startRecording = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice input is available on web only');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      Alert.alert('Microphone Error', 'Could not access microphone. Allow permission and try again.');
      console.error('Mic error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setTranscribing(true);
    }
  };

  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    try {
      const ext      = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', blob, `recording.${ext}`);
      formData.append('language', selectedLang.code);

      const res  = await fetch(`${API}/chat/transcribe`, { method: 'POST', body: formData });
      const data = await res.json();

      if (data.text) {
        setInput(data.text);
        setTimeout(() => sendMessageWithText(data.text), 300);
      } else {
        Alert.alert('Could not transcribe', 'Please try again or type your message.');
      }
    } catch (err) {
      console.error('Transcribe error:', err);
      Alert.alert('Transcription failed', 'Please type your message instead.');
    } finally {
      setTranscribing(false);
    }
  };

  // ── VOICE OUTPUT ─────────────────────────────────────────────────────────
  const speakReply = (text: string) => {
    if (Platform.OS !== 'web' || !('speechSynthesis' in window)) return;
    stopSpeaking();
    setSpeaking(true);

    const clean     = stripMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang  = selectedLang.voiceLocale;
    utterance.rate  = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const match  = voices.find((v) =>
      v.lang.startsWith(selectedLang.voiceLocale.split('-')[0])
    );
    if (match) utterance.voice = match;

    utterance.onend  = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeakingNow = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────
  const sendMessageWithText = async (text: string) => {
    if (!text.trim()) return;
    stopSpeaking();

    const newMessage: Message        = { role: 'user', content: text };
    const updatedMessages: Message[] = [...messagesRef.current, newMessage];

    setMessages(updatedMessages);
    setDisplayMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          language: selectedLang.code,
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      if (!res.body) throw new Error('No response body');

      setLoading(false);
      setStreaming(true);
      setDisplayMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const token  = parsed.token || '';
              fullReply   += token;
              setDisplayMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: stripMarkdown(fullReply),
                };
                return updated;
              });
              scrollRef.current?.scrollToEnd({ animated: false });
            } catch { /* ignore malformed SSE */ }
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: stripMarkdown(fullReply) },
      ]);

      if (voiceReply && fullReply) {
        setTimeout(() => speakReply(fullReply), 300);
      }
    } catch {
      setLoading(false);
      setDisplayMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Error connecting. Please check the server and try again.' },
      ]);
    } finally {
      setLoading(false);
      setStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendMessage = () => sendMessageWithText(input);
  const topics      = QUICK_TOPICS[selectedLang.code] || QUICK_TOPICS['en'];

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerText}>🌾 KrishiBot</Text>
            <Text style={styles.headerSub}>AI Farming Assistant</Text>
          </View>
          <View style={styles.headerActions}>
            {/* Language picker button */}
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setShowLangPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.langBtnText}>
                {selectedLang.flag} {selectedLang.nativeLabel}
              </Text>
            </TouchableOpacity>
            {/* Voice reply toggle */}
            <TouchableOpacity
              style={[styles.voiceToggle, voiceReply && styles.voiceToggleOn]}
              onPress={() => {
                if (voiceReply) stopSpeakingNow();
                setVoiceReply((v) => !v);
              }}
            >
              <Text style={styles.voiceToggleText}>{voiceReply ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {/* Quick topic chips — only show on empty chat */}
        {messages.length === 0 && (
          <View style={styles.topicGrid}>
            {topics.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={styles.topicChip}
                onPress={() => sendMessageWithText(t.query)}
                activeOpacity={0.75}
              >
                <Text style={styles.topicEmoji}>{t.emoji}</Text>
                <Text style={styles.topicLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {displayMessages.map((msg, i) => (
          <View key={i} style={styles.messageRow}>
            <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.botBubble]}>
              <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.botText]}>
                {msg.content}
                {streaming && i === displayMessages.length - 1 && (
                  <Text style={styles.cursor}>▋</Text>
                )}
              </Text>
            </View>
            {msg.role === 'assistant' && msg.content.length > 0 && !streaming && (
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => speaking ? stopSpeakingNow() : speakReply(msg.content)}
              >
                <Text style={styles.speakBtnText}>{speaking ? '⏹️' : '🔊'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {loading && (
          <View style={styles.botBubble}>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#4a9948" />
              <Text style={styles.typingText}> KrishiBot is thinking…</Text>
            </View>
          </View>
        )}

        {transcribing && (
          <View style={styles.botBubble}>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.typingText}> Transcribing…</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {recording && (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording… tap 🎤 to stop</Text>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[
            styles.micBtn,
            recording && styles.micBtnActive,
            transcribing && styles.micBtnTranscribing,
          ]}
          onPress={recording ? stopRecording : startRecording}
          disabled={transcribing || streaming || loading}
        >
          <Text style={styles.micBtnText}>
            {transcribing ? '⏳' : recording ? '⏹️' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={selectedLang.placeholder}
          placeholderTextColor="#888"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          multiline
          editable={!streaming && !recording}
        />

        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || streaming) && { opacity: 0.5 }]}
          onPress={sendMessage}
          disabled={!input.trim() || loading || streaming || recording}
        >
          <Text style={styles.sendText}>{streaming ? '⏳' : '➤'}</Text>
        </TouchableOpacity>
      </View>

      {/* Language picker modal */}
      <Modal
        visible={showLangPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLangPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>🌐 Select Language</Text>
            <ScrollView>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langOption,
                    selectedLang.code === lang.code && styles.langOptionActive,
                  ]}
                  onPress={() => {
                    setSelectedLang(lang);
                    setShowLangPicker(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={styles.langOptionFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.langOptionNative}>{lang.nativeLabel}</Text>
                    <Text style={styles.langOptionEnglish}>{lang.label}</Text>
                  </View>
                  {selectedLang.code === lang.code && (
                    <Text style={styles.langCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowLangPicker(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    backgroundColor: '#1a1a1a', padding: 16, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { fontSize: 20, fontWeight: 'bold', color: '#4a9948' },
  headerSub: { fontSize: 11, color: '#888', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  langBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#4a9948', backgroundColor: 'rgba(74,153,72,0.1)',
  },
  langBtnText: { color: '#4a9948', fontSize: 12, fontWeight: '600' },

  voiceToggle: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1, borderColor: '#444', backgroundColor: '#0f0f0f',
    justifyContent: 'center', alignItems: 'center',
  },
  voiceToggleOn: { borderColor: '#4a9948', backgroundColor: 'rgba(74,153,72,0.1)' },
  voiceToggleText: { fontSize: 16 },

  topicGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    justifyContent: 'center', marginBottom: 16,
  },
  topicChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(74,153,72,0.12)',
    borderWidth: 1, borderColor: 'rgba(74,153,72,0.35)',
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  topicEmoji: { fontSize: 13 },
  topicLabel: { fontSize: 11, color: '#72b05a', fontWeight: '600' },

  messages: { flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  userBubble: {
    backgroundColor: '#4a9948', alignSelf: 'flex-end',
    borderBottomRightRadius: 4, marginLeft: 'auto',
  },
  botBubble: {
    backgroundColor: '#1a1a1a', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#333', borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  botText: { color: '#ddd' },
  cursor: { color: '#4a9948', fontWeight: 'bold' },

  speakBtn: {
    marginLeft: 6, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  speakBtnText: { fontSize: 14 },

  typingDots: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  typingText: { color: '#888', fontSize: 13 },

  recordingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#ef4444',
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginRight: 8 },
  recordingText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', padding: 12,
    borderTopWidth: 1, borderTopColor: '#333',
    backgroundColor: '#1a1a1a', alignItems: 'flex-end',
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  micBtnActive: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  micBtnTranscribing: { backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8b5cf6' },
  micBtnText: { fontSize: 20 },
  input: {
    flex: 1, backgroundColor: '#0f0f0f', color: '#fff',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, borderWidth: 1, borderColor: '#333', maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#4a9948', borderRadius: 24,
    width: 44, height: 44, justifyContent: 'center',
    alignItems: 'center', marginLeft: 8,
  },
  sendText: { color: '#fff', fontSize: 18 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '75%',
    borderTopWidth: 1, borderTopColor: '#333',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#4a9948', marginBottom: 16 },
  langOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10,
  },
  langOptionActive: { backgroundColor: 'rgba(74,153,72,0.15)' },
  langOptionFlag: { fontSize: 24 },
  langOptionNative: { fontSize: 16, color: '#fff', fontWeight: '600' },
  langOptionEnglish: { fontSize: 12, color: '#888', marginTop: 1 },
  langCheckmark: { fontSize: 16, color: '#4a9948', fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  modalCancelText: { color: '#888', fontSize: 15 },
});