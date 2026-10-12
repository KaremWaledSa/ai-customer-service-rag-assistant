/**
 * Vision Service Unit Tests
 */

// Create mock functions
const mockQuery = jest.fn();
const mockOpenAICreate = jest.fn();

// Mock all dependencies BEFORE requiring the service
jest.mock('../../src/config/database', () => ({
  query: mockQuery,
  initDatabase: jest.fn().mockResolvedValue(true),
  getPool: jest.fn()
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
  PROVIDER_NAME: 'OpenAI',
  AI_PROVIDER: 'openai'
}));

// Now require the service
const visionService = require('../../src/services/vision.service');

// Mock food response
const mockFoodResponse = {
  foods: [
    { name_ar: 'رز', portion: 'كوب', calories: 200 },
    { name_ar: 'دجاج', portion: '100 جرام', calories: 165 }
  ],
  total_calories: 365,
  assessment: 'healthy',
  notes_ar: 'وجبة متوازنة'
};

// Mock handwriting response
const mockHandwritingResponse = {
  text: 'ملاحظات: الوزن 75 كيلو',
  lines: ['ملاحظات:', 'الوزن 75 كيلو'],
  confidence: 0.85,
  language: 'ar'
};

// Mock scale response
const mockScaleResponse = {
  number: '72.5',
  unit: 'kg',
  confidence: 0.95
};

