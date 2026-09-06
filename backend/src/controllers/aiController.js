const fs = require('fs/promises');

const CONVERSATION_STORE = new Map();
const MAX_HISTORY_MESSAGES = 12;

const pruneStore = () => {
  if (CONVERSATION_STORE.size < 800) return;
  const keys = Array.from(CONVERSATION_STORE.keys());
  for (let i = 0; i < 200; i++) CONVERSATION_STORE.delete(keys[i]);
};

const updateConversationHistory = (conversationId, userId, userMessage, aiReply) => {
  pruneStore();
  const key = `${userId || 'guest'}::${conversationId || 'default'}`;
  const current = CONVERSATION_STORE.get(key) || { id: conversationId, userId, history: [], createdAt: Date.now() };
  if (userMessage) current.history.push({ role: 'user', content: String(userMessage).slice(0, 4000), ts: Date.now() });
  if (aiReply) current.history.push({ role: 'assistant', content: String(aiReply).slice(0, 4000), ts: Date.now() });
  if (current.history.length > MAX_HISTORY_MESSAGES) current.history = current.history.slice(-MAX_HISTORY_MESSAGES);
  CONVERSATION_STORE.set(key, current);
  return current.history;
};

const getConversationHistory = (conversationId, userId, clientHistory = []) => {
  pruneStore();
  const key = `${userId || 'guest'}::${conversationId || 'default'}`;
  const stored = CONVERSATION_STORE.get(key)?.history || [];
  const merged = [...stored];
  for (const m of (Array.isArray(clientHistory) ? clientHistory : [])) {
    if (!m || !m.text) continue;
    merged.push({ role: m.sender === 'ai' || m.role === 'assistant' ? 'assistant' : 'user', content: String(m.text).slice(0, 4000), ts: Date.now() });
  }
  const deduped = [];
  const seen = new Set();
  for (const m of merged) {
    const sig = `${m.role}:${m.content.slice(0, 80)}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    deduped.push(m);
  }
  const result = deduped.slice(-MAX_HISTORY_MESSAGES);
  CONVERSATION_STORE.set(key, { id: conversationId, userId, history: result, createdAt: Date.now() });
  return result;
};

// ===== GEMINI API (Google AI — free tier available) =====
const callGeminiAPI = async ({ message, history, file }) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  if (!apiKey) return { reply: null, usedFallback: true, error: 'No GEMINI_API_KEY' };

  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const SYSTEM_PROMPT = `Kamu adalah AI COMPANION NOVARIX — asisten digital yang sangat pintar, membantu, dan berpengetahuan luas seperti Google Gemini.

IDENTITAS DAN GAYA BICARA:
- Gunakan BAHASA INDONESIA SANTAI, GAUL, NATURAL, kayak temen seumuran.
- Boleh pakai "gue" & "lu", sisipkan kata kayak "deh", "sih", "nih", "dong", "wkwk" kalo pas.
- JAWAB PERTANYAAN DENGAN AKURAT, LENGKAP, BERGUNA — seperti Google Gemini.
- Bisa menjawab pertanyaan umum, sains, teknologi, sejarah, matematika, programming, dll.
- KALO USER CURHAT: jadi pendengar yang baik, validasi perasaan dulu, baru kasih masukan santai.
- EMOTICON secukupnya: ✨, 💙, 🔥, 🫂, 😎
- JANGAN PERNAH mulai dengan sapaan template robotik ("I am here to help", "Aku siap membantu"). Langsung ke inti.
- Jika user bertanya sesuatu, jawab dengan lengkap dan akurat, bukan hanya template.

KEMAMPUAN:
- Menjawab pertanyaan umum dengan pengetahuan luas
- Analisis lampiran foto/dokumen dengan detail
- Membantu coding, debugging, dan teknologi
- Curhat cinta, stres kuliah/kantor, masalah temen
- Resep masakan, lirik lagu, rekomendasi
- Semua bahasa: Indonesia, Inggris, dll.

Jika ada riwayat percakapan, LANJUTKAN konteksnya. JANGAN mengulang sapaan awal di tengah obrolan.`;

  // Build conversation messages
  const contents = [];
  for (const entry of history) {
    contents.push({
      role: entry.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: entry.content }],
    });
  }

  // Build user message parts
  const userParts = [{ text: message }];

  // Handle image attachments
  if (file?.mimetype?.startsWith('image/')) {
    try {
      const imageBuffer = await fs.readFile(file.path);
      const base64Image = imageBuffer.toString('base64');
      userParts.push({
        inlineData: {
          mimeType: file.mimetype,
          data: base64Image,
        },
      });
    } catch (err) {
      console.warn('[Gemini] Failed to read image:', err.message);
    }
  }

  // Handle document attachments
  if (file && !file.mimetype?.startsWith('image/')) {
    try {
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
        const docText = (await fs.readFile(file.path, 'utf8')).slice(0, 20000);
        userParts[0].text = `${message}\n\n[Isi dokumen ${file.originalname}]:\n${docText}`;
      }
    } catch (err) {
      console.warn('[Gemini] Failed to read document:', err.message);
    }
  }

  contents.push({ role: 'user', parts: userParts });

  const requestBody = {
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.85,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('[Gemini] API error:', response.status, errBody.slice(0, 200));
      return { reply: null, usedFallback: true, error: `Gemini status ${response.status}` };
    }

    const data = await response.json();
    const candidates = data.candidates || [];
    if (candidates.length === 0) return { reply: null, usedFallback: true, error: 'Empty Gemini response' };

    const content = candidates[0].content;
    const textParts = (content?.parts || []).filter((p) => p.text).map((p) => p.text);
    const reply = textParts.join('').trim();

    if (!reply) return { reply: null, usedFallback: true, error: 'Empty Gemini text' };

    return { reply, usedFallback: false };
  } catch (err) {
    console.error('[Gemini] Request failed:', err.message);
    return { reply: null, usedFallback: true, error: err.message };
  }
};

// ===== OPENAI API (GPT-4o / GPT-4o-mini) =====
const callOpenAIAPI = async ({ message, history, file }) => {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return { reply: null, usedFallback: true, error: 'No API key' };

  const endpoint = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const SYSTEM_PROMPT = `Kamu adalah AI COMPANION NOVARIX — asisten digital yang sangat pintar, membantu, dan berpengetahuan luas.
Gunakan BAHASA INDONESIA SANTAI, GAUL, NATURAL, kayak temen seumuran. Boleh pakai "gue" & "lu".
JAWAB PERTANYAAN DENGAN AKURAT, LENGKAP, BERGUNA. Bisa menjawab pertanyaan umum, sains, teknologi, coding, dll.
JANGAN PERNAH mulai dengan sapaan template robotik. Langsung ke inti.
Jika ada riwayat percakapan, LANJUTKAN konteksnya.`;

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  for (const entry of history) {
    messages.push({ role: entry.role, content: entry.content });
  }

  const userContent = [{ type: 'text', text: message }];
  if (file?.mimetype?.startsWith('image/')) {
    try {
      const image = (await fs.readFile(file.path)).toString('base64');
      userContent.push({ type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${image}` } });
    } catch {}
  } else if (file) {
    try {
      if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv') {
        const docText = (await fs.readFile(file.path, 'utf8')).slice(0, 30000);
        userContent.push({ type: 'text', text: `Isi dokumen ${file.originalname}:\n${docText}` });
      }
    } catch {}
  }
  messages.push({ role: 'user', content: userContent });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, temperature: 0.78, messages }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return { reply: null, usedFallback: true, error: `OpenAI status ${response.status}` };
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || null;
    if (!raw) return { reply: null, usedFallback: true, error: 'Empty OpenAI payload' };
    return { reply: raw, usedFallback: false };
  } catch (err) {
    return { reply: null, usedFallback: true, error: err.message };
  }
};

