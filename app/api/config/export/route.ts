import { NextResponse } from 'next/server';
import { readRawConfig } from '@/lib/db';
import { getConfigExportFilename } from '@/lib/utils';

export async function GET() {
  try {
    const raw = await readRawConfig();

    return new NextResponse(raw, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${getConfigExportFilename()}"`,
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
