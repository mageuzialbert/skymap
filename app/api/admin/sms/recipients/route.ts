import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - Search/list businesses for recipient picker
export async function GET(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabaseAdmin
      .from('businesses')
      .select('id, name, phone')
      .eq('active', true)
      .order('name', { ascending: true })
      .limit(limit);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching recipients:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
