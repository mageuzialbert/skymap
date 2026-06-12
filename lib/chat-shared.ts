// Shared column lists + view-shaping for the two chat message tables
// (chat_messages = per-delivery, direct_messages = general/direct).
import { supabaseAdmin } from '@/lib/auth-server';

export const ATTACHMENT_TYPES = ['image', 'video', 'audio', 'file', 'location'];

/**
 * Verify the caller participates in a ride's chat (business owner, assigned
 * rider, or admin/staff). Returns the delivery + a participant flag.
 */
export async function authorizeRideParticipant(deliveryId: string, userId: string, role: string | null) {
  const { data: delivery } = await supabaseAdmin
    .from('deliveries')
    .select('id, business_id, assigned_rider_id, created_by')
    .eq('id', deliveryId)
    .single();

  if (!delivery) return { delivery: null, ok: false };
  if (role === 'ADMIN' || role === 'STAFF') return { delivery, ok: true };
  if (role === 'RIDER') return { delivery, ok: delivery.assigned_rider_id === userId };

  const { data: business } = await supabaseAdmin
    .from('businesses')
    .select('id')
    .eq('user_id', userId)
    .single();
  return { delivery, ok: !!business && delivery.business_id === business.id };
}

export const CHAT_COLS_DELIVERY =
  'id, delivery_id, sender_id, sender_role, body, attachment, created_at, delivered_at, read_at, edited_at, deleted_at, deleted_for';

export const CHAT_COLS_DIRECT =
  'id, owner_id, sender_id, sender_role, body, attachment, created_at, delivered_at, read_at, edited_at, deleted_at, deleted_for';

/** Keep only known, safe fields from a client-supplied attachment object. */
export function sanitizeAttachment(a: any): Record<string, any> | null {
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

/**
 * Shape rows for a given viewer:
 * - drop messages the viewer "deleted for me",
 * - blank out body/attachment for "deleted for everyone" (keep deleted_at so the
 *   UI can show "This message was deleted"),
 * - never expose the internal `deleted_for` list.
 */
export function shapeChatMessages<T extends Record<string, any>>(rows: T[] | null, viewerId: string) {
  return (rows || [])
    .filter((m) => !(Array.isArray(m.deleted_for) && m.deleted_for.includes(viewerId)))
    .map((m) => {
      const { deleted_for, ...rest } = m;
      if (m.deleted_at) return { ...rest, body: null, attachment: null };
      return rest;
    });
}
