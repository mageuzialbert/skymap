'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, Home, LogIn, UserPlus, Info, Package } from 'lucide-react';

interface SlideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SlideMenu({ isOpen, onClose }: SlideMenuProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Slide Panel */}
      <div 
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-[101] transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 bg-primary flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="The Skaymap" className="w-10 h-10 bg-white rounded-lg p-1" />
            <span className="text-xl font-bold text-white">The Skaymap</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="p-4 space-y-1">
          <Link 
            href="/" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="font-medium">Home</span>
          </Link>

          <Link 
            href="/quick-order" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          >
            <Package className="w-5 h-5" />
            <span className="font-medium">Order Delivery</span>
          </Link>

          <hr className="my-3 border-gray-200" />

          <Link 
            href="/login" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span className="font-medium">Login</span>
          </Link>

          <Link 
            href="/register" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Register</span>
          </Link>

          <hr className="my-3 border-gray-200" />

          <Link 
            href="#about" 
            onClick={onClose}
            className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-primary/10 hover:text-primary rounded-xl transition-colors"
          >
            <Info className="w-5 h-5" />
            <span className="font-medium">About Us</span>
          </Link>
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            © {new Date().getFullYear()} The Skaymap Logistics
          </p>
        </div>
      </div>
    </>
  );
}
