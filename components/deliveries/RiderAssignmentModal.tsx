'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface Rider {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

interface RiderAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (riderId: string) => Promise<void>;
  deliveryId: string;
  loading?: boolean;
}

export default function RiderAssignmentModal({
  isOpen,
  onClose,
  onAssign,
  deliveryId,
  loading = false,
}: RiderAssignmentModalProps) {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [loadingRiders, setLoadingRiders] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadRiders();
    }
  }, [isOpen]);

  async function loadRiders() {
    setLoadingRiders(true);
    setError('');
    try {
      const response = await fetch('/api/admin/users?role=RIDER&active=true');
      if (!response.ok) throw new Error('Failed to load riders');
      const data = await response.json();
      setRiders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load riders');
    } finally {
      setLoadingRiders(false);
    }
  }

  async function handleAssign() {
    if (!selectedRiderId) {
      setError('Please select a rider');
      return;
    }

    setError('');
    try {
      await onAssign(selectedRiderId);
      onClose();
      setSelectedRiderId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign rider');
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Assign Rider</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {loadingRiders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : riders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active riders available
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Rider *
                </label>
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Choose a rider...</option>
                  {riders.map((rider) => (
                    <option key={rider.id} value={rider.id}>
                      {rider.name} - {rider.phone}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAssign}
                  disabled={loading || !selectedRiderId}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Assigning...' : 'Assign Rider'}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
