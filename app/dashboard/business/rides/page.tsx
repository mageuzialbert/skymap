'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Filter, Bike, Plus, MapPin, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import ServiceBadge from '@/components/common/ServiceBadge';

interface Ride {
  id: string;
  pickup_address: string;
  pickup_name: string | null;
  dropoff_address: string | null;
  dropoff_name: string | null;
  status: string;
  service_type: string | null;
  vehicle_type_id: string | null;
  scheduled_pickup_at: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_fee?: number | null;
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800 border border-gray-300',
  PENDING_CONFIRMATION: 'bg-purple-100 text-purple-800 border border-purple-300',
  ASSIGNED: 'bg-blue-100 text-blue-800 border border-blue-300',
  PICKED_UP: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  IN_TRANSIT: 'bg-orange-100 text-orange-800 border border-orange-300',
  DELIVERED: 'bg-green-100 text-green-800 border border-green-300',
  FAILED: 'bg-red-100 text-red-800 border border-red-300',
  REJECTED: 'bg-red-100 text-red-800 border border-red-300',
};

function formatCurrency(v?: number | null) {
  if (v == null || v <= 0) return null;
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  }).format(v);
}

export default function RidesHistoryPage() {
  const t = useT();
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: { user } }, vtRes] = await Promise.all([
          supabase.auth.getUser(),
          fetch('/api/vehicle-types').then((r) => (r.ok ? r.json() : [])),
        ]);

        const map: Record<string, string> = {};
        (Array.isArray(vtRes) ? vtRes : []).forEach((v: any) => (map[v.id] = v.name));
        setVehicleNames(map);

        if (!user) return;
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!business) return;

        const { data } = await supabase
          .from('deliveries')
          .select('*')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false });
        setRides(data || []);
      } catch (err) {
        console.error('Error loading rides:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Apply date-range, time-range and status filters to created_at.
  const filtered = useMemo(() => {
    return rides.filter((r) => {
      const d = new Date(r.created_at);
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;

      if (timeFrom || timeTo) {
        const mins = d.getHours() * 60 + d.getMinutes();
        if (timeFrom) {
          const [h, m] = timeFrom.split(':').map(Number);
          if (mins < h * 60 + m) return false;
        }
        if (timeTo) {
          const [h, m] = timeTo.split(':').map(Number);
          if (mins > h * 60 + m) return false;
        }
      }
      return true;
    });
  }, [rides, statusFilter, dateFrom, dateTo, timeFrom, timeTo]);

  const hasFilters = dateFrom || dateTo || timeFrom || timeTo || statusFilter !== 'ALL';
  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setStatusFilter('ALL');
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('client.ridesHistory')}</h1>
        <Link
          href="/dashboard/business/request-ride"
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-primary-dark transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('client.requestRide')}</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date from</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date to</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time from</label>
            <input
              type="time"
              value={timeFrom}
              onChange={(e) => setTimeFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time to</label>
            <input
              type="time"
              value={timeTo}
              onChange={(e) => setTimeTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
            >
              <option value="ALL">All</option>
              <option value="CREATED">Created</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PICKED_UP">Picked up</option>
              <option value="IN_TRANSIT">In transit</option>
              <option value="DELIVERED">Delivered</option>
              <option value="FAILED">Failed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing {filtered.length} of {rides.length} rides
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/dashboard/business/deliveries/${r.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-5 py-4">
                      <ServiceBadge serviceType={r.service_type} />
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate max-w-[220px]">{r.pickup_address}</span>
                      </div>
                      {r.dropoff_address && (
                        <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-secondary-dark shrink-0" />
                          <span className="truncate max-w-[220px]">{r.dropoff_address}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {r.vehicle_type_id ? vehicleNames[r.vehicle_type_id] || '-' : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                          statusColors[r.status] || statusColors.CREATED
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(r.delivery_fee) || <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">No rides found.</div>
        ) : (
          filtered.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/business/deliveries/${r.id}`}
              className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <ServiceBadge serviceType={r.service_type} />
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                    statusColors[r.status] || statusColors.CREATED
                  }`}
                >
                  {r.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-900">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{r.pickup_address}</span>
              </div>
              {r.dropoff_address && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-secondary-dark shrink-0" />
                  <span className="truncate">{r.dropoff_address}</span>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date(r.created_at).toLocaleDateString()}{' '}
                {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <Bike className="w-3.5 h-3.5" />
                  {r.vehicle_type_id ? vehicleNames[r.vehicle_type_id] || '-' : '-'}
                </span>
                <span className="font-medium text-gray-900">{formatCurrency(r.delivery_fee) || '-'}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
