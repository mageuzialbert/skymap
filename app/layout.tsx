import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { createClient } from '@/lib/supabase-server';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import { LanguageProvider } from '@/lib/i18n';

// Fonts are self-hosted (woff2 in ./fonts) so builds never depend on reaching
// Google Fonts. Inter drives all body/UI text; Sora is the display face.
const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});
const sora = localFont({
  variable: "--font-sora",
  display: "swap",
  src: [
    { path: "./fonts/sora-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/sora-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/sora-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

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
  viewportFit: 'cover',
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
      icon: [
        { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      shortcut: '/icons/favicon-32.png',
      apple: '/icons/apple-touch-icon.png',
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
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="The Skaymap" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="The Skaymap" />
        <meta name="msapplication-TileColor" content="#0b5a54" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Apple Touch Icon (180x180, solid background) */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16.png" />
      </head>
      <body>
        <LanguageProvider>
          {children}
          <ServiceWorkerRegistration />
        </LanguageProvider>
      </body>
    </html>
  );
}
