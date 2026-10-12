/**
 * Configuration Index
 * Exports all configuration modules
 */

require('dotenv').config();

module.exports = {
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'development_secret_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  // WhatsApp configuration
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token: process.env.WHATSAPP_TOKEN,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'nutrition_webhook_verify_token_2024',
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0'
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    models: {
      chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      vision: process.env.OPENAI_VISION_MODEL || 'gpt-4o',
      embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
    },
    embeddingDimension: 1536
  },

  // Database configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'nutrition_whatsapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
  },

  // Server configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
  }
};
