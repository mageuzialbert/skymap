'use client';

import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { useMemo, useEffect, useState, useCallback } from 'react';
import { LocationState } from './types';

interface LandingMapProps {
  pickup: LocationState;
  dropoff: LocationState;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -6.7924,
  lng: 39.2083,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
    {
      featureType: 'transit',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export default function LandingMap({ pickup, dropoff }: LandingMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const center = useMemo(() => {
    if (pickup.latitude && pickup.longitude) {
      return { lat: pickup.latitude, lng: pickup.longitude };
    }
    return defaultCenter;
  }, [pickup.latitude, pickup.longitude]);

  // Calculate route between pickup and dropoff
  useEffect(() => {
    if (!pickup.latitude || !pickup.longitude || !dropoff.latitude || !dropoff.longitude) {
      setDirections(null);
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    
    directionsService.route(
      {
        origin: { lat: pickup.latitude, lng: pickup.longitude },
        destination: { lat: dropoff.latitude, lng: dropoff.longitude },
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          setDirections(result);
        } else {
          console.error('Directions request failed:', status);
          setDirections(null);
        }
      }
    );
  }, [pickup.latitude, pickup.longitude, dropoff.latitude, dropoff.longitude]);

  // Fit bounds when we have both points
  useEffect(() => {
    if (!map) return;

    if (pickup.latitude && pickup.longitude && dropoff.latitude && dropoff.longitude) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.latitude, lng: pickup.longitude });
      bounds.extend({ lat: dropoff.latitude, lng: dropoff.longitude });
      map.fitBounds(bounds, {
        top: 180,
        right: 40,
        bottom: 380,
        left: 40,
      });
    } else if (pickup.latitude && pickup.longitude) {
      map.panTo({ lat: pickup.latitude, lng: pickup.longitude });
      map.setZoom(15);
    } else if (dropoff.latitude && dropoff.longitude) {
      map.panTo({ lat: dropoff.latitude, lng: dropoff.longitude });
      map.setZoom(15);
    }
  }, [map, pickup, dropoff]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
        options={mapOptions}
        onLoad={onLoad}
      >
        {/* Show route if we have directions */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#0b5a54',
                strokeWeight: 4,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}

        {/* Pickup Marker */}
        {pickup.latitude && pickup.longitude && (
          <Marker
            position={{ lat: pickup.latitude, lng: pickup.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            label={{
              text: 'P',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          />
        )}

        {/* Dropoff Marker */}
        {dropoff.latitude && dropoff.longitude && (
          <Marker
            position={{ lat: dropoff.latitude, lng: dropoff.longitude }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#f59e0b',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            }}
            label={{
              text: 'D',
              color: '#ffffff',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          />
        )}
      </GoogleMap>

      {/* Gradient overlays for better UI visibility */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-black/40 via-black/20 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
    </div>
  );
}
