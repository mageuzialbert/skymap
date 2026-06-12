import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

interface Conversation {
  delivery_id: string;
  other_name: string;
  status: string;
  service_type: string | null;
  last_message: string | null;
  last_at: string | null;
  unread: number;
}

/**
 * List the current user's chat conversations (one per ride).
 * - RIDER: rides assigned to them.
 * - BUSINESS (client): their rides that have an assigned rider.
 * - ADMIN/STAFF: every ride that already has chat activity.
 */
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const baseSelect =
      'id, status, service_type, assigned_rider_id, businesses:business_id ( name ), assigned_rider:assigned_rider_id ( name )';

    let deliveries: any[] = [];

    if (role === 'RIDER') {
      const { data } = await supabaseAdmin
        .from('deliveries')
        .select(baseSelect)
        .eq('assigned_rider_id', user.id)
        .order('created_at', { ascending: false });
      deliveries = data || [];
    } else if (role === 'ADMIN' || role === 'STAFF') {
      // Rides that have at least one chat message.
      const { data: msgRows } = await supabaseAdmin
        .from('chat_messages')
        .select('delivery_id')
        .order('created_at', { ascending: false });
      const ids = Array.from(new Set((msgRows || []).map((m) => m.delivery_id)));
      if (ids.length > 0) {
        const { data } = await supabaseAdmin.from('deliveries').select(baseSelect).in('id', ids);
        deliveries = data || [];
      }
    } else {
      // BUSINESS / client
      const { data: business } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (business) {
        const { data } = await supabaseAdmin
          .from('deliveries')
          .select(baseSelect)
          .eq('business_id', business.id)
          .not('assigned_rider_id', 'is', null)
          .order('created_at', { ascending: false });
        deliveries = data || [];
      }
    }

    if (deliveries.length === 0) return NextResponse.json([]);

    // Pull all chat messages for these rides in one query and aggregate.
    const deliveryIds = deliveries.map((d) => d.id);
    const { data: messages } = await supabaseAdmin
      .from('chat_messages')
      .select('delivery_id, sender_id, body, created_at, read_at')
      .in('delivery_id', deliveryIds)
      .order('created_at', { ascending: true });

    const byDelivery: Record<string, { last: any; unread: number }> = {};
    for (const m of messages || []) {
      const entry = (byDelivery[m.delivery_id] ||= { last: null, unread: 0 });
      entry.last = m; // ascending order → last seen is newest
      if (m.sender_id !== user.id && !m.read_at) entry.unread += 1;
    }

    const conversations: Conversation[] = deliveries.map((d) => {
      const agg = byDelivery[d.id];
      const other =
        role === 'RIDER'
          ? d.businesses?.name || 'Client'
          : role === 'BUSINESS'
          ? d.assigned_rider?.name || 'Rider'
          : d.businesses?.name || 'Client';
      return {
        delivery_id: d.id,
        other_name: other,
        status: d.status,
        service_type: d.service_type ?? null,
        last_message: agg?.last?.body ?? null,
        last_at: agg?.last?.created_at ?? null,
        unread: agg?.unread ?? 0,
      };
    });

    // Conversations with messages first (newest activity), then the rest.
    conversations.sort((a, b) => {
      if (a.last_at && b.last_at) return a.last_at < b.last_at ? 1 : -1;
      if (a.last_at) return -1;
      if (b.last_at) return 1;
      return 0;
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error listing conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
