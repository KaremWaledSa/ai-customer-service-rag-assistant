/**
 * AI Provider Configuration
 * Supports both Groq (free testing) and OpenAI (production)
 * Switch via AI_PROVIDER env variable
 */

const OpenAI = require('openai');

// Determine which provider to use
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai'; // 'groq' or 'openai'

// Provider configurations
const providers = {
  groq: {
    client: new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    }),
    models: {
      CHAT: 'llama-3.3-70b-versatile',
      VISION: 'llama-3.2-11b-vision-preview', // Groq vision model
    },
    name: 'Groq',
    // Groq is free, but track for consistency
    pricing: {
      chat_input: 0,
      chat_output: 0,
    }
  },
  openai: {
    client: new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }),
    models: {
      CHAT: 'gpt-4o-mini',
      VISION: 'gpt-4o',
      EMBEDDING: 'text-embedding-3-small'
    },
    name: 'OpenAI',
    pricing: {
      chat_input: 0.00015 / 1000,  // $0.15 per 1M tokens
      chat_output: 0.0006 / 1000,  // $0.60 per 1M tokens
      embedding: 0.00002 / 1000,   // $0.02 per 1M tokens
    }
  }
};

// Get current provider config
const currentProvider = providers[AI_PROVIDER] || providers.openai;

// OpenAI client for embeddings (always use OpenAI for embeddings in production)
// In testing mode without OpenAI key, embeddings will be mocked
const openaiForEmbeddings = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Check if we have valid API keys
const hasGroqKey = process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('your');
const hasOpenAIKey = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your');

// Embedding mode: 'openai' (real vectors) or 'simple' (keyword matching)
const EMBEDDING_MODE = hasOpenAIKey ? 'openai' : 'simple';

console.log(`🤖 AI Provider: ${currentProvider.name}`);
console.log(`📊 Embedding Mode: ${EMBEDDING_MODE}`);

module.exports = {
  AI_PROVIDER,
  aiClient: currentProvider.client,
  MODELS: currentProvider.models,
  PRICING: currentProvider.pricing,
  PROVIDER_NAME: currentProvider.name,

  // For embeddings (OpenAI only)
  openaiForEmbeddings,
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIMENSION: 1536,
  EMBEDDING_MODE,

  // Helper flags
  hasGroqKey,
  hasOpenAIKey,
  isTestingMode: AI_PROVIDER === 'groq'
};
