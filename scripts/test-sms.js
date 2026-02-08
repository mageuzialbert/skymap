/**
 * Test script for iPAB SmartSMS API
 * Run with: node scripts/test-sms.js
 * 
 * This script loads environment variables from .env.local and sends a test SMS
 */

const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key] = valueParts.join('=');
      }
    }
  });
}

const SMS_API_URL = process.env.SMS_API_URL || 'https://smartsms.ipab.co.tz/api/v3/sms/send';
const SMS_API_TOKEN = process.env.SMS_API_TOKEN;
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'iPAB';

// Get recipient from command line or use a default test number
const testRecipient = process.argv[2] || '255712345678';

function normalizePhoneNumber(phone) {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // Handle Tanzania local format: 0XXXXXXXXX -> 255XXXXXXXXX
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '255' + normalized.substring(1);
  }
  
  return normalized;
}

async function sendTestSMS() {
  console.log('=== iPAB SmartSMS Test ===\n');
  
  if (!SMS_API_TOKEN) {
    console.error('ERROR: SMS_API_TOKEN is not configured in .env.local');
    process.exit(1);
  }
  
  const normalizedRecipient = normalizePhoneNumber(testRecipient);
  
  console.log('Configuration:');
  console.log(`  API URL: ${SMS_API_URL}`);
  console.log(`  Token: ${SMS_API_TOKEN.substring(0, 10)}...`);
  console.log(`  Sender ID: ${SMS_SENDER_ID}`);
  console.log(`  Recipient (original): ${testRecipient}`);
  console.log(`  Recipient (normalized): ${normalizedRecipient}`);
  console.log('');
  
  const payload = {
    recipient: normalizedRecipient,
    sender_id: SMS_SENDER_ID,
    type: 'plain',
    message: 'Test message from Kasi Courier Services - iPAB SmartSMS integration test'
  };
  
  console.log('Request payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('');
  
  try {
    console.log('Sending request...');
    
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SMS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const responseData = await response.json();
    
    console.log(`\nHTTP Status: ${response.status} ${response.statusText}`);
    console.log('\nResponse body:');
    console.log(JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✓ SUCCESS: SMS sent successfully!');
    } else {
      console.log('\n✗ FAILED: SMS sending failed');
      console.log(`Error: HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    if (error.cause) {
      console.error('Cause:', error.cause);
    }
  }
}

sendTestSMS();
