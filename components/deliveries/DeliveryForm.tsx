"use client";

import { useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";
import {
  Loader2,
  MapPin,
  User,
  Phone,
  Package,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  Check,
  DollarSign,
  Calendar,
} from "lucide-react";
import LocationPicker from "@/components/common/LocationPicker";

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

interface Business {
  id: string;
  name: string;
  phone?: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  district_id?: number | null;
  delivery_fee?: number | null;
  package_id?: string | null;
  delivery_fee_packages?: {
    id: string;
    fee_per_delivery: number;
  } | null;
}

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void;
  onCancel?: () => void;
  loading: boolean;
  error: string;
  businessId?: string | null;
  showBusinessSelector?: boolean;
  showDeliveryFee?: boolean;
}

export interface DeliveryFormData {
  business_id?: string;
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
  package_description: string;
  delivery_fee?: number;
  created_at?: string;
}

export default function DeliveryForm({
  onSubmit,
  onCancel,
  loading,
  error,
  businessId,
  showBusinessSelector = false,
  showDeliveryFee = false,
}: DeliveryFormProps) {
  const [regions, setRegions] = useState<Region[]>([]);
  const [pickupDistricts, setPickupDistricts] = useState<District[]>([]);
  const [dropoffDistricts, setDropoffDistricts] = useState<District[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [loadingPickupDistricts, setLoadingPickupDistricts] = useState(false);
  const [loadingDropoffDistricts, setLoadingDropoffDistricts] = useState(false);
  const [pickupCollapsed, setPickupCollapsed] = useState(false);
  const [pickupPreFilled, setPickupPreFilled] = useState(false);
  const [defaultPackageFee, setDefaultPackageFee] = useState<number>(0);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Get current datetime in local timezone for the default created_at value
  const getCurrentLocalDatetime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localDate = new Date(now.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState<DeliveryFormData>({
    business_id: businessId || undefined,
    pickup_address: "",
    pickup_latitude: null,
    pickup_longitude: null,
    pickup_name: "",
    pickup_phone: "",
    pickup_region_id: null,
    pickup_district_id: null,
    dropoff_address: "",
    dropoff_latitude: null,
    dropoff_longitude: null,
    dropoff_name: "",
    dropoff_phone: "",
    dropoff_region_id: null,
    dropoff_district_id: null,
    package_description: "",
    delivery_fee: 0,
    created_at: getCurrentLocalDatetime(),
  });

  // Auto-populate pickup when business is selected
  async function handleBusinessChange(selectedBusinessId: string) {
    setFormData((prev) => ({ ...prev, business_id: selectedBusinessId }));

    if (!selectedBusinessId) {
      setPickupPreFilled(false);
      setPickupCollapsed(false);
      // Reset to default package fee when no business selected
      setFormData((prev) => ({ ...prev, delivery_fee: defaultPackageFee }));
      return;
    }

    // Find business in the list with full details
    const selectedBusiness = businesses.find(
      (b) => b.id === selectedBusinessId,
    );

    if (selectedBusiness) {
      // Determine delivery fee for this business
      let businessDeliveryFee = defaultPackageFee;
      if (selectedBusiness.delivery_fee) {
        // Use business's custom delivery fee
        businessDeliveryFee = parseFloat(
          selectedBusiness.delivery_fee.toString(),
        );
      } else if (selectedBusiness.delivery_fee_packages?.fee_per_delivery) {
        // Use business's package fee
        businessDeliveryFee = parseFloat(
          selectedBusiness.delivery_fee_packages.fee_per_delivery.toString(),
        );
      }

      // Auto-populate pickup fields from business data
      const newFormData: Partial<DeliveryFormData> = {
        business_id: selectedBusinessId,
        pickup_name: selectedBusiness.name || "",
        pickup_phone: selectedBusiness.phone || "",
        pickup_address: selectedBusiness.address || "",
        pickup_latitude: selectedBusiness.latitude || null,
        pickup_longitude: selectedBusiness.longitude || null,
        pickup_district_id: selectedBusiness.district_id || null,
        delivery_fee: businessDeliveryFee,
      };

      // If district exists, find its region
      if (selectedBusiness.district_id) {
        try {
          const response = await fetch("/api/districts");
          if (response.ok) {
            const allDistricts = await response.json();
            const district = allDistricts.find(
              (d: District) => d.id === selectedBusiness.district_id,
            );
            if (district) {
              newFormData.pickup_region_id = district.region_id;
              // Load districts for that region
              const districtResponse = await fetch(
                `/api/districts?region_id=${district.region_id}`,
              );
              if (districtResponse.ok) {
                const districtsData = await districtResponse.json();
                setPickupDistricts(districtsData);
              }
            }
          }
        } catch (err) {
          console.error("Error loading district region:", err);
        }
      }

      setFormData((prev) => ({ ...prev, ...newFormData }));
      setPickupPreFilled(true);

      // On mobile (< 1024px), collapse pickup section
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setPickupCollapsed(true);
      }
    }
  }

  useEffect(() => {
    async function loadRegions() {
      try {
        const response = await fetch("/api/regions");
        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        }
      } catch (error) {
        console.error("Error loading regions:", error);
      } finally {
        setLoadingRegions(false);
      }
    }
    loadRegions();
  }, []);

  // Load default package fee on mount
  useEffect(() => {
    async function loadDefaultPackageFee() {
      try {
        const response = await fetch("/api/delivery-packages/public");
        if (response.ok) {
          const packages = await response.json();
          const defaultPkg = packages.find(
            (p: { is_default: boolean; active: boolean }) =>
              p.is_default && p.active,
          );
          if (defaultPkg) {
            const fee = parseFloat(defaultPkg.fee_per_delivery.toString());
            setDefaultPackageFee(fee);
            // Set initial delivery fee to default package fee
            setFormData((prev) => ({ ...prev, delivery_fee: fee }));
          }
        }
      } catch (error) {
        console.error("Error loading default package fee:", error);
      }
    }
    loadDefaultPackageFee();
  }, []);

  useEffect(() => {
    if (showBusinessSelector) {
      async function loadBusinesses() {
        setLoadingBusinesses(true);
        try {
          // Fetch businesses with their delivery fee package info
          const response = await fetch(
            "/api/staff/businesses?limit=1000&include_package=true",
          );
          console.log("Businesses API response status:", response.status);
          if (response.ok) {
            const data = await response.json();
            console.log("Businesses loaded:", data?.length || 0);
            setBusinesses(data);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error("Businesses API error:", response.status, errorData);
          }
        } catch (error) {
          console.error("Error loading businesses:", error);
        } finally {
          setLoadingBusinesses(false);
        }
      }
      loadBusinesses();
    }
  }, [showBusinessSelector]);

  useEffect(() => {
    async function loadPickupDistricts() {
      if (!formData.pickup_region_id) {
        setPickupDistricts([]);
        setFormData((prev) => ({ ...prev, pickup_district_id: null }));
        return;
      }

      setLoadingPickupDistricts(true);
      try {
        const response = await fetch(
          `/api/districts?region_id=${formData.pickup_region_id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setPickupDistricts(data);
        }
      } catch (error) {
        console.error("Error loading districts:", error);
      } finally {
        setLoadingPickupDistricts(false);
      }
    }
    loadPickupDistricts();
  }, [formData.pickup_region_id]);

  useEffect(() => {
    async function loadDropoffDistricts() {
      if (!formData.dropoff_region_id) {
        setDropoffDistricts([]);
        setFormData((prev) => ({ ...prev, dropoff_district_id: null }));
        return;
      }

      setLoadingDropoffDistricts(true);
      try {
        const response = await fetch(
          `/api/districts?region_id=${formData.dropoff_region_id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setDropoffDistricts(data);
        }
      } catch (error) {
        console.error("Error loading districts:", error);
      } finally {
        setLoadingDropoffDistricts(false);
      }
    }
    loadDropoffDistricts();
  }, [formData.dropoff_region_id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(formData);
  }

  const inputClass =
    "w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const sectionHeaderClass =
    "flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>
            Google Maps failed to load. Address search and map features are
            unavailable. You can still enter addresses manually.
          </span>
        </div>
      )}

      {!isLoaded && !loadError && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-gray-500">Loading maps...</span>
        </div>
      )}

      {/* Business Selector */}
      {showBusinessSelector && (
        <div className="bg-gray-50 rounded-lg p-4">
          <label className={labelClass}>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-400" />
              Business <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            value={formData.business_id || ""}
            onChange={(e) => handleBusinessChange(e.target.value)}
            required
            disabled={loadingBusinesses}
            className={inputClass}
          >
            <option value="">Select a business</option>
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
          {pickupPreFilled && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Pickup details auto-filled from business
            </p>
          )}
        </div>
      )}

      {/* Pickup and Dropoff - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickup Details - Left Column */}
        <div className="bg-green-50/50 rounded-xl p-5 border border-green-100">
          <button
            type="button"
            onClick={() => setPickupCollapsed(!pickupCollapsed)}
            className={`${sectionHeaderClass} w-full cursor-pointer hover:opacity-80 transition-opacity`}
          >
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <span className="flex-1 text-left">Pickup Details</span>
            {pickupPreFilled && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Pre-filled
              </span>
            )}
            <span className="lg:hidden">
              {pickupCollapsed ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              )}
            </span>
          </button>

          {/* Collapsed Summary (mobile only) */}
          {pickupCollapsed && pickupPreFilled && (
            <div className="lg:hidden bg-green-100/50 rounded-lg p-3 mb-2 text-sm">
              <p className="font-medium text-green-800">
                {formData.pickup_name}
              </p>
              <p className="text-green-700">{formData.pickup_phone}</p>
              <p className="text-green-600 truncate">
                {formData.pickup_address || "No address"}
              </p>
              <button
                type="button"
                onClick={() => setPickupCollapsed(false)}
                className="text-green-700 underline text-xs mt-1"
              >
                Edit pickup details
              </button>
            </div>
          )}

          <div
            className={`space-y-4 ${pickupCollapsed ? "hidden lg:block" : ""}`}
          >
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  Contact Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.pickup_name}
                onChange={(e) =>
                  setFormData({ ...formData, pickup_name: e.target.value })
                }
                required
                placeholder="Who to pick up from"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone Number <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="tel"
                value={formData.pickup_phone}
                onChange={(e) =>
                  setFormData({ ...formData, pickup_phone: e.target.value })
                }
                required
                placeholder="+255..."
                className={inputClass}
              />
            </div>

            <div>
              {isLoaded ? (
                <LocationPicker
                  label="Pickup Address *"
                  value={formData.pickup_address}
                  onChange={(address, lat, lng) =>
                    setFormData({
                      ...formData,
                      pickup_address: address,
                      pickup_latitude: lat,
                      pickup_longitude: lng,
                    })
                  }
                  defaultLocation={
                    formData.pickup_latitude && formData.pickup_longitude
                      ? {
                          lat: formData.pickup_latitude,
                          lng: formData.pickup_longitude,
                        }
                      : undefined
                  }
                  error={
                    formData.pickup_address ? undefined : "Address is required"
                  }
                />
              ) : (
                <>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Address <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pickup_address: e.target.value,
                      })
                    }
                    required
                    placeholder="Street address, building, etc."
                    className={inputClass}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Region</label>
                <select
                  value={formData.pickup_region_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_region_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={loadingRegions}
                  className={inputClass}
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
                <label className={labelClass}>District</label>
                <select
                  value={formData.pickup_district_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_district_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={
                    !formData.pickup_region_id || loadingPickupDistricts
                  }
                  className={inputClass}
                >
                  <option value="">Select district</option>
                  {pickupDistricts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Dropoff Details - Right Column */}
        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100">
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <span>Drop-off Details</span>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-gray-400" />
                  Recipient Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.dropoff_name}
                onChange={(e) =>
                  setFormData({ ...formData, dropoff_name: e.target.value })
                }
                required
                placeholder="Who to deliver to"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone Number <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="tel"
                value={formData.dropoff_phone}
                onChange={(e) =>
                  setFormData({ ...formData, dropoff_phone: e.target.value })
                }
                required
                placeholder="+255..."
                className={inputClass}
              />
            </div>

            <div>
              {isLoaded ? (
                <LocationPicker
                  label="Drop-off Address *"
                  value={formData.dropoff_address}
                  onChange={(address, lat, lng) =>
                    setFormData({
                      ...formData,
                      dropoff_address: address,
                      dropoff_latitude: lat,
                      dropoff_longitude: lng,
                    })
                  }
                  error={
                    formData.dropoff_address ? undefined : "Address is required"
                  }
                />
              ) : (
                <>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Address <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dropoff_address: e.target.value,
                      })
                    }
                    required
                    placeholder="Street address, building, etc."
                    className={inputClass}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Region</label>
                <select
                  value={formData.dropoff_region_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dropoff_region_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={loadingRegions}
                  className={inputClass}
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
                <label className={labelClass}>District</label>
                <select
                  value={formData.dropoff_district_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dropoff_district_id: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  disabled={
                    !formData.dropoff_region_id || loadingDropoffDistricts
                  }
                  className={inputClass}
                >
                  <option value="">Select district</option>
                  {dropoffDistricts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Special Instructions */}
      <div className="bg-amber-50/50 rounded-xl p-5 border border-amber-100">
        <div className={sectionHeaderClass}>
          <div className="p-2 bg-amber-100 rounded-lg">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <span>
            Special Instructions <span className="text-red-500">*</span>
          </span>
        </div>
        <textarea
          value={formData.package_description}
          onChange={(e) =>
            setFormData({ ...formData, package_description: e.target.value })
          }
          required
          rows={3}
          placeholder="Package details, handling instructions, delivery notes..."
          className={inputClass + " resize-none"}
        />
      </div>

      {/* Delivery Fee - Only shown when showDeliveryFee is true */}
      {showDeliveryFee && (
        <div className="bg-purple-50/50 rounded-xl p-5 border border-purple-100">
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <span>Delivery Fee</span>
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-gray-400" />
                Fee Amount (TZS)
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.delivery_fee ?? 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  delivery_fee: e.target.value ? parseFloat(e.target.value) : 0,
                })
              }
              placeholder="Enter delivery fee"
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Auto-filled from selected business package. You can adjust if
              needed.
            </p>
          </div>
        </div>
      )}

      {/* Created Date/Time - Only shown when showDeliveryFee is true (staff form) */}
      {showDeliveryFee && (
        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-200">
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-600" />
            </div>
            <span>Delivery Date & Time</span>
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                When was this delivery done?
              </span>
            </label>
            <input
              type="datetime-local"
              value={formData.created_at || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  created_at: e.target.value,
                })
              }
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Defaults to current date/time. Adjust if the delivery was already completed.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? "Creating Delivery..." : "Create Delivery"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
