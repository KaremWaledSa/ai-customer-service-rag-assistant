import React, { useState, useRef, useEffect } from 'react';

// ==================== CONFIGURATION ====================
// ⚠️ IMPORTANT: In production, NEVER put API keys in frontend code!
// Use environment variables or a backend server

const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY_HERE'; // Replace with your key

// ==================== SIMULATED VECTOR DATABASE ====================
const createEmbedding = (text) => {
  const words = text.toLowerCase().split(/\s+/);
  const keywords = {
    'تعب': 'fatigue', 'مليت': 'bored', 'دايت': 'diet', 'وزن': 'weight',
    'ثبت': 'plateau', 'نزل': 'lost', 'زاد': 'gained', 'أكل': 'eat',
    'برجر': 'cheat', 'بيتزا': 'cheat', 'حلى': 'sweets', 'عزيمة': 'social',
    'صداع': 'headache', 'تعبان': 'tired', 'طاقة': 'energy', 'نوم': 'sleep',
    'موعد': 'appointment', 'جدول': 'schedule', 'مكمل': 'supplement',
    'ماء': 'water', 'رياضة': 'exercise', 'مشي': 'walking', 'حامل': 'pregnant',
    'سكر': 'sugar', 'ضغط': 'pressure', 'كوليسترول': 'cholesterol',
    'فطور': 'breakfast', 'غدا': 'lunch', 'عشا': 'dinner', 'سناك': 'snack'
  };
  
  const features = {};
  words.forEach(word => {
    Object.keys(keywords).forEach(key => {
      if (word.includes(key)) {
        features[keywords[key]] = (features[keywords[key]] || 0) + 1;
      }
    });
  });
  return features;
};

const cosineSimilarity = (emb1, emb2) => {
  const keys = new Set([...Object.keys(emb1), ...Object.keys(emb2)]);
  let dotProduct = 0, mag1 = 0, mag2 = 0;
  keys.forEach(key => {
    const v1 = emb1[key] || 0;
    const v2 = emb2[key] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
};

// ==================== INITIAL TRAINING DATA ====================
const INITIAL_EXAMPLES = [
  {
    id: 1,
    clientMessage: "دكتور تعبت من الدايت ومليت، حاسة نفسي مو قادرة أكمل",
    doctorResponse: "أنا فاهمك تمامًا، طبيعي جدًا توصلي لهالمرحلة، كلنا نمر فيها. المهم ما نستسلم. أنتي ماشيه صح ونتايجك حلوة، بس ممكن نغير شوي في الجدول عشان نرجّع الحماس. تبين نعمل تعديل بسيط؟",
    category: "motivation",
    embedding: null
  },
  {
    id: 2,
    clientMessage: "وزني ثبت من أسبوعين مع إني ماشية على النظام",
    doctorResponse: "ثبات الوزن طبيعي ويصير مع الكل، جسمك يتأقلم. المهم لا توقفين. خليني أشوف أكلك الأسبوع هذا، أرسلي لي صور الوجبات وأعطيك رأيي.",
    category: "plateau",
    embedding: null
  },
  {
    id: 3,
    clientMessage: "ممكن آكل برجر اليوم؟ عندي عزيمة",
    doctorResponse: "إيه عادي، استمتعي بالعزيمة! بس خلي البرجر بدون صوص زيادة وخذي سلطة جنبه. ولا تحسبينها غلطة، هذي جزء من الحياة الصحية المتوازنة 😊",
    category: "cheat_meal",
    embedding: null
  },
  {
    id: 4,
    clientMessage: "الحمدلله نزلت 2 كيلو هالأسبوع!",
    doctorResponse: "ماشاء الله تبارك الله! 🎉 شغل ممتاز، واضح إنك ملتزمة. استمري على كذا وبنوصل للهدف قريب إن شاء الله. فخور فيك!",
    category: "celebration",
    embedding: null
  },
  {
    id: 5,
    clientMessage: "حاسة بصداع من يومين",
    doctorResponse: "الصداع ممكن يكون من قلة الماء أو تغيير الأكل. كم لتر ماء تشربين باليوم؟ وهل الصداع مستمر ولا يجي ويروح؟ لو مستمر كثير، راجعي طبيب عشان نطمن.",
    category: "health_concern",
    embedding: null
  },
  {
    id: 6,
    clientMessage: "نسيت آخذ المكمل أمس",
    doctorResponse: "ما عليك، يوم ما يأثر. كملي من اليوم عادي ولا تاخذين جرعة دبل. المهم الانتظام بشكل عام مو يوم بيوم.",
    category: "supplement",
    embedding: null
  },
  {
    id: 7,
    clientMessage: "إيش أفطر اليوم؟",
    doctorResponse: "جربي بيض مسلوق مع خبز توست أسمر وخيار. أو زبادي يوناني مع شوية توت ومكسرات. الاثنين خفاف ويعطونك طاقة للصباح 💪",
    category: "meal_suggestion",
    embedding: null
  },
  {
    id: 8,
    clientMessage: "أحس بجوع الليل وما أقدر أنام",
    doctorResponse: "جوع الليل طبيعي أول الدايت. جربي تشربين شاي أعشاب أو كوب حليب دافي قليل الدسم. ولو الجوع قوي، كلي خيارة أو حبة جزر، ما تأثر.",
    category: "night_hunger",
    embedding: null
  }
];

// ==================== OPENAI API CALL ====================
const callOpenAI = async (prompt) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message);
  }
  
  return data.choices[0].message.content;
};

