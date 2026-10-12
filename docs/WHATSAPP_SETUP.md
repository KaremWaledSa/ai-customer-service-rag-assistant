# 📱 دليل إعداد WhatsApp Business API

## ⚠️ تحذير مهم

**استخدم الطريقة الرسمية فقط!**

| الطريقة | النتيجة |
|---------|---------|
| ✅ Official API | آمن 100%، بدون حظر |
| ❌ whatsapp-web.js | حظر دائم للرقم! |
| ❌ Baileys | حظر دائم للرقم! |

---

## المرحلة 1: إنشاء Meta Business Account

### الخطوات

1. **اذهب لـ**: https://business.facebook.com

2. **أنشئ حساب جديد**:
   - اسم العيادة
   - إيميل رسمي
   - رقم تليفون للتأكيد

3. **أكد الإيميل**

4. **أضف معلومات العمل**:
   - العنوان
   - نوع العمل: Healthcare / Medical
   - الموقع (اختياري)

---

## المرحلة 2: إنشاء Meta Developer Account

### الخطوات

1. **اذهب لـ**: https://developers.facebook.com

2. **سجّل دخول** بنفس حساب فيسبوك

3. **اقبل الشروط**

4. **أنشئ App جديد**:
   - اضغط "Create App"
   - اختر "Business"
   - الاسم: "Nutrition Assistant"
   - اربطه بـ Business Account

---

## المرحلة 3: تفعيل WhatsApp API

### الخطوات

1. **في App Dashboard**:
   - من القائمة الجانبية: "Add Products"
   - ابحث عن "WhatsApp"
   - اضغط "Set Up"

2. **اربط Business Account**:
   - وافق على الربط

3. **ستحصل على**:
   ```
   Phone Number ID: 1234567890
   WhatsApp Business Account ID: 0987654321
   Temporary Access Token: EAAxxxxxxx...
   Test Phone Number: +1 555 xxx xxxx
   ```

4. **احفظ هذه القيم في `.env`**

---

## المرحلة 4: إعداد Webhook

### في Meta Developer Dashboard

1. **اذهب لـ** WhatsApp → Configuration

2. **Webhook URL**:
   ```
   https://your-domain.com/webhook
   ```

3. **Verify Token**: اختر أي نص سري
   ```
   my_secret_verify_token_123
   ```

4. **اشترك في**:
   - [x] messages
   - [x] message_status

### الكود (Node.js)

```javascript
// webhook.js
const express = require('express');
const router = express.Router();

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Webhook verification (GET)
router.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook verified!');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Receive messages (POST)
router.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach(entry => {
            entry.changes?.forEach(change => {
                if (change.field === 'messages') {
                    const message = change.value.messages?.[0];
                    if (message) {
                        const from = message.from; // sender phone
                        const text = message.text?.body; // message text
                        
                        console.log(`Message from ${from}: ${text}`);
                        
                        // TODO: Process with RAG system
                        // processMessage(from, text);
                    }
                }
            });
        });
        
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;
```

---

## المرحلة 5: إرسال الرسائل

### الكود (Node.js)

```javascript
// sender.js
const axios = require('axios');

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

async function sendMessage(to, text) {
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    
    try {
        const response = await axios.post(url, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to, // e.g., '966501234567'
            type: 'text',
            text: { body: text }
        }, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Message sent:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response?.data);
        throw error;
    }
}

module.exports = { sendMessage };
```

---

## المرحلة 6: إضافة رقم حقيقي

### المتطلبات
- رقم جديد (ما اتسجل على واتساب قبل)
- أو رقم واتساب بزنس موجود

### الخطوات

1. **في WhatsApp Dashboard**:
   - اضغط "Add Phone Number"
   - أدخل الرقم
   - اختر طريقة التأكيد (SMS أو مكالمة)

2. **أدخل كود التأكيد**

3. **انتظر موافقة Meta** (1-3 أيام)

4. **Business Verification** (قد يُطلب):
   - رخصة العمل / سجل تجاري
   - فاتورة باسم العيادة
   - إثبات عنوان

---

## 📊 التسعير

### المحادثات المجانية
- أول 1000 محادثة/شهر: **مجاني**

### بعد ذلك
| نوع المحادثة | التكلفة |
|--------------|---------|
| User-initiated (العميل يبدأ) | ~$0.05 |
| Business-initiated (أنت تبدأ) | ~$0.08 |

### 24-Hour Window
- لما العميل يرسل رسالة، عندك 24 ساعة للرد **مجاناً**
- بعد 24 ساعة: تحتاج Message Template (معتمد من Meta)

---

## 📁 ملف `.env` المطلوب

```env
# WhatsApp API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_webhook_verify_token

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# Database
DATABASE_URL=postgresql://user:password@host:5432/nutrition_db
```

---

## ❓ أسئلة شائعة

**س: كم ياخذ وقت التفعيل؟**
ج: الرقم التجريبي فوري. الرقم الحقيقي 1-3 أيام.

**س: لو عندي رقم واتساب عادي؟**
ج: لازم تحوله لـ Business أو تستخدم رقم جديد.

**س: هل يشتغل بدون HTTPS؟**
ج: لا، الـ Webhook لازم HTTPS. استخدم Vercel أو ngrok للتطوير.

**س: كيف أختبر بدون نشر؟**
ج: استخدم ngrok لعمل tunnel:
```bash
ngrok http 3000
```
