'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import DeliveryDetails from '@/components/rider/DeliveryDetails';
import Link from 'next/link';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_name: string;
  pickup_phone: string;
  pickup_region_id: number | null;
  pickup_district_id: number | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_name: string;
  dropoff_phone: string;
  dropoff_region_id: number | null;
  dropoff_district_id: number | null;
  package_description: string | null;
  status: string;
  assigned_rider_id: string | null;
  created_at: string;
  delivered_at: string | null;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface DeliveryEvent {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  created_by?: {
    id: string;
    name: string;
  };
}

export default function RiderJobDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [error, setError] = useState('');

  const loadDeliveryDetails = useCallback(async () => {
    try {
      // Load all deliveries and find the one we need
      const deliveryResponse = await fetch(`/api/rider/deliveries?limit=1000`);
      if (deliveryResponse.ok) {
        const deliveries = await deliveryResponse.json();
        const foundDelivery = deliveries.find((d: Delivery) => d.id === deliveryId);
        if (foundDelivery) {
          setDelivery(foundDelivery);
        } else {
          setError('Delivery not found or you are not assigned to it');
        }
      } else {
        setError('Failed to load delivery');
      }

      // Load delivery events
      const eventsResponse = await fetch(`/api/deliveries/${deliveryId}/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
      setError('Failed to load delivery details');
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'RIDER') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadDeliveryDetails();
    }
    checkRole();
  }, [router, deliveryId, loadDeliveryDetails]);

  async function handleStatusUpdate(status: string, note: string) {
    setUpdating(true);
    setError('');

    try {
      const response = await fetch(`/api/rider/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Reload delivery and events
      await loadDeliveryDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Link
          href="/dashboard/rider/jobs"
          className="text-primary hover:text-primary-dark"
        >
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  return (
    <div className="pb-20">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard/rider/jobs"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Delivery Details</h1>
          <p className="text-gray-600 mt-1">ID: {delivery.id.slice(0, 8)}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <DeliveryDetails
        delivery={delivery}
        events={events}
        onStatusUpdate={handleStatusUpdate}
        loading={updating}
      />
    </div>
  );
}
