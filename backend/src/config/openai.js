const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Model configurations
const MODELS = {
  CHAT: 'gpt-4o-mini',
  VISION: 'gpt-4o',
  EMBEDDING: 'text-embedding-3-small'
};

// Embedding dimension for text-embedding-3-small
const EMBEDDING_DIMENSION = 1536;

module.exports = {
  openai,
  MODELS,
  EMBEDDING_DIMENSION
};
