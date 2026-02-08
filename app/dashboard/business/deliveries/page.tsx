'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { X, Plus, Loader2, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import DeliveryForm, { DeliveryFormData } from '@/components/deliveries/DeliveryForm';

interface Delivery {
  id: string;
  pickup_address: string;
  pickup_name: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_name: string;
  dropoff_phone: string;
  package_description: string | null;
  status: string;
  assigned_rider_id: string | null;
  created_at: string;
  delivered_at: string | null;
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800 border border-gray-300',
  ASSIGNED: 'bg-blue-100 text-blue-800 border border-blue-300',
  PICKED_UP: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  IN_TRANSIT: 'bg-orange-100 text-orange-800 border border-orange-300',
  DELIVERED: 'bg-green-100 text-green-800 border border-green-300',
  FAILED: 'bg-red-100 text-red-800 border border-red-300',
};

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'CREATED', label: 'Created' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'PICKED_UP', label: 'Picked Up' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

function BusinessDeliveriesContent() {
  const searchParams = useSearchParams();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we should show create form
    if (searchParams.get('action') === 'create') {
      setShowCreateForm(true);
    }
    loadDeliveries();
  }, [searchParams]);

  async function loadDeliveries() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get business ID
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!business) return;

      // Get deliveries
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
      setFilteredDeliveries(data || []);
    } catch (err) {
      console.error('Error loading deliveries:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter deliveries based on status
  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredDeliveries(deliveries);
    } else {
      setFilteredDeliveries(deliveries.filter(d => d.status === statusFilter));
    }
  }, [statusFilter, deliveries]);

  async function handleCreateDelivery(formData: DeliveryFormData) {
    setError('');
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get business with package info
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          package_id,
          delivery_fee,
          delivery_fee_packages:package_id (
            id,
            fee_per_delivery
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (businessError || !business) throw new Error('Business not found');

      // Determine the delivery fee
      let deliveryFee: number | null = null;
      
      if (business.delivery_fee) {
        // Use business's custom delivery fee if set
        deliveryFee = parseFloat(business.delivery_fee.toString());
      } else if (
        business.delivery_fee_packages &&
        typeof business.delivery_fee_packages === "object" &&
        !Array.isArray(business.delivery_fee_packages)
      ) {
        // Use business's package fee
        const packages = business.delivery_fee_packages as {
          id: any;
          fee_per_delivery: any;
        };
        deliveryFee = parseFloat(packages.fee_per_delivery.toString());
      } else {
        // Fall back to default package
        const { data: defaultPackage } = await supabase
          .from('delivery_fee_packages')
          .select('fee_per_delivery')
          .eq('is_default', true)
          .eq('active', true)
          .single();
        
        if (defaultPackage) {
          deliveryFee = parseFloat(defaultPackage.fee_per_delivery.toString());
        }
      }

      // Create delivery with delivery_fee
      const { data: deliveryData, error: createError } = await supabase
        .from('deliveries')
        .insert({
          business_id: business.id,
          pickup_address: formData.pickup_address,
          pickup_latitude: formData.pickup_latitude,
          pickup_longitude: formData.pickup_longitude,
          pickup_name: formData.pickup_name,
          pickup_phone: formData.pickup_phone,
          pickup_region_id: formData.pickup_region_id,
          pickup_district_id: formData.pickup_district_id,
          dropoff_address: formData.dropoff_address,
          dropoff_latitude: formData.dropoff_latitude,
          dropoff_longitude: formData.dropoff_longitude,
          dropoff_name: formData.dropoff_name,
          dropoff_phone: formData.dropoff_phone,
          dropoff_region_id: formData.dropoff_region_id,
          dropoff_district_id: formData.dropoff_district_id,
          package_description: formData.package_description || null,
          delivery_fee: deliveryFee,
          status: 'CREATED',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (createError) throw createError;

      // Create charge record for revenue tracking
      if (deliveryData && deliveryFee && deliveryFee > 0) {
        await supabase
          .from('charges')
          .insert({
            delivery_id: deliveryData.id,
            business_id: business.id,
            amount: deliveryFee,
            description: 'Delivery fee - Created by business',
          });
      }

      setShowCreateForm(false);
      loadDeliveries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delivery');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Deliveries</h1>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Create Delivery</span>
          </button>
        )}
      </div>

      {/* Create Delivery Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Delivery</h2>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setError('');
              }}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <DeliveryForm
            onSubmit={handleCreateDelivery}
            onCancel={() => {
              setShowCreateForm(false);
              setError('');
            }}
            loading={submitting}
            error={error}
          />
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-sm font-medium"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {statusFilter !== 'ALL' && (
          <span className="text-sm text-gray-600">
            Showing {filteredDeliveries.length} of {deliveries.length} deliveries
          </span>
        )}
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pickup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Drop-off
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDeliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    {deliveries.length === 0 
                      ? 'No deliveries found. Create your first delivery!'
                      : `No deliveries found with status "${statusOptions.find(o => o.value === statusFilter)?.label}".`
                    }
                  </td>
                </tr>
              ) : (
                filteredDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {delivery.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{delivery.pickup_name}</div>
                      <div className="text-xs text-gray-500">{delivery.pickup_address}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{delivery.dropoff_name}</div>
                      <div className="text-xs text-gray-500">{delivery.dropoff_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                          statusColors[delivery.status] || statusColors.CREATED
                        }`}
                      >
                        {delivery.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function BusinessDeliveriesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <BusinessDeliveriesContent />
    </Suspense>
  );
}
