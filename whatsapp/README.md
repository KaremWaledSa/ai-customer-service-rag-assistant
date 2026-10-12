# 📱 WhatsApp Integration

## الحالة: 🔲 قادم في المرحلة 3

---

## ⚠️ تحذير مهم

**استخدم WhatsApp Business API الرسمي فقط!**

الطرق غير الرسمية (whatsapp-web.js, Baileys) ستؤدي لحظر دائم للرقم.

---

## الهيكل المخطط

```
whatsapp/
├── webhook.js      # استقبال الرسائل
├── sender.js       # إرسال الرسائل
├── templates.js    # Message Templates
└── config.js       # الإعدادات
```

---

## المتطلبات

1. Meta Business Account
2. Meta Developer Account
3. WhatsApp Business API access
4. HTTPS endpoint (للـ Webhook)

---

## الخطوات

راجع الملف: [docs/WHATSAPP_SETUP.md](../docs/WHATSAPP_SETUP.md)

---

## Environment Variables

```env
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
```

---

## التكلفة

- أول 1000 محادثة/شهر: **مجاني**
- بعدها: ~$0.05-0.08 per conversation
