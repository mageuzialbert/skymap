'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DeliveryDetails from '@/components/deliveries/DeliveryDetails';

export default function BusinessDeliveryDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDelivery() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // Get business associated with user
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!business) {
          setError('Business profile not found');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('deliveries')
          .select(`
            *,
            assigned_rider:assigned_rider_id (
              name,
              phone
            )
          `)
          .eq('id', params.id)
          .eq('business_id', business.id)
          .single();

        if (error) throw error;
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
          href="/dashboard/business/deliveries"
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
        href="/dashboard/business/deliveries"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Deliveries
      </Link>
      
      <DeliveryDetails delivery={delivery} />
    </div>
  );
}
