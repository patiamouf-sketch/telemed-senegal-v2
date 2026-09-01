import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';

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
        </AuthProvider>
      </body>
    </html>
  );
}
