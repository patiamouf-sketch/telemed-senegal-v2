import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/utils/rateLimiter';

/**
 * Middleware de Sécurité Périmétrique Globale - TELEMED SENEGAL V2
 * 1. Filtrage anti-intrusion et blocage des scanners malveillants.
 * 2. Rate Limiting in-memory par adresse IP sur les routes sensibles.
 * 3. Injection systématique des en-têtes HTTP de sécurité stricts.
 */

// Liste noire de chemins et motifs malveillants couramment scannés
const BLOCKED_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login\.php/i,
  /\/xmlrpc\.php/i,
  /\/phpmyadmin/i,
  /\/\.aws/i,
  /\/\.config/i,
  /\.\.%2f/i,
  /\.\.%5c/i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request.headers);

  // 1. Filtrage anti-intrusion : Rejet immédiat des sondes et scans malveillants
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(pathname) || pattern.test(request.url)) {
      return new NextResponse(
        JSON.stringify({ error: 'Accès refusé par la politique de sécurité.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // 2. Application du Rate Limiting adaptatif
  // A. Scan QR Code Ordonnances (/verify et /verify-rx) : Max 30 scans / minute par IP
  if (pathname.startsWith('/verify/') || pathname.startsWith('/verify-rx/')) {
    const rateLimit = checkRateLimit(`scan_${clientIp}`, 30, 60);
    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Trop de vérifications d\'ordonnances en peu de temps. Veuillez patienter.',
          retryAfter: rateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // B. API Envoi Push (/api/push/send) : Max 15 requêtes / minute par IP
  if (pathname.startsWith('/api/push/send')) {
    const rateLimit = checkRateLimit(`push_${clientIp}`, 15, 60);
    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Quota d\'envoi de notifications push temporairement dépassé.',
          retryAfter: rateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // C. API Rétention & Cron (/api/cron/) : Max 10 requêtes / minute par IP
  if (pathname.startsWith('/api/cron/')) {
    const rateLimit = checkRateLimit(`cron_${clientIp}`, 10, 60);
    if (!rateLimit.success) {
      return new NextResponse(
        JSON.stringify({
          error: 'Fréquence d\'appel cron excessive.',
          retryAfter: rateLimit.retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }
  }

  // 3. Poursuite normale avec injection des en-têtes de sécurité
  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Intercepte toutes les routes à l'exception des fichiers statiques :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation d'images)
     * - favicon.ico (icône de favori)
     * - images, sons, manifest et icônes
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|sounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ogg)).*)',
  ],
};
