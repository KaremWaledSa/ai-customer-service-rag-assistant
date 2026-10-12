# 🗺️ خطة التطوير - Roadmap

## المرحلة 1: Prototype ✅ مكتمل

### الأهداف
- [x] بناء واجهة تجريبية
- [x] تنفيذ RAG بسيط (keyword matching)
- [x] قاعدة معرفة أولية
- [x] نظام موافقة الدكتور
- [x] التعلم من الردود المعتمدة
- [x] رفع محادثات قديمة

### الملفات
- `prototype/src/App.jsx`

---

## المرحلة 2: Backend + Database 🔲 قادم

### الأهداف
- [ ] إنشاء Node.js server
- [ ] إعداد PostgreSQL + pgvector
- [ ] تنفيذ OpenAI Embeddings (بدل keyword matching)
- [ ] API endpoints للـ frontend
- [ ] نظام authentication بسيط

### الهيكل المقترح

```
backend/
├── src/
│   ├── index.js              # Entry point
│   ├── config/
│   │   └── database.js       # PostgreSQL connection
│   ├── routes/
│   │   ├── messages.js       # Message handling
│   │   ├── knowledge.js      # Knowledge base CRUD
│   │   └── auth.js           # Simple auth
│   ├── services/
│   │   ├── rag.js            # RAG logic
│   │   ├── embeddings.js     # OpenAI embeddings
│   │   └── openai.js         # Chat completion
│   ├── models/
│   │   ├── Conversation.js
│   │   └── KnowledgeEntry.js
│   └── utils/
│       └── promptBuilder.js
├── package.json
└── .env.example
```

### Database Schema

```sql
-- جدول المحادثات
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    client_phone VARCHAR(20),
    client_message TEXT NOT NULL,
    ai_response TEXT,
    approved_response TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT NOW(),
    approved_at TIMESTAMP
);

-- جدول قاعدة المعرفة مع Vector
CREATE TABLE knowledge_base (
    id SERIAL PRIMARY KEY,
    client_message TEXT NOT NULL,
    doctor_response TEXT NOT NULL,
    category VARCHAR(50),
    embedding vector(1536), -- OpenAI embedding dimension
    source VARCHAR(20), -- 'initial', 'uploaded', 'learned'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index للبحث السريع
CREATE INDEX ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
```

### التكلفة المتوقعة
- OpenAI Embeddings: ~$0.0001 per 1K tokens
- مهمل مقارنة بـ Chat Completion

---

## المرحلة 3: WhatsApp Integration 🔲 قادم

### الأهداف
- [ ] إنشاء Meta Business Account
- [ ] إعداد WhatsApp Business API
- [ ] Webhook لاستقبال الرسائل
- [ ] إرسال الردود عبر API

### الهيكل المقترح

```
whatsapp/
├── webhook.js          # Receive messages
├── sender.js           # Send messages
├── templates.js        # Message templates (for 24h+ replies)
└── config.js           # API credentials
```

### Flow

```
WhatsApp Cloud API
        ↓ (Webhook POST)
    /webhook endpoint
        ↓
    Extract message
        ↓
    RAG Service
        ↓
    Generate response
        ↓
    Save to DB (pending)
        ↓
    [Doctor approves]
        ↓
    Send via API
```

### التكلفة المتوقعة
- أول 1000 محادثة/شهر: مجاني
- بعدها: ~$0.05-0.08 per conversation
- لـ 2000 رسالة/يوم: ~$50-100/شهر

---

## المرحلة 4: Doctor Dashboard 🔲 قادم

### الأهداف
- [ ] واجهة ويب للدكتور
- [ ] قائمة الرسائل المعلقة
- [ ] موافقة/تعديل/رفض بسهولة
- [ ] إحصائيات بسيطة
- [ ] رفع محادثات قديمة

### الشاشات

1. **Login** - تسجيل دخول بسيط
2. **Inbox** - الرسائل المعلقة
3. **Approved** - الرسائل المرسلة
4. **Knowledge** - قاعدة المعرفة
5. **Upload** - رفع محادثات
6. **Stats** - إحصائيات

### Tech
- React (نفس الـ Prototype)
- أو: Next.js للسرعة

---

## المرحلة 5: تحسينات 🔲 مستقبلي

### الأهداف
- [ ] Auto-approve للردود عالية الثقة
- [ ] تصنيف تلقائي للرسائل
- [ ] تقارير أسبوعية
- [ ] دعم عدة أطباء
- [ ] Mobile app للدكتور

---

## 📊 الجدول الزمني المقترح

| المرحلة | المدة | المتطلبات |
|---------|-------|-----------|
| 1. Prototype | ✅ | - |
| 2. Backend | 1-2 أسبوع | Node.js, PostgreSQL |
| 3. WhatsApp | 1 أسبوع | Meta Business Account |
| 4. Dashboard | 1 أسبوع | React |
| 5. تحسينات | مستمر | Feedback من الدكتور |

---

## 💰 التكلفة الشهرية المتوقعة

| البند | التكلفة |
|-------|---------|
| OpenAI (GPT-4o-mini) | ~$100-150 |
| OpenAI (Embeddings) | ~$5-10 |
| WhatsApp API | ~$50-100 |
| Hosting (Vercel/Railway) | ~$0-20 |
| Database (Supabase/Railway) | ~$0-25 |
| **الإجمالي** | **~$155-305** |

⚠️ ممكن نتجاوز الميزانية ($200) - محتاج نراقب الاستخدام
