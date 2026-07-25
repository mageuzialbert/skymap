'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Truck, Users, Phone, Palette, Hash, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import DeliveryDetails from '@/components/deliveries/DeliveryDetails';

export default function BusinessDeliveryDetailsPage({ params }: { params: { id: string } }) {
  const t = useT();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [hireInfo, setHireInfo] = useState<any>(null);
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
          setError(t('business.deliveryDetails.profileNotFound'));
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

        // For hire requests, fetch the assigned vehicle details (driver/plate are
        // only returned by the API once the order is confirmed).
        if (data?.service_type === 'hire') {
          try {
            const res = await fetch(`/api/client/rides/${params.id}`);
            if (res.ok) setHireInfo(await res.json());
          } catch {
            /* non-fatal */
          }
        }
      } catch (err) {
        console.error('Error loading delivery:', err);
        setError(t('business.deliveryDetails.loadFailed'));
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || t('business.deliveryDetails.notFound')}</h2>
        <Link
          href="/dashboard/business/deliveries"
          className="text-primary hover:underline flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('business.deliveryDetails.back')}
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
        {t('business.deliveryDetails.back')}
      </Link>

      {hireInfo?.hireVehicle && <HireVehicleCard info={hireInfo} />}

      <DeliveryDetails delivery={delivery} />
    </div>
  );
}

function HireVehicleCard({ info }: { info: any }) {
  const t = useT();
  const v = info.hireVehicle;
  const confirmed = info.confirmed;
  const Icon = v.category === 'people' ? Users : Truck;
  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
          {v.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-6 h-6 text-primary" />
          )}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{v.name}</h3>
          <p className="text-xs text-gray-500">
            {v.capacity_value != null && `${v.capacity_value} ${v.capacity_unit || ''}`}
            {v.color && ` • ${v.color}`}
          </p>
        </div>
      </div>

      {confirmed ? (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {v.driver_name && (
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{t('business.deliveryDetails.driver')}:</span>
              <span className="font-medium text-gray-900">{v.driver_name}</span>
            </div>
          )}
          {v.driver_phone && (
            <a href={`tel:${v.driver_phone}`} className="flex items-center gap-2 text-primary">
              <Phone className="w-4 h-4" />
              <span className="font-medium">{v.driver_phone}</span>
            </a>
          )}
          {v.plate_number && (
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{t('business.deliveryDetails.plate')}:</span>
              <span className="font-medium text-gray-900">{v.plate_number}</span>
            </div>
          )}
          {v.color && (
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">{t('business.deliveryDetails.color')}:</span>
              <span className="font-medium text-gray-900">{v.color}</span>
            </div>
          )}
        </dl>
      ) : (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('business.deliveryDetails.hireRevealAfterConfirm')}</span>
        </div>
      )}
    </div>
  );
}