describe('Vision Service', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    // Default mock for OpenAI - return food analysis
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(mockFoodResponse) } }],
      usage: { prompt_tokens: 500, completion_tokens: 100, total_tokens: 600 }
    });
  });

  describe('detectImageType', () => {
    it('should detect food image type', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'food' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.detectImageType('base64imagedata');

      expect(result).toBe('food');
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o',
          max_tokens: 20
        })
      );
    });

    it('should detect handwriting image type', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'handwriting' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.detectImageType('base64imagedata');

      expect(result).toBe('handwriting');
    });

    it('should detect scale image type', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'scale' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.detectImageType('base64imagedata');

      expect(result).toBe('scale');
    });

    it('should return general for unknown types', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'something_unknown' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.detectImageType('base64imagedata');

      expect(result).toBe('general');
    });

    it('should return unknown on API error', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('API error'));

      const result = await visionService.detectImageType('invalid');

      expect(result).toBe('unknown');
    });

    it('should handle uppercase response', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'FOOD' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.detectImageType('base64imagedata');

      expect(result).toBe('food');
    });
  });

  describe('analyzeFoodImage', () => {
    it('should analyze food and return nutrition info', async () => {
      const result = await visionService.analyzeFoodImage('base64imagedata');

      expect(result).toHaveProperty('foods');
      expect(result).toHaveProperty('total_calories');
      expect(result).toHaveProperty('assessment');
      expect(result.foods).toHaveLength(2);
      expect(result.total_calories).toBe(365);
    });

    it('should include food items with Arabic names', async () => {
      const result = await visionService.analyzeFoodImage('base64imagedata');

      expect(result.foods[0].name_ar).toBe('رز');
      expect(result.foods[1].name_ar).toBe('دجاج');
    });

    it('should include portion and calorie info', async () => {
      const result = await visionService.analyzeFoodImage('base64imagedata');

      expect(result.foods[0]).toHaveProperty('portion');
      expect(result.foods[0]).toHaveProperty('calories');
    });

    it('should handle healthy assessment', async () => {
      const result = await visionService.analyzeFoodImage('base64imagedata');

      expect(['healthy', 'moderate', 'unhealthy']).toContain(result.assessment);
    });

    it('should handle non-JSON response gracefully', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Not valid JSON response' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.analyzeFoodImage('base64imagedata');

      // Should return something even if parsing fails
      expect(result).toBeDefined();
    });

    it('should throw error on API failure', async () => {
      mockOpenAICreate.mockRejectedValueOnce(new Error('API error'));

      await expect(
        visionService.analyzeFoodImage('base64imagedata')
      ).rejects.toThrow('API error');
    });

    it('should track vision usage', async () => {
      await visionService.analyzeFoodImage('base64imagedata');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('api_usage'),
        expect.any(Array)
      );
    });
  });

  describe('extractArabicText (handwriting)', () => {
    beforeEach(() => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockHandwritingResponse) } }],
        usage: { prompt_tokens: 200, completion_tokens: 50, total_tokens: 250 }
      });
    });

    it('should extract text from handwriting image', async () => {
      const result = await visionService.extractArabicText('base64imagedata');

      expect(result).toHaveProperty('text');
      expect(result.text).toContain('ملاحظات');
    });

    it('should return confidence score', async () => {
      const result = await visionService.extractArabicText('base64imagedata');

      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include line-by-line extraction', async () => {
      const result = await visionService.extractArabicText('base64imagedata');

      expect(result).toHaveProperty('lines');
      expect(Array.isArray(result.lines)).toBe(true);
    });

    it('should detect language', async () => {
      const result = await visionService.extractArabicText('base64imagedata');

      expect(result).toHaveProperty('language');
      expect(result.language).toBe('ar');
    });

    it('should handle unclear handwriting', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              text: '',
              confidence: 0.2,
              error: 'صورة غير واضحة'
            })
          }
        }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.extractArabicText('blurry_image');

      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('readScaleNumber', () => {
    beforeEach(() => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockScaleResponse) } }],
        usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 }
      });
    });

    it('should extract weight from scale image', async () => {
      const result = await visionService.readScaleNumber('base64imagedata');

      expect(result).toHaveProperty('number');
      expect(result.number).toBe('72.5');
    });

    it('should extract unit', async () => {
      const result = await visionService.readScaleNumber('base64imagedata');

      expect(result).toHaveProperty('unit');
      expect(result.unit).toBe('kg');
    });

    it('should include confidence score', async () => {
      const result = await visionService.readScaleNumber('base64imagedata');

      expect(result).toHaveProperty('confidence');
      expect(result.confidence).toBe(0.95);
    });

    it('should handle unreadable scale', async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              number: null,
              unit: null,
              confidence: 0.1,
              error: 'صورة غير واضحة'
            })
          }
        }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.readScaleNumber('blurry_scale');

      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('analyzeImage (main function)', () => {
    it('should analyze food image when type is food', async () => {
      const result = await visionService.analyzeImage('base64data', 'food');

      expect(result).toHaveProperty('image_type', 'food');
      expect(result).toHaveProperty('analysis');
      expect(result.analysis).toHaveProperty('foods');
    });

    it('should analyze handwriting when type is handwriting', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockHandwritingResponse) } }],
        usage: { total_tokens: 100 }
      });

      const result = await visionService.analyzeImage('base64data', 'handwriting');

      expect(result).toHaveProperty('image_type', 'handwriting');
      expect(result).toHaveProperty('analysis');
    });

    it('should analyze scale when type is scale', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockScaleResponse) } }],
        usage: { total_tokens: 100 }
      });

      const result = await visionService.analyzeImage('base64data', 'scale');

      expect(result).toHaveProperty('image_type', 'scale');
    });

    it('should auto-detect type when not provided', async () => {
      // First call for detection
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'food' } }],
          usage: { total_tokens: 20 }
        })
        // Second call for analysis
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockFoodResponse) } }],
          usage: { total_tokens: 100 }
        });

      const result = await visionService.analyzeImage('base64data');

      expect(result).toHaveProperty('image_type');
    });

    it('should accept Buffer input', async () => {
      const buffer = Buffer.from('fake image data');

      const result = await visionService.analyzeImage(buffer, 'food');

      expect(result).toHaveProperty('image_type', 'food');
    });

    it('should include analyzed_at timestamp', async () => {
      const result = await visionService.analyzeImage('base64data', 'food');

      expect(result).toHaveProperty('analyzed_at');
      expect(new Date(result.analyzed_at)).toBeInstanceOf(Date);
    });

    it('should handle general image type', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'صورة عامة غير محددة' } }],
        usage: { total_tokens: 50 }
      });

      const result = await visionService.analyzeImage('base64data', 'general');

      expect(result).toHaveProperty('image_type', 'general');
    });
  });
});
