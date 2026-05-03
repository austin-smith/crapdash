import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchServiceFavicon } from '@/lib/favicon';
import { getIconsDir } from '@/lib/paths';
import { createTestDataDir, removeTestDataDir } from './test-data-dir';

let rootDir: string;

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe('favicon fetching', () => {
  beforeEach(async () => {
    rootDir = await createTestDataDir('favicon');
  });

  afterEach(async () => {
    await removeTestDataDir(rootDir);
  });

  it('rejects non-SVG XML payloads when content type is generic', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('<link rel="icon" href="/feed.xml" type="application/octet-stream">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === 'https://example.com/feed.xml') {
        return response('<?xml version="1.0"?><rss><channel /></rss>', {
          headers: { 'content-type': 'application/octet-stream' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceFavicon('https://example.com/', 'example')).resolves.toBeNull();
    await expect(readdir(getIconsDir())).resolves.toEqual([]);
  });

  it('accepts SVG payloads after an XML declaration', async () => {
    const svg = '<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" />';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('<link rel="icon" href="/favicon.xml" type="application/octet-stream">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === 'https://example.com/favicon.xml') {
        return response(svg, {
          headers: { 'content-type': 'application/octet-stream' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceFavicon('https://example.com/', 'example')).resolves.toBe('icons/example.svg');
    await expect(readFile(path.join(getIconsDir(), 'example.svg'), 'utf-8')).resolves.toBe(svg);
  });
});
