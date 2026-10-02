import { NextResponse } from 'next/server';
import { computeStatus } from '@/lib/status';

/**
 * Machine-readable provider status. Each call fans out to every venue, so
 * the CDN holds the answer for a minute: this is for monitoring and for
 * confirming connectors after a deploy, not for polling in a loop.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const report = await computeStatus();
  return NextResponse.json(report, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control': 'max-age=60',
    },
  });
}
