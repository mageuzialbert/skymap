'use client';

import { useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (status: string, note: string) => Promise<void>;
  currentStatus: string;
  loading?: boolean;
}

const statusOptions = [
  { value: 'PICKED_UP', label: 'Picked Up', description: 'Package has been collected from pickup location' },
  { value: 'IN_TRANSIT', label: 'In Transit', description: 'Package is on the way to destination' },
  { value: 'DELIVERED', label: 'Delivered', description: 'Package has been successfully delivered' },
  { value: 'FAILED', label: 'Failed', description: 'Delivery could not be completed' },
];

const validTransitions: Record<string, string[]> = {
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED'],
};

export default function StatusUpdateModal({
  isOpen,
  onClose,
  onUpdate,
  currentStatus,
  loading = false,
}: StatusUpdateModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState('');

  const availableStatuses = validTransitions[currentStatus] || [];

  if (!isOpen) return null;

  async function handleSubmit() {
    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }

    if (!availableStatuses.includes(selectedStatus)) {
      setError(`Cannot transition from ${currentStatus} to ${selectedStatus}`);
      return;
    }

    setError('');
    try {
      await onUpdate(selectedStatus, note);
      onClose();
      setSelectedStatus('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-t-lg md:rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Update Delivery Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Status
            </label>
            <div className="px-4 py-2 bg-gray-50 rounded-md text-sm text-gray-700">
              {currentStatus.replace('_', ' ')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status *
            </label>
            <div className="space-y-2">
              {statusOptions
                .filter((option) => availableStatuses.includes(option.value))
                .map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedStatus === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={option.value}
                      checked={selectedStatus === option.value}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </div>
                  </label>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSubmit}
              disabled={loading || !selectedStatus}
              className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Updating...' : 'Update Status'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
