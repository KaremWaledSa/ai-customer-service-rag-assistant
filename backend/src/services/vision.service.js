/**
 * Vision Service - Image Analysis
 * Supports both Groq (testing) and OpenAI (production)
 * For food photos, handwriting OCR, and weight scale reading
 */

const { aiClient, MODELS, PROVIDER_NAME, AI_PROVIDER } = require('../config/ai');
const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Detect the type of image (food, handwriting, scale, or general)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<string>} - Image type
 */
async function detectImageType(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: MODELS.VISION || MODELS.CHAT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Classify this image into ONE of these categories:
- food: Photos of food, meals, dishes
- handwriting: Handwritten notes, prescriptions, lists (Arabic or English)
- scale: Weight scale, measuring tape, body measurements
- general: Anything else

Respond with just the category name, nothing else.`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'low'
            }
          }
        ]
      }],
      max_tokens: 20
    });

    const type = response.choices[0].message.content.trim().toLowerCase();
    const validTypes = ['food', 'handwriting', 'scale', 'general'];

    return validTypes.includes(type) ? type : 'general';
  } catch (error) {
    console.error('Image type detection error:', error.message);
    return 'unknown';
  }
}

/**
 * Analyze food image and estimate calories
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Food analysis result
 */
async function analyzeFoodImage(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: MODELS.VISION || MODELS.CHAT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `أنت خبير تغذية. حلل هذه الصورة للطعام وأعطني:

1. قائمة الأطعمة الموجودة (بالعربي)
2. تقدير الحصة لكل طعام
3. تقدير السعرات الحرارية لكل طعام
4. إجمالي السعرات
5. تقييم صحي (صحي / معتدل / غير صحي)
6. ملاحظات للدكتور

أجب بصيغة JSON التالية فقط:
{
  "foods": [
    {"name_ar": "اسم الطعام", "portion": "الحصة", "calories": 123}
  ],
  "total_calories": 456,
  "assessment": "healthy",
  "notes_ar": "ملاحظات بالعربي"
}`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 500
    });

    await trackVisionUsage(response.usage);

    const content = response.choices[0].message.content;

    // Try to parse JSON from response
    try {
      // Extract JSON from markdown code block if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonStr);
    } catch (parseError) {
      return {
        foods: [],
        total_calories: 0,
        assessment: 'unknown',
        notes_ar: content,
        raw_response: content
      };
    }
  } catch (error) {
    console.error('Food analysis error:', error.message);
    throw error;
  }
}

/**
 * Extract Arabic text from handwritten image (OCR)
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - OCR result
 */
async function extractArabicText(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: MODELS.VISION || MODELS.CHAT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `هذه صورة لملاحظات مكتوبة بخط اليد. استخرج كل النص المكتوب.

- حافظ على اللغة الأصلية (عربي/إنجليزي)
- إذا كان النص غير واضح، اكتب [غير واضح]
- استخرج أي أرقام أو قياسات موجودة
- رتب النص بشكل منطقي

أجب بصيغة JSON:
{
  "text": "النص المستخرج كاملاً",
  "measurements": ["أي قياسات أو أرقام"],
  "confidence": "high/medium/low",
  "notes": "ملاحظات إضافية"
}`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 1000
    });

    await trackVisionUsage(response.usage);

    const content = response.choices[0].message.content;

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonStr);
    } catch (parseError) {
      return {
        text: content,
        measurements: [],
        confidence: 'medium',
        notes: ''
      };
    }
  } catch (error) {
    console.error('OCR error:', error.message);
    throw error;
  }
}

/**
 * Read weight/measurement from scale image
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Scale reading result
 */
async function readScaleNumber(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: MODELS.VISION || MODELS.CHAT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `هذه صورة لميزان أو جهاز قياس. اقرأ الرقم الظاهر.

أجب بصيغة JSON:
{
  "value": 75.5,
  "unit": "kg",
  "confidence": "high/medium/low",
  "display_text": "75.5 كيلو"
}

إذا لم تستطع قراءة الرقم، أجب:
{
  "value": null,
  "unit": null,
  "confidence": "low",
  "display_text": "غير واضح"
}`
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'high'
            }
          }
        ]
      }],
      max_tokens: 100
    });

    await trackVisionUsage(response.usage);

    const content = response.choices[0].message.content;

    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      return JSON.parse(jsonStr);
    } catch (parseError) {
      // Try to extract number from plain text
      const numberMatch = content.match(/[\d.]+/);
      return {
        value: numberMatch ? parseFloat(numberMatch[0]) : null,
        unit: 'kg',
        confidence: 'low',
        display_text: content
      };
    }
  } catch (error) {
    console.error('Scale reading error:', error.message);
    throw error;
  }
}

/**
 * Analyze image and return appropriate analysis based on type
 * @param {Buffer|string} imageInput - Image buffer or base64 string
 * @param {string} forcedType - Optional forced image type
 * @returns {Promise<Object>} - Complete analysis result
 */
async function analyzeImage(imageInput, forcedType = null) {
  // Convert buffer to base64 if needed
  const base64Image = Buffer.isBuffer(imageInput)
    ? imageInput.toString('base64')
    : imageInput;

  // Detect or use forced type
  const imageType = forcedType || await detectImageType(base64Image);

  let analysis = {};

  switch (imageType) {
    case 'food':
      analysis = await analyzeFoodImage(base64Image);
      break;
    case 'handwriting':
      analysis = await extractArabicText(base64Image);
      break;
    case 'scale':
      analysis = await readScaleNumber(base64Image);
      break;
    default:
      // General description
      analysis = await getGeneralDescription(base64Image);
  }

  return {
    image_type: imageType,
    analysis: analysis,
    analyzed_at: new Date().toISOString(),
    provider: PROVIDER_NAME
  };
}

/**
 * Get general description of image
 */
async function getGeneralDescription(base64Image) {
  try {
    const response = await aiClient.chat.completions.create({
      model: MODELS.VISION || MODELS.CHAT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'صف هذه الصورة باختصار بالعربية. ما المحتوى الرئيسي؟'
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
              detail: 'low'
            }
          }
        ]
      }],
      max_tokens: 200
    });

    await trackVisionUsage(response.usage);

    return {
      description: response.choices[0].message.content,
      confidence: 'medium'
    };
  } catch (error) {
    console.error('General description error:', error.message);
    return { description: 'لم أتمكن من تحليل الصورة', confidence: 'low' };
  }
}

/**
 * Track Vision API usage
 */
async function trackVisionUsage(usage) {
  try {
    const tokens = (usage?.prompt_tokens || 0) + (usage?.completion_tokens || 0);
    // GPT-4o pricing for images is complex, estimate ~$0.0025 per image
    // Groq is free
    const cost = AI_PROVIDER === 'groq' ? 0 : 0.0025;

    await query(`
      INSERT INTO api_usage (date, vision_tokens, vision_cost, images_processed)
      VALUES (CURRENT_DATE, $1, $2, 1)
      ON CONFLICT (date)
      DO UPDATE SET
        vision_tokens = api_usage.vision_tokens + $1,
        vision_cost = api_usage.vision_cost + $2,
        images_processed = api_usage.images_processed + 1,
        updated_at = NOW()
    `, [tokens, cost]);
  } catch (error) {
    console.error('Vision usage tracking error:', error.message);
  }
}

module.exports = {
  detectImageType,
  analyzeFoodImage,
  extractArabicText,
  readScaleNumber,
  analyzeImage
};
