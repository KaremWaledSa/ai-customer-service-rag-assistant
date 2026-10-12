# 📱 WhatsApp Business API - Complete Setup Guide

## Overview

This guide walks you through setting up the **Official WhatsApp Business API** (Cloud API) with Meta.

**Important**: Only use the official API. Unofficial libraries will get your number banned permanently.

---

## 📋 Prerequisites

1. A Facebook account
2. A business (or business name)
3. A phone number that:
   - Can receive SMS or voice calls
   - Is NOT already registered with WhatsApp
4. Your backend deployed with a public HTTPS URL

---

## Step 1: Create Meta Business Account

1. Go to [business.facebook.com](https://business.facebook.com)
2. Click **Create Account**
3. Fill in:
   - Business name: `عيادة التغذية` (or your clinic name)
   - Your name
   - Business email
4. Verify your email

---

## Step 2: Create Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **Get Started**
3. Accept the terms
4. Verify your account (phone number)

---

## Step 3: Create a Meta App

1. Go to [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Click **Create App**
3. Select **Business** as the app type
4. Fill in:
   - App name: `Nutrition WhatsApp Assistant`
   - Contact email: your email
   - Business Account: select your business
5. Click **Create App**

---

## Step 4: Add WhatsApp Product

1. In your app dashboard, scroll to **Add Products**
2. Find **WhatsApp** and click **Set Up**
3. Select your Business Account
4. Click **Continue**

---

## Step 5: Get API Credentials

After adding WhatsApp, you'll see the WhatsApp section in the left menu.

### Get Temporary Access Token
1. Go to **WhatsApp > API Setup**
2. Copy the **Temporary access token**
   - ⚠️ This expires in 24 hours!
   - For production, you'll need a permanent token

### Get Phone Number ID
1. On the same page, find **Phone number ID**
2. Copy this value

### Get Test Phone Number
- Meta provides a test phone number for development
- You can send messages FROM this number
- Add your personal number as a recipient for testing

---

## Step 6: Configure Webhook

### In Meta Developer Console:

1. Go to **WhatsApp > Configuration**
2. Click **Edit** next to Webhook
3. Enter:
   - **Callback URL**: `https://your-domain.com/webhook`
   - **Verify Token**: `nutrition_webhook_verify_token_2024` (or your custom token)
4. Click **Verify and Save**

### Webhook Fields to Subscribe:
Check these boxes:
- ✅ `messages` - To receive incoming messages
- ✅ `message_status` - To get delivery receipts

---

## Step 7: Update Your .env File

```env
# WhatsApp Business API
WHATSAPP_TOKEN=EAAxxxxx...your_access_token
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=nutrition_webhook_verify_token_2024
WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210
```

---

## Step 8: Add Test Recipients

Before you can send messages, you must add recipient numbers:

1. Go to **WhatsApp > API Setup**
2. Scroll to **To** field
3. Click **Add phone number**
4. Enter your personal WhatsApp number
5. Verify with the code sent to that number

---

## Step 9: Test the Integration

### Send a Test Message (via curl)

```bash
curl -X POST "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "966500000000",
    "type": "text",
    "text": {"body": "مرحباً! هذه رسالة تجريبية من مساعد التغذية 🧠"}
  }'
```

### Test Webhook (Local Development)

Use ngrok to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose port 3001
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as your webhook URL in Meta console
```

---

## Step 10: Get Permanent Access Token

For production, you need a non-expiring token:

1. Go to **Business Settings > System Users**
2. Create a System User:
   - Name: `WhatsApp API`
   - Role: Admin
3. Click **Generate Token**
4. Select your app
5. Select permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
6. Generate and copy the token

---

## Step 11: Register Your Phone Number (Production)

To use your own business phone number:

1. Go to **WhatsApp > Phone Numbers**
2. Click **Add Phone Number**
3. Enter your business phone number
4. Verify via SMS or voice call
5. Set up a display name and profile

---

## 🔒 Security Best Practices

1. **Never commit tokens** to git
2. Use environment variables
3. Implement webhook signature verification
4. Use HTTPS only
5. Rate limit your endpoints
6. Log all incoming webhooks for debugging

---

## 📊 Pricing

WhatsApp Business API uses conversation-based pricing:

| Type | Saudi Arabia (per conversation) |
|------|--------------------------------|
| User-initiated | ~$0.0279 |
| Business-initiated | ~$0.0466 |

- First 1,000 conversations/month are FREE
- Conversations are 24-hour windows

---

## 🔧 Webhook Signature Verification

Add this to your webhook handler for security:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(req) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) return false;

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET)
    .update(req.rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

---

## 🚨 Common Issues

### "Webhook URL not reachable"
- Make sure your server is publicly accessible
- Check if HTTPS is working
- Verify the URL path is correct (`/webhook`)

### "Verification failed"
- Check your verify token matches exactly
- Make sure you're returning the challenge value

### "Message not delivered"
- Recipient must be added as test number
- Check if token is expired
- Verify phone number format (with country code, no +)

### "Rate limited"
- You're sending too many messages
- Implement queuing system
- Check Meta's rate limits

---

## 📱 Message Templates (for Business-Initiated)

For sending messages outside the 24-hour window, you need approved templates:

1. Go to **WhatsApp > Message Templates**
2. Click **Create Template**
3. Choose category (e.g., `UTILITY`)
4. Write your template with placeholders
5. Submit for approval (takes 24-48 hours)

Example template:
```
مرحباً {{1}}!

موعدك القادم: {{2}}
الموقع: {{3}}

للتأكيد، أرسل "نعم"
للإلغاء، أرسل "لا"
```

---

## ✅ Setup Checklist

- [ ] Meta Business Account created
- [ ] Meta Developer Account created
- [ ] Meta App created
- [ ] WhatsApp product added
- [ ] Temporary token obtained
- [ ] Phone Number ID copied
- [ ] Webhook URL configured
- [ ] Webhook verified
- [ ] Test recipient added
- [ ] Test message sent
- [ ] Backend .env updated
- [ ] (Production) Permanent token generated
- [ ] (Production) Business phone registered
