import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

const SELECT = 'id, owner_id, sender_id, sender_role, body, attachment, created_at, delivered_at, read_at';

const ATTACHMENT_TYPES = ['image', 'video', 'audio', 'file', 'location'];

// Keep only known, safe fields from a client-supplied attachment object.
function sanitizeAttachment(a: any): Record<string, any> | null {
  if (!a || typeof a !== 'object' || !ATTACHMENT_TYPES.includes(a.type)) return null;
  const out: Record<string, any> = { type: a.type };
  if (typeof a.url === 'string') out.url = a.url.slice(0, 1000);
  if (typeof a.name === 'string') out.name = a.name.slice(0, 200);
  if (typeof a.mime === 'string') out.mime = a.mime.slice(0, 100);
  if (typeof a.size === 'number') out.size = a.size;
  if (typeof a.duration === 'number') out.duration = a.duration;
  if (typeof a.lat === 'number') out.lat = a.lat;
  if (typeof a.lng === 'number') out.lng = a.lng;
  return out;
}

// The caller may access a conversation if they own it or are admin/staff.
function canAccess(ownerId: string, userId: string, role: string | null): boolean {
  return userId === ownerId || role === 'ADMIN' || role === 'STAFF';
}

// GET - list a conversation's messages (oldest first). Marks the OTHER party's
// messages delivered always, and read too unless `?peek=1` (background badge).
export async function GET(request: NextRequest, { params }: { params: { ownerId: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccess(params.ownerId, user.id, role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const peek = request.nextUrl.searchParams.get('peek') === '1';

    await supabaseAdmin
      .from('direct_messages')
      .update({ delivered_at: now })
      .eq('owner_id', params.ownerId)
      .neq('sender_id', user.id)
      .is('delivered_at', null);

    if (!peek) {
      await supabaseAdmin
        .from('direct_messages')
        .update({ read_at: now })
        .eq('owner_id', params.ownerId)
        .neq('sender_id', user.id)
        .is('read_at', null);
    }

    const { data: messages, error } = await supabaseAdmin
      .from('direct_messages')
      .select(SELECT)
      .eq('owner_id', params.ownerId)
      .order('created_at', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(messages || []);
  } catch (error) {
    console.error('Error fetching direct chat:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - send a message into a conversation.
export async function POST(request: NextRequest, { params }: { params: { ownerId: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canAccess(params.ownerId, user.id, role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { body, attachment } = await request.json();
    const cleanAttachment = sanitizeAttachment(attachment);
    const cleanBody = typeof body === 'string' && body.trim() ? body.trim().slice(0, 2000) : null;
    if (!cleanBody && !cleanAttachment) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const { data: message, error } = await supabaseAdmin
      .from('direct_messages')
      .insert({
        owner_id: params.ownerId,
        sender_id: user.id,
        sender_role: role,
        body: cleanBody,
        attachment: cleanAttachment,
      })
      .select(SELECT)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending direct message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
