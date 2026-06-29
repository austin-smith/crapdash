const SERVICE_FETCH_TIMEOUT_MS = 4_000;
const SERVICE_PAGE_MAX_BYTES = 512 * 1024;
const SERVICE_MAX_REDIRECTS = 3;
export const SERVICE_FETCH_USER_AGENT = 'crapdash-service-fetcher/1.0';

export function isHttpUrl(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

export function getTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(SERVICE_FETCH_TIMEOUT_MS);
}

export function normalizeContentType(value: string | null): string {
  return value?.toLowerCase().split(';')[0]?.trim() ?? '';
}

export function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrPattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

  for (const match of tag.matchAll(attrPattern)) {
    const [, rawName, doubleQuoted, singleQuoted, unquoted] = match;
    if (!rawName) continue;

    const name = rawName.toLowerCase();
    if (name === 'link' || name === 'meta' || name === 'title') continue;

    attrs[name] = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
  }

  return attrs;
}

export async function fetchWithRedirects(
  url: URL,
  init: RequestInit,
  redirects = 0
): Promise<{ response: Response; url: URL }> {
  const response = await fetch(url, {
    ...init,
    redirect: 'manual',
  });

  if (![301, 302, 303, 307, 308].includes(response.status)) {
    return { response, url };
  }

  if (redirects >= SERVICE_MAX_REDIRECTS) {
    return { response, url };
  }

  const location = response.headers.get('location');
  if (!location) return { response, url };

  const nextUrl = new URL(location, url);
  if (!isHttpUrl(nextUrl)) return { response, url };

  return fetchWithRedirects(nextUrl, init, redirects + 1);
}

export async function readResponseBuffer(response: Response, maxBytes: number): Promise<Buffer | null> {
  if (!response.body) {
    const arrayBuffer = await response.arrayBuffer();
    return arrayBuffer.byteLength <= maxBytes ? Buffer.from(arrayBuffer) : null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function fetchPageHtml(serviceUrl: URL): Promise<{ html: string; pageUrl: URL } | null> {
  const { response, url } = await fetchWithRedirects(serviceUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': SERVICE_FETCH_USER_AGENT,
    },
    signal: getTimeoutSignal(),
  });

  if (!response.ok) return null;

  const contentType = normalizeContentType(response.headers.get('content-type'));
  if (contentType && !contentType.includes('html')) return null;

  const buffer = await readResponseBuffer(response, SERVICE_PAGE_MAX_BYTES);
  if (!buffer) return null;

  return {
    html: buffer.toString('utf8'),
    pageUrl: url,
  };
}
