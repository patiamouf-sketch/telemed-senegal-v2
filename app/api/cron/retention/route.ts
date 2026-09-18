import { NextResponse } from 'next/server';
import { executeDataRetentionCycle } from '@/lib/services/retentionService';

export const dynamic = 'force-dynamic';

/**
 * Validation de sécurité pour l'exécution du cycle de rétention (Vercel Cron ou Secret Token)
 */
function isCronAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const cronSecret = process.env.CRON_SECRET;

  // En production, l'en-tête Bearer <CRON_SECRET> est strictement obligatoire
  if (cronSecret) {
    return authHeader.trim() === `Bearer ${cronSecret.trim()}`;
  }

  // En développement local (sans CRON_SECRET défini dans l'environnement)
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé. Jeton d\'autorisation CRON_SECRET requis.' },
        { status: 401 }
      );
    }

    const result = await executeDataRetentionCycle('system-cron@telemed.sn');
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors du cycle de rétention',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json(
        { success: false, error: 'Accès refusé. Jeton d\'autorisation CRON_SECRET requis.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const adminEmail = body.adminEmail || 'dr.thiam@telemed.sn';
    const result = await executeDataRetentionCycle(adminEmail);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erreur lors du cycle de rétention',
      },
      { status: 500 }
    );
  }
}
