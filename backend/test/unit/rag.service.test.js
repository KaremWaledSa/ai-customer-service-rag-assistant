/**
 * RAG Service Unit Tests
 */

// Create mock functions
const mockQuery = jest.fn();
const mockCreateEmbedding = jest.fn();
const mockOpenAICreate = jest.fn();

// Mock all dependencies BEFORE requiring the service
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  initDatabase: jest.fn().mockResolvedValue(true),
  getPool: jest.fn()
}));

jest.mock('../../src/services/embeddings.service', () => ({
  createEmbedding: mockCreateEmbedding
}));

jest.mock('../../src/config/ai', () => ({
  aiClient: {
    chat: {
      completions: {
        create: mockOpenAICreate
      }
    }
  },
  MODELS: {
    CHAT: 'gpt-4o-mini',
    VISION: 'gpt-4o',
    EMBEDDING: 'text-embedding-3-small'
  },
  PRICING: {
    chat_input: 0.00015 / 1000,
    chat_output: 0.0006 / 1000
  },
  PROVIDER_NAME: 'OpenAI'
}));

// Now require the service
const ragService = require('../../src/services/rag.service');

// Sample embedding (1536 dimensions)
const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.sin(i) * 0.1);

describe('RAG Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default mock implementations
    mockCreateEmbedding.mockResolvedValue(mockEmbedding);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('findSimilarConversations', () => {
    it('should find similar conversations from knowledge base', async () => {
      const mockResults = [
        {
          id: 1,
          client_message: 'دكتور تعبت من الدايت',
          doctor_response: 'أنا فاهمك، طبيعي جدًا توصلي لهالمرحلة',
          category: 'motivation',
          similarity: 0.85
        },
        {
          id: 2,
          client_message: 'مليت من الحمية',
          doctor_response: 'استمري ولا تستسلمي',
          category: 'motivation',
          similarity: 0.75
        }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockResults, rowCount: 2 }) // Search query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Update query

      const result = await ragService.findSimilarConversations('أنا تعبت من الدايت');

      expect(result).toHaveLength(2);
      expect(result[0].similarity).toBe(0.85);
      expect(mockCreateEmbedding).toHaveBeenCalledWith('أنا تعبت من الدايت');
      expect(mockQuery).toHaveBeenCalled();
    });

    it('should filter out results below minimum similarity', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, client_message: 'test', doctor_response: 'test', similarity: 0.2 }],
        rowCount: 1
      });

      const result = await ragService.findSimilarConversations('test message', 3, 0.3);

      expect(result).toHaveLength(0);
    });

    it('should respect topK limit', async () => {
      const mockResults = [
        { id: 1, client_message: 'msg1', doctor_response: 'resp1', similarity: 0.9 },
        { id: 2, client_message: 'msg2', doctor_response: 'resp2', similarity: 0.85 },
        { id: 3, client_message: 'msg3', doctor_response: 'resp3', similarity: 0.8 }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockResults, rowCount: 3 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await ragService.findSimilarConversations('test', 2);

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      const result = await ragService.findSimilarConversations('test');

      expect(result).toEqual([]);
    });

    it('should update retrieval count for matched entries', async () => {
      const mockResults = [
        { id: 1, client_message: 'test', doctor_response: 'response', similarity: 0.9 }
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockResults, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await ragService.findSimilarConversations('test');

      // Second call should be the UPDATE query
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[1][0]).toContain('UPDATE');
    });
  });

  describe('buildDynamicPrompt', () => {
    it('should build prompt with examples', () => {
      const examples = [
        { client_message: 'تعبت', doctor_response: 'فاهمك', similarity: 0.9 }
      ];

      const prompt = ragService.buildDynamicPrompt('رسالة جديدة', examples);

      expect(prompt).toContain('رسالة جديدة');
      expect(prompt).toContain('تعبت');
      expect(prompt).toContain('فاهمك');
      expect(prompt).toContain('90%'); // Similarity percentage
    });

    it('should handle empty examples', () => {
      const prompt = ragService.buildDynamicPrompt('رسالة جديدة', []);

      expect(prompt).toContain('رسالة جديدة');
      expect(prompt).toContain('أنت مساعد ذكي');
      expect(prompt).not.toContain('أمثلة من ردود الدكتور');
    });

    it('should include all required sections', () => {
      const prompt = ragService.buildDynamicPrompt('test', []);

      expect(prompt).toContain('# الدور');
      expect(prompt).toContain('# أسلوب الرد');
      expect(prompt).toContain('# قواعد مهمة');
      expect(prompt).toContain('# المطلوب');
    });

    it('should handle null examples', () => {
      const prompt = ragService.buildDynamicPrompt('رسالة', null);

      expect(prompt).toContain('رسالة');
    });
  });

  describe('generateResponse', () => {
    it('should generate AI response with context', async () => {
      // Mock similar conversations
      mockQuery
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            client_message: 'دكتور تعبت',
            doctor_response: 'أنا فاهمك',
            similarity: 0.85
          }],
          rowCount: 1
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // Update retrieval count
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // Track usage

      // Mock OpenAI response
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'أنا فاهمك تمامًا، استمري!' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });

      const result = await ragService.generateResponse('دكتور تعبت من الدايت');

      expect(result).toHaveProperty('response');
      expect(result).toHaveProperty('examples');
      expect(result).toHaveProperty('similarity');
      expect(result.response).toBe('أنا فاهمك تمامًا، استمري!');
    });

    it('should handle empty knowledge base gracefully', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'رد بدون أمثلة' } }],
        usage: { prompt_tokens: 50, completion_tokens: 30 }
      });

      const result = await ragService.generateResponse('سؤال جديد');

      expect(result).toHaveProperty('response');
      expect(result.examples).toHaveLength(0);
      expect(result.similarity).toBe(0);
    });

    it('should include image context when provided', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'رد على صورة' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });

      const result = await ragService.generateResponse('ما رأيك؟', 'صورة طعام صحي');

      expect(result).toHaveProperty('response');
      // Verify prompt includes image context
      const promptCall = mockOpenAICreate.mock.calls[0][0];
      expect(promptCall.messages[0].content).toContain('صورة طعام صحي');
    });

    it('should throw error on OpenAI failure', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'));

      await expect(
        ragService.generateResponse('test')
      ).rejects.toThrow('OpenAI API error');
    });

    it('should calculate average similarity correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            { id: 1, client_message: 'm1', doctor_response: 'r1', similarity: 0.8 },
            { id: 2, client_message: 'm2', doctor_response: 'r2', similarity: 0.6 }
          ],
          rowCount: 2
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'response' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 }
      });

      const result = await ragService.generateResponse('test');

      expect(result.similarity).toBe(0.7); // (0.8 + 0.6) / 2
    });
  });

  describe('learnFromApproval', () => {
    it('should add approved response to knowledge base', async () => {
      mockQuery.mockResolvedValue({
        rows: [{
          id: 10,
          client_message: 'رسالة العميل',
          doctor_response: 'رد الدكتور',
          category: 'learned',
          source: 'learned',
          created_at: new Date()
        }],
        rowCount: 1
      });

      const result = await ragService.learnFromApproval(
        'رسالة العميل',
        'رد الدكتور',
        1
      );

      expect(result).toHaveProperty('id', 10);
      expect(result).toHaveProperty('category', 'learned');
      expect(mockCreateEmbedding).toHaveBeenCalledWith('رسالة العميل');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO knowledge_base'),
        expect.any(Array)
      );
    });

    it('should create embedding for the client message', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

      await ragService.learnFromApproval('test message', 'test response');

      expect(mockCreateEmbedding).toHaveBeenCalledWith('test message');
    });

    it('should throw error on database failure', async () => {
      mockQuery.mockRejectedValue(new Error('Database error'));

      await expect(
        ragService.learnFromApproval('msg', 'resp')
      ).rejects.toThrow('Database error');
    });

    it('should work without message ID', async () => {
      mockQuery.mockResolvedValue({
        rows: [{ id: 1, category: 'learned' }],
        rowCount: 1
      });

      const result = await ragService.learnFromApproval('msg', 'resp');

      expect(result).toHaveProperty('id');
    });
  });
});
