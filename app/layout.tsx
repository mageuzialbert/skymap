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
    title: profile?.company_name || "The Skymap Logistics",
    description: "Modern Logistics & Delivery Platform - Track your shipments with The Skymap",
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: profile?.company_name || "The Skymap",
    },
    formatDetection: {
      telephone: true,
    },
    icons: profile?.favicon_url ? {
      icon: profile.favicon_url,
      shortcut: profile.favicon_url,
      apple: profile.favicon_url,
    } : {
      icon: '/icons/icon.png',
      shortcut: '/icons/icon.png',
      apple: '/icons/icon.png',
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
        <meta name="application-name" content="The Skaymap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="The Skaymap" />
        <meta name="msapplication-TileColor" content="#0b5a54" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon.png" />
      </head>
      <body>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
