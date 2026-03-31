# Multilingual Farming Advisor - Testing Guide

## Prerequisites
- Backend running: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
- Frontend running: `npm start` (Expo dev server on port 8081)
- `.env` file has valid `GROQ_API_KEY`
- Using a web browser (voice features work best on web/Expo web)

## Test Cases

### Test 1: Initial Startup ✅
**Goal**: Verify app launches with English as default language

**Steps**:
1. Start frontend dev server
2. Open http://localhost:8081 in browser
3. Login with test account
4. Navigate to home page

**Expected Results**:
- [ ] App loads successfully
- [ ] All UI text in English
- [ ] Home page displays all feature buttons
- [ ] No console errors

---

### Test 2: Language Switching via Settings 🌐
**Goal**: Verify language changes persist across app

**Steps**:
1. From home page, tap ⚙️ Settings
2. Tap "हिन्दी — Hindi"
3. Verify alert shows "✅ Language changed!"
4. Tap Back button
5. Observe home page

**Expected Results**:
- [ ] UI text changes to Hindi
- [ ] Feature cards show Hindi labels
- [ ] Language preference saved in AsyncStorage

**Check with DevTools**:
```javascript
// In browser console:
localStorage.getItem('app_language') // Should show 'hi'
```

---

### Test 3: Language Change in Chat 💬
**Goal**: Verify quick language selector in chat works

**Steps**:
1. From home, tap "🤖 AI Farmer Advisory"
2. Chat page loads
3. In header, tap "🇬🇧 EN" button
4. Modal appears with language options
5. Tap "🇮🇳 हिन्दी"
6. Modal closes, chat header shows "🇮🇳 HI"

**Expected Results**:
- [ ] Language selector modal appears
- [ ] Current language has checkmark ✓
- [ ] Selecting new language modal closes immediately
- [ ] Header updates to show new language flag and code
- [ ] Initial advisor greeting text remains (not retranslated)

---

### Test 4: Text Translation in Chat 🔤
**Goal**: Verify UI strings auto-translate

**Steps**:
1. In chat (still in Hindi), observe:
   - Placeholder text for input field
   - Voice toggle label
   - Mic button tooltip (if any)
2. Tap anywhere in input field
3. Should show: "अपना कृषि प्रश्न पूछें..." (Hindi equivalent)

**Expected Results**:
- [ ] Input placeholder in Hindi
- [ ] Voice toggle shows translated text
- [ ] No visible delays in translations
- [ ] Text is readable (proper Unicode)

---

### Test 5: Chat in English 🇬🇧
**Goal**: Verify chatbot responds in English first language

**Steps**:
1. Switch language to English via header selector
2. Type: "What is the best crop for sandy soil?"
3. Wait for response to complete
4. Read advisor response

**Expected Results**:
- [ ] Chat accepts English question
- [ ] Backend receives question with `language: "English"`
- [ ] Response appears in English
- [ ] Response includes farming-specific advice
- [ ] Text streaming works smoothly

**Example Response Should Include**:
- Crop recommendations
- Soil preparation tips
- Irrigation considerations
- NOT: Sustainability/recycling content (old EcoBot behavior)

---

### Test 6: Chat in Hindi 🇮🇳
**Goal**: Verify chatbot responds in Hindi with appropriate content

**Steps**:
1. Switch language to Hindi via header selector
2. Type Hindi question: "मेरी फसल को पीला पड़ जाता है, क्या करूं?"
   (Translation: "My crop turns yellow, what should I do?")
3. Wait for response
4. Read the response in Hindi

**Expected Results**:
- [ ] Question accepted even though in Hindi
- [ ] Advisor responds in Hindi
- [ ] Response includes:
  - Nitrogen deficiency discussion (yellow crop symptom)
  - Fertilizer recommendations
  - Watering advice
  - Agricultural terminology in Hindi

**Example Hindi Response Should Include**:
- नाइट्रोजन की कमी (Nitrogen deficiency)
- यूरिया या अन्य खाद (Urea or other fertilizer)
- सिंचाई (Irrigation)
- NOT: English mixed in (unless for technical terms)

---

### Test 7: Chat in Marathi 🇮🇳
**Goal**: Verify chatbot works in third language

