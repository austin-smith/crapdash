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

  it('resolves relative icon URLs against the final page URL after redirects', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('', {
          status: 301,
          headers: { location: 'https://www.example.com/dashboard/' },
        });
      }

      if (url === 'https://www.example.com/dashboard/') {
        return response('<link rel="icon" href="assets/icon.png" type="image/png">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === 'https://www.example.com/dashboard/assets/icon.png') {
        return new Response(png, {
          headers: { 'content-type': 'image/png' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceFavicon('https://example.com/', 'example')).resolves.toBe('icons/example.png');
    await expect(readFile(path.join(getIconsDir(), 'example.png'))).resolves.toEqual(png);
  });

  it('accepts cross-origin icon URLs declared by the page', async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('<link rel="icon" href="https://cdn.example.com/favicon.png" type="image/png">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === 'https://cdn.example.com/favicon.png') {
        return new Response(png, {
          headers: { 'content-type': 'image/png' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceFavicon('https://example.com/', 'example')).resolves.toBe('icons/example.png');
    await expect(readFile(path.join(getIconsDir(), 'example.png'))).resolves.toEqual(png);
  });

  it('decodes entity references in icon attributes', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" />';
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('<link rel="icon" href="/icons/a&amp;b.svg" type="image/svg+xml">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      if (url === 'https://example.com/icons/a&b.svg') {
        return response(svg, {
          headers: { 'content-type': 'image/svg+xml' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceFavicon('https://example.com/', 'example')).resolves.toBe('icons/example.svg');
    await expect(readFile(path.join(getIconsDir(), 'example.svg'), 'utf-8')).resolves.toBe(svg);
  });
});
