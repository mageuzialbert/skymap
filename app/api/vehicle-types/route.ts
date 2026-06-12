import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth-server';

// Lightweight lookup of all vehicle types (id, key, name) for labeling.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('vehicle_types')
      .select('id, key, name, icon_url, active')
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
