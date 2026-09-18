/**
 * Moteur de Rate Limiting In-Memory (Algorithme de Fenêtre Glissante)
 * Protection Anti-Bruteforce, Anti-DoS et Limitation de Débit pour TELEMED SENEGAL V2
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Magasin en mémoire pour stocker les compteurs par clé (IP ou Token)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Nettoyage périodique toutes les 5 minutes pour éviter toute fuite de mémoire
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of Array.from(rateLimitStore.entries())) {
      if (record.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterSeconds: number;
}

/**
 * Vérifie si une requête respecte le quota alloué
 * @param key Identifiant unique du client (ex: IP, route + IP)
 * @param limit Nombre maximum de requêtes autorisées dans la fenêtre
 * @param windowSeconds Durée de la fenêtre en secondes (défaut 60s)
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowSeconds: number = 60
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = rateLimitStore.get(key);

  if (!existing || existing.resetTime <= now) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetTime,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetTime: existing.resetTime,
    retryAfterSeconds: 0,
  };
}

/**
 * Extrait l'adresse IP cliente fiable depuis les en-têtes de la requête
 */
export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return '127.0.0.1';
}
