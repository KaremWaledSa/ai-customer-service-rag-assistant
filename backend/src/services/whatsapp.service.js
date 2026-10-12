const { whatsappApi, whatsappConfig } = require('../config/whatsapp');
const { query } = require('../config/database');
const axios = require('axios');

/**
 * Check if we're in development mode (skip actual WhatsApp sending)
 */
function isDevMode() {
  return process.env.NODE_ENV === 'development' ||
         process.env.WHATSAPP_TOKEN === 'your_whatsapp_access_token' ||
         !process.env.WHATSAPP_TOKEN;
}

/**
 * Send a text message via WhatsApp
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - Message text
 * @returns {Promise<Object>} - WhatsApp API response
 */
async function sendTextMessage(to, message) {
  // In development mode, skip actual WhatsApp sending
  if (isDevMode()) {
    console.log(`📱 [DEV MODE] Would send to ${to}:`);
    console.log(`   "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    return {
      messages: [{ id: `dev_${Date.now()}` }],
      devMode: true
    };
  }

  try {
    const response = await whatsappApi.post(
      `/${whatsappConfig.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      }
    );

    // Track usage
    await trackWhatsAppUsage();

    console.log(`📱 Message sent to ${to}`);
    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mark a message as read
 * @param {string} messageId - WhatsApp message ID
 */
async function markAsRead(messageId) {
  try {
    await whatsappApi.post(
      `/${whatsappConfig.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      }
    );
  } catch (error) {
    console.error('Mark as read error:', error.message);
  }
}

/**
 * Download media from WhatsApp
 * @param {string} mediaId - WhatsApp media ID
 * @returns {Promise<Buffer>} - Media buffer
 */
async function downloadMedia(mediaId) {
  try {
    // First, get the media URL
    const mediaInfo = await whatsappApi.get(`/${mediaId}`);
    const mediaUrl = mediaInfo.data.url;

    // Download the actual media
    const response = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${whatsappConfig.token}`
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Media download error:', error.message);
    throw error;
  }
}

/**
 * Get or create conversation for a phone number
 * @param {string} phone - Client phone number
 * @param {string} name - Optional client name
 * @returns {Promise<Object>} - Conversation record
 */
async function getOrCreateConversation(phone, name = null) {
  // Try to find existing conversation
  let result = await query(
    'SELECT * FROM conversations WHERE client_phone = $1',
    [phone]
  );

  if (result.rows.length > 0) {
    // Update last_message_at
    await query(
      'UPDATE conversations SET last_message_at = NOW(), total_messages = total_messages + 1 WHERE id = $1',
      [result.rows[0].id]
    );
    return result.rows[0];
  }

  // Create new conversation
  result = await query(
    `INSERT INTO conversations (client_phone, client_name, last_message_at, total_messages)
     VALUES ($1, $2, NOW(), 1)
     RETURNING *`,
    [phone, name]
  );

  return result.rows[0];
}

/**
 * Create a new pending message
 * @param {Object} data - Message data
 * @returns {Promise<Object>} - Created message record
 */
async function createPendingMessage(data) {
  const {
    conversationId,
    content,
    contentType = 'text',
    whatsappMessageId = null
  } = data;

  const result = await query(
    `INSERT INTO messages
     (conversation_id, direction, content, content_type, whatsapp_message_id, status, received_at)
     VALUES ($1, 'inbound', $2, $3, $4, 'pending', NOW())
     RETURNING *`,
    [conversationId, content, contentType, whatsappMessageId]
  );

  // Track received message
  await query(`
    INSERT INTO api_usage (date, messages_received)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date)
    DO UPDATE SET messages_received = api_usage.messages_received + 1, updated_at = NOW()
  `);

  return result.rows[0];
}

/**
 * Update message with AI response
 * @param {number} messageId - Message ID
 * @param {Object} ragResult - RAG generation result
 */
async function updateMessageWithAI(messageId, ragResult) {
  await query(
    `UPDATE messages
     SET ai_response = $1,
         rag_examples = $2,
         similarity_score = $3,
         status = 'ready'
     WHERE id = $4`,
    [
      ragResult.response,
      JSON.stringify(ragResult.examples),
      ragResult.similarity,
      messageId
    ]
  );
}

/**
 * Approve and send a message
 * @param {number} messageId - Message ID
 * @param {string} response - Response to send (AI or edited)
 * @param {boolean} wasEdited - Whether response was edited
 */
async function approveAndSend(messageId, response, wasEdited = false) {
  // Get the message and conversation
  const msgResult = await query(
    `SELECT m.*, c.client_phone
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE m.id = $1`,
    [messageId]
  );

  if (msgResult.rows.length === 0) {
    throw new Error('Message not found');
  }

  const message = msgResult.rows[0];

  // Send via WhatsApp
  await sendTextMessage(message.client_phone, response);

  // Update message status
  await query(
    `UPDATE messages
     SET approved_response = $1,
         status = 'sent',
         approved_at = NOW(),
         sent_at = NOW()
     WHERE id = $2`,
    [response, messageId]
  );

  // Track sent message
  await query(`
    INSERT INTO api_usage (date, messages_sent)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date)
    DO UPDATE SET messages_sent = api_usage.messages_sent + 1, updated_at = NOW()
  `);

  return { success: true, wasEdited };
}

/**
 * Track WhatsApp API usage
 */
async function trackWhatsAppUsage() {
  try {
    // Estimate ~$0.05 per conversation (varies by country)
    const cost = 0.05;

    await query(`
      INSERT INTO api_usage (date, whatsapp_conversations, whatsapp_cost)
      VALUES (CURRENT_DATE, 1, $1)
      ON CONFLICT (date)
      DO UPDATE SET
        whatsapp_conversations = api_usage.whatsapp_conversations + 1,
        whatsapp_cost = api_usage.whatsapp_cost + $1,
        updated_at = NOW()
    `, [cost]);
  } catch (error) {
    console.error('WhatsApp usage tracking error:', error.message);
  }
}

/**
 * Parse incoming webhook payload
 * @param {Object} body - Webhook body
 * @returns {Object|null} - Parsed message or null
 */
function parseWebhookMessage(body) {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.[0]) {
      return null;
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];

    return {
      messageId: message.id,
      from: message.from,
      timestamp: message.timestamp,
      type: message.type,
      text: message.text?.body || null,
      image: message.image || null,
      audio: message.audio || null,
      document: message.document || null,
      contactName: contact?.profile?.name || null
    };
  } catch (error) {
    console.error('Webhook parse error:', error.message);
    return null;
  }
}

module.exports = {
  sendTextMessage,
  markAsRead,
  downloadMedia,
  getOrCreateConversation,
  createPendingMessage,
  updateMessageWithAI,
  approveAndSend,
  parseWebhookMessage
};
