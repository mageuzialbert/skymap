'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  logo_url: string | null;
}

interface BusinessPartnersProps {
  businesses: Business[];
  totalBusinesses: number;
  totalDeliveries: number;
}

export default function BusinessPartners({ businesses, totalBusinesses, totalDeliveries }: BusinessPartnersProps) {
  // Limit displayed businesses to 20
  const displayBusinesses = businesses.slice(0, 20);
  const [isPaused, setIsPaused] = useState(false);
  
  // Duplicate the businesses array for seamless infinite loop
  const duplicatedBusinesses = [...displayBusinesses, ...displayBusinesses];

  return (
    <section className="py-16 md:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Statistics */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Who We Work With
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Trusted by businesses across Tanzania
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-12">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {totalBusinesses}+
              </div>
              <div className="text-gray-600">Businesses</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {totalDeliveries}+
              </div>
              <div className="text-gray-600">Deliveries</div>
            </div>
          </div>
        </div>

        {/* Business Logos Marquee */}
        {displayBusinesses.length > 0 ? (
          <div 
            className="relative w-full overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            {/* Gradient overlays for smooth fade effect */}
            <div className="absolute left-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-16 md:w-24 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
            
            {/* Scrolling container */}
            <div 
              className={`flex gap-6 md:gap-8 marquee-container ${isPaused ? '' : 'animate-marquee'}`}
              style={{ 
                width: 'fit-content',
                animationDuration: `${Math.max(20, displayBusinesses.length * 3)}s`
              }}
            >
              {duplicatedBusinesses.map((business, index) => (
                <div
                  key={`${business.id}-${index}`}
                  className="flex-shrink-0 group"
                >
                  <div className="bg-gray-50 rounded-xl p-4 md:p-6 flex flex-col items-center justify-center w-28 h-28 md:w-36 md:h-36 
                    transition-all duration-300 ease-out
                    hover:bg-white hover:shadow-lg hover:scale-105
                    active:scale-95"
                  >
                    {business.logo_url ? (
                      <div className="flex-1 flex items-center justify-center w-full">
                        <Image
                          src={business.logo_url}
                          alt={business.name}
                          width={100}
                          height={60}
                          className="object-contain max-w-full max-h-16 md:max-h-20
                            grayscale opacity-70 
                            group-hover:grayscale-0 group-hover:opacity-100
                            transition-all duration-300 ease-out"
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <Building2 className="w-8 h-8 md:w-10 md:h-10 text-gray-400 
                          group-hover:text-primary
                          transition-colors duration-300" />
                      </div>
                    )}
                    {/* Business name below logo */}
                    <span className="text-xs text-center text-gray-500 mt-2 truncate w-full px-1
                      group-hover:text-gray-800
                      transition-colors duration-300">
                      {business.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No business logos available yet</p>
          </div>
        )}
      </div>
    </section>
  );
}
