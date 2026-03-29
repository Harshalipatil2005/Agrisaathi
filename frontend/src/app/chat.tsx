import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useT } from '../hooks/useT';

const API = 'http://127.0.0.1:8000';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Browser TTS — speaks the reply aloud
function speakText(text: string, lang: string) {
  if (Platform.OS !== 'web') return;
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel(); // stop any ongoing speech

  const clean = text.replace(/[*#_`~]/g, '').trim(); // strip markdown
  const utterance = new SpeechSynthesisUtterance(clean);

  // Pick voice language
  const langMap: Record<string, string> = {
    en: 'en-IN',
    hi: 'hi-IN',
    mr: 'mr-IN',
  };
  utterance.lang = langMap[lang] || 'en-IN';
  utterance.rate = 0.95;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
  if (match) utterance.voice = match;

  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (Platform.OS !== 'web') return;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export default function ChatScreen() {
  const { user, getValidToken } = useAuth();
  const { language } = useLanguage();
  const t = useT();

  const langNames: Record<string, string> = {
    en: 'English', hi: 'Hindi', mr: 'Marathi'
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🌱 Hi! I am EcoBot, your sustainability assistant. Ask me anything about environment, recycling, carbon footprint, or tap 🎤 to speak!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Voice states
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceReply, setVoiceReply] = useState(false); // auto-speak replies
  const [speaking, setSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  // Load voices on mount (browser needs this)
  useEffect(() => {
    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    return () => stopSpeaking();
  }, []);

  // ── VOICE INPUT ─────────────────────────────────────────────
  const startRecording = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice input is available on web only');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Use webm if supported, otherwise ogg
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
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(blob, mimeType);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      Alert.alert('Microphone Error', 'Could not access microphone. Allow mic permission and try again.');
      console.log('Mic error:', err);
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
      const freshToken = await getValidToken();
      const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
      const formData = new FormData();
      formData.append('file', blob, `recording.${ext}`);

      const res = await fetch(`${API}/chat/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData
      });

      const data = await res.json();
      console.log('Transcription:', data);

      if (data.text) {
        setInput(data.text);
        // Auto-send after transcription
        setTimeout(() => sendMessageWithText(data.text), 300);
      } else {
        Alert.alert('Could not transcribe', 'Please try again or type your message.');
      }
    } catch (err) {
      console.log('Transcribe error:', err);
      Alert.alert('Transcription failed', 'Please type your message instead.');
    } finally {
      setTranscribing(false);
    }
  };

  // ── VOICE OUTPUT ─────────────────────────────────────────────
  const speakReply = (text: string) => {
    setSpeaking(true);
    stopSpeaking();

    if (Platform.OS === 'web' && 'speechSynthesis' in window) {
      const clean = text.replace(/[*#_`~]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(clean);
      const langMap: Record<string, string> = { en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN' };
      utterance.lang = langMap[language] || 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => v.lang.startsWith(utterance.lang.split('-')[0]));
      if (match) utterance.voice = match;

      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  };

  const stopSpeakingNow = () => {
    stopSpeaking();
    setSpeaking(false);
  };

  // ── SEND MESSAGE ─────────────────────────────────────────────
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
      const freshToken = await getValidToken();
      const res = await fetch(`${API}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${freshToken}`
        },
        body: JSON.stringify({
          messages: updatedMessages,
          language: langNames[language] || 'English'
        })
      });

      if (!res.ok) throw new Error('Server error');
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
        const lines = chunk.split('\n');

        for (const line of lines) {
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

      // Auto-speak reply if voice mode is on
      if (voiceReply && fullReply) {
        setTimeout(() => speakReply(fullReply), 300);
      }

    } catch (e) {
      setLoading(false);
      setDisplayMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error connecting. Please try again.'
      }]);
    } finally {
      setLoading(false);
      setStreaming(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const sendMessage = () => sendMessageWithText(input);

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerText}>🌱 {t('EcoBot')}</Text>
            <Text style={styles.headerSub}>{t('AI Sustainability Assistant')}</Text>
          </View>
          {/* Voice reply toggle */}
          <TouchableOpacity
            style={[styles.voiceToggle, voiceReply && styles.voiceToggleOn]}
            onPress={() => {
              if (voiceReply) stopSpeakingNow();
              setVoiceReply(v => !v);
            }}
          >
            <Text style={styles.voiceToggleText}>{voiceReply ? '🔊 ON' : '🔇 OFF'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
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

            {/* Speak button on assistant messages */}
            {msg.role === 'assistant' && msg.content.length > 0 && !streaming && (
              <TouchableOpacity
                style={styles.speakBtn}
                onPress={() => {
                  if (speaking) {
                    stopSpeakingNow();
                  } else {
                    speakReply(msg.content);
                  }
                }}
              >
                <Text style={styles.speakBtnText}>{speaking ? '⏹️' : '🔊'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {loading && (
          <View style={styles.botBubble}>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#22c55e" />
              <Text style={styles.typingText}> {t('EcoBot is thinking...')}</Text>
            </View>
          </View>
        )}

        {transcribing && (
          <View style={styles.botBubble}>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color="#8b5cf6" />
              <Text style={styles.typingText}> Transcribing your voice...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Recording indicator */}
      {recording && (
        <View style={styles.recordingBar}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>Recording... tap 🎤 to stop</Text>
        </View>
      )}

      {/* Input row */}
      <View style={styles.inputRow}>
        {/* Mic button */}
        <TouchableOpacity
          style={[
            styles.micBtn,
            recording && styles.micBtnActive,
            transcribing && styles.micBtnTranscribing
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
          placeholder={t('Ask EcoBot...')}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    backgroundColor: '#1a1a1a', padding: 20, paddingTop: 50,
    borderBottomWidth: 1, borderBottomColor: '#333'
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { fontSize: 22, fontWeight: 'bold', color: '#22c55e' },
  headerSub: { fontSize: 12, color: '#888', marginTop: 2 },

  voiceToggle: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#444', backgroundColor: '#0f0f0f'
  },
  voiceToggleOn: { borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)' },
  voiceToggleText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  messages: { flex: 1 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  bubble: { maxWidth: '78%', borderRadius: 16, padding: 12 },
  userBubble: { backgroundColor: '#22c55e', alignSelf: 'flex-end', borderBottomRightRadius: 4, marginLeft: 'auto' },
  botBubble: {
    backgroundColor: '#1a1a1a', alignSelf: 'flex-start',
    borderWidth: 1, borderColor: '#333', borderBottomLeftRadius: 4
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  botText: { color: '#ddd' },
  cursor: { color: '#22c55e', fontWeight: 'bold' },

  speakBtn: {
    marginLeft: 6, width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center'
  },
  speakBtnText: { fontSize: 14 },

  typingDots: { flexDirection: 'row', alignItems: 'center', padding: 4 },
  typingText: { color: '#888', fontSize: 13 },

  recordingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: '#ef4444'
  },
  recordingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ef4444', marginRight: 8
  },
  recordingText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row', padding: 12, borderTopWidth: 1,
    borderTopColor: '#333', backgroundColor: '#1a1a1a', alignItems: 'flex-end'
  },

  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151',
    justifyContent: 'center', alignItems: 'center', marginRight: 8
  },
  micBtnActive: {
    backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444'
  },
  micBtnTranscribing: {
    backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8b5cf6'
  },
  micBtnText: { fontSize: 20 },

  input: {
    flex: 1, backgroundColor: '#0f0f0f', color: '#fff', borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    borderWidth: 1, borderColor: '#333', maxHeight: 100
  },
  sendBtn: {
    backgroundColor: '#22c55e', borderRadius: 24, width: 44, height: 44,
    justifyContent: 'center', alignItems: 'center', marginLeft: 8
  },
  sendText: { color: '#fff', fontSize: 18 },
});