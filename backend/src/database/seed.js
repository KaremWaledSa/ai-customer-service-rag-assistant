require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Use the embeddings service that supports both OpenAI and simple mode
const { createEmbedding, EMBEDDING_MODE } = require('../services/embeddings.service');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initial training examples (from prototype)
const INITIAL_EXAMPLES = [
  {
    clientMessage: "دكتور تعبت من الدايت ومليت، حاسة نفسي مو قادرة أكمل",
    doctorResponse: "أنا فاهمك تمامًا، طبيعي جدًا توصلي لهالمرحلة، كلنا نمر فيها. المهم ما نستسلم. أنتي ماشيه صح ونتايجك حلوة، بس ممكن نغير شوي في الجدول عشان نرجّع الحماس. تبين نعمل تعديل بسيط؟",
    category: "motivation"
  },
  {
    clientMessage: "وزني ثبت من أسبوعين مع إني ماشية على النظام",
    doctorResponse: "ثبات الوزن طبيعي ويصير مع الكل، جسمك يتأقلم. المهم لا توقفين. خليني أشوف أكلك الأسبوع هذا، أرسلي لي صور الوجبات وأعطيك رأيي.",
    category: "plateau"
  },
  {
    clientMessage: "ممكن آكل برجر اليوم؟ عندي عزيمة",
    doctorResponse: "إيه عادي، استمتعي بالعزيمة! بس خلي البرجر بدون صوص زيادة وخذي سلطة جنبه. ولا تحسبينها غلطة، هذي جزء من الحياة الصحية المتوازنة 😊",
    category: "cheat_meal"
  },
  {
    clientMessage: "الحمدلله نزلت 2 كيلو هالأسبوع!",
    doctorResponse: "ماشاء الله تبارك الله! 🎉 شغل ممتاز، واضح إنك ملتزمة. استمري على كذا وبنوصل للهدف قريب إن شاء الله. فخور فيك!",
    category: "celebration"
  },
  {
    clientMessage: "حاسة بصداع من يومين",
    doctorResponse: "الصداع ممكن يكون من قلة الماء أو تغيير الأكل. كم لتر ماء تشربين باليوم؟ وهل الصداع مستمر ولا يجي ويروح؟ لو مستمر كثير، راجعي طبيب عشان نطمن.",
    category: "health_concern"
  },
  {
    clientMessage: "نسيت آخذ المكمل أمس",
    doctorResponse: "ما عليك، يوم ما يأثر. كملي من اليوم عادي ولا تاخذين جرعة دبل. المهم الانتظام بشكل عام مو يوم بيوم.",
    category: "supplement"
  },
  {
    clientMessage: "إيش أفطر اليوم؟",
    doctorResponse: "جربي بيض مسلوق مع خبز توست أسمر وخيار. أو زبادي يوناني مع شوية توت ومكسرات. الاثنين خفاف ويعطونك طاقة للصباح 💪",
    category: "meal_suggestion"
  },
  {
    clientMessage: "أحس بجوع الليل وما أقدر أنام",
    doctorResponse: "جوع الليل طبيعي أول الدايت. جربي تشربين شاي أعشاب أو كوب حليب دافي قليل الدسم. ولو الجوع قوي، كلي خيارة أو حبة جزر، ما تأثر.",
    category: "night_hunger"
  }
];

async function seed() {
  console.log('🌱 Seeding database...');
  console.log(`📊 Embedding mode: ${EMBEDDING_MODE}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create default doctor user
    const passwordHash = await bcrypt.hash('doctor123', 10);
    await client.query(`
      INSERT INTO users (email, password_hash, name, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO NOTHING
    `, ['doctor@nutrition.sa', passwordHash, 'دكتور التغذية', '+966500000000', 'doctor']);
    console.log('✅ Default doctor user created');

    // Seed initial knowledge base examples
    console.log('📚 Creating embeddings for initial examples...');

    for (const example of INITIAL_EXAMPLES) {
      try {
        const embedding = await createEmbedding(example.clientMessage);

        if (embedding && embedding.length > 0) {
          // Convert embedding array to pgvector format
          const embeddingStr = `[${embedding.join(',')}]`;

          await client.query(`
            INSERT INTO knowledge_base (client_message, doctor_response, category, embedding, source)
            VALUES ($1, $2, $3, $4::vector, 'initial')
            ON CONFLICT DO NOTHING
          `, [example.clientMessage, example.doctorResponse, example.category, embeddingStr]);

          console.log(`   ✓ Added: "${example.clientMessage.substring(0, 40)}..."`);
        } else {
          console.log(`   ⚠️ Skipped (no embedding): "${example.clientMessage.substring(0, 40)}..."`);
        }
      } catch (error) {
        console.log(`   ⚠️ Error: "${example.clientMessage.substring(0, 40)}..." - ${error.message}`);
      }
    }

    // Initialize today's API usage record
    await client.query(`
      INSERT INTO api_usage (date)
      VALUES (CURRENT_DATE)
      ON CONFLICT (date) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');

    // Show stats
    const kbCount = await client.query('SELECT COUNT(*) FROM knowledge_base');
    console.log(`📊 Knowledge base entries: ${kbCount.rows[0].count}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
