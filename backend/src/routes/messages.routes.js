const express = require('express');
const { query } = require('../config/database');
const { generateResponse, learnFromApproval } = require('../services/rag.service');
const { approveAndSend } = require('../services/whatsapp.service');
const { notifyStatusUpdate } = require('../services/websocket.service');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Protect all routes
router.use(authMiddleware);

/**
 * GET /api/messages/pending
 * Get all pending messages awaiting approval
 */
router.get('/pending', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        m.*,
        c.client_phone,
        c.client_name,
        (SELECT COUNT(*) FROM images WHERE message_id = m.id) as image_count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.status IN ('pending', 'ready')
      ORDER BY m.received_at DESC
      LIMIT 50
    `);

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get pending error:', error);
    res.status(500).json({ error: 'Failed to get pending messages' });
  }
});

/**
 * GET /api/messages/:id
 * Get single message with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        m.*,
        c.client_phone,
        c.client_name,
        c.total_messages as conversation_total
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = result.rows[0];

    // Get images if any
    const images = await query(
      'SELECT * FROM images WHERE message_id = $1',
      [id]
    );
    message.images = images.rows;

    // Parse RAG examples if stored as string
    if (message.rag_examples && typeof message.rag_examples === 'string') {
      message.rag_examples = JSON.parse(message.rag_examples);
    }

    res.json({ message });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({ error: 'Failed to get message' });
  }
});

/**
 * POST /api/messages/:id/generate
 * Generate AI response for a message
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const { id } = req.params;

    // Get message
    const msgResult = await query('SELECT * FROM messages WHERE id = $1', [id]);
    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = msgResult.rows[0];

    // Check for image context
    let imageContext = null;
    const imageResult = await query(
      'SELECT extracted_text, analysis_result FROM images WHERE message_id = $1 AND status = $2',
      [id, 'completed']
    );
    if (imageResult.rows.length > 0) {
      const img = imageResult.rows[0];
      imageContext = img.extracted_text || JSON.stringify(img.analysis_result);
    }

    // Generate response using RAG
    const ragResult = await generateResponse(message.content, imageContext);

    // Update message
    await query(`
      UPDATE messages
      SET ai_response = $1, rag_examples = $2, similarity_score = $3, status = 'ready'
      WHERE id = $4
    `, [ragResult.response, JSON.stringify(ragResult.examples), ragResult.similarity, id]);

    // Notify via WebSocket
    notifyStatusUpdate(id, 'ready');

    res.json({
      response: ragResult.response,
      examples: ragResult.examples,
      similarity: ragResult.similarity
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

/**
 * POST /api/messages/:id/approve
 * Approve AI response and send
 */
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // Get message
    const msgResult = await query('SELECT * FROM messages WHERE id = $1', [id]);
    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = msgResult.rows[0];

    if (!message.ai_response) {
      return res.status(400).json({ error: 'No AI response to approve' });
    }

    // Approve and send
    await approveAndSend(id, message.ai_response, false);

    // Learn from approval
    await learnFromApproval(message.content, message.ai_response, id);

    // Notify via WebSocket
    notifyStatusUpdate(id, 'sent');

    res.json({ success: true, message: 'Response approved and sent' });
  } catch (error) {
    console.error('Approve error:', error);
    res.status(500).json({ error: 'Failed to approve message' });
  }
});

/**
 * POST /api/messages/:id/edit
 * Edit response and send
 */
router.post('/:id/edit', async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }

    // Get message
    const msgResult = await query('SELECT * FROM messages WHERE id = $1', [id]);
    if (msgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const message = msgResult.rows[0];

    // Send edited response
    await approveAndSend(id, response.trim(), true);

    // Learn from edited response
    await learnFromApproval(message.content, response.trim(), id);

    // Notify via WebSocket
    notifyStatusUpdate(id, 'sent');

    res.json({ success: true, message: 'Edited response sent' });
  } catch (error) {
    console.error('Edit error:', error);
    res.status(500).json({ error: 'Failed to send edited response' });
  }
});

/**
 * POST /api/messages/:id/reject
 * Reject message (don't respond)
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;

    await query(
      'UPDATE messages SET status = $1 WHERE id = $2',
      ['rejected', id]
    );

    // Notify via WebSocket
    notifyStatusUpdate(id, 'rejected');

    res.json({ success: true, message: 'Message rejected' });
  } catch (error) {
    console.error('Reject error:', error);
    res.status(500).json({ error: 'Failed to reject message' });
  }
});

/**
 * POST /api/messages/test
 * Test AI response generation without creating a message
 */
router.post('/test', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate response using RAG
    const ragResult = await generateResponse(message.trim());

    res.json({
      input: message,
      response: ragResult.response,
      examples: ragResult.examples,
      similarity: ragResult.similarity,
      provider: ragResult.provider
    });
  } catch (error) {
    console.error('Test generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate response' });
  }
});

/**
 * GET /api/messages/history
 * Get sent message history
 */
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT
        m.*,
        c.client_phone,
        c.client_name
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.status = 'sent'
      ORDER BY m.sent_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query(
      "SELECT COUNT(*) FROM messages WHERE status = 'sent'"
    );

    res.json({
      messages: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

module.exports = router;
