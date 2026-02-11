'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SliderImage {
  id: string;
  image_url: string;
  caption: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

interface HeroSliderProps {
  slides?: SliderImage[];
  height?: 'compact' | 'normal' | 'tall';
}

export default function HeroSlider({ slides = [], height = 'normal' }: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [dynamicSlides, setDynamicSlides] = useState<SliderImage[]>(slides);
  const [isLoading, setIsLoading] = useState(slides.length === 0);

  // Fetch sliders dynamically if not provided
  useEffect(() => {
    if (slides.length > 0) {
      setDynamicSlides(slides);
      setIsLoading(false);
      return;
    }

    const fetchSliders = async () => {
      try {
        const response = await fetch('/api/cms/sliders');
        if (response.ok) {
          const data = await response.json();
          setDynamicSlides(data);
        }
      } catch (error) {
        console.error('Error fetching sliders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSliders();
  }, [slides]);

  // Auto-play slider
  useEffect(() => {
    if (dynamicSlides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % dynamicSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [dynamicSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + dynamicSlides.length) % dynamicSlides.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % dynamicSlides.length);
  };

  // Touch handlers for mobile swipe
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrevious();
    }
  };

  // Height classes
  const heightClasses = {
    compact: 'h-32 md:h-40',
    normal: 'h-48 md:h-64',
    tall: 'h-56 md:h-80'
  };

  if (isLoading) {
    return (
      <div className={`relative w-full ${heightClasses[height]} bg-gradient-to-r from-primary/20 to-primary-dark/20 animate-pulse rounded-2xl`} />
    );
  }

  if (dynamicSlides.length === 0) {
    return (
      <div className={`relative w-full ${heightClasses[height]} bg-gradient-to-r from-primary to-primary-dark flex items-center justify-center rounded-2xl overflow-hidden`}>
        <div className="text-center text-white px-4">
          <h1 className="text-xl md:text-2xl font-bold">The Skaymap Logistics</h1>
          <p className="text-sm md:text-base opacity-90">Fast, Reliable Delivery</p>
        </div>
      </div>
    );
  }

  const currentSlide = dynamicSlides[currentIndex];

  return (
    <div 
      className={`relative w-full ${heightClasses[height]} overflow-hidden rounded-2xl`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide Image */}
      <div className="relative w-full h-full">
        <Image
          src={currentSlide.image_url}
          alt={currentSlide.caption || 'Slider image'}
          fill
          className="object-cover"
          priority={currentIndex === 0}
          sizes="100vw"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Caption */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="text-white">
            {currentSlide.caption && (
              <h2 className="text-lg md:text-xl font-bold drop-shadow-lg line-clamp-2">
                {currentSlide.caption}
              </h2>
            )}
            {currentSlide.cta_text && currentSlide.cta_link && (
              <Link
                href={currentSlide.cta_link}
                className="inline-block mt-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
              >
                {currentSlide.cta_text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Arrows - Only on larger screens */}
      {dynamicSlides.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors hidden md:block"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-1.5 rounded-full transition-colors hidden md:block"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {dynamicSlides.length > 1 && (
        <div className="absolute bottom-2 right-3 flex gap-1.5">
          {dynamicSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
