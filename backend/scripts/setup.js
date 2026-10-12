#!/usr/bin/env node
/**
 * Backend Setup Script
 * Checks prerequisites and helps set up the project
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Nutrition Assistant Backend Setup\n');
console.log('=' .repeat(50));

// Check Node.js version
console.log('\n📍 Checking Node.js...');
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0]);
if (major >= 18) {
  console.log(`✅ Node.js ${nodeVersion} (OK)`);
} else {
  console.log(`❌ Node.js ${nodeVersion} (Need 18+)`);
}

// Check .env file
console.log('\n📍 Checking .env file...');
const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file exists');

  // Check required variables
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'JWT_SECRET'
  ];

  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your_`)) {
      console.log(`   ✅ ${varName} is set`);
    } else {
      console.log(`   ⚠️  ${varName} needs to be configured`);
    }
  });
} else {
  console.log('❌ .env file not found');
  console.log('   Creating from .env.example...');

  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ .env created. Please edit it with your values.');
  } else {
    console.log('   ❌ .env.example not found');
  }
}

// Check node_modules
console.log('\n📍 Checking dependencies...');
const nodeModulesPath = path.join(__dirname, '../node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules exists');
} else {
  console.log('⚠️  node_modules not found');
  console.log('   Run: npm install');
}

// PostgreSQL check (basic)
console.log('\n📍 PostgreSQL Setup Guide:');
console.log('   1. Install PostgreSQL 15+');
console.log('   2. Install pgvector extension:');
console.log('      - Windows: Download from pgvector releases');
console.log('      - Mac: brew install pgvector');
console.log('      - Linux: See pgvector docs');
console.log('   3. Create database:');
console.log('      createdb nutrition_assistant');
console.log('   4. Enable extension:');
console.log('      psql -d nutrition_assistant -c "CREATE EXTENSION vector;"');

// OpenAI API
console.log('\n📍 OpenAI API:');
console.log('   1. Get API key from: https://platform.openai.com/api-keys');
console.log('   2. Add to .env: OPENAI_API_KEY=sk-...');

// Next steps
console.log('\n' + '=' .repeat(50));
console.log('📋 Setup Checklist:\n');
console.log('[ ] 1. Install PostgreSQL with pgvector');
console.log('[ ] 2. Create database: createdb nutrition_assistant');
console.log('[ ] 3. Edit .env with your credentials');
console.log('[ ] 4. Run: npm run migrate');
console.log('[ ] 5. Run: npm run seed');
console.log('[ ] 6. Run: npm run dev');
console.log('[ ] 7. Test: node test/test-api.js\n');
