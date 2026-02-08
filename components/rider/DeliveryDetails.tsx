'use client';

import { useState } from 'react';
import { Package, MapPin, Phone, User, Clock, FileText, Navigation, ExternalLink } from 'lucide-react';
import StatusUpdateModal from './StatusUpdateModal';

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

interface DeliveryDetailsProps {
  delivery: Delivery;
  events?: DeliveryEvent[];
  onStatusUpdate: (status: string, note: string) => Promise<void>;
  loading?: boolean;
}

const statusColors: Record<string, string> = {
  PENDING_CONFIRMATION: 'bg-purple-100 text-purple-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  PICKED_UP: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export default function DeliveryDetails({
  delivery,
  events = [],
  onStatusUpdate,
  loading = false,
}: DeliveryDetailsProps) {
  const [showStatusModal, setShowStatusModal] = useState(false);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canUpdateStatus = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(delivery.status);

  // Generate Google Maps navigation URL
  const getNavigationUrl = (lat: number | null, lng: number | null, address: string) => {
    if (lat && lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    // Fallback to address search if no coordinates
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };

  // Get the next navigation target based on status
  const getNextDestination = () => {
    if (delivery.status === 'ASSIGNED') {
      return {
        type: 'pickup',
        lat: delivery.pickup_latitude,
        lng: delivery.pickup_longitude,
        address: delivery.pickup_address,
        label: 'Navigate to Pickup',
      };
    } else if (delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT') {
      return {
        type: 'dropoff',
        lat: delivery.dropoff_latitude,
        lng: delivery.dropoff_longitude,
        address: delivery.dropoff_address,
        label: 'Navigate to Drop-off',
      };
    }
    return null;
  };

  const nextDestination = getNextDestination();

  return (
    <div className="space-y-4 pb-32">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
            statusColors[delivery.status] || statusColors.ASSIGNED
          }`}
        >
          {delivery.status.replace('_', ' ')}
        </span>
      </div>

      {/* Pending Confirmation Notice */}
      {delivery.status === 'PENDING_CONFIRMATION' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-900">Awaiting Confirmation</h4>
              <p className="text-sm text-purple-700 mt-1">
                This delivery is pending approval from staff/admin. Once confirmed, you will be able to start the delivery.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Rejected Notice */}
      {delivery.status === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Clock className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-semibold text-red-900">Delivery Rejected</h4>
              <p className="text-sm text-red-700 mt-1">
                This delivery request was rejected by staff/admin.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Card - Most Important for Riders */}
      {nextDestination && (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              <span className="font-semibold">
                {nextDestination.type === 'pickup' ? 'Go to Pickup' : 'Go to Drop-off'}
              </span>
            </div>
            {(nextDestination.lat && nextDestination.lng) && (
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">GPS Ready</span>
            )}
          </div>
          <p className="text-sm text-white/90 mb-3 line-clamp-2">{nextDestination.address}</p>
          <a
            href={getNavigationUrl(nextDestination.lat, nextDestination.lng, nextDestination.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-white text-primary font-semibold py-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            Open in Google Maps
          </a>
        </div>
      )}

      {/* Business Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-gray-900">Business</h3>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <p className="font-medium">{delivery.businesses?.name || 'Unknown'}</p>
            <p className="text-gray-500">{delivery.businesses?.phone || ''}</p>
          </div>
          {delivery.businesses?.phone && (
            <a
              href={`tel:${delivery.businesses.phone}`}
              className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
            >
              <Phone className="w-5 h-5 text-primary" />
            </a>
          )}
        </div>
      </div>

      {/* Pickup Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Pickup Location</h3>
          {delivery.pickup_latitude && delivery.pickup_longitude && (
            <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">GPS</span>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-900">{delivery.pickup_name}</p>
            <p className="text-sm text-gray-600">{delivery.pickup_address}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${delivery.pickup_phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
            <a
              href={getNavigationUrl(delivery.pickup_latitude, delivery.pickup_longitude, delivery.pickup_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </a>
          </div>
        </div>
      </div>

      {/* Dropoff Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MapPin className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900">Drop-off Location</h3>
          {delivery.dropoff_latitude && delivery.dropoff_longitude && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">GPS</span>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <p className="font-medium text-gray-900">{delivery.dropoff_name}</p>
            <p className="text-sm text-gray-600">{delivery.dropoff_address}</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${delivery.dropoff_phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              <Phone className="w-4 h-4" />
              Call
            </a>
            <a
              href={getNavigationUrl(delivery.dropoff_latitude, delivery.dropoff_longitude, delivery.dropoff_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </a>
          </div>
        </div>
      </div>

      {/* Package Description */}
      {delivery.package_description && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-amber-100 rounded-lg">
              <FileText className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Package Description</h3>
          </div>
          <p className="text-sm text-gray-700 bg-amber-50 p-3 rounded-lg">{delivery.package_description}</p>
        </div>
      )}

      {/* Delivery Timeline */}
      {events.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Delivery Timeline</h3>
          </div>
          <div className="space-y-3">
            {events.map((event, index) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  {index < events.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[event.status] || statusColors.ASSIGNED
                      }`}
                    >
                      {event.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>
                  {event.note && (
                    <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      {canUpdateStatus && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <button
            onClick={() => setShowStatusModal(true)}
            className="w-full bg-primary text-white py-4 rounded-xl hover:bg-primary-dark transition-colors font-semibold text-lg flex items-center justify-center gap-2"
          >
            Update Delivery Status
          </button>
        </div>
      )}

      {/* Status Update Modal */}
      <StatusUpdateModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onUpdate={onStatusUpdate}
        currentStatus={delivery.status}
        loading={loading}
      />
    </div>
  );
}
