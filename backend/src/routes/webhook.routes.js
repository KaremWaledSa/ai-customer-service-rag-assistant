const express = require('express');
const { whatsappConfig } = require('../config/whatsapp');
const {
  parseWebhookMessage,
  getOrCreateConversation,
  createPendingMessage,
  markAsRead,
  downloadMedia
} = require('../services/whatsapp.service');
const { generateResponse } = require('../services/rag.service');
const { analyzeImage } = require('../services/vision.service');
const { notifyNewMessage, notifyResponseReady } = require('../services/websocket.service');
const { query } = require('../config/database');

const router = express.Router();

/**
 * GET /webhook
 * WhatsApp webhook verification
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📱 Webhook verification request:', { mode, token: token?.substring(0, 10) + '...' });

  if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Receive WhatsApp messages
 */
router.post('/', async (req, res) => {
  try {
    // Parse raw body if needed
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString());
    }

    // Always respond 200 quickly (WhatsApp requirement)
    res.sendStatus(200);

    // Parse the webhook message
    const parsed = parseWebhookMessage(body);
    if (!parsed) {
      console.log('📱 Non-message webhook event');
      return;
    }

    console.log(`📱 Incoming message from ${parsed.from}: ${parsed.type}`);

    // Mark as read
    await markAsRead(parsed.messageId);

    // Get or create conversation
    const conversation = await getOrCreateConversation(parsed.from, parsed.contactName);

    // Handle different message types
    let messageContent = '';
    let contentType = 'text';
    let imageBuffer = null;

    if (parsed.type === 'text') {
      messageContent = parsed.text;
    } else if (parsed.type === 'image') {
      contentType = 'image';
      messageContent = parsed.image.caption || '[صورة]';

      try {
        // Download the image
        imageBuffer = await downloadMedia(parsed.image.id);
        console.log(`📷 Downloaded image: ${imageBuffer.length} bytes`);
      } catch (err) {
        console.error('Failed to download image:', err.message);
        messageContent = '[فشل تحميل الصورة]';
      }
    } else if (parsed.type === 'audio') {
      contentType = 'audio';
      messageContent = '[رسالة صوتية]';
    } else if (parsed.type === 'document') {
      contentType = 'document';
      messageContent = parsed.document.filename || '[مستند]';
    }

    // Create pending message
    const message = await createPendingMessage({
      conversationId: conversation.id,
      content: messageContent,
      contentType: contentType,
      whatsappMessageId: parsed.messageId
    });

    console.log(`💬 Message saved: ID ${message.id}`);

    // Notify Flutter app of new message
    notifyNewMessage(message);

    // If image, analyze it
    let imageContext = null;
    if (imageBuffer) {
      try {
        const imageAnalysis = await analyzeImage(imageBuffer);

        // Save image analysis to database
        await query(`
          INSERT INTO images (message_id, whatsapp_media_id, image_type, analysis_result, extracted_text, status, processed_at)
          VALUES ($1, $2, $3, $4, $5, 'completed', NOW())
        `, [
          message.id,
          parsed.image.id,
          imageAnalysis.image_type,
          JSON.stringify(imageAnalysis.analysis),
          imageAnalysis.analysis.text || imageAnalysis.analysis.extracted_text || null
        ]);

        // Prepare image context for RAG
        if (imageAnalysis.image_type === 'food' && imageAnalysis.analysis.foods) {
          imageContext = `طعام: ${imageAnalysis.analysis.foods.map(f => f.name_ar).join(', ')}. السعرات: ${imageAnalysis.analysis.total_calories}`;
        } else if (imageAnalysis.analysis.text || imageAnalysis.analysis.extracted_text) {
          imageContext = imageAnalysis.analysis.text || imageAnalysis.analysis.extracted_text;
        } else if (imageAnalysis.analysis.display_text) {
          imageContext = `قراءة الميزان: ${imageAnalysis.analysis.display_text}`;
        }

        console.log(`🖼️ Image analyzed: ${imageAnalysis.image_type}`);
      } catch (err) {
        console.error('Image analysis failed:', err.message);
      }
    }

    // Generate AI response using RAG
    try {
      const ragResult = await generateResponse(messageContent, imageContext);

      // Update message with AI response
      await query(`
        UPDATE messages
        SET ai_response = $1, rag_examples = $2, similarity_score = $3, status = 'ready'
        WHERE id = $4
      `, [
        ragResult.response,
        JSON.stringify(ragResult.examples),
        ragResult.similarity,
        message.id
      ]);

      // Notify Flutter app that response is ready
      notifyResponseReady({
        id: message.id,
        conversation_id: conversation.id,
        ai_response: ragResult.response,
        similarity_score: ragResult.similarity
      });

      console.log(`🤖 AI response generated for message ${message.id}`);
    } catch (err) {
      console.error('RAG generation failed:', err.message);
      // Keep message as pending, doctor can still respond manually
    }

  } catch (error) {
    console.error('Webhook processing error:', error);
    // Don't re-throw - we already sent 200
  }
});

module.exports = router;
