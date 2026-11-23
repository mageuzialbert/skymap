"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import LocationPicker from "@/components/common/LocationPicker";
import Alert from '@/components/common/Alert';
import { useT } from '@/lib/i18n';
import { fieldLabel, helpText, inputClass, pillGhost, pillPrimary, sectionLabel } from '@/lib/ui';

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
  const t = useT();
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
      {error && <Alert tone="error">{error}</Alert>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel}>
            {t('admin.clients.name')} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={fieldLabel}>
            {t('admin.clients.phone')} *
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
            placeholder="+255…"
            className={inputClass}
          />
        </div>

        {/* Only show email and password for new businesses */}
        {!isEditing && (
          <>
            <div>
              <label className={fieldLabel}>
                {t('admin.clients.email')} *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                placeholder={t('admin.clients.emailPlaceholder')}
                className={inputClass}
              />
              <p className={helpText}>{t('admin.clients.usedForLogin')}</p>
            </div>

            <div>
              <label className={fieldLabel}>
                {t('admin.clients.password')} *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                minLength={6}
                placeholder={t('admin.clients.passwordPlaceholder')}
                className={inputClass}
              />
            </div>
          </>
        )}

        <div>
          <label className={fieldLabel}>
            {t('admin.clients.deliveryFee')}
          </label>
          <input
            type="number"
            value={formData.delivery_fee}
            onChange={(e) =>
              setFormData({ ...formData, delivery_fee: e.target.value })
            }
            step="0.01"
            min="0"
            placeholder={t('admin.clients.feePlaceholder')}
            className={inputClass}
          />
          <p className={helpText}>
            {t('admin.clients.deliveryFeeHint')}
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
            {t('admin.clients.active')}
          </label>
        </div>
      </div>

      {/* Location Section */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-md font-semibold text-gray-800 mb-3">
          {t('admin.clients.location')}
        </h3>

        {/* Business address */}
        <div className="mb-4">
          <LocationPicker
              label={t('admin.clients.address')}
              value={formData.address}
              onChange={handleLocationChange}
              defaultLocation={
                formData.latitude && formData.longitude
                  ? { lat: formData.latitude, lng: formData.longitude }
                  : undefined
              }
            />
        </div>

        {/* Region and District */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={fieldLabel}>
              {t('admin.clients.region')}
            </label>
            <select
              value={selectedRegionId || ""}
              onChange={(e) =>
                handleRegionChange(
                  e.target.value ? parseInt(e.target.value) : null,
                )
              }
              disabled={loadingRegions}
              className={`${inputClass} disabled:bg-gray-100`}
            >
              <option value="">{t('admin.clients.selectRegion')}</option>
              {regions.map((region) => (
                <option key={region.id} value={region.id}>
                  {region.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={fieldLabel}>
              {t('admin.clients.district')}
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
              className={`${inputClass} disabled:bg-gray-100`}
            >
              <option value="">{t('admin.clients.selectDistrict')}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
            {!selectedRegionId && (
              <p className={helpText}>
                {t('admin.clients.selectRegionFirst')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`${pillPrimary} h-12 flex-[2]`}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading
            ? t('common.saving')
            : isEditing
              ? t('admin.clients.update')
              : t('admin.clients.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`${pillGhost} h-12 flex-1`}
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
