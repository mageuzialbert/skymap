import { NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

interface Conversation {
  owner_id: string;
  other_name: string;
  last_message: string | null;
  last_at: string | null;
  unread: number;
}

/**
 * Direct (general) chat conversations.
 * - ADMIN/STAFF: one conversation per client/rider who has messaged support,
 *   newest activity first, with the unread count of the user's messages.
 * - BUSINESS/RIDER: their own single conversation with Support (always present,
 *   even before any message), with the unread count of support's replies.
 */
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isSupport = role === 'ADMIN' || role === 'STAFF';

    if (!isSupport) {
      // The caller's own conversation (owner_id = self).
      const { data: msgs } = await supabaseAdmin
        .from('direct_messages')
        .select('body, created_at, read_at, sender_id')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true });
      const last = msgs && msgs.length ? msgs[msgs.length - 1] : null;
      const unread = (msgs || []).filter((m) => m.sender_id !== user.id && !m.read_at).length;
      const conv: Conversation = {
        owner_id: user.id,
        other_name: 'Support Team',
        last_message: last?.body ?? null,
        last_at: last?.created_at ?? null,
        unread,
      };
      return NextResponse.json([conv]);
    }

    // Support view: every conversation that has messages.
    const { data: rows } = await supabaseAdmin
      .from('direct_messages')
      .select('owner_id, sender_id, body, created_at, read_at')
      .order('created_at', { ascending: true });

    const byOwner: Record<string, { last: any; unread: number }> = {};
    for (const m of rows || []) {
      const entry = (byOwner[m.owner_id] ||= { last: null, unread: 0 });
      entry.last = m;
      // Unread for support = messages the owner sent that aren't read yet.
      if (m.sender_id === m.owner_id && !m.read_at) entry.unread += 1;
    }

    const ownerIds = Object.keys(byOwner);
    let names: Record<string, string> = {};
    if (ownerIds.length > 0) {
      const { data: users } = await supabaseAdmin.from('users').select('id, name').in('id', ownerIds);
      names = Object.fromEntries((users || []).map((u) => [u.id, u.name || 'User']));
    }

    const conversations: Conversation[] = ownerIds.map((id) => ({
      owner_id: id,
      other_name: names[id] || 'User',
      last_message: byOwner[id].last?.body ?? null,
      last_at: byOwner[id].last?.created_at ?? null,
      unread: byOwner[id].unread,
    }));

    conversations.sort((a, b) => (a.last_at && b.last_at ? (a.last_at < b.last_at ? 1 : -1) : a.last_at ? -1 : 1));

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error listing direct conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
