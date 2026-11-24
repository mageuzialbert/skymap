import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';
import { customersFor } from '@/lib/driverHire-server';

// Reads the session cookie, so it can never be prerendered at build time.
export const dynamic = 'force-dynamic';

// GET - every driver request, for administrators.
// Filters: q (reference, customer name or phone), category, transmission,
// status, date (travel date, YYYY-MM-DD), sort (newest | oldest).
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sp = request.nextUrl.searchParams;
    const q = (sp.get('q') || '').trim().toLowerCase();
    const category = sp.get('category') || '';
    const transmission = sp.get('transmission') || '';
    const status = sp.get('status') || '';
    const date = sp.get('date') || '';
    const oldestFirst = sp.get('sort') === 'oldest';

    let query = supabaseAdmin
      .from('driver_hire_requests')
      .select('*')
      .order('created_at', { ascending: oldestFirst })
      .limit(1000);
    if (category) query = query.eq('vehicle_category', category);
    if (transmission) query = query.eq('transmission_type', transmission);
    if (status) query = query.eq('status', status);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) query = query.eq('departure_date', date);

    const { data, error } = await query;
    if (error) {
      console.error('Error listing driver requests (admin):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const customers = await customersFor((data || []).map((r: any) => r.customer_id));
    let rows = (data || []).map((r: any) => ({
      ...r,
      customer: customers[r.customer_id] || { name: '', phone: '', email: '' },
    }));

    // The search spans two tables, so it is applied here rather than in SQL.
    if (q) {
      const digits = q.replace(/\D/g, '');
      rows = rows.filter(
        (r: any) =>
          r.reference_number.toLowerCase().includes(q) ||
          r.customer.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && r.customer.phone.replace(/\D/g, '').includes(digits))
      );
    }

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error listing driver requests (admin):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
