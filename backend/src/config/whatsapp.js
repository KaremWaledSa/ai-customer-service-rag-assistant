const axios = require('axios');

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

const whatsappConfig = {
  token: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
};

// Create axios instance for WhatsApp API
const whatsappApi = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'Authorization': `Bearer ${whatsappConfig.token}`,
    'Content-Type': 'application/json'
  }
});

module.exports = {
  whatsappConfig,
  whatsappApi,
  WHATSAPP_API_URL
};
