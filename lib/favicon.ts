import path from 'path';
import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import {
  MAX_FILE_SIZE,
  getImageExtensionForContentType,
  isAllowedImageExtension,
  isAllowedImageMime,
} from './image-constants';
import { getProvisionalIconFilename, writeIconBuffer } from './file-utils';
import {
  SERVICE_FETCH_USER_AGENT,
  fetchPageHtml,
  fetchWithRedirects,
  getTimeoutSignal,
  isHttpUrl,
  normalizeContentType,
  readResponseBuffer,
} from './service-url-fetch';

interface IconCandidate {
  url: URL;
  rel: string;
  type?: string;
  sizes?: string;
  source: 'html' | 'fallback';
}

function isElement(node: DefaultTreeAdapterTypes.Node): node is DefaultTreeAdapterTypes.Element {
  return 'tagName' in node;
}

function getAttribute(node: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  const attr = node.attrs.find((item) => item.name.toLowerCase() === name);
  return attr?.value;
}

function findElements(
  node: DefaultTreeAdapterTypes.Node,
  tagName: string,
  results: DefaultTreeAdapterTypes.Element[] = []
): DefaultTreeAdapterTypes.Element[] {
  if (isElement(node) && node.tagName === tagName) {
    results.push(node);
  }

  if ('childNodes' in node) {
    for (const child of node.childNodes) {
      findElements(child, tagName, results);
    }
  }

  return results;
}

function parseIconCandidates(html: string, baseUrl: URL): IconCandidate[] {
  const candidates: IconCandidate[] = [];
  const document = parse(html);

  for (const link of findElements(document, 'link')) {
    const rel = getAttribute(link, 'rel')?.toLowerCase() ?? '';
    const href = getAttribute(link, 'href');

    if (!href || !rel.split(/\s+/).some((part) => part === 'icon' || part.startsWith('apple-touch-icon'))) {
      continue;
    }

    try {
      const url = new URL(href, baseUrl);
      if (!isHttpUrl(url)) continue;

      candidates.push({
        url,
        rel,
        type: getAttribute(link, 'type'),
        sizes: getAttribute(link, 'sizes'),
        source: 'html',
      });
    } catch {
      // Ignore malformed icon hrefs.
    }
  }

  return candidates;
}

function getLargestDeclaredSize(sizes?: string): number {
  if (!sizes || sizes.toLowerCase() === 'any') return 0;

  return sizes
    .split(/\s+/)
    .map((size) => {
      const match = /^(\d+)x(\d+)$/i.exec(size);
      if (!match) return 0;
      return Math.max(Number(match[1]), Number(match[2]));
    })
    .reduce((max, size) => Math.max(max, size), 0);
}

function scoreCandidate(candidate: IconCandidate): number {
  const pathname = candidate.url.pathname.toLowerCase();
  const declaredType = normalizeContentType(candidate.type ?? null);
  const declaredSize = getLargestDeclaredSize(candidate.sizes);
  let score = candidate.source === 'html' ? 100 : 10;

  if (candidate.rel.includes('apple-touch-icon')) score += 18;
  if (declaredSize >= 128) score += 20;
  else if (declaredSize >= 64) score += 12;
  else if (declaredSize >= 32) score += 8;

  if (declaredType === 'image/svg+xml' || pathname.endsWith('.svg')) score += 16;
  else if (declaredType === 'image/png' || pathname.endsWith('.png')) score += 14;
  else if (declaredType === 'image/webp' || pathname.endsWith('.webp')) score += 12;
  else if (declaredType === 'image/x-icon' || pathname.endsWith('.ico')) score += 4;

  return score;
}

function dedupeAndSortCandidates(candidates: IconCandidate[]): IconCandidate[] {
  const byUrl = new Map<string, IconCandidate>();

  for (const candidate of candidates) {
    const key = candidate.url.href;
    const existing = byUrl.get(key);
    if (!existing || scoreCandidate(candidate) > scoreCandidate(existing)) {
      byUrl.set(key, candidate);
    }
  }

  return [...byUrl.values()].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
}

