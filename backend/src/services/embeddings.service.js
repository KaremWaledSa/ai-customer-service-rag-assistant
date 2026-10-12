/**
 * Embeddings Service
 * Supports two modes:
 * - 'openai': Real vector embeddings (production)
 * - 'simple': Keyword-based matching (free testing)
 */

const { openaiForEmbeddings, EMBEDDING_MODEL, EMBEDDING_MODE, EMBEDDING_DIMENSION } = require('../config/ai');
const { query } = require('../config/database');

/**
 * Create embedding vector for text
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - Embedding vector
 */
async function createEmbedding(text) {
  if (EMBEDDING_MODE === 'simple') {
    return createSimpleEmbedding(text);
  }

  try {
    const response = await openaiForEmbeddings.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim()
    });

    // Track API usage
    const tokens = response.usage?.total_tokens || 0;
    await trackUsage('embeddings', tokens);

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding error:', error.message);
    // Fallback to simple embedding if OpenAI fails
    console.log('⚠️ Falling back to simple embedding');
    return createSimpleEmbedding(text);
  }
}

/**
 * Create embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
async function createEmbeddingsBatch(texts) {
  if (EMBEDDING_MODE === 'simple') {
    return texts.map(t => createSimpleEmbedding(t));
  }

  try {
    const response = await openaiForEmbeddings.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.map(t => t.trim())
    });

    // Track API usage
    const tokens = response.usage?.total_tokens || 0;
    await trackUsage('embeddings', tokens);

    return response.data.map(d => d.embedding);
  } catch (error) {
    console.error('Batch embedding error:', error.message);
    return texts.map(t => createSimpleEmbedding(t));
  }
}

/**
 * Simple embedding using TF-IDF-like approach
 * Creates a sparse vector based on word frequencies
 * This is for TESTING ONLY - use OpenAI embeddings for production
 */
function createSimpleEmbedding(text) {
  // Normalize Arabic text
  const normalized = text
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, '') // Keep Arabic, English, numbers
    .trim();

  // Create a deterministic hash-based embedding
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const embedding = new Array(EMBEDDING_DIMENSION).fill(0);

  // Hash each word to multiple positions (like a bloom filter)
  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const pos1 = (charCode * 31 + i) % EMBEDDING_DIMENSION;
      const pos2 = (charCode * 37 + wordIndex) % EMBEDDING_DIMENSION;
      const pos3 = (charCode * 41 + word.length) % EMBEDDING_DIMENSION;

      embedding[pos1] += 0.1;
      embedding[pos2] += 0.05;
      embedding[pos3] += 0.05;
    }
  });

  // Normalize the vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Track API token usage for cost monitoring
 */
async function trackUsage(type, tokens) {
  try {
    const costs = {
      embeddings: 0.00002 / 1000, // $0.00002 per 1K tokens for text-embedding-3-small
    };

    const cost = tokens * (costs[type] || 0);

    await query(`
      INSERT INTO api_usage (date, embeddings_tokens, embeddings_cost)
      VALUES (CURRENT_DATE, $1, $2)
      ON CONFLICT (date)
      DO UPDATE SET
        embeddings_tokens = api_usage.embeddings_tokens + $1,
        embeddings_cost = api_usage.embeddings_cost + $2,
        updated_at = NOW()
    `, [tokens, cost]);
  } catch (error) {
    console.error('Usage tracking error:', error.message);
  }
}

module.exports = {
  createEmbedding,
  createEmbeddingsBatch,
  EMBEDDING_MODE
};
