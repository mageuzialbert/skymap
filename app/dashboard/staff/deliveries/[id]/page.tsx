'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getUserRole } from '@/lib/roles';
import DeliveryDetails from '@/components/deliveries/DeliveryDetails';

export default function StaffDeliveryDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDelivery() {
      try {
        const userRole = await getUserRole();
        if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
           // Redirect or show not authorized
           router.push('/dashboard/business');
           return;
        }

        // We can reuse the staff deliveries API or fetch directly if we had a single endpoint
        // Since the staff API list endpoint returns everything, let's fetch specific delivery
        // For simplicity and security (using admin client on server), let's use a new API endpoint or filter the list
        // Actually, for staff, we should probably add a GET /api/staff/deliveries/[id] endpoint
        // BUT, given the instructions, I'll temporarily fetch from client if RLS allows, 
        // OR better, create/use an API route. 
        // Let's try fetching via the existing list endpoint with a filter if supported, 
        // OR implement a detail fetch. 
        // Wait, I can't easily change the API right now without more files. 
        // Let's assume RLS allows staff to select deliveries or use the server action pattern.
        // Actually, looking at `api/staff/deliveries/route.ts`, it lists deliveries.
        // I'll add a fetch to that endpoint with a filter if possible, or just raw fetch if RLS is set up.
        // Checking RLS... `rls.sql` usually handles this.
        // Let's try fetching via a new API call to /api/staff/deliveries/[id] which I might need to create?
        // Or just use the client-side supabase request if the user is authenticated as staff.
        // The RLS for 'deliveries' usually allows read for 'STAFF'.
        
        // Let's try client-side fetch first using the `getUserRole` validation.
        // Wait, `getUserRole` uses server actions or cookie checks.
        
        // Use the existing GET /api/staff/deliveries endpoint? It returns a list.
        // Let's fetch the specific one via client-side supabase if RLS permits.
        
        // Re-checking `api/staff/deliveries/route.ts`... it uses `supabaseAdmin` so it bypasses RLS.
        // So client-side `supabase.from('deliveries')` will fail if RLS is strict (which it should be).
        // I should probably Create a new route `app/api/staff/deliveries/[id]/route.ts`.
        // BUT, to save time/files, I can check if `api/staff/deliveries` accepts an ID? 
        // It accepts `business_id` and filters.
        
        // Let's create `app/api/staff/deliveries/[id]/route.ts` quickly?
        // Actually, I can just use the existing one? No, it doesn't filter by ID.
        
        // Let's create the route. It's cleaner.
        
        // Wait, for this step I'm just creating pages. 
        // I will write the page to fetch from `/api/staff/deliveries/${params.id}` and then create that route.
        
        const response = await fetch(`/api/staff/deliveries/${params.id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch delivery');
        }
        const data = await response.json();
        setDelivery(data);

      } catch (err) {
        console.error('Error loading delivery:', err);
        setError('Failed to load delivery details');
      } finally {
        setLoading(false);
      }
    }
    loadDelivery();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Delivery not found'}</h2>
        <Link 
          href="/dashboard/staff/deliveries"
          className="text-primary hover:underline flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deliveries
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link 
        href="/dashboard/staff/deliveries"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deliveries
      </Link>
      
      <DeliveryDetails delivery={delivery} />
    </div>
  );
}
