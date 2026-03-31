import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, Modal
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useT } from '../hooks/useT';

const API = 'http://127.0.0.1:8000';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const C = {
  sage:         '#4a7c59',
  sageMid:      '#b5d9bf',
  sageLight:    '#e8f5ec',
  sageDark:     '#2d5a3d',
  straw:        '#f5e6a3',
  strawMid:     '#e8c84a',
  strawDark:    '#7a6210',
  sky:          '#bde0f5',
  skyMid:       '#5bacd4',
  skyDark:      '#1e5f82',
  clay:         '#e8a87c',
  clayLight:    '#fdf0e6',
  clayDark:     '#7a3d15',
  cream:        '#faf7f0',
  parchment:    '#f0ead8',
  ink:          '#2c2416',
  inkMid:       '#5a4f3c',
  inkSoft:      '#8a7d68',
  white:        '#ffffff',
  border:       'rgba(74,124,89,0.18)',
  red:          '#c0392b',
  redLight:     'rgba(192,57,43,0.12)',
  redBorder:    '#e8a87c',
  purple:       '#7c5cbf',
  purpleLight:  'rgba(124,92,191,0.12)',
  purpleBorder: '#c4aee8',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function stopSpeaking() {
  if (Platform.OS !== 'web') return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { language, changeLanguage } = useLanguage();
  const t = useT();

  const langNames: Record<string, string> = {
    en: 'English', hi: 'Hindi', mr: 'Marathi'
  };

  const languages = [
    { code: 'en', label: 'English',  flag: '🇬🇧' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
    { code: 'mr', label: 'मराठी',   flag: '🇮🇳' },
  ];

  const [messages, setMessages]               = useState<Message[]>([]);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([{
    role: 'assistant',
    content: 'Namaste! I am your Agricultural Advisor. Ask me about crops, soil, pests, water, equipment, schemes, or weather. You can also tap 🎤 to speak!',
  }]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [streaming, setStreaming]   = useState(false);
  const [recording, setRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceReply, setVoiceReply] = useState(false);
  const [speaking, setSpeaking]     = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const scrollRef        = useRef<ScrollView>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const loadVoices = () => { window.speechSynthesis.getVoices(); };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => stopSpeaking();
  }, []);

  // ── Voice Input ──────────────────────────────────────────────

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
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      Alert.alert('Microphone Error', 'Could not access microphone. Allow mic permission and try again.');
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
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', blob, `recording.${ext}`);
      const res = await fetch(`${API}/chat/transcribe`, { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).detail ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      if (data.text) {
        setInput(data.text);
        setTimeout(() => sendMessageWithText(data.text), 300);
      } else {
        Alert.alert('Could not transcribe', 'Please try again or type your message.');
      }
    } catch (err: any) {
      Alert.alert('Transcription failed', err.message ?? 'Please type your message instead.');
    } finally {
      setTranscribing(false);
    }
  };

  // ── Voice Output ─────────────────────────────────────────────

  const speakReply = async (text: string) => {
    setSpeaking(true);
    stopSpeaking();

    if (Platform.OS !== 'web' || !('speechSynthesis' in window)) {
      setSpeaking(false);
      return;
    }

    const clean = text.replace(/[*#_`~]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);

    // Map app language codes → BCP-47 tags
    const langMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
    };
    utterance.lang   = langMap[language] ?? 'en-IN';
    utterance.rate   = language === 'en' ? 0.95 : 0.85;  // slightly slower for Indic scripts
    utterance.pitch  = 1.0;
    utterance.volume = 1.0;

    // Give the browser time to populate voices (needed on first load)
    const getVoices = (): Promise<SpeechSynthesisVoice[]> =>
      new Promise(resolve => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) { resolve(voices); return; }
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices());
        };
      });

    const voices = await getVoices();
    const targetLang = utterance.lang;           // e.g. "hi-IN"
    const targetCode = targetLang.split('-')[0]; // e.g. "hi"

    // Tier 1 — exact match (e.g. "hi-IN")
    let match = voices.find(v => v.lang === targetLang);

    // Tier 2 — same language, any region (e.g. "hi-*")
    if (!match) match = voices.find(v => v.lang.startsWith(targetCode + '-') || v.lang === targetCode);

    // Tier 3 — for Marathi, fall back to Hindi voice (both Devanagari, reasonably intelligible)
    if (!match && language === 'mr') {
      match = voices.find(v => v.lang.startsWith('hi'));
    }

    // Tier 4 — any Indian voice (at least keeps the accent)
    if (!match && language !== 'en') {
      match = voices.find(v => v.lang.endsWith('-IN') || v.lang.endsWith('_IN'));
    }

    // Do NOT fall back to English for non-English languages.
    // Set the voice only if we found one; leave it unset otherwise so the
    // browser engine auto-selects the best available voice for utterance.lang.
    if (match) utterance.voice = match;

    utterance.onend  = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeakingNow = () => { stopSpeaking(); setSpeaking(false); };

  // ── Send Message ─────────────────────────────────────────────

  const sendMessageWithText = async (text: string) => {
    if (!text.trim()) return;
    stopSpeaking();
    const newMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setDisplayMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, language: langNames[language] || 'English' }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      if (!res.body) throw new Error('No response body');
      setLoading(false);
      setStreaming(true);
      setDisplayMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
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
              const token = parsed.token || '';
              fullReply += token;
              setDisplayMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullReply };
                return updated;
              });
              scrollRef.current?.scrollToEnd({ animated: false });
            } catch { }
          }
        }
      }
      setMessages(prev => [...prev, { role: 'assistant', content: fullReply }]);
      if (voiceReply && fullReply) {
        setTimeout(() => speakReply(fullReply).catch(() => {}), 300);
      }
    } catch {
      setLoading(false);
      setDisplayMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error connecting. Please check the server is running.',
      }]);
    } finally {
      setLoading(false);
      setStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendMessage = () => sendMessageWithText(input);

  const handleLanguageChange = async (code: string) => {
    await changeLanguage(code);
    setShowLangModal(false);
  };

  // ── Render ────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Language Modal ── */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <View style={s.modalLeaf} />
              <Text style={s.modalTitle}>{t('Select Language')}</Text>
            </View>
            {languages.map(lang => (
              <TouchableOpacity
                key={lang.code}
                style={[s.langOption, language === lang.code && s.langOptionActive]}
                onPress={() => handleLanguageChange(lang.code)}
                activeOpacity={0.75}
              >
                <Text style={s.langOptionText}>{lang.flag}  {lang.label}</Text>
                {language === lang.code && (
                  <View style={s.checkPill}>
                    <Text style={s.checkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.closeModalBtn} onPress={() => setShowLangModal(false)} activeOpacity={0.85}>
              <Text style={s.closeModalText}>{t('Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerInner}>
          <View style={s.headerLeft}>
            <View style={s.headerBadge}>
              <View style={s.headerBadgeDot} />
              <Text style={s.headerBadgeText}>AGRI ADVISOR</Text>
            </View>
            <Text style={s.headerTitle}>{t('Farming Advisor')}</Text>
            <Text style={s.headerSub}>{t('Expert Agricultural Assistant')}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity style={s.langBtn} onPress={() => setShowLangModal(true)} activeOpacity={0.8}>
              <Text style={s.langBtnText}>
                {languages.find(l => l.code === language)?.flag}  {language.toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.voiceToggle, voiceReply && s.voiceToggleOn]}
              onPress={() => {
                const next = !voiceReply;
                if (voiceReply) stopSpeakingNow();
                setVoiceReply(next);
              }}
              activeOpacity={0.8}
            >
              <Text style={[s.voiceToggleText, voiceReply && s.voiceToggleTextOn]}>
                {voiceReply ? '🔊 ON' : '🔇 OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={s.messages}
        contentContainerStyle={s.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      >
        {displayMessages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isLastStreaming = streaming && i === displayMessages.length - 1;
          return (
            <View key={i} style={[s.messageRow, isUser ? s.messageRowUser : s.messageRowBot]}>
              {!isUser && (
                <View style={s.avatar}>
                  <Text style={s.avatarText}></Text>
                </View>
              )}
              <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleBot]}>
                <Text style={[s.bubbleText, isUser ? s.bubbleTextUser : s.bubbleTextBot]}>
                  {msg.content}
                  {isLastStreaming && <Text style={s.cursor}>▋</Text>}
                </Text>
              </View>
              {isUser && (
                <View style={s.avatarUser}>
                  <Text style={s.avatarUserText}>👤</Text>
                </View>
              )}
              {!isUser && msg.content.length > 0 && !streaming && (
                <TouchableOpacity
                  style={s.speakBtn}
                  onPress={() => speaking ? stopSpeakingNow() : speakReply(msg.content).catch(() => {})}
                  activeOpacity={0.75}
                >
                  <Text style={s.speakBtnText}>{speaking ? '⏹' : '🔊'}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {loading && (
          <View style={[s.messageRow, s.messageRowBot]}>
            <View style={s.avatar}><Text style={s.avatarText}></Text></View>
            <View style={[s.bubble, s.bubbleBot, s.bubbleTyping]}>
              <ActivityIndicator size="small" color={C.sage} />
              <Text style={s.typingText}>  {t('Advisor is thinking...')}</Text>
            </View>
          </View>
        )}
        {transcribing && (
          <View style={[s.messageRow, s.messageRowBot]}>
            <View style={s.avatar}><Text style={s.avatarText}></Text></View>
            <View style={[s.bubble, s.bubbleBot, s.bubbleTyping]}>
              <ActivityIndicator size="small" color={C.purple} />
              <Text style={[s.typingText, { color: C.purple }]}>  Transcribing your voice...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Recording Bar ── */}
      {recording && (
        <View style={s.recordingBar}>
          <View style={s.recordingDot} />
          <Text style={s.recordingText}>Recording… tap 🎤 to stop</Text>
        </View>
      )}

      {/* ── Input Row ── */}
      <View style={s.inputRow}>
        <TouchableOpacity
          style={[
            s.micBtn,
            recording    && s.micBtnRecording,
            transcribing && s.micBtnTranscribing,
          ]}
          onPress={recording ? stopRecording : startRecording}
          disabled={transcribing || streaming || loading}
          activeOpacity={0.8}
        >
          <Text style={s.micBtnText}>
            {transcribing ? '⏳' : recording ? '⏹' : '🎤'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={s.textInput}
          placeholder={t('Ask your farming question...')}
          placeholderTextColor={C.inkSoft}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          multiline
          editable={!streaming && !recording}
        />

        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || streaming) && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading || streaming || recording}
          activeOpacity={0.85}
        >
          <Text style={s.sendBtnText}>{streaming ? '⏳' : '➤'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(44,36,22,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  modalLeaf: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.sage },
  modalTitle: { fontSize: 16, fontWeight: '700', color: C.sageDark },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.cream,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  langOptionActive: { borderColor: C.sage, backgroundColor: C.sageLight },
  langOptionText: { fontSize: 15, color: C.ink, fontWeight: '500' },
  checkPill: {
    backgroundColor: C.sage,
    borderRadius: 100,
    width: 22, height: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  checkText: { color: C.white, fontSize: 12, fontWeight: '700' },
  closeModalBtn: {
    backgroundColor: C.sageDark,
    borderRadius: 12,
    padding: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  closeModalText: { color: C.white, fontSize: 14, fontWeight: '700' },

  // Header
  header: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerLeft: { flex: 1 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.straw,
    borderWidth: 1.5,
    borderColor: C.strawMid,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  headerBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.strawMid },
  headerBadgeText: { fontSize: 9, fontWeight: '700', color: C.strawDark, letterSpacing: 0.8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: C.sageDark },
  headerSub: { fontSize: 11, color: C.inkSoft, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  langBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: C.sageMid,
    backgroundColor: C.sageLight,
  },
  langBtnText: { color: C.sageDark, fontSize: 11, fontWeight: '700' },
  voiceToggle: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.parchment,
  },
  voiceToggleOn: { borderColor: C.sage, backgroundColor: C.sageLight },
  voiceToggleText: { fontSize: 11, fontWeight: '700', color: C.inkMid },
  voiceToggleTextOn: { color: C.sageDark },

  // Messages
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 12 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowBot:  { justifyContent: 'flex-start' },

  avatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.sageLight,
    borderWidth: 1.5, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 14 },
  avatarUser: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.straw,
    borderWidth: 1.5, borderColor: C.strawMid,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarUserText: { fontSize: 13 },

  bubble: { maxWidth: '72%', borderRadius: 16, padding: 12 },
  bubbleUser: {
    backgroundColor: C.sage,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  bubbleTyping: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: C.white },
  bubbleTextBot:  { color: C.ink },
  cursor: { color: C.sage, fontWeight: '700' },

  speakBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: C.sageLight,
    borderWidth: 1, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 2,
  },
  speakBtnText: { fontSize: 13 },

  typingText: { fontSize: 13, color: C.inkSoft },

  // Recording bar
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.redLight,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.redBorder,
    gap: 8,
  },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.red },
  recordingText: { color: C.red, fontSize: 13, fontWeight: '600' },

  // Input row
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.white,
    alignItems: 'flex-end',
    gap: 8,
  },
  micBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: C.sageLight,
    borderWidth: 1.5, borderColor: C.sageMid,
    justifyContent: 'center', alignItems: 'center',
  },
  micBtnRecording: {
    backgroundColor: C.redLight,
    borderColor: C.red,
  },
  micBtnTranscribing: {
    backgroundColor: C.purpleLight,
    borderColor: C.purpleBorder,
  },
  micBtnText: { fontSize: 20 },

  textInput: {
    flex: 1,
    backgroundColor: C.cream,
    color: C.ink,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1.5,
    borderColor: C.sageMid,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: C.sageDark,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnText: { color: C.white, fontSize: 18 },
});