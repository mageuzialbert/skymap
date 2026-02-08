'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { Loader2, MapPin, User, Phone, Package, Calendar, AlertCircle } from 'lucide-react';

interface Delivery {
  id: string;
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
  assigned_rider?: {
    name: string;
    phone: string;
  } | null;
}

interface DeliveryDetailsProps {
  delivery: Delivery;
}

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.75rem',
};

const defaultCenter = {
  lat: -6.7924,
  lng: 39.2083,
};

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800 border-gray-200',
  ASSIGNED: 'bg-blue-100 text-blue-800 border-blue-200',
  PICKED_UP: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  IN_TRANSIT: 'bg-orange-100 text-orange-800 border-orange-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  FAILED: 'bg-red-100 text-red-800 border-red-200',
};

export default function DeliveryDetails({ delivery }: DeliveryDetailsProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  // Memoize location objects to prevent re-renders
  const pickupLocation = useMemo(() => {
    if (delivery.pickup_latitude && delivery.pickup_longitude) {
      return { lat: Number(delivery.pickup_latitude), lng: Number(delivery.pickup_longitude) };
    }
    return null;
  }, [delivery.pickup_latitude, delivery.pickup_longitude]);

  const dropoffLocation = useMemo(() => {
    if (delivery.dropoff_latitude && delivery.dropoff_longitude) {
      return { lat: Number(delivery.dropoff_latitude), lng: Number(delivery.dropoff_longitude) };
    }
    return null;
  }, [delivery.dropoff_latitude, delivery.dropoff_longitude]);

  // Memoize the map center to prevent re-renders
  const mapCenter = useMemo(() => {
    return pickupLocation || defaultCenter;
  }, [pickupLocation]);

  useEffect(() => {
    if (isLoaded && pickupLocation && dropoffLocation) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickupLocation,
          destination: dropoffLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`Directions request failed: ${status}`);
          }
        }
      );
    }
  }, [isLoaded, pickupLocation, dropoffLocation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header / Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500 mb-1">Delivery ID: {delivery.id}</div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Details</h1>
        </div>
        <div>
          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${statusColors[delivery.status] || statusColors.CREATED}`}>
            {delivery.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Route Map
              </h2>
            </div>
            
            {loadError && (
              <div className="p-8 text-center text-amber-600 bg-amber-50">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                <p>Map could not be loaded.</p>
              </div>
            )}

            {!isLoaded && !loadError && (
              <div className="h-[400px] flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={mapCenter}
                options={{
                  disableDefaultUI: false,
                  streetViewControl: false,
                  mapTypeControl: false,
                }}
              >
                {pickupLocation && <Marker position={pickupLocation} label="A" title="Pickup" />}
                {dropoffLocation && <Marker position={dropoffLocation} label="B" title="Dropoff" />}
                {directions && <DirectionsRenderer directions={directions} />}
              </GoogleMap>
            )}
          </div>

          {/* Locations Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
              {/* Pickup */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">A</div>
                  Pickup Details
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.pickup_name}</div>
                      <div className="text-sm text-gray-500">Contact Person</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.pickup_phone}</div>
                      <div className="text-sm text-gray-500">Phone Number</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.pickup_address}</div>
                      <div className="text-sm text-gray-500">Address</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropoff */}
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">B</div>
                  Drop-off Details
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.dropoff_name}</div>
                      <div className="text-sm text-gray-500">Recipient</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.dropoff_phone}</div>
                      <div className="text-sm text-gray-500">Phone Number</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{delivery.dropoff_address}</div>
                      <div className="text-sm text-gray-500">Address</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info */}
        <div className="space-y-6">
          {/* Package Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              Package Information
            </h3>
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 text-amber-900">
              <p className="whitespace-pre-wrap">{delivery.package_description || 'No description provided.'}</p>
            </div>
          </div>

          {/* Rider Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              Assigned Rider
            </h3>
            {delivery.assigned_rider ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-500" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{delivery.assigned_rider.name}</div>
                  <div className="text-sm text-gray-500">{delivery.assigned_rider.phone}</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                No rider assigned yet
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
             <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              Timeline
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">Created</div>
                  <div className="text-xs text-gray-500">{formatDate(delivery.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
