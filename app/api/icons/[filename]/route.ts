import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getIconFilePath, isValidImageExtension } from '@/lib/file-utils';

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Validate filename (prevent path traversal)
    if (!filename || filename.includes('..') || filename.includes('/')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Validate extension
    if (!isValidImageExtension(filename)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Get file path
    const filePath = getIconFilePath(filename);

    // Get file stats for ETag
    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
    }

    // Generate ETag from file modification time and size
    const etag = `"${stats.mtimeMs.toString(36)}-${stats.size.toString(36)}"`;

    // Check if client has valid cached version
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Get content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

    // Return file with cache validation headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'ETag': etag,
      },
    });
  } catch (error) {
    console.error('Error serving icon:', error);
    return NextResponse.json({ error: 'Failed to serve icon' }, { status: 500 });
  }
}