function sniffImageExtension(buffer: Buffer): string | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return '.png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return '.jpg';
  }

  if (buffer.length >= 6) {
    const signature = buffer.subarray(0, 6).toString('ascii');
    if (signature === 'GIF87a' || signature === 'GIF89a') return '.gif';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return '.webp';
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x00 &&
    buffer[1] === 0x00 &&
    (buffer[2] === 0x01 || buffer[2] === 0x02) &&
    buffer[3] === 0x00
  ) {
    return '.ico';
  }

  const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString('utf8').trimStart().toLowerCase();
  const xmlDeclaration = /^<\?xml\b[^>]*\?>/.exec(prefix);
  const rootPrefix = xmlDeclaration ? prefix.slice(xmlDeclaration[0].length).trimStart() : prefix;
  if (rootPrefix.startsWith('<svg')) {
    return '.svg';
  }

  return null;
}

function getExtensionFromUrl(url: URL): string | null {
  const ext = path.extname(url.pathname).toLowerCase();
  return ext && isAllowedImageExtension(ext) ? ext : null;
}

async function fetchIconCandidate(candidate: IconCandidate): Promise<{ buffer: Buffer; ext: string } | null> {
  const { response } = await fetchWithRedirects(candidate.url, {
    headers: {
      Accept: 'image/avif,image/webp,image/svg+xml,image/png,image/*,*/*;q=0.8',
      'User-Agent': SERVICE_FETCH_USER_AGENT,
    },
    signal: getTimeoutSignal(),
  });

  if (!response.ok) return null;

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE) return null;

  const contentType = normalizeContentType(response.headers.get('content-type'));
  const extFromContentType = getImageExtensionForContentType(contentType);
  const extFromUrl = getExtensionFromUrl(candidate.url);

  if (contentType && !isAllowedImageMime(contentType) && contentType !== 'application/octet-stream') {
    return null;
  }

  const buffer = await readResponseBuffer(response, MAX_FILE_SIZE);
  if (!buffer || buffer.length === 0) return null;

  const extFromBytes = sniffImageExtension(buffer);
  const ext = extFromBytes ?? extFromContentType ?? extFromUrl;
  if (!ext || !isAllowedImageExtension(ext)) return null;

  return { buffer, ext };
}

async function findServiceFavicon(serviceUrl: string): Promise<{ buffer: Buffer; ext: string } | null> {
  const baseUrl = new URL(serviceUrl);
  if (!isHttpUrl(baseUrl)) return null;

  const page = await fetchPageHtml(baseUrl);
  const pageUrl = page?.pageUrl ?? baseUrl;
  const fallbackCandidates: IconCandidate[] = [
    { url: new URL('/apple-touch-icon.png', pageUrl), rel: 'apple-touch-icon', source: 'fallback' },
    { url: new URL('/favicon.svg', pageUrl), rel: 'icon', source: 'fallback' },
    { url: new URL('/favicon.png', pageUrl), rel: 'icon', source: 'fallback' },
    { url: new URL('/favicon.ico', pageUrl), rel: 'icon', source: 'fallback' },
  ];

  const htmlCandidates = page ? parseIconCandidates(page.html, pageUrl) : [];
  const candidates = dedupeAndSortCandidates([...htmlCandidates, ...fallbackCandidates]);

  for (const candidate of candidates) {
    const icon = await fetchIconCandidate(candidate);
    if (icon) return icon;
  }

  return null;
}

export async function fetchServiceFavicon(serviceUrl: string, serviceId: string): Promise<string | null> {
  try {
    const icon = await findServiceFavicon(serviceUrl);
    if (!icon) return null;

    return writeIconBuffer(icon.buffer, `${serviceId}${icon.ext}`, serviceId);
  } catch (error) {
    if (error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'AbortError') {
      console.error('Favicon fetch error:', error);
    }
    return null;
  }
}

export async function fetchProvisionalServiceFavicon(serviceUrl: string): Promise<string | null> {
  try {
    const icon = await findServiceFavicon(serviceUrl);
    if (!icon) return null;

    return writeIconBuffer(icon.buffer, getProvisionalIconFilename(icon.ext));
  } catch (error) {
    if (error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'AbortError') {
      console.error('Favicon fetch error:', error);
    }
    return null;
  }
}
