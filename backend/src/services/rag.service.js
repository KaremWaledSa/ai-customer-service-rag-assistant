/**
 * RAG (Retrieval Augmented Generation) Service
 * Uses vector search to find similar conversations and generate responses
 * Supports both Groq (testing) and OpenAI (production)
 */

const { aiClient, MODELS, PRICING, PROVIDER_NAME } = require('../config/ai');
const { query } = require('../config/database');
const { createEmbedding } = require('./embeddings.service');

/**
 * Find similar conversations from knowledge base using vector search
 * @param {string} clientMessage - The client's message
 * @param {number} topK - Number of similar examples to retrieve
 * @param {number} minSimilarity - Minimum similarity threshold (0-1)
 * @returns {Promise<Array>} - Array of similar conversations with similarity scores
 */
async function findSimilarConversations(clientMessage, topK = 3, minSimilarity = 0.3) {
  try {
    // Create embedding for the query
    const queryEmbedding = await createEmbedding(clientMessage);
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Search using pgvector cosine similarity
    const result = await query(`
      SELECT
        id,
        client_message,
        doctor_response,
        category,
        source,
        1 - (embedding <=> $1::vector) as similarity
      FROM knowledge_base
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [embeddingStr, topK * 2]); // Get more, then filter by threshold

    // Filter by minimum similarity
    const filtered = result.rows.filter(row => row.similarity >= minSimilarity);

    // Update retrieval count for matched entries
    if (filtered.length > 0) {
      const ids = filtered.slice(0, topK).map(r => r.id);
      await query(`
        UPDATE knowledge_base
        SET times_retrieved = times_retrieved + 1
        WHERE id = ANY($1)
      `, [ids]);
    }

    return filtered.slice(0, topK);
  } catch (error) {
    console.error('RAG search error:', error.message);
    return [];
  }
}

/**
 * Build dynamic prompt with RAG examples
 * @param {string} clientMessage - The client's message
 * @param {Array} examples - Similar examples from knowledge base
 * @returns {string} - Complete prompt for AI
 */
function buildDynamicPrompt(clientMessage, examples) {
  let prompt = `# الدور
أنت مساعد ذكي لدكتور تغذية سعودي. مهمتك صياغة ردود على رسائل العملاء بنفس أسلوب الدكتور وطريقة تفكيره.

# أسلوب الرد
- اللهجة: سعودية طبيعية
- النبرة: دافئة، داعمة، تحفيزية
- الطول: مختصر ومباشر (2-4 جمل غالباً)
- تجنب: الردود الآلية، المصطلحات المعقدة، الوعظ الزائد

# قواعد مهمة
- لا تعطي وصفات طبية أو جرعات أدوية
- الحالات الطارئة: وجّه للتواصل المباشر مع الدكتور
- إذا ما عرفت: قل "خليني أتأكد من الدكتور وأرد عليك"
`;

  if (examples && examples.length > 0) {
    prompt += `\n# أمثلة من ردود الدكتور السابقة (تعلّم منها الأسلوب)\n`;
    examples.forEach((ex, i) => {
      const similarityPercent = Math.round((ex.similarity || 0) * 100);
      prompt += `
## مثال ${i + 1} (تشابه: ${similarityPercent}%)
العميل: "${ex.client_message}"
رد الدكتور: "${ex.doctor_response}"
`;
    });
  }

  prompt += `\n# المطلوب
رد على الرسالة التالية بنفس أسلوب الأمثلة أعلاه. اكتب الرد فقط بدون أي مقدمات أو شرح.

رسالة العميل: "${clientMessage}"`;

  return prompt;
}

/**
 * Generate AI response using RAG
 * @param {string} clientMessage - The client's message
 * @param {string} imageContext - Optional context from image analysis
 * @returns {Promise<Object>} - AI response with metadata
 */
async function generateResponse(clientMessage, imageContext = null) {
  try {
    // Find similar conversations
    const examples = await findSimilarConversations(clientMessage);

    // Build prompt with examples
    let fullMessage = clientMessage;
    if (imageContext) {
      fullMessage = `${clientMessage}\n\n[معلومات من الصورة: ${imageContext}]`;
    }

    const prompt = buildDynamicPrompt(fullMessage, examples);

    // Call AI (Groq or OpenAI)
    const response = await aiClient.chat.completions.create({
      model: MODELS.CHAT,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7
    });

    const aiResponse = response.choices[0].message.content;

    // Track API usage
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    await trackChatUsage(inputTokens, outputTokens);

    // Calculate average similarity
    const avgSimilarity = examples.length > 0
      ? examples.reduce((sum, ex) => sum + (ex.similarity || 0), 0) / examples.length
      : 0;

    console.log(`🤖 [${PROVIDER_NAME}] Generated response for: "${clientMessage.substring(0, 40)}..."`);

    return {
      response: aiResponse,
      examples: examples,
      similarity: avgSimilarity,
      prompt: prompt,
      provider: PROVIDER_NAME
    };
  } catch (error) {
    console.error('Response generation error:', error.message);
    throw error;
  }
}

/**
 * Add approved response to knowledge base (learning)
 * @param {string} clientMessage - The client's message
 * @param {string} approvedResponse - The approved/edited response
 * @param {number} messageId - Optional message ID for reference
 * @returns {Promise<Object>} - New knowledge base entry
 */
async function learnFromApproval(clientMessage, approvedResponse, messageId = null) {
  try {
    // Create embedding for the client message
    const embedding = await createEmbedding(clientMessage);
    const embeddingStr = `[${embedding.join(',')}]`;

    // Insert into knowledge base
    const result = await query(`
      INSERT INTO knowledge_base (client_message, doctor_response, category, embedding, source, message_id)
      VALUES ($1, $2, 'learned', $3::vector, 'learned', $4)
      RETURNING id, client_message, doctor_response, category, source, created_at
    `, [clientMessage, approvedResponse, embeddingStr, messageId]);

    console.log(`🧠 Learned new response: "${clientMessage.substring(0, 40)}..."`);

    return result.rows[0];
  } catch (error) {
    console.error('Learning error:', error.message);
    throw error;
  }
}

/**
 * Track chat API usage
 */
async function trackChatUsage(inputTokens, outputTokens) {
  try {
    // Calculate cost based on provider pricing
    const inputCost = inputTokens * (PRICING.chat_input || 0);
    const outputCost = outputTokens * (PRICING.chat_output || 0);

    await query(`
      INSERT INTO api_usage (date, chat_tokens_input, chat_tokens_output, chat_cost)
      VALUES (CURRENT_DATE, $1, $2, $3)
      ON CONFLICT (date)
      DO UPDATE SET
        chat_tokens_input = api_usage.chat_tokens_input + $1,
        chat_tokens_output = api_usage.chat_tokens_output + $2,
        chat_cost = api_usage.chat_cost + $3,
        updated_at = NOW()
    `, [inputTokens, outputTokens, inputCost + outputCost]);
  } catch (error) {
    console.error('Chat usage tracking error:', error.message);
  }
}

module.exports = {
  findSimilarConversations,
  buildDynamicPrompt,
  generateResponse,
  learnFromApproval
};
