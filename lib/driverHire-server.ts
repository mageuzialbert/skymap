import { supabaseAdmin } from '@/lib/auth-server';

/** Name, phone and email for each customer, keyed by user id. The business
 *  name is preferred because that is how the team knows the customer. */
export async function customersFor(userIds: string[]) {
  const out: Record<string, { name: string; phone: string; email: string }> = {};
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (ids.length === 0) return out;

  const [{ data: users }, { data: businesses }] = await Promise.all([
    supabaseAdmin.from('users').select('*').in('id', ids),
    supabaseAdmin.from('businesses').select('user_id, name, phone').in('user_id', ids),
  ]);

  const bizByUser: Record<string, { name: string | null; phone: string | null }> = {};
  (businesses || []).forEach((b: any) => (bizByUser[b.user_id] = b));

  (users || []).forEach((u: any) => {
    const b = bizByUser[u.id];
    out[u.id] = {
      name: b?.name || u.name || '',
      phone: u.phone || b?.phone || '',
      email: u.email || '',
    };
  });
  return out;
}
