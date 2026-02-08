'use client';

import Link from 'next/link';
import { ArrowRight, Package } from 'lucide-react';

export default function CTABar() {
  return (
    <div className="bg-primary text-white py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
          <Link
            href="/register"
            className="w-full md:w-auto bg-white text-primary font-semibold px-8 py-4 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <span>Register Now</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/quick-order"
            className="w-full md:w-auto bg-secondary text-white font-semibold px-8 py-4 rounded-lg hover:bg-secondary-dark transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <Package className="w-5 h-5" />
            <span>Order Delivery Now</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
