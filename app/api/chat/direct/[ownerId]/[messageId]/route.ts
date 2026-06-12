import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

const TABLE = 'direct_messages';

function canAccess(ownerId: string, userId: string, role: string | null): boolean {
  return userId === ownerId || role === 'ADMIN' || role === 'STAFF';
}

async function loadMessage(messageId: string, ownerId: string) {
  const { data } = await supabaseAdmin
    .from(TABLE)
    .select('id, owner_id, sender_id, deleted_at, deleted_for')
    .eq('id', messageId)
    .eq('owner_id', ownerId)
    .single();
  return data;
}

// PATCH - edit a message body (sender only).
export async function PATCH(
  request: NextRequest,
  { params }: { params: { ownerId: string; messageId: string } }
) {
  const { user, role } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccess(params.ownerId, user.id, role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const msg = await loadMessage(params.messageId, params.ownerId);
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (msg.sender_id !== user.id) return NextResponse.json({ error: 'You can only edit your own messages' }, { status: 403 });
  if (msg.deleted_at) return NextResponse.json({ error: 'Cannot edit a deleted message' }, { status: 400 });

  const { body } = await request.json();
  const clean = typeof body === 'string' ? body.trim().slice(0, 2000) : '';
  if (!clean) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ body: clean, edited_at: new Date().toISOString() })
    .eq('id', params.messageId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE - ?scope=everyone (sender only, tombstone) or ?scope=me (hide for caller).
export async function DELETE(
  request: NextRequest,
  { params }: { params: { ownerId: string; messageId: string } }
) {
  const { user, role } = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccess(params.ownerId, user.id, role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const msg = await loadMessage(params.messageId, params.ownerId);
  if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const scope = request.nextUrl.searchParams.get('scope') === 'everyone' ? 'everyone' : 'me';

  if (scope === 'everyone') {
    if (msg.sender_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own messages for everyone' }, { status: 403 });
    }
    const { error } = await supabaseAdmin
      .from(TABLE)
      .update({ deleted_at: new Date().toISOString(), body: null, attachment: null })
      .eq('id', params.messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const next = Array.from(new Set([...(msg.deleted_for || []), user.id]));
    const { error } = await supabaseAdmin.from(TABLE).update({ deleted_for: next }).eq('id', params.messageId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
