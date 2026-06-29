import { describe, expect, it, vi } from 'vitest';
import { fetchServiceMetadata, parseServiceMetadata } from '@/lib/service-metadata';

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe('service metadata', () => {
  it('extracts title from the document title and description from meta name description', () => {
    const html = `
      <html>
        <head>
          <title> Example &amp; Service </title>
          <meta name="description" content=" Runs the important things. ">
        </head>
      </html>
    `;

    expect(parseServiceMetadata(html)).toEqual({
      title: 'Example & Service',
      description: 'Runs the important things.',
    });
  });

  it('does not use Open Graph or Twitter descriptions as fallbacks', () => {
    const html = `
      <html>
        <head>
          <title>Example</title>
          <meta property="og:description" content="Do not use this">
          <meta name="twitter:description" content="Do not use this either">
        </head>
      </html>
    `;

    expect(parseServiceMetadata(html)).toEqual({
      title: 'Example',
      description: undefined,
    });
  });

  it('normalizes whitespace, decodes entities, and applies service limits', () => {
    const longDescription = `${'A'.repeat(510)} &amp; more`;
    const html = `
      <html>
        <head>
          <title>
            Line&#x20;One
            Line&nbsp;Two
          </title>
          <meta name="description" content="${longDescription}">
        </head>
      </html>
    `;

    const metadata = parseServiceMetadata(html);

    expect(metadata.title).toBe('Line One Line Two');
    expect(metadata.description).toHaveLength(500);
    expect(metadata.description).toBe('A'.repeat(500));
  });

  it('preserves encoded angle-bracket text in titles and descriptions', () => {
    const html = `
      <html>
        <head>
          <title>ACME &lt;Preview&gt;</title>
          <meta name="description" content="Tools for ACME &lt;Preview&gt;">
        </head>
      </html>
    `;

    expect(parseServiceMetadata(html)).toEqual({
      title: 'ACME <Preview>',
      description: 'Tools for ACME <Preview>',
    });
  });

  it('resolves metadata from the final page after redirects', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);

      if (url === 'https://example.com/') {
        return response('', {
          status: 302,
          headers: { location: 'https://example.com/app/' },
        });
      }

      if (url === 'https://example.com/app/') {
        return response('<title>Redirected App</title><meta name="description" content="Final page description">', {
          headers: { 'content-type': 'text/html' },
        });
      }

      return response('', { status: 404 });
    });

    await expect(fetchServiceMetadata('https://example.com/')).resolves.toEqual({
      title: 'Redirected App',
      description: 'Final page description',
    });
  });

  it('returns null when the response is not HTML or has no supported metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response('{"name":"Example"}', {
      headers: { 'content-type': 'application/json' },
    }));

    await expect(fetchServiceMetadata('https://example.com/')).resolves.toBeNull();
  });
});
