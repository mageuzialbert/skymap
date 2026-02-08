'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Loader2, Package } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import DeliveryCard from '@/components/rider/DeliveryCard';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_name: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_name: string;
  dropoff_phone: string;
  package_description: string | null;
  status: string;
  created_at: string;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function RiderJobsPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadDeliveries = useCallback(async () => {
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/rider/deliveries?limit=1000'
        : `/api/rider/deliveries?status=${statusFilter}&limit=1000`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'RIDER') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    if (role === 'RIDER') {
      loadDeliveries();
    }
  }, [statusFilter, role, loadDeliveries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-gray-600 mt-1">Assigned deliveries</p>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Filter className="w-5 h-5 text-gray-500" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="PICKED_UP">Picked Up</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {/* Deliveries List */}
      {deliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 text-lg mb-2">No deliveries found</p>
          <p className="text-gray-400 text-sm">
            {statusFilter === 'ALL' 
              ? 'You don\'t have any assigned deliveries yet.'
              : `No deliveries with status "${statusFilter}"`}
          </p>
        </div>
      ) : (
        <div>
          {deliveries.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery} />
          ))}
        </div>
      )}
    </div>
  );
}
