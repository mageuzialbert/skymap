import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/auth-server';

// Public: list active landing videos in display order.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('home_videos')
      .select('*')
      .eq('active', true)
      .order('order_index', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
