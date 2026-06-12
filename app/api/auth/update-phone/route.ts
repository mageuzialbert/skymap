import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/auth-server';

// POST - the authenticated user updates their OWN phone number.
export async function POST(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone } = await request.json();
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize: keep an explicit international form, default bare/local numbers to +255.
    let normalized = phone.trim();
    if (normalized.startsWith('+')) {
      normalized = '+' + normalized.replace(/\D/g, '');
    } else {
      const digits = normalized.replace(/\D/g, '');
      if (digits.startsWith('0')) normalized = '+255' + digits.slice(1);
      else if (digits.startsWith('255')) normalized = '+' + digits;
      else normalized = '+255' + digits;
    }

    if (normalized.replace(/\D/g, '').length < 8) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 });
    }

    // Phone must be unique across users.
    const { data: clash } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', normalized)
      .neq('id', user.id)
      .single();

    if (clash) {
      return NextResponse.json(
        { error: 'This phone number is already in use by another account' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ phone: normalized, phone_verified: false })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Keep auth metadata in sync (best-effort).
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, phone: normalized },
    });

    return NextResponse.json({ success: true, phone: normalized });
  } catch (error) {
    console.error('Error updating phone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
