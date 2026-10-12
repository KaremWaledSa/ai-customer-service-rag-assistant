const WebSocket = require('ws');

let wss = null;
const clients = new Map(); // userId -> WebSocket

/**
 * Initialize WebSocket server
 * @param {Object} server - HTTP server instance
 */
function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('🔌 New WebSocket connection');

    // Extract user ID from query params (e.g., /ws?userId=123)
    const url = new URL(req.url, 'http://localhost');
    const userId = url.searchParams.get('userId') || 'anonymous';

    // Store client connection
    clients.set(userId, ws);

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        handleMessage(userId, data, ws);
      } catch (error) {
        console.error('WebSocket message error:', error.message);
      }
    });

    ws.on('close', () => {
      console.log(`🔌 WebSocket closed for user: ${userId}`);
      clients.delete(userId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error.message);
      clients.delete(userId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to Nutrition Assistant WebSocket',
      timestamp: new Date().toISOString()
    }));
  });

  console.log('🔌 WebSocket server initialized on /ws');
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(userId, data, ws) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;

    case 'subscribe':
      // User subscribes to updates
      console.log(`📡 User ${userId} subscribed to updates`);
      break;

    default:
      console.log(`Unknown message type: ${data.type}`);
  }
}

/**
 * Notify all connected clients of a new pending message
 * @param {Object} message - The new message
 */
function notifyNewMessage(message) {
  broadcast({
    type: 'new_message',
    data: {
      id: message.id,
      conversation_id: message.conversation_id,
      content: message.content,
      content_type: message.content_type,
      status: message.status,
      received_at: message.received_at
    }
  });
}

/**
 * Notify clients that AI response is ready
 * @param {Object} message - The message with AI response
 */
function notifyResponseReady(message) {
  broadcast({
    type: 'response_ready',
    data: {
      id: message.id,
      conversation_id: message.conversation_id,
      ai_response: message.ai_response,
      similarity_score: message.similarity_score,
      status: 'ready'
    }
  });
}

/**
 * Notify clients of message status update
 * @param {number} messageId - Message ID
 * @param {string} status - New status
 */
function notifyStatusUpdate(messageId, status) {
  broadcast({
    type: 'status_update',
    data: {
      id: messageId,
      status: status
    }
  });
}

/**
 * Broadcast message to all connected clients
 * @param {Object} data - Data to broadcast
 */
function broadcast(data) {
  if (!wss) return;

  const message = JSON.stringify(data);

  clients.forEach((ws, userId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

/**
 * Send message to specific user
 * @param {string} userId - User ID
 * @param {Object} data - Data to send
 */
function sendToUser(userId, data) {
  const ws = clients.get(userId);

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Get count of connected clients
 */
function getConnectedCount() {
  return clients.size;
}

module.exports = {
  initWebSocket,
  notifyNewMessage,
  notifyResponseReady,
  notifyStatusUpdate,
  broadcast,
  sendToUser,
  getConnectedCount
};