// ===== LOCAL FALLBACK (built-in knowledge) =====
const generateLocalReply = (message, context = 'general', file = null) => {
  const normalized = String(message).trim().toLowerCase();
  const indonesian = /\b(apa|bagaimana|gimana|cara|saya|aku|kamu|tolong|bisa|ingin|mau|dengan|untuk|dan|tidak|gue|lu|gw|lo|dong|yah|nih|wkwk|sih|deh|kok)\b/i.test(message);

  if (file) {
    return indonesian
      ? 'File udah diterima ✨ Kalo mau analisis detail, nyalain AI provider di server biar bisa baca isinya lebih cerdas ya.'
      : 'File received ✨ Enable the AI provider on the server for deeper analysis.';
  }

  // Smart local responses
  if (/\?|apa|bagaimana|gimana|how|what|why|cara|kenapa/i.test(normalized)) {
    if (/novarix|fitur|cara pakai|upload|posting|story|chat|grup|call|kamera|editor/i.test(normalized)) {
      return indonesian
        ? 'Novarix punya banyak fitur keren! 📱 Upload postingan lewat tombol +, bikin Story/Boomerang, Chat sama temen, bikin Grup, Video/Voice Call, AI Companion buat nemenin, dan masih banyak lagi. Tinggal eksplor dari menu nav aja ya! ✨'
        : 'Novarix has tons of cool features! 📱 Upload posts via the + button, create Stories/Boomerang, Chat with friends, make Groups, Video/Voice Calls, AI Companion, and more. Explore from the nav menu! ✨';
    }
    if (/python|javascript|coding|program|html|css|react|node|api|database|sql|debug/i.test(normalized)) {
      return indonesian
        ? 'Tentang programming, gue bisa bantu! 🔥 Sebutin spesifik bahasa/framework-nya, kasih contoh kode atau error-nya, nanti gue jelasin langkah per langkah biar jelas. Mau yang basic atau advanced? 💻'
        : 'Programming help? 🔥 Tell me the specific language/framework, share some code or the error, and I will walk you through it step by step. Basic or advanced? 💻';
    }
    if (/matematika|hitung|rumus|algebra|statistika|kalkulus|integral/i.test(normalized)) {
      return indonesian
        ? 'Matematika? Siap gue bantu! 🧮 Kasih soal atau rumus spesifiknya, nanti gue breakdown penyelesaiannya step by step biar gampang dipahami. Mau yang dasar atau lanjutan?'
        : 'Math help? 🧮 Give me the specific problem or formula and I will break down the solution step by step. Basic or advanced?';
    }
    if (/cuaca|rekomendasi|saran|tips|saran/i.test(normalized)) {
      return indonesian
        ? 'Tentu! Gue punya banyak rekomendasi 🔥 Mau soal makanan, film, musik, tempat wisata, produktivitas, atau apapun? Spesifik dikit biar rekomendasinya nendang! ✨'
        : 'Sure! I have tons of recommendations 🔥 Food, movies, music, travel, productivity — tell me what you need! ✨';
    }
  }

  // Topic-based responses
  if (/cinta|suka|naksir|pacar|gebetan|perasaan|love|crush|relationship|dating|pdkt/i.test(normalized)) {
    return indonesian
      ? 'Kasmaran nih ya ✨ Perasaan lu itu NORMAL, ga usah malu. Mulai dari chat ringan, tanya kabar atau hal yang dia suka. Tunjukin ketertarikan tanpa bikin dia tertekan. Kalau akhirnya ditolak, keberanian lu buat nyoba udah WIN kok 💙'
      : 'Crush vibes ✨ Your feelings are totally normal. Start light, be sincere without pressure. Whatever the answer, being brave already makes you a winner 💙';
  }

  if (/sedih|cemas|stress|stres|curhat|capek|lelah|worried|sad|anxious|pusing|bosen/i.test(normalized)) {
    return indonesian
      ? 'Gue dengar ya 🫂 Hari ini lagi berat ya? Perasaan lu VALID, ga usah merasa lemah. Ambil napas dalem, minum air, atau curhatin semua ke gue. Yang penting lu survive dulu hari ini, sisanya nyusul 💙'
      : 'I hear you 🫂 Rough day? Your feelings are valid. Breathe, hydrate, or rant it all out to me. Today the goal is just getting through it 💙';
  }

  return indonesian
    ? 'Gue ngerti! 💪 Mau cerita lebih detail lagi biar gue bisa bantu lebih spesifik? Atau ada yang lain yang mau ditanyain? Gue siap bantu apapun! ✨'
    : 'Got it! 💪 Want to tell me more so I can help specifically? I am here for whatever you need! ✨';
};

