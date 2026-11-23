'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ArrowLeft, Truck, Users, Phone, Palette, Hash, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import DeliveryDetails from '@/components/deliveries/DeliveryDetails';
import { cardClass, pillGhost, sectionLabel } from '@/lib/ui';

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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className={`${cardClass} px-6 py-12 text-center`}>
        <p className="text-base font-semibold text-gray-900">
          {error || t('business.deliveryDetails.notFound')}
        </p>
        <Link href="/dashboard/business/rides" className={`${pillGhost} mt-5`}>
          <ArrowLeft className="h-5 w-5" />
          {t('business.deliveryDetails.back')}
        </Link>
      </div>
    );
  }

  // No width or padding of its own: the dashboard layout already centres this
  // at max-w-3xl with p-4, and the old max-w-7xl px-4 py-8 double-padded it.
  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/business/rides"
        className="-ml-1 inline-flex min-h-[2.75rem] items-center gap-2 text-[15px] font-medium text-gray-500 transition-colors active:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        {t('business.deliveryDetails.back')}
      </Link>

      {hireInfo?.hireVehicle && <HireVehicleCard info={hireInfo} />}

      <DeliveryDetails delivery={delivery} showServiceBadge={false} />
    </div>
  );
}

/** One label/value line on the hire card. */
function Spec({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex min-h-[2rem] items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <dt className="text-[13px] text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function HireVehicleCard({ info }: { info: any }) {
  const t = useT();
  const v = info.hireVehicle;
  const confirmed = info.confirmed;
  const Icon = v.category === 'people' ? Users : Truck;
  // Capacity and colour are both optional, so build the line from what exists.
  const spec = [
    v.capacity_value != null ? `${v.capacity_value} ${v.capacity_unit || ''}`.trim() : '',
    v.color || '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <section>
      <h2 className={sectionLabel}>{t('components.rideWizard.group.vehicle')}</h2>
      <div className={`${cardClass} p-4 sm:p-5`}>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-primary">
            {v.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Icon className="h-6 w-6" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-semibold text-gray-900">{v.name}</span>
            {spec && <span className="mt-0.5 block truncate text-[13px] text-gray-500">{spec}</span>}
          </span>
        </div>

        {confirmed ? (
          <dl className="space-y-1">
            {v.driver_name && (
              <Spec icon={Users} label={t('business.deliveryDetails.driver')} value={v.driver_name} />
            )}
            {v.plate_number && (
              <Spec icon={Hash} label={t('business.deliveryDetails.plate')} value={v.plate_number} />
            )}
            {v.color && (
              <Spec icon={Palette} label={t('business.deliveryDetails.color')} value={v.color} />
            )}
            {v.driver_phone && (
              <a
                href={`tel:${v.driver_phone}`}
                className="-mx-1 flex min-h-[3rem] items-center gap-2.5 rounded-xl px-1 font-semibold text-primary transition-colors active:bg-primary/5"
              >
                <Phone className="h-5 w-5 shrink-0" />
                <span className="text-[15px]">{v.driver_phone}</span>
              </a>
            )}
          </dl>
        ) : (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-800">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('business.deliveryDetails.hireRevealAfterConfirm')}</span>
          </div>
        )}
      </div>
    </section>
  );
}