**Steps**:
1. Switch language to "मराठी" (Marathi)
2. Type Marathi question: "माझ्या भाजीपालात कीटक आल्य, काय करावे?"
   (Translation: "My vegetables have pests, what to do?")
3. Wait for response

**Expected Results**:
- [ ] Question interpreted correctly
- [ ] Response in Marathi
- [ ] Contains agricultural pest management advice
- [ ] Uses Marathi farming terminology

---

### Test 8: Voice Input - Transcription 🎤
**Goal**: Verify microphone input works

**Prerequisites**:
- Running on Firefox, Chrome, or Safari (not all browsers support)
- Browser permission granted for microphone

**Steps**:
1. Stay in any language (e.g., English)
2. Tap 🎤 (microphone button)
3. Recording indicator appears
4. Speak clearly: "What is the best fertilizer for rice?"
5. Tap 🎤 again to stop recording
6. Wait for transcription

**Expected Results**:
- [ ] Recording starts (visual feedback)
- [ ] Microphone is accessible
- [ ] Speech recognized and converted to text
- [ ] Text appears in input field
- [ ] Message automatically sent after transcription

**Debug Output Visible**:
- Browser console should show successful transcription response
- No CORS errors

---

### Test 9: Voice Output - Text-to-Speech 🔊
**Goal**: Verify chatbot responses are spoken

**Prerequisites**:
- Using web browser with Web Speech API support
- System volume is on
- Browser has speaker/headphone connected

**Steps**:
1. In chat, toggle 🔊 to ON (should change to blue)
2. Ask a question
3. Wait for response to complete streaming
4. Listen for audio

**Expected Results**:
- [ ] Voice toggle changes appearance when ON
- [ ] After response completes, hear voice (or see browser trying to speak)
- [ ] Voice is in correct language for selected language
  - English: English accent  
  - Hindi: Hindi voice (en-IN)
  - Marathi: Marathi voice (mr-IN)

**If No Audio**:
- Check browser console for errors
- Verify system volume
- Test browser's speech synthesis: `speechSynthesis.speak(new SpeakSynthesisUtterance('test'))`

---

### Test 10: Voice Output - Different Languages 🌍
**Goal**: Verify voice changes with language

**Steps**:
1. Chat at English, toggle 🔊 ON
2. Ask question and listen to response
3. Note the voice characteristics
4. Switch to Hindi via header
5. Ask another question
6. Listen to response
7. Note voice differences

**Expected Results**:
- [ ] Different voice when language changes
- [ ] English response sounds like English accent
- [ ] Hindi response sounds distinctly different
- [ ] Marathi response different from both

---

### Test 11: Manual Message Playback 🔊
**Goal**: Verify can replay any message's audio

**Steps**:
1. In chat, don't toggle voice ON
2. Ask a question (no auto-speak)
3. Response appears without audio
4. Hover over/tap the response bubble
5. 🔊 button appears next to message
6. Tap 🔊 button
7. Listen to audio playback

**Expected Results**:
- [ ] 🔊 button visible on assistant messages
- [ ] Clicking plays audio of that message
- [ ] Audio speaks the message in current language
- [ ] Can stop audio by clicking ⏹️ button

---

### Test 12: Language Persistence Across Page Navigation 📍
**Goal**: Verify language stays set when navigating

**Steps**:
1. Set language to Hindi in chat
2. Navigate to home page
3. Go to Settings
4. Tap another feature (e.g., Biogas)
5. Come back to chat

**Expected Results**:
- [ ] Language stays as Hindi throughout navigation
- [ ] UI remains in Hindi on all pages
- [ ] No page resets language to English

---

### Test 13: Translation Caching Performance ⚡
**Goal**: Verify UI translations are cached efficiently

**Steps**:
1. Start in English
2. Switch to Hindi (first time)
3. Observe response time for text to translate
4. Note how long it takes
5. Switch back to English
6. Switch to Hindi again (second time)
7. Compare load time

**Expected Results**:
- [ ] First switch: Slight delay (1-2 sec) as texts translate
- [ ] Second switch: Nearly instant (cached)
- [ ] No noticeable UI lag or freezing

