import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/sms';

/**
 * Test SMS endpoint - Development only
 * POST /api/dev/test-sms
 * Body: { "recipient": "255XXXXXXXXX" }
 */
export async function POST(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { recipient } = body;

    if (!recipient) {
      return NextResponse.json(
        { error: 'recipient is required in request body' },
        { status: 400 }
      );
    }

    console.log(`[Test SMS] Sending test message to: ${recipient}`);

    const result = await sendSMS(
      recipient,
      'Test message from Kasi Courier Services - iPAB SmartSMS integration working!'
    );

    console.log(`[Test SMS] Result:`, result);

    if (result.success) {
      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        message: 'Test SMS sent successfully',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: 'Failed to send test SMS',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Test SMS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
