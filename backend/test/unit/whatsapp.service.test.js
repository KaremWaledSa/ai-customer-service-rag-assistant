/**
 * WhatsApp Service Unit Tests
 */

// Create mock functions
const mockQuery = jest.fn();
const mockWhatsappApiPost = jest.fn();
const mockWhatsappApiGet = jest.fn();
const mockAxiosGet = jest.fn();

// Mock all dependencies BEFORE requiring the service
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  initDatabase: jest.fn().mockResolvedValue(true),
  getPool: jest.fn()
}));

jest.mock('../../src/config/whatsapp', () => ({
  whatsappApi: {
    post: mockWhatsappApiPost,
    get: mockWhatsappApiGet
  },
  whatsappConfig: {
    phoneNumberId: 'test_phone_id',
    token: 'test_token',
    verifyToken: 'test_verify_token'
  }
}));

jest.mock('axios', () => ({
  get: mockAxiosGet
}));

// Now require the service
const whatsappService = require('../../src/services/whatsapp.service');

describe('WhatsApp Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('sendTextMessage', () => {
    it('should send text message successfully', async () => {
      mockWhatsappApiPost.mockResolvedValue({
        data: {
          messages: [{ id: 'wamid.123456' }]
        }
      });

      const result = await whatsappService.sendTextMessage('+966500000000', 'مرحباً');

      expect(result).toHaveProperty('messages');
      expect(result.messages[0].id).toBe('wamid.123456');
      expect(mockWhatsappApiPost).toHaveBeenCalledWith(
        '/test_phone_id/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          to: '+966500000000',
          type: 'text',
          text: { preview_url: false, body: 'مرحباً' }
        })
      );
    });

    it('should track usage after sending', async () => {
      mockWhatsappApiPost.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] }
      });

      await whatsappService.sendTextMessage('+966500000000', 'test');

      // Check that usage tracking was called
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('api_usage'),
        expect.any(Array)
      );
    });

    it('should handle API errors', async () => {
      mockWhatsappApiPost.mockRejectedValue({
        response: { data: { error: 'Invalid phone' } },
        message: 'API error'
      });

      await expect(
        whatsappService.sendTextMessage('invalid', 'test')
      ).rejects.toBeDefined();
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      mockWhatsappApiPost.mockResolvedValue({ data: { success: true } });

      await whatsappService.markAsRead('wamid.123');

      expect(mockWhatsappApiPost).toHaveBeenCalledWith(
        '/test_phone_id/messages',
        expect.objectContaining({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: 'wamid.123'
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockWhatsappApiPost.mockRejectedValue(new Error('API error'));

      // Should not throw
      await expect(whatsappService.markAsRead('wamid.123')).resolves.not.toThrow();
    });
  });

  describe('downloadMedia', () => {
    it('should download media file', async () => {
      // Mock getting media URL
      mockWhatsappApiGet.mockResolvedValue({
        data: { url: 'https://cdn.whatsapp.com/media/123' }
      });

      // Mock downloading the actual file
      mockAxiosGet.mockResolvedValue({
        data: Buffer.from('image data')
      });

      const result = await whatsappService.downloadMedia('media_id_123');

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(mockWhatsappApiGet).toHaveBeenCalledWith('/media_id_123');
      expect(mockAxiosGet).toHaveBeenCalledWith(
        'https://cdn.whatsapp.com/media/123',
        expect.objectContaining({
          headers: { Authorization: 'Bearer test_token' },
          responseType: 'arraybuffer'
        })
      );
    });

    it('should handle media download errors', async () => {
      mockWhatsappApiGet.mockRejectedValue(new Error('Media not found'));

      await expect(
        whatsappService.downloadMedia('invalid_id')
      ).rejects.toThrow('Media not found');
    });
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation', async () => {
      const mockConversation = {
        id: 1,
        client_phone: '+966500000001',
        client_name: 'أحمد',
        total_messages: 5
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await whatsappService.getOrCreateConversation('+966500000001');

      expect(result.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['+966500000001']
      );
    });

    it('should create new conversation if not exists', async () => {
      const newConversation = {
        id: 10,
        client_phone: '+966500000002',
        client_name: 'جديد',
        total_messages: 1
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // No existing
        .mockResolvedValueOnce({ rows: [newConversation], rowCount: 1 }); // Insert

      const result = await whatsappService.getOrCreateConversation('+966500000002', 'جديد');

      expect(result.id).toBe(10);
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('INSERT');
    });

    it('should update last_message_at for existing conversation', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await whatsappService.getOrCreateConversation('+966500000001');

      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE');
    });
  });

  describe('createPendingMessage', () => {
    it('should create pending message', async () => {
      const mockMessage = {
        id: 1,
        conversation_id: 1,
        content: 'test message',
        status: 'pending'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMessage], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await whatsappService.createPendingMessage({
        conversationId: 1,
        content: 'test message',
        contentType: 'text'
      });

      expect(result.id).toBe(1);
      expect(result.status).toBe('pending');
    });

    it('should track received message in usage', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      await whatsappService.createPendingMessage({
        conversationId: 1,
        content: 'test'
      });

      // Second call should be usage tracking
      expect(mockQuery.mock.calls[1][0]).toContain('api_usage');
      expect(mockQuery.mock.calls[1][0]).toContain('messages_received');
    });
  });

  describe('updateMessageWithAI', () => {
    it('should update message with RAG result', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

      const ragResult = {
        response: 'AI generated response',
        examples: [{ id: 1, similarity: 0.9 }],
        similarity: 0.9
      };

      await whatsappService.updateMessageWithAI(1, ragResult);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages'),
        ['AI generated response', expect.any(String), 0.9, 1]
      );
    });
  });

  describe('approveAndSend', () => {
    it('should approve and send message', async () => {
      const mockMessage = {
        id: 1,
        content: 'client message',
        client_phone: '+966500000001'
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockMessage], rowCount: 1 }) // Get message
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Track WA usage
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Update message
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Track sent

      mockWhatsappApiPost.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] }
      });

      const result = await whatsappService.approveAndSend(1, 'Response text');

      expect(result.success).toBe(true);
      expect(mockWhatsappApiPost).toHaveBeenCalled();
    });

    it('should throw error if message not found', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

      await expect(
        whatsappService.approveAndSend(999, 'response')
      ).rejects.toThrow('Message not found');
    });

    it('should track wasEdited flag', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, client_phone: '+966500000001' }],
        rowCount: 1
      });
      mockWhatsappApiPost.mockResolvedValue({
        data: { messages: [{ id: 'wamid.123' }] }
      });

      const result = await whatsappService.approveAndSend(1, 'edited response', true);

      expect(result.wasEdited).toBe(true);
    });
  });

  describe('parseWebhookMessage', () => {
    it('should parse text message webhook', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wamid.123',
                from: '966500000000',
                timestamp: '1234567890',
                type: 'text',
                text: { body: 'مرحبا دكتور' }
              }],
              contacts: [{
                profile: { name: 'أحمد' },
                wa_id: '966500000000'
              }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result).toEqual({
        messageId: 'wamid.123',
        from: '966500000000',
        timestamp: '1234567890',
        type: 'text',
        text: 'مرحبا دكتور',
        image: null,
        audio: null,
        document: null,
        contactName: 'أحمد'
      });
    });

    it('should parse image message webhook', () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wamid.img123',
                from: '966500000000',
                timestamp: '1234567890',
                type: 'image',
                image: {
                  id: 'media_id_123',
                  mime_type: 'image/jpeg'
                }
              }],
              contacts: [{
                profile: { name: 'أحمد' }
              }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result.type).toBe('image');
      expect(result.image).toEqual({
        id: 'media_id_123',
        mime_type: 'image/jpeg'
      });
    });

    it('should return null for empty payload', () => {
      const result = whatsappService.parseWebhookMessage({});

      expect(result).toBeNull();
    });

    it('should return null for status updates (no messages)', () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              statuses: [{
                id: 'wamid.123',
                status: 'delivered'
              }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result).toBeNull();
    });

    it('should handle missing contact info', () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wamid.123',
                from: '966500000000',
                type: 'text',
                text: { body: 'test' }
              }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result.contactName).toBeNull();
    });

    it('should handle audio message', () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wamid.audio',
                from: '966500000000',
                type: 'audio',
                audio: { id: 'audio_id', mime_type: 'audio/ogg' }
              }],
              contacts: [{ profile: { name: 'Test' } }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result.type).toBe('audio');
      expect(result.audio).toEqual({ id: 'audio_id', mime_type: 'audio/ogg' });
    });

    it('should handle document message', () => {
      const payload = {
        entry: [{
          changes: [{
            value: {
              messages: [{
                id: 'wamid.doc',
                from: '966500000000',
                type: 'document',
                document: { id: 'doc_id', filename: 'test.pdf' }
              }],
              contacts: [{ profile: { name: 'Test' } }]
            }
          }]
        }]
      };

      const result = whatsappService.parseWebhookMessage(payload);

      expect(result.type).toBe('document');
      expect(result.document).toEqual({ id: 'doc_id', filename: 'test.pdf' });
    });
  });
});
