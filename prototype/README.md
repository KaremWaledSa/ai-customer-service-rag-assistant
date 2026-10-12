# 🧠 مساعد التغذية الذكي - RAG System

نظام ذكي يتعلم من ردود الدكتور ويرد على العملاء بنفس أسلوبه.

---

## 🚀 خطوات التشغيل

### 1. المتطلبات
- Node.js (version 18+): حمّله من https://nodejs.org
- VS Code (اختياري): https://code.visualstudio.com

### 2. تشغيل المشروع

افتح Terminal في مجلد المشروع واكتب:

```bash
# تثبيت المكتبات
npm install

# تشغيل المشروع
npm run dev
```

المشروع هيفتح تلقائياً على: http://localhost:3000

---

## 🔑 إعداد OpenAI API Key

1. سجّل في: https://platform.openai.com
2. اذهب لـ: https://platform.openai.com/api-keys
3. اضغط "Create new secret key"
4. انسخ الـ Key
5. في التطبيق، اذهب لتاب "⚙️ الإعدادات"
6. الصق الـ Key واضغط "حفظ"

---

## 📱 كيف يشتغل؟

```
رسالة العميل
    ↓
🔍 بحث في قاعدة المعرفة
    ↓
📚 جلب محادثات مشابهة
    ↓
🤖 AI يرد بنفس الأسلوب
    ↓
✅ الدكتور يوافق/يعدل
    ↓
🧠 الرد يتضاف للمعرفة = تعلّم!
```

---

## 📂 هيكل المشروع

```
nutrition-assistant-local/
├── src/
│   ├── App.jsx          # الكود الرئيسي
│   ├── main.jsx         # نقطة البداية
│   └── index.css        # الستايل
├── index.html           # صفحة HTML
├── package.json         # المكتبات
├── vite.config.js       # إعدادات Vite
├── tailwind.config.js   # إعدادات Tailwind
└── postcss.config.js    # إعدادات PostCSS
```

---

## 💾 البيانات

- **قاعدة المعرفة:** محفوظة في localStorage (تبقى حتى لو أغلقت المتصفح)
- **تصدير البيانات:** من تاب الإعدادات تقدر تصدّر JSON
- **مسح البيانات:** زر "مسح الكل" يرجعك للبيانات الأساسية

---

## 🔧 للتطوير لاحقاً

### ربط مع واتساب (Production)
1. استخدم Backend (Node.js/Python)
2. ضع API Key في الـ Backend (أمان)
3. استخدم WhatsApp Business API
4. استخدم Pinecone/pgvector لقاعدة بيانات Vector حقيقية

### تحسين البحث
- استبدل الـ keyword matching بـ OpenAI Embeddings
- استخدم Pinecone أو Supabase Vector

---

## ❓ مشاكل شائعة

**المشروع ما يشتغل؟**
- تأكد Node.js مثبت: `node --version`
- امسح node_modules وحاول مرة ثانية: `rm -rf node_modules && npm install`

**API مش شغال؟**
- تأكد الـ Key صحيح
- تأكد عندك رصيد في OpenAI

**الردود بطيئة؟**
- GPT-4o-mini أسرع من GPT-4
- تأكد الإنترنت شغال

---

## 📞 الدعم

لو احتجت مساعدة، ارجع لـ Claude وقولي المشكلة!

---

Made with ❤️ for Nutrition Clinics
