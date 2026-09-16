import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';
import { ServiceWorkerRegister } from '@/components/ui/ServiceWorkerRegister';
import { PWAInstallBanner } from '@/components/ui/PWAInstallBanner';

// Chargement sécurisé local Next.js (Zéro CDN, Zéro appel externe, Zéro redirection)
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'TELEMED SENEGAL • Plateforme Médicale',
  description: 'Plateforme de télémédecine pour praticiens et patients au Sénégal.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TéléMed SN',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
  themeColor: '#3B82F6',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`scroll-smooth ${inter.variable} ${poppins.variable}`}>
      <body className={`${inter.className} min-h-screen text-[#1E293B]`}>
        <AuthProvider>
          {children}
          <PWAInstallBanner />
          <ServiceWorkerRegister />
        </AuthProvider>
      </body>
    </html>
  );
}
