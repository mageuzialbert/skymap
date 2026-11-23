import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { customersFor } from '@/lib/driverHire-server';
import { STATUS_LABELS_EN, adminNextStatuses, type DriverRequestStatus } from '@/lib/driverHire';

/** The request with its customer and its full status history (who and when). */
async function loadDetail(id: string) {
  const { data: req } = await supabaseAdmin
    .from('driver_hire_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!req) return null;

  const { data: history } = await supabaseAdmin
    .from('driver_hire_status_history')
    .select('*')
    .eq('request_id', id)
    .order('created_at', { ascending: true });

  const people = await customersFor([
    req.customer_id,
    ...(history || []).map((h: any) => h.changed_by),
  ]);

  return {
    request: { ...req, customer: people[req.customer_id] || { name: '', phone: '', email: '' } },
    history: (history || []).map((h: any) => ({
      ...h,
      changed_by_name:
        h.changed_by === req.customer_id ? null : people[h.changed_by]?.name || null,
      by_customer: h.changed_by === req.customer_id,
    })),
  };
}

// GET - one request in full, for administrators.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const detail = await loadDetail(params.id);
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (error) {
    console.error('Error fetching driver request (admin):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - change the status (with an optional note for the history) and/or
// save the internal notes. Administrators only.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { data: current } = await supabaseAdmin
      .from('driver_hire_requests')
      .select('id, status, reference_number, customer_id')
      .eq('id', params.id)
      .maybeSingle();
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (typeof body.admin_notes === 'string') {
      patch.admin_notes = body.admin_notes.trim().slice(0, 4000) || null;
    }

    const nextStatus: string | undefined =
      typeof body.status === 'string' && body.status !== current.status ? body.status : undefined;
    if (nextStatus) {
      if (!adminNextStatuses(current.status).includes(nextStatus as DriverRequestStatus)) {
        return NextResponse.json(
          { error: `A request that is ${current.status} cannot be moved to ${nextStatus}` },
          { status: 409 }
        );
      }
      patch.status = nextStatus;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    patch.updated_at = new Date().toISOString();

    // Matching on the status we read means two admins cannot both move the
    // same request: the second update finds no row.
    const { data: updated, error } = await supabaseAdmin
      .from('driver_hire_requests')
      .update(patch)
      .eq('id', current.id)
      .eq('status', current.status)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('Error updating driver request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json(
        { error: 'This request was just changed by someone else. Reload and try again.' },
        { status: 409 }
      );
    }

    if (nextStatus) {
      await supabaseAdmin.from('driver_hire_status_history').insert({
        request_id: current.id,
        previous_status: current.status,
        new_status: nextStatus,
        changed_by: user.id,
        note: typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null,
      });

      // Let the customer know, through the existing SMS + email templates.
      try {
        const { notifyEvent } = await import('@/lib/notify');
        const people = await customersFor([current.customer_id]);
        const customer = people[current.customer_id];
        if (customer) {
          await notifyEvent(
            'client_driver_request_status',
            { phone: customer.phone, email: customer.email },
            {
              reference: current.reference_number,
              status_label: STATUS_LABELS_EN[nextStatus as DriverRequestStatus] || nextStatus,
            }
          );
        }
      } catch (notifyErr) {
        console.error('Failed to send driver-request status notification:', notifyErr);
      }
    }

    return NextResponse.json(await loadDetail(current.id));
  } catch (error) {
    console.error('Error updating driver request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