---

### Test 14: Error Handling - No API Key 🔴
**Goal**: Verify graceful error if GROQ_API_KEY missing

**Steps**:
1. Remove or corrupt `GROQ_API_KEY` in `.env`
2. Restart backend
3. Try to send chat message

**Expected Results**:
- [ ] Error message shown: "Error connecting. Please check the server is running."
- [ ] App doesn't crash
- [ ] Console shows helpful debug message

---

### Test 15: Error Handling - Network Down 🌐
**Goal**: Verify app handles disconnection

**Steps**:
1. Stop backend server (Ctrl+C)
2. Try to send chat message
3. Wait for timeout (~5 seconds)

**Expected Results**:
- [ ] Error message displayed
- [ ] No console errors
- [ ] Can restart server and try again

---

### Test 16: Concurrent Users - Language Independence 👥
**Goal**: Verify each browser tab has independent language

**Steps** (Advanced):
1. Open chat in Tab A (English)
2. Open chat in Tab B (Hindi)
3. Verify Tab A shows English
4. Verify Tab B shows Hindi
5. Switch language in Tab A to Hindi
6. Check Tab B still shows Hindi
7. Check Tab A now shows Hindi

**Expected Results**:
- [ ] Each browser instance has own language state
- [ ] Language changes in one tab don't affect others
- [ ] AsyncStorage maintains separate state

---

## Performance Benchmarks

Record these for optimization tracking:

| Test | Expected Time | Actual Time |
|------|---|---|
| Initial language load | < 2s | ___ |
| Language switch (cold) | 2-3s | ___ |
| Language switch (cached) | < 500ms | ___ |
| Chat message send | 3-5s | ___ |
| Translation lookup | 100-200ms | ___ |
| Voice input (transcribe) | 2-5s | ___ |
| Voice output (speak) | Immediate | ___ |

---

## Browser Compatibility

### Voice Features (Transcription & Speech)
- ✅ Chrome 25+
- ✅ Firefox 25+
- ✅ Safari 14+
- ✅ Edge 79+
- ❌ Internet Explorer (not supported)
- ⚠️ Mobile browsers (limited support, varies by OS)

### Translation Features
- ✅ All browsers (uses API)

### Storage (AsyncStorage/LocalStorage)
- ✅ All browsers with localStorage support

---

## Troubleshooting Checklist

### If Chat Returns English Responses in Hindi Mode
- [ ] Check network tab - verify language parameter sent
- [ ] Check backend logs - confirm language being received
- [ ] Restart backend and try again
- [ ] Check if GROQ_API_KEY is valid

### If Voice Doesn't Work
- [ ] Check browser is compatible (Chrome/Firefox/Safari)
- [ ] Check microphone/speaker connected and working
- [ ] Try fresh browser tab (clear cache)
- [ ] Check browser permissions (microphone access)
- [ ] Test with different message (simpler text)

### If Translations Show English
- [ ] Check network tab for `/chat/translate-text` calls
- [ ] Verify Groq API key working
- [ ] Clear AsyncStorage and try again
- [ ] Check browser console for errors

### If Language Won't Change
- [ ] Hard refresh page (Ctrl+Shift+R)
- [ ] Clear browser cache completely
- [ ] Check DevTools → Application → LocalStorage for `app_language`
- [ ] Try different language first

---

## Success Criteria

✅ **All Tests Pass When**:
1. English chat works with English responses
2. Hindi chat works with Hindi responses  
3. Marathi chat works with Marathi responses
4. Voice input transcribes to text
5. Voice output speaks responses
6. Languages change instantly with no freezing
7. Language persists across navigation
8. No console errors
9. Responses are farming-specific, not generic

---

## Regression Testing

Run these tests before each deployment:

- [ ] Default language is English
- [ ] Settings language selector works
- [ ] Chat header language selector works
- [ ] Boolean language persist in storage
- [ ] Response includes farm content, not sustainability
- [ ] Voice toggle appears and functions
- [ ] Multiple language switches don't cause memory leaks
- [ ] Translations don't show encoding issues (proper Unicode)

---

**Last Updated**: March 30, 2026  
**Status**: Complete implementation ready for testing
