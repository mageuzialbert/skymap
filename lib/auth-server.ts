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
      return { user: null, role: null };
    }

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

    return { user, role: userData?.role || null };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return { user: null, role: null };
  }
}
