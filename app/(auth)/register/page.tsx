'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerBusiness } from '@/lib/auth';

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

interface DeliveryPackage {
  id: string;
  name: string;
  description: string | null;
  fee_per_delivery: number;
  is_default: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 = Business Info, 2 = Account Info, 3 = Package Selection
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    phone: '+255',
    password: '',
    confirmPassword: '',
    regionId: '',
    districtId: '',
    packageId: '',
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [packages, setPackages] = useState<DeliveryPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch regions
    fetch('/api/regions')
      .then(res => res.json())
      .then(data => setRegions(data))
      .catch(err => console.error('Error fetching regions:', err));

    // Fetch delivery packages
    fetch('/api/delivery-packages/public')
      .then(res => res.json())
      .then(data => {
        setPackages(data);
        // Set default package if available
        const defaultPackage = data.find((pkg: DeliveryPackage) => pkg.is_default);
        if (defaultPackage) {
          setFormData(prev => ({ ...prev, packageId: defaultPackage.id }));
        }
      })
      .catch(err => console.error('Error fetching packages:', err));
  }, []);

  useEffect(() => {
    // Fetch districts when region is selected
    if (formData.regionId) {
      fetch(`/api/districts?region_id=${formData.regionId}`)
        .then(res => res.json())
        .then(data => {
          setDistricts(data);
          setFormData(prev => ({ ...prev, districtId: '' })); // Reset district
        })
        .catch(err => console.error('Error fetching districts:', err));
    } else {
      setDistricts([]);
    }
  }, [formData.regionId]);

  const validateStep1 = () => {
    setError('');
    
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!formData.regionId) {
      setError('Please select a region');
      return false;
    }

    if (!formData.districtId) {
      setError('Please select a district');
      return false;
    }

    return true;
  };

  const validateStep2 = () => {
    setError('');

    // Ensure phone starts with +255 and is properly formatted
    let phoneNumber = formData.phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // Validate that there are exactly 9 digits after +255
    const digitsAfter255 = phoneNumber.replace(/^\+255/, '');
    if (digitsAfter255.length !== 9) {
      setError('Phone number must be exactly 9 digits after +255 (e.g., +255759561311)');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const validateStep3 = () => {
    setError('');
    if (!formData.packageId) {
      setError('Please select a delivery package');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 3) {
      if (!validateStep3()) {
        return;
      }
    } else if (!validateStep2()) {
      return;
    }

    setLoading(true);
    setError('');

    // Ensure phone starts with +255 and is properly formatted
    let phoneNumber = formData.phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    try {
      await registerBusiness({
        businessName: formData.businessName,
        email: formData.email,
        phone: phoneNumber,
        password: formData.password,
        districtId: parseInt(formData.districtId),
        packageId: formData.packageId,
      });
      router.push('/dashboard/business');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo/Branding */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Kasi Courier Services
          </h1>
          <p className="text-gray-600">Register your business</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`w-16 h-1 mx-2 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>
        </div>
        <div className="flex justify-center mb-6 text-sm text-gray-600">
          <span className={step === 1 ? 'font-semibold text-primary' : ''}>Business Info</span>
          <span className="mx-2">•</span>
          <span className={step === 2 ? 'font-semibold text-primary' : ''}>Account</span>
          <span className="mx-2">•</span>
          <span className={step === 3 ? 'font-semibold text-primary' : ''}>Package</span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Business Information */}
          {step === 1 && (
            <>
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label htmlFor="regionId" className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select
                  id="regionId"
                  value={formData.regionId}
                  onChange={(e) => setFormData({ ...formData, regionId: e.target.value, districtId: '' })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select Region</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="districtId" className="block text-sm font-medium text-gray-700 mb-1">
                  District
                </label>
                <select
                  id="districtId"
                  value={formData.districtId}
                  onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                  required
                  disabled={!formData.regionId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select District</option>
                  {districts.map(district => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
                {!formData.regionId && (
                  <p className="text-xs text-gray-500 mt-1">
                    Please select a region first
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors font-medium"
              >
                Next
              </button>
            </>
          )}

          {/* Step 2: Account Information */}
          {step === 2 && (
            <>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    +255
                  </span>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone.replace(/^\+255/, '')}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 9); // Only digits, max 9
                      setFormData({ ...formData, phone: '+255' + value });
                    }}
                    required
                    maxLength={9}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="759561311"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter exactly 9 digits (e.g., 759561311). This will be your username for login.
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm your password"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 3: Package Selection */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Delivery Package *
                </label>
                <div className="space-y-3">
                  {packages.map((pkg) => (
                    <label
                      key={pkg.id}
                      className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        formData.packageId === pkg.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="packageId"
                        value={pkg.id}
                        checked={formData.packageId === pkg.id}
                        onChange={(e) => setFormData({ ...formData, packageId: e.target.value })}
                        className="mt-1 mr-3 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{pkg.name}</span>
                          {pkg.is_default && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">
                          {new Intl.NumberFormat('en-TZ', {
                            style: 'currency',
                            currency: 'TZS',
                            minimumFractionDigits: 0,
                          }).format(pkg.fee_per_delivery)}{' '}
                          per delivery
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Registering...' : 'Register Business'}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
