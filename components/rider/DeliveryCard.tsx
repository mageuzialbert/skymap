'use client';

import { Package, MapPin, Clock, ChevronRight, Navigation, Phone } from 'lucide-react';
import Link from 'next/link';

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

interface DeliveryCardProps {
  delivery: Delivery;
}

const statusColors: Record<string, string> = {
  PENDING_CONFIRMATION: 'bg-purple-100 text-purple-800 border border-purple-300',
  ASSIGNED: 'bg-blue-100 text-blue-800 border border-blue-300',
  PICKED_UP: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  IN_TRANSIT: 'bg-orange-100 text-orange-800 border border-orange-300',
  DELIVERED: 'bg-green-100 text-green-800 border border-green-300',
  FAILED: 'bg-red-100 text-red-800 border border-red-300',
  REJECTED: 'bg-red-100 text-red-800 border border-red-300',
};

const statusLabels: Record<string, string> = {
  PENDING_CONFIRMATION: 'Pending Confirmation',
  ASSIGNED: 'Assigned',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
};

export default function DeliveryCard({ delivery }: DeliveryCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get the next destination based on status
  const getNextDestination = () => {
    if (delivery.status === 'ASSIGNED') {
      return {
        lat: delivery.pickup_latitude,
        lng: delivery.pickup_longitude,
        address: delivery.pickup_address,
        phone: delivery.pickup_phone,
        label: 'Pickup',
      };
    } else if (delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT') {
      return {
        lat: delivery.dropoff_latitude,
        lng: delivery.dropoff_longitude,
        address: delivery.dropoff_address,
        phone: delivery.dropoff_phone,
        label: 'Drop-off',
      };
    }
    return null;
  };

  const getNavigationUrl = (lat: number | null, lng: number | null, address: string) => {
    if (lat && lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  const nextDest = getNextDestination();
  const isActive = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
      <Link href={`/dashboard/rider/jobs/${delivery.id}`}>
        <div className="p-4 active:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-primary/10 rounded-lg">
                  <Package className="w-4 h-4 text-primary" />
                </div>
                <span className="font-semibold text-gray-900 truncate">
                  {delivery.businesses?.name || 'Unknown Business'}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                  <span className="truncate">{delivery.pickup_address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                  <span className="truncate">{delivery.dropoff_address}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2 mt-1" />
          </div>

          <div className="flex items-center justify-between">
            <span
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                statusColors[delivery.status] || statusColors.ASSIGNED
              }`}
            >
              {statusLabels[delivery.status] || delivery.status}
            </span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(delivery.created_at)}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Actions for Active Deliveries */}
      {isActive && nextDest && (
        <div className="flex border-t border-gray-100">
          <a
            href={`tel:${nextDest.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            <Phone className="w-4 h-4" />
            Call {nextDest.label}
          </a>
          <a
            href={getNavigationUrl(nextDest.lat, nextDest.lng, nextDest.address)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
          >
            <Navigation className="w-4 h-4" />
            Navigate
          </a>
        </div>
      )}
    </div>
  );
}
