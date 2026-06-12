import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// Verify the caller participates in this ride's chat (business owner, assigned
// rider, or admin/staff). Returns the delivery + a participant flag.
async function authorizeParticipant(deliveryId: string, userId: string, role: string | null) {
  const { data: delivery } = await supabaseAdmin
    .from('deliveries')
    .select('id, business_id, assigned_rider_id, created_by')
    .eq('id', deliveryId)
    .single();

  if (!delivery) return { delivery: null, ok: false };

  if (role === 'ADMIN' || role === 'STAFF') return { delivery, ok: true };

  if (role === 'RIDER') {
    return { delivery, ok: delivery.assigned_rider_id === userId };
  }

  // BUSINESS (client): must own the ride's business.
  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('user_id', userId)
    .single();
  return { delivery, ok: !!business && delivery.business_id === business.id };
}

// GET - list messages for a ride (oldest first). Marks the other party's
// messages read unless `?peek=1` (used to update the unread badge in the
// background without clearing it).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { delivery, ok } = await authorizeParticipant(params.id, user.id, role);
    if (!delivery) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date().toISOString();
    const peek = request.nextUrl.searchParams.get('peek') === '1';

    // Always mark the other party's messages as DELIVERED (their device has the
    // message now). When the panel is open (not a peek), also mark them READ.
    await supabaseAdmin
      .from('chat_messages')
      .update({ delivered_at: now })
      .eq('delivery_id', params.id)
      .neq('sender_id', user.id)
      .is('delivered_at', null);

    if (!peek) {
      await supabaseAdmin
        .from('chat_messages')
        .update({ read_at: now })
        .eq('delivery_id', params.id)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }

    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id, delivery_id, sender_id, sender_role, body, created_at, delivered_at, read_at')
      .eq('delivery_id', params.id)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - send a message in a ride's chat.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { body } = await request.json();
    if (!body || !body.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const { delivery, ok } = await authorizeParticipant(params.id, user.id, role);
    if (!delivery) return NextResponse.json({ error: 'Ride not found' }, { status: 404 });
    if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: message, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        delivery_id: params.id,
        sender_id: user.id,
        sender_role: role,
        body: body.trim().slice(0, 2000),
      })
      .select('id, delivery_id, sender_id, sender_role, body, created_at, delivered_at, read_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
