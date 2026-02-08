import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

// Admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Helper to get authenticated user and role from server-side API routes
// Uses SSR client which properly handles cookies
export async function getAuthenticatedUser(request?: Request) {
  try {
    // Use the SSR client which properly handles cookies
    const supabaseClient = await createServerClient();

    // Debug: Check available cookies
    const cookieStore = await import('next/headers').then(m => m.cookies());
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('supabase') || 
      c.name.includes('auth') || 
      c.name.includes('sb-') || 
      c.name.includes('access_token') ||
      c.name.includes('refresh_token')
    );
    console.log('Available cookies count:', allCookies.length);
    console.log('All cookie names:', allCookies.map(c => c.name));
    console.log('Auth-related cookies:', authCookies.map(c => ({ name: c.name, hasValue: !!c.value, valueLength: c.value?.length || 0 })));

    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    if (error) {
      console.error('Auth getUser error:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      
      // Try alternative: get session instead of user
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
      } else if (session?.user) {
        console.log('Got user from session instead:', session.user.id);
        const user = session.user;
        
        // Get role from users table
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        
        return { user, role: userData?.role || null };
      }
      
      return { user: null, role: null };
    }

    if (!user) {
      console.error('No user found in getUser response');
      return { user: null, role: null };
    }

    console.log('Auth user found:', { userId: user.id, email: user.email });

    // Get role from users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user role:', userError);
      return { user, role: null };
    }

    console.log('User role retrieved:', { userId: user.id, role: userData?.role });

    return { user, role: userData?.role || null };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return { user: null, role: null };
  }
}
