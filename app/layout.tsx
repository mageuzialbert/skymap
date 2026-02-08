import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createClient } from '@/lib/supabase-server';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';

async function getCompanyProfile() {
  try {
    const supabaseClient = await createClient();
    const { data } = await supabaseClient
      .from('company_profile')
      .select('company_name, favicon_url')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .single();

    return data;
  } catch (error) {
    return null;
  }
}

export const viewport: Viewport = {
  themeColor: '#0b5a54',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getCompanyProfile();
  
  return {
    title: profile?.company_name || "Skymap Logistics",
    description: "Modern Logistics & Delivery Platform - Track your shipments with Skymap",
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: profile?.company_name || "Skymap",
    },
    formatDetection: {
      telephone: true,
    },
    icons: profile?.favicon_url ? {
      icon: profile.favicon_url,
      shortcut: profile.favicon_url,
      apple: profile.favicon_url,
    } : {
      icon: '/icons/icon.svg',
      shortcut: '/icons/icon.svg',
      apple: '/icons/icon-maskable.svg',
    },
    other: {
      'mobile-web-app-capable': 'yes',
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Skymap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Skymap" />
        <meta name="msapplication-TileColor" content="#0b5a54" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-maskable.svg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-maskable.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-maskable.svg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-maskable.svg" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
