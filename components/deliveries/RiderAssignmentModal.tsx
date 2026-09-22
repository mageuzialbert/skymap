'use client';

import { useState, useEffect } from 'react';
import { Loader2, Shield, User } from 'lucide-react';
import Alert from '@/components/common/Alert';
import Sheet from '@/components/common/Sheet';
import { OptionGroup, OptionRow } from '@/components/wizard/OptionGroup';
import { useT } from '@/lib/i18n';
import { pillGhost, pillPrimary } from '@/lib/ui';

interface Rider {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  vehicle_type_id?: string | null;
}

interface RiderAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (riderId: string) => Promise<void>;
  deliveryId: string;
  /** When set, only riders operating this vehicle type can be assigned. */
  vehicleTypeId?: string | null;
  vehicleLabel?: string | null;
  loading?: boolean;
}

export default function RiderAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  deliveryId,
  vehicleTypeId,
  vehicleLabel,
  loading = false,
}: RiderAssignmentModalProps) {
  const t = useT();
  const [allRiders, setAllRiders] = useState<Rider[]>([]);
  const [admins, setAdmins] = useState<Rider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRiders();
    }
  }, [isOpen]);

  // When the ride requested a specific vehicle type, only offer matching riders.
  const riders = vehicleTypeId
    ? allRiders.filter((r) => r.vehicle_type_id === vehicleTypeId)
    : allRiders;

  // No rider owns this vehicle type, so the job would be unassignable. Admins
  // double as riders, so offer them rather than showing an empty list with no
  // way out. They stay a clearly-labelled fallback, never merged in with riders.
  const showAdminFallback = riders.length === 0 && admins.length > 0;

  async function loadRiders() {
    setLoadingRiders(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users?role=RIDER&active=true');
      if (!response.ok) throw new Error(t('components.riderAssignment.loadFailed'));
      const data = await response.json();
      setAllRiders(data);

      // Fetched unconditionally: whether the fallback is needed depends on the
      // vehicle filter applied to the riders we just got, and a second awaited
      // round-trip after that would leave the sheet blank for longer.
      const adminRes = await fetch('/api/admin/users?role=ADMIN&active=true');
      if (adminRes.ok) setAdmins(await adminRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('components.riderAssignment.loadFailed'));
    } finally {
      setLoadingRiders(false);
    }
  }

  async function handleAssign() {
    if (!selectedRiderId) {
      setError(t('components.riderAssignment.pleaseSelect'));
      return;
    }

    setError('');
    try {
      await onAssign(selectedRiderId);
      onClose();
      setSelectedRiderId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('components.riderAssignment.assignFailed'));
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={() => !loading && onClose()}
      title={t('components.riderAssignment.title')}
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={`${pillGhost} h-12 flex-1`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading || !selectedRiderId}
            className={`${pillPrimary} h-12 flex-[2]`}
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading
              ? t('components.riderAssignment.assigning')
              : t('components.riderAssignment.title')}
          </button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        {error && <Alert tone="error">{error}</Alert>}

        {vehicleLabel && !showAdminFallback && (
          <Alert tone="info">
            {t('components.riderAssignment.requestedVehicle')}:{' '}
            <span className="font-semibold">{vehicleLabel}</span> —{' '}
            {t('components.riderAssignment.onlyMatching')}
          </Alert>
        )}

        {loadingRiders ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : showAdminFallback ? (
          <>
            <Alert tone="warning">
              {vehicleLabel ? (
                <>
                  {t('components.riderAssignment.requestedVehicle')}:{' '}
                  <span className="font-semibold">{vehicleLabel}</span>.{' '}
                </>
              ) : null}
              {vehicleTypeId
                ? t('components.riderAssignment.noRidersForVehicle')
                : t('components.riderAssignment.noRiders')}
              {'. '}
              {t('components.riderAssignment.adminFallbackHint')}
            </Alert>
            <OptionGroup label={t('components.riderAssignment.selectAdmin')}>
              {admins.map((admin) => (
                <OptionRow
                  key={admin.id}
                  selected={selectedRiderId === admin.id}
                  onSelect={() => {
                    setSelectedRiderId(admin.id);
                    setError('');
                  }}
                  disabled={loading}
                  icon={<Shield className="h-5 w-5" />}
                  title={admin.name}
                  subtitle={admin.phone}
                />
              ))}
            </OptionGroup>
          </>
        ) : riders.length === 0 ? (
          <p className="py-10 text-center text-[15px] text-gray-500">
            {vehicleTypeId
              ? t('components.riderAssignment.noRidersForVehicle')
              : t('components.riderAssignment.noRiders')}
          </p>
        ) : (
          /* A rider is a person, not a dropdown entry - the row shows who they
             are and is a 56px target. */
          <OptionGroup label={t('components.riderAssignment.selectRider')}>
            {riders.map((rider) => (
              <OptionRow
                key={rider.id}
                selected={selectedRiderId === rider.id}
                onSelect={() => {
                  setSelectedRiderId(rider.id);
                  setError('');
                }}
                disabled={loading}
                icon={<User className="h-5 w-5" />}
                title={rider.name}
                subtitle={rider.phone}
              />
            ))}
          </OptionGroup>
        )}
      </div>
    </Sheet>
  );
}