// ===== MAIN AI CHAT HANDLER =====
const aiChat = async (req, res) => {
  try {
    const userId = req.userId;
    const { message, context, conversation_id: conversationIdBody, history: clientHistoryRaw } = req.body;
    const conversationId = String(conversationIdBody || req.body.conversationId || req.headers['x-conversation-id'] || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ message: 'Pesan kosong, isinya apa ya?' });
    }
    if (message.length > 10000) {
      return res.status(400).json({ message: 'Pesan terlalu panjang (maksimal 10.000 karakter)' });
    }

    const clientHistory = Array.isArray(clientHistoryRaw)
      ? clientHistoryRaw.slice(-12).filter((entry) => entry && typeof entry === 'object')
      : [];
    const history = getConversationHistory(conversationId, userId, clientHistory);

    let providerResult = { reply: null, usedFallback: true };

    // Strategy: Try Gemini first → OpenAI → Local fallback
    providerResult = await callGeminiAPI({ message: message.trim(), history, file: req.file });

    if (!providerResult.reply || providerResult.usedFallback) {
      console.log('[AI] Gemini unavailable, trying OpenAI...');
      providerResult = await callOpenAIAPI({ message: message.trim(), history, file: req.file });
    }

    let reply = providerResult.reply;
    if (!reply || providerResult.usedFallback) {
      console.log('[AI] Using local fallback reply');
      reply = generateLocalReply(message, context, req.file);
    }

    // Store conversation
    updateConversationHistory(conversationId, userId, message.trim(), reply);

    res.json({
      reply,
      conversation_id: conversationId,
      attachment: req.file ? {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
      } : null,
      context: context || 'general',
      used_fallback: !!providerResult.usedFallback,
      provider: providerResult.usedFallback ? 'local' : 'gemini/openai',
      userId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({ message: 'Server Novarix lagi nge-hang bentar, coba lagi dong 🙏' });
  }
};

const suggestCaption = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });
    const captions = [
      "Living my best life! ✨",
      "This moment is everything 💙",
      "Good vibes only 🔥",
      "Making memories 📸",
      "Serenity in every frame 🌿",
    ];
    res.json({ suggestedCaption: captions[Math.floor(Math.random() * captions.length)], imageUrl, confidence: 0.85 });
  } catch (err) {
    console.error('Suggest caption error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const detectNSFW = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: 'Image URL is required' });
    res.json({ imageUrl, isNSFW: false, confidence: 0.95, categories: [], message: 'NSFW detection stub' });
  } catch (err) {
    console.error('Detect NSFW error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { aiChat, suggestCaption, detectNSFW, generateCompanionReply: generateLocalReply };
