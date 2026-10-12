# 🖥️ Backend - Node.js API Server

## الحالة: ✅ مكتمل

WhatsApp RAG Assistant Backend مع دعم كامل للـ:
- نظام RAG مع pgvector
- تحليل الصور (OCR + Food Recognition)
- WhatsApp Business API Webhook
- WebSocket للتحديثات الفورية

---

## 🚀 البدء السريع

### 1. المتطلبات
- Node.js 18+
- PostgreSQL 15+ مع pgvector extension
- OpenAI API Key
- WhatsApp Business API credentials (اختياري للاختبار)

### 2. التثبيت

```bash
cd backend

# تثبيت المكتبات
npm install

# نسخ ملف البيئة
copy .env.example .env

# تعديل .env بالقيم الصحيحة
```

### 3. إعداد قاعدة البيانات

```bash
# إنشاء قاعدة البيانات
createdb nutrition_assistant

# تفعيل pgvector (في psql)
CREATE EXTENSION vector;

# تشغيل migrations
npm run migrate

# إضافة البيانات الأولية
npm run seed
```

### 4. التشغيل

```bash
# تطوير (مع hot reload)
npm run dev

# إنتاج
npm start
```

الخادم يعمل على: `http://localhost:3001`

---

## 📁 هيكل المشروع

```
backend/
├── src/
│   ├── index.js              # نقطة البداية
│   ├── app.js                # Express app
│   ├── config/
│   │   ├── database.js       # PostgreSQL + pgvector
│   │   ├── openai.js         # OpenAI client
│   │   └── whatsapp.js       # WhatsApp API config
│   ├── routes/
│   │   ├── auth.routes.js    # تسجيل الدخول
│   │   ├── messages.routes.js # الرسائل
│   │   ├── knowledge.routes.js # قاعدة المعرفة
│   │   ├── images.routes.js  # تحليل الصور
│   │   ├── stats.routes.js   # الإحصائيات
│   │   └── webhook.routes.js # WhatsApp webhook
│   ├── services/
│   │   ├── rag.service.js    # نظام RAG
│   │   ├── embeddings.service.js # OpenAI Embeddings
│   │   ├── vision.service.js # تحليل الصور
│   │   ├── whatsapp.service.js # WhatsApp API
│   │   └── websocket.service.js # Real-time updates
│   ├── middleware/
│   │   └── auth.middleware.js
│   └── database/
│       ├── migrate.js        # Database schema
│       └── seed.js           # Initial data
├── uploads/                  # الصور المرفوعة
├── package.json
└── .env.example
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login` - تسجيل الدخول
- `POST /api/auth/refresh` - تجديد التوكن
- `GET /api/auth/me` - معلومات المستخدم

### Messages
- `GET /api/messages/pending` - الرسائل المعلّقة
- `GET /api/messages/:id` - تفاصيل رسالة
- `POST /api/messages/:id/generate` - توليد رد AI
- `POST /api/messages/:id/approve` - موافقة وإرسال
- `POST /api/messages/:id/edit` - تعديل وإرسال
- `POST /api/messages/:id/reject` - رفض

### Knowledge Base
- `GET /api/knowledge` - كل المحادثات
- `GET /api/knowledge/search?q=` - بحث
- `POST /api/knowledge` - إضافة محادثة
- `POST /api/knowledge/bulk` - رفع جماعي
- `DELETE /api/knowledge/:id` - حذف

### Images
- `POST /api/images/analyze` - تحليل صورة (upload)
- `POST /api/images/analyze-base64` - تحليل صورة (base64)

### Stats
- `GET /api/stats/overview` - نظرة عامة
- `GET /api/stats/usage` - استخدام API
- `GET /api/stats/budget` - حالة الميزانية

### WhatsApp Webhook
- `GET /webhook` - Verification
- `POST /webhook` - Receive messages

---

## 🔐 متغيرات البيئة

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nutrition_assistant

# OpenAI
OPENAI_API_KEY=sk-...

# WhatsApp (اختياري)
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

---

## 🧪 اختبار بدون WhatsApp

يمكنك اختبار النظام كاملاً بدون ربط WhatsApp:

1. شغّل الخادم: `npm run dev`
2. سجّل دخول:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@nutrition.sa","password":"doctor123"}'
```
3. أضف رسالة تجريبية مباشرة في قاعدة البيانات
4. استخدم Flutter app للموافقة على الردود

---

## 📊 مراقبة التكلفة

النظام يتتبع استخدام API تلقائياً في جدول `api_usage`:
- توكنات OpenAI (chat, embeddings, vision)
- تكلفة كل خدمة
- عدد الرسائل والصور

استخدم `/api/stats/budget` لمراقبة الميزانية الشهرية.
