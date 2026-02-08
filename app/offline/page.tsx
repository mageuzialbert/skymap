'use client';

import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Offline Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-gray-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          You&apos;re Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-6">
          It looks like you&apos;ve lost your internet connection. 
          Please check your connection and try again.
        </p>

        {/* Brand */}
        <div className="mb-6 py-4 border-t border-b border-gray-100">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-primary">Kasi Courier Services</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            B2B Logistics Delivery Platform
          </p>
        </div>

        {/* Retry Button */}
        <button
          onClick={handleRetry}
          className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>

        {/* Tips */}
        <div className="mt-6 text-left">
          <p className="text-sm font-medium text-gray-700 mb-2">Troubleshooting tips:</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Check your Wi-Fi or mobile data connection</li>
            <li>• Try moving to an area with better signal</li>
            <li>• Restart your device if the problem persists</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
