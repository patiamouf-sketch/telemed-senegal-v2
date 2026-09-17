import { NextResponse } from 'next/server';
import { executeDataRetentionCycle } from '@/lib/services/retentionService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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
