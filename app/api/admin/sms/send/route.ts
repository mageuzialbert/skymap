import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { sendSMS } from '@/lib/sms';

// POST - Send custom SMS to recipients
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, recipient_type, recipient_ids } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    let phones: { id: string; phone: string; name: string }[] = [];

    if (recipient_type === 'all_clients') {
      // Get all active business phones
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id, phone, name')
        .eq('active', true);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      phones = data || [];
    } else if (recipient_type === 'selected' && recipient_ids?.length) {
      // Get selected business phones
      const { data, error } = await supabaseAdmin
        .from('businesses')
        .select('id, phone, name')
        .in('id', recipient_ids);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      phones = data || [];
    } else {
      return NextResponse.json({ error: 'No recipients specified' }, { status: 400 });
    }

    if (phones.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // Send SMS to each recipient
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of phones) {
      const result = await sendSMS(recipient.phone, message);
      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    // Log the broadcast
    await supabaseAdmin.from('sms_broadcasts').insert({
      subject: subject || null,
      body: message,
      recipient_type,
      recipient_ids: phones.map((p) => p.id),
      total_sent: totalSent,
      total_failed: totalFailed,
      sent_by: user.id,
    });

    return NextResponse.json({
      success: true,
      total_sent: totalSent,
      total_failed: totalFailed,
      total_recipients: phones.length,
    });
  } catch (error) {
    console.error('Error sending SMS broadcast:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - List recent broadcasts
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('sms_broadcasts')
      .select('*, sent_by_user:sent_by(name)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
