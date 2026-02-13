import { createClient } from '@supabase/supabase-js';

// iPAB SmartSMS API Configuration
const SMS_API_URL = process.env.SMS_API_URL || 'https://smartsms.ipab.co.tz/api/v3/sms/send';
const SMS_API_TOKEN = process.env.SMS_API_TOKEN; // Bearer token - no fallback, fail if missing
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'iPAB';

// Create admin client for server-side operations
function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Normalize phone number for iPAB API
 * - Strips '+' and spaces
 * - Converts leading '0' to '255' for Tanzania
 * - Returns digits only (e.g., '255712345678')
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters (including +, spaces, dashes)
  let normalized = phone.replace(/\D/g, '');
  
  // Handle Tanzania local format: 0XXXXXXXXX -> 255XXXXXXXXX
  if (normalized.startsWith('0') && normalized.length === 10) {
    normalized = '255' + normalized.substring(1);
  }
  
  return normalized;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSMS(to: string, message: string): Promise<SMSResult> {
  // Check for API token
  if (!SMS_API_TOKEN) {
    console.error('SMS_API_TOKEN is not configured');
    return {
      success: false,
      error: 'SMS service not configured: missing API token',
    };
  }

  try {
    // Normalize phone number for iPAB (digits only, Tanzania format)
    const normalizedRecipient = normalizePhoneNumber(to);
    
    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SMS_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        recipient: normalizedRecipient,
        sender_id: SMS_SENDER_ID,
        type: 'plain',
        message: message,
      }),
    });

    const responseData = await response.json();
    const httpCode = response.status;

    // Log SMS attempt using admin client
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error: logError } = await supabaseAdmin.from('sms_logs').insert({
        to_phone: to, // Keep original format for logs
        message: message,
        status: response.ok ? 'success' : 'failed',
        provider_response: JSON.stringify(responseData),
      });

      if (logError) {
        console.error('Failed to log SMS:', logError);
      }
    } catch (logErr) {
      console.error('Error creating admin client for SMS logging:', logErr);
    }

    if (!response.ok) {
      return {
        success: false,
        error: `SMS API returned ${httpCode}: ${JSON.stringify(responseData)}`,
      };
    }

    // iPAB response may have different structure - extract messageId if available
    const messageId = responseData.data?.id || responseData.message_id || responseData.id || 'unknown';

    return {
      success: true,
      messageId: String(messageId),
    };
  } catch (error) {
    // Log error using admin client
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.from('sms_logs').insert({
        to_phone: to,
        message: message,
        status: 'failed',
        provider_response: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logErr) {
      console.error('Error logging SMS failure:', logErr);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function sendOTPSMS(phone: string, code: string): Promise<SMSResult> {
  const message = `Your The Skymap verification code is: ${code}. Valid for 5 minutes.`;
  return sendSMS(phone, message);
}
