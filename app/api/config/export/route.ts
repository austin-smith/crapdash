import { NextResponse } from 'next/server';
import { readConfig } from '@/lib/db';

export async function GET() {
  try {
    const config = await readConfig();
    const today = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(config, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="config-${today}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export config error:', error);
    return NextResponse.json(
      { error: 'Failed to export configuration' },
      { status: 500 }
    );
  }
}