// ==================== MAIN COMPONENT ====================
export default function App() {
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingResponse, setPendingResponse] = useState(null);
  const [editingResponse, setEditingResponse] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [uploadText, setUploadText] = useState('');
  const [stats, setStats] = useState({ total: 0, approved: 0, edited: 0, avgSimilarity: 0 });
  const [retrievedExamples, setRetrievedExamples] = useState([]);
  const [showPrompt, setShowPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_key') || '');
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initialized = INITIAL_EXAMPLES.map(ex => ({
      ...ex,
      embedding: createEmbedding(ex.clientMessage)
    }));
    setKnowledgeBase(initialized);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingResponse]);

  // Save to localStorage whenever knowledgeBase changes
  useEffect(() => {
    if (knowledgeBase.length > INITIAL_EXAMPLES.length) {
      localStorage.setItem('nutrition_kb', JSON.stringify(knowledgeBase));
    }
  }, [knowledgeBase]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('nutrition_kb');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setKnowledgeBase(parsed);
      } catch (e) {
        console.error('Failed to load saved knowledge base');
      }
    }
  }, []);

  const findSimilarConversations = (query, topK = 3) => {
    const queryEmbedding = createEmbedding(query);
    
    const scored = knowledgeBase.map(item => ({
      ...item,
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }));
    
    return scored
      .filter(item => item.similarity > 0.1)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  };

  const buildDynamicPrompt = (clientMessage, examples) => {
    let prompt = `# الدور
أنت مساعد ذكي لدكتور تغذية سعودي. مهمتك صياغة ردود على رسائل العملاء بنفس أسلوب الدكتور وطريقة تفكيره.

# أسلوب الرد
- اللهجة: سعودية طبيعية
- النبرة: دافئة، داعمة، تحفيزية
- الطول: مختصر ومباشر (2-4 جمل غالباً)
- تجنب: الردود الآلية، المصطلحات المعقدة، الوعظ الزائد

# قواعد مهمة
- لا تعطي وصفات طبية أو جرعات أدوية
- الحالات الطارئة: وجّه للتواصل المباشر مع الدكتور
- إذا ما عرفت: قل "خليني أتأكد من الدكتور وأرد عليك"
`;

    if (examples.length > 0) {
      prompt += `\n# أمثلة من ردود الدكتور السابقة (تعلّم منها الأسلوب)\n`;
      examples.forEach((ex, i) => {
        prompt += `
## مثال ${i + 1} (تشابه: ${Math.round(ex.similarity * 100)}%)
العميل: "${ex.clientMessage}"
رد الدكتور: "${ex.doctorResponse}"
`;
      });
    }

    prompt += `\n# المطلوب
رد على الرسالة التالية بنفس أسلوب الأمثلة أعلاه. اكتب الرد فقط بدون أي مقدمات أو شرح.

رسالة العميل: "${clientMessage}"`;

    return prompt;
  };

  const generateResponse = async (clientMessage) => {
    if (!apiKey) {
      setError('❌ أدخل OpenAI API Key أولاً من الإعدادات');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const similar = findSimilarConversations(clientMessage);
    setRetrievedExamples(similar);
    
    const dynamicPrompt = buildDynamicPrompt(clientMessage, similar);
    setGeneratedPrompt(dynamicPrompt);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: dynamicPrompt }],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const aiResponse = data.choices[0].message.content;
      
      const avgSim = similar.length > 0 
        ? similar.reduce((acc, ex) => acc + ex.similarity, 0) / similar.length 
        : 0;
      
      setPendingResponse({
        clientMessage,
        aiResponse,
        retrievedExamples: similar,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      });
      
      setStats(prev => ({ 
        ...prev, 
        total: prev.total + 1,
        avgSimilarity: ((prev.avgSimilarity * prev.total) + avgSim) / (prev.total + 1)
      }));
    } catch (error) {
      console.error('Error:', error);
      setError(`❌ خطأ: ${error.message}`);
    }
    setIsLoading(false);
  };

  const handleSend = () => {
    if (!inputText.trim() || isLoading || pendingResponse) return;
    generateResponse(inputText.trim());
    setInputText('');
  };

  const handleApprove = (useEdited = false) => {
    if (!pendingResponse) return;
    
    const finalResponse = useEdited && editingResponse 
      ? editingResponse 
      : pendingResponse.aiResponse;
    
    setMessages(prev => [...prev, {
      type: 'client',
      text: pendingResponse.clientMessage,
      time: pendingResponse.timestamp
    }, {
      type: 'doctor',
      text: finalResponse,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      wasEdited: useEdited && editingResponse !== pendingResponse.aiResponse,
      similarityUsed: pendingResponse.retrievedExamples.length
    }]);
    
    // LEARNING: Add to knowledge base
    const newEntry = {
      id: Date.now(),
      clientMessage: pendingResponse.clientMessage,
      doctorResponse: finalResponse,
      category: "learned",
      embedding: createEmbedding(pendingResponse.clientMessage),
      learnedAt: new Date().toISOString()
    };
    setKnowledgeBase(prev => [...prev, newEntry]);
    
    setStats(prev => ({
      ...prev,
      approved: prev.approved + (useEdited ? 0 : 1),
      edited: prev.edited + (useEdited ? 1 : 0)
    }));
    
    setPendingResponse(null);
    setEditingResponse('');
    setRetrievedExamples([]);
  };

  const handleReject = () => {
    setPendingResponse(null);
    setEditingResponse('');
    setRetrievedExamples([]);
  };

  const parseConversations = (text) => {
    const pairs = [];
    const lines = text.split('\n').filter(l => l.trim());
    
    let currentClient = '';
    lines.forEach(line => {
      if (line.includes('عميل:') || line.includes('العميل:')) {
        currentClient = line.replace(/عميل:|العميل:/g, '').trim();
      } else if ((line.includes('دكتور:') || line.includes('الدكتور:')) && currentClient) {
        const doctorResponse = line.replace(/دكتور:|الدكتور:/g, '').trim();
        if (currentClient && doctorResponse) {
          pairs.push({ clientMessage: currentClient, doctorResponse });
        }
        currentClient = '';
      }
    });
    return pairs;
  };

  const handleUpload = () => {
    const parsed = parseConversations(uploadText);
    if (parsed.length === 0) {
      alert('ما لقيت محادثات. تأكد من الصيغة:\nعميل: الرسالة\nدكتور: الرد');
      return;
    }
    
    const newEntries = parsed.map((p, i) => ({
      id: Date.now() + i,
      clientMessage: p.clientMessage,
      doctorResponse: p.doctorResponse,
      category: "uploaded",
      embedding: createEmbedding(p.clientMessage),
      uploadedAt: new Date().toISOString()
    }));
    
    setKnowledgeBase(prev => [...prev, ...newEntries]);
    setUploadText('');
    alert(`✅ تم إضافة ${parsed.length} محادثة لقاعدة المعرفة!`);
  };

  const saveApiKey = () => {
    localStorage.setItem('openai_key', apiKeyInput);
    setApiKey(apiKeyInput);
    setApiKeyInput('');
    alert('✅ تم حفظ الـ API Key');
  };

  const clearData = () => {
    if (confirm('هل أنت متأكد؟ سيتم حذف كل المحادثات المتعلمة والمرفوعة!')) {
      localStorage.removeItem('nutrition_kb');
      const initialized = INITIAL_EXAMPLES.map(ex => ({
        ...ex,
        embedding: createEmbedding(ex.clientMessage)
      }));
      setKnowledgeBase(initialized);
      setMessages([]);
      setStats({ total: 0, approved: 0, edited: 0, avgSimilarity: 0 });
      alert('✅ تم مسح البيانات');
    }
  };

  const exportData = () => {
    const data = {
      knowledgeBase,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nutrition-assistant-data.json';
    a.click();
  };

  return (
    <div dir="rtl" className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow">
              <span className="text-2xl">🧠</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">مساعد التغذية الذكي - RAG</h1>
              <p className="text-emerald-100 text-sm">يتعلم من ردود الدكتور | Local Version</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/30 px-3 py-1 rounded-full">
            <span className="text-sm">📚</span>
            <span className="font-bold">{knowledgeBase.length}</span>
            <span className="text-sm">محادثة</span>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {['chat', 'upload', 'knowledge', 'settings'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab 
                  ? 'bg-white text-emerald-600' 
                  : 'bg-emerald-500/30 hover:bg-emerald-500/50'
              }`}
            >
              {tab === 'chat' && '💬 المحادثة'}
              {tab === 'upload' && '📤 رفع محادثات'}
              {tab === 'knowledge' && '📚 قاعدة المعرفة'}
              {tab === 'settings' && '⚙️ الإعدادات'}
            </button>
          ))}
        </div>
      </div>

      {/* API Key Warning */}
      {!apiKey && activeTab === 'chat' && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-3 text-yellow-800 text-sm">
          ⚠️ لم يتم إدخال OpenAI API Key. اذهب للإعدادات أولاً.
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-b border-red-300 px-4 py-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Stats Bar */}
      <div className="bg-white border-b px-4 py-2 flex gap-4 text-sm flex-wrap">
        <span className="text-gray-600">📊</span>
        <span className="text-blue-600">الرسائل: {stats.total}</span>
        <span className="text-green-600">✓ موافق: {stats.approved}</span>
        <span className="text-yellow-600">✏️ معدل: {stats.edited}</span>
        <span className="text-purple-600">🎯 تشابه: {Math.round(stats.avgSimilarity * 100)}%</span>
      </div>

      {/* ==================== SETTINGS TAB ==================== */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">🔑 OpenAI API Key</h2>
              <p className="text-gray-600 text-sm mb-4">
                احصل على API Key من: <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 underline">platform.openai.com/api-keys</a>
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 border rounded-lg px-4 py-2"
                />
                <button
                  onClick={saveApiKey}
                  disabled={!apiKeyInput}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-bold"
                >
                  حفظ
                </button>
              </div>
              {apiKey && (
                <p className="text-green-600 text-sm mt-2">✅ تم حفظ الـ API Key</p>
              )}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4">💾 إدارة البيانات</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportData}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-bold"
                >
                  📥 تصدير البيانات
                </button>
                <button
                  onClick={clearData}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold"
                >
                  🗑️ مسح الكل
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">البيانات محفوظة في المتصفح (localStorage)</p>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CHAT TAB ==================== */}
      {activeTab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !pendingResponse && !isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="text-6xl mb-4">🧠</div>
                <h2 className="text-xl font-bold mb-2">نظام RAG الذكي</h2>
                <p className="text-center max-w-md mb-4">
                  يبحث في المحادثات السابقة ويتعلم من أسلوب الدكتور
                </p>
                <div className="bg-emerald-50 p-4 rounded-lg max-w-md">
                  <p className="text-sm text-emerald-700">
                    💡 جرب: "تعبت من الدايت" أو "وزني ثبت"
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'client' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 shadow ${
                  msg.type === 'client' 
                    ? 'bg-white rounded-tr-none' 
                    : 'bg-emerald-500 text-white rounded-tl-none'
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  <div className={`flex items-center gap-2 mt-1 text-xs ${
                    msg.type === 'client' ? 'text-gray-400' : 'text-emerald-100'
                  }`}>
                    <span>{msg.time}</span>
                    {msg.type === 'doctor' && (
                      <>
                        <span>✓✓</span>
                        {msg.wasEdited && <span className="bg-yellow-400 text-yellow-900 px-1 rounded text-xs">معدّل</span>}
                        {msg.similarityUsed > 0 && <span className="bg-purple-400 text-purple-900 px-1 rounded text-xs">RAG: {msg.similarityUsed}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl rounded-tr-none px-4 py-3 shadow">
                  <p className="text-sm text-gray-500 mb-2">🔍 يبحث في قاعدة المعرفة...</p>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            {pendingResponse && (
              <div className="space-y-3">
                {retrievedExamples.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-purple-700 mb-3">
                      <span>🔍</span>
                      <span className="font-bold">محادثات مشابهة (RAG)</span>
                    </div>
                    <div className="space-y-2">
                      {retrievedExamples.map((ex, i) => (
                        <div key={i} className="bg-white rounded-lg p-3 text-sm border border-purple-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-purple-600 font-medium">مثال {i + 1}</span>
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs">
                              {Math.round(ex.similarity * 100)}%
                            </span>
                          </div>
                          <p className="text-gray-600"><strong>العميل:</strong> {ex.clientMessage}</p>
                          <p className="text-gray-800"><strong>الدكتور:</strong> {ex.doctorResponse}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowPrompt(!showPrompt)}
                      className="mt-3 text-sm text-purple-600 hover:underline"
                    >
                      {showPrompt ? '🔼 إخفاء الـ Prompt' : '🔽 عرض الـ Prompt'}
                    </button>
                    {showPrompt && (
                      <pre className="mt-2 bg-gray-800 text-green-400 p-3 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                        {generatedPrompt}
                      </pre>
                    )}
                  </div>
                )}

                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 text-yellow-700 mb-3">
                    <span className="text-xl">⏳</span>
                    <span className="font-bold">في انتظار موافقة الدكتور</span>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 mb-3 border">
                    <p className="text-xs text-gray-500 mb-1">💬 رسالة العميل:</p>
                    <p className="text-gray-800">{pendingResponse.clientMessage}</p>
                  </div>
                  
                  <div className="bg-emerald-50 rounded-lg p-3 mb-3 border border-emerald-200">
                    <p className="text-xs text-emerald-600 mb-1">🤖 رد الـ AI ({retrievedExamples.length} أمثلة):</p>
                    <textarea
                      value={editingResponse || pendingResponse.aiResponse}
                      onChange={(e) => setEditingResponse(e.target.value)}
                      className="w-full bg-transparent resize-none focus:outline-none text-gray-800 min-h-20"
                    />
                  </div>
                  
                  <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                    <p className="text-xs text-blue-600">
                      💡 لما توافق، الرد يتضاف لقاعدة المعرفة ويتعلم منه النظام!
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(false)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition"
                    >
                      ✓ موافقة
                    </button>
                    <button
                      onClick={() => handleApprove(true)}
                      disabled={!editingResponse || editingResponse === pendingResponse.aiResponse}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-bold transition"
                    >
                      ✏️ إرسال المعدل
                    </button>
                    <button
                      onClick={handleReject}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اكتب رسالة العميل هنا..."
                className="flex-1 border rounded-full px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                disabled={isLoading || pendingResponse || !apiKey}
                dir="rtl"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || pendingResponse || !inputText.trim() || !apiKey}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white px-6 py-3 rounded-full font-bold transition"
              >
                إرسال
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==================== UPLOAD TAB ==================== */}
      {activeTab === 'upload' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span>📤</span> رفع محادثات سابقة
              </h2>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-700 mb-2"><strong>📝 صيغة المحادثات:</strong></p>
                <pre className="bg-white p-3 rounded text-sm border">
{`عميل: دكتور تعبت من الدايت
دكتور: طبيعي تحسين بكذا، خلينا نعدل النظام شوي

عميل: وزني ثبت من أسبوع
دكتور: عادي، هذا طبيعي. أرسلي لي أكلك`}
                </pre>
              </div>
              
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="الصق المحادثات هنا..."
                className="w-full h-64 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-emerald-500 mb-4"
                dir="rtl"
              />
              
              <button
                onClick={handleUpload}
                disabled={!uploadText.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-3 rounded-lg font-bold"
              >
                📥 إضافة للمعرفة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== KNOWLEDGE BASE TAB ==================== */}
      {activeTab === 'knowledge' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h2 className="text-xl font-bold">📚 قاعدة المعرفة ({knowledgeBase.length})</h2>
              <div className="flex gap-2 text-xs">
                <span className="bg-gray-200 px-2 py-1 rounded">أساسي: {knowledgeBase.filter(k => !['uploaded', 'learned'].includes(k.category)).length}</span>
                <span className="bg-blue-200 px-2 py-1 rounded">مرفوع: {knowledgeBase.filter(k => k.category === 'uploaded').length}</span>
                <span className="bg-green-200 px-2 py-1 rounded">متعلم: {knowledgeBase.filter(k => k.category === 'learned').length}</span>
              </div>
            </div>
            
            {knowledgeBase.map((item, idx) => (
              <div key={item.id} className={`bg-white rounded-lg p-4 shadow border-r-4 ${
                item.category === 'learned' ? 'border-green-500' :
                item.category === 'uploaded' ? 'border-blue-500' : 'border-gray-300'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-500">#{idx + 1}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    item.category === 'learned' ? 'bg-green-100 text-green-700' :
                    item.category === 'uploaded' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.category === 'learned' ? '🧠 متعلم' :
                     item.category === 'uploaded' ? '📤 مرفوع' : '📋 أساسي'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-1"><strong>العميل:</strong> {item.clientMessage}</p>
                <p className="text-gray-800 text-sm"><strong>الدكتور:</strong> {item.doctorResponse}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
