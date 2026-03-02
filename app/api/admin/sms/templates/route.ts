import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// GET - List all SMS templates
export async function GET() {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('sms_templates')
      .select('*')
      .order('audience', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching SMS templates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create a new SMS template
export async function POST(request: NextRequest) {
  try {
    const { user, role } = await getAuthenticatedUser();
    if (!user || role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { event_key, audience, name, body: templateBody, tags } = body;

    if (!event_key || !audience || !name || !templateBody) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('sms_templates')
      .upsert(
        {
          event_key,
          audience,
          name,
          body: templateBody,
          tags: tags || [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_key' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating SMS template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
