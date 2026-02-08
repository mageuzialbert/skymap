"use client";

import { useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";
import { Loader2, AlertCircle } from "lucide-react";
import LocationPicker from "@/components/common/LocationPicker";

interface Business {
  id: string;
  name: string;
  phone: string;
  delivery_fee: number | null;
  active: boolean;
  created_at: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district_id?: number | null;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: string;
  };
}

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

interface BusinessFormProps {
  business?: Business | null;
  onSubmit: (data: BusinessFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string;
}

export interface BusinessFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  delivery_fee: string;
  active: boolean;
  address: string;
  latitude: number | null;
  longitude: number | null;
  district_id: number | null;
}

export default function BusinessForm({
  business,
  onSubmit,
  onCancel,
  loading,
  error,
}: BusinessFormProps) {
  const isEditing = !!business;

  const [formData, setFormData] = useState<BusinessFormData>({
    name: business?.name || "",
    email: "",
    phone: business?.phone || "",
    password: "",
    delivery_fee: business?.delivery_fee?.toString() || "",
    active: business?.active ?? true,
    address: business?.address || "",
    latitude: business?.latitude || null,
    longitude: business?.longitude || null,
    district_id: business?.district_id || null,
  });

  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Load regions on mount
  useEffect(() => {
    async function loadRegions() {
      try {
        const response = await fetch("/api/regions");
        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        }
      } catch (err) {
        console.error("Error loading regions:", err);
      } finally {
        setLoadingRegions(false);
      }
    }
    loadRegions();
  }, []);

  // Load districts when region changes
  useEffect(() => {
    async function loadDistricts() {
      if (!selectedRegionId) {
        setDistricts([]);
        return;
      }

      setLoadingDistricts(true);
      try {
        const response = await fetch(
          `/api/districts?region_id=${selectedRegionId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setDistricts(data);
        }
      } catch (err) {
        console.error("Error loading districts:", err);
      } finally {
        setLoadingDistricts(false);
      }
    }
    loadDistricts();
  }, [selectedRegionId]);

  // Load region for existing district (when editing)
  useEffect(() => {
    async function loadRegionForDistrict() {
      if (business?.district_id && regions.length > 0) {
        try {
          const response = await fetch(`/api/districts?region_id=`);
          if (response.ok) {
            const allDistricts = await response.json();
            const district = allDistricts.find(
              (d: District) => d.id === business.district_id,
            );
            if (district) {
              setSelectedRegionId(district.region_id);
            }
          }
        } catch (err) {
          console.error("Error loading district region:", err);
        }
      }
    }
    loadRegionForDistrict();
  }, [business?.district_id, regions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  function handleLocationChange(
    address: string,
    lat: number | null,
    lng: number | null,
  ) {
    setFormData({
      ...formData,
      address,
      latitude: lat,
      longitude: lng,
    });
  }

  function handleRegionChange(regionId: number | null) {
    setSelectedRegionId(regionId);
    setFormData({ ...formData, district_id: null }); // Reset district when region changes
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loadError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Google Maps failed to load. You can still enter addresses manually.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
            placeholder="+255759561311"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Only show email and password for new businesses */}
        {!isEditing && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder="client@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Used for login</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Fee (TZS)
          </label>
          <input
            type="number"
            value={formData.delivery_fee}
            onChange={(e) =>
              setFormData({ ...formData, delivery_fee: e.target.value })
            }
            step="0.01"
            min="0"
            placeholder="0.00"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty to use default pricing
          </p>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) =>
              setFormData({ ...formData, active: e.target.checked })
            }
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
      </div>

      {/* Location Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-md font-semibold text-gray-800 mb-3">
          Business Location
        </h3>

        {/* Address with Google Maps */}
        <div className="mb-4">
          {isLoaded ? (
            <LocationPicker
              label="Business Address"
              value={formData.address}
              onChange={handleLocationChange}
              defaultLocation={
                formData.latitude && formData.longitude
                  ? { lat: formData.latitude, lng: formData.longitude }
                  : undefined
              }
            />
          ) : loadError ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Business Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="Enter business address"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-gray-500 text-sm">
                Loading maps...
              </span>
            </div>
          )}
        </div>

        {/* Region and District */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              value={selectedRegionId || ""}
              onChange={(e) =>
                handleRegionChange(
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              disabled={loadingRegions}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select region</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District
            </label>
            <select
              value={formData.district_id || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  district_id: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              disabled={!selectedRegionId || loadingDistricts}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            {!selectedRegionId && (
              <p className="mt-1 text-xs text-gray-500">
                Select a region first
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? "Saving..."
            : isEditing
              ? "Update Client"
              : "Create Client"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
