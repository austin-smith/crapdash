import { SERVICE_DESCRIPTION_MAX_LENGTH, SERVICE_NAME_MAX_LENGTH } from './validations';
import { fetchPageHtml, isHttpUrl, parseAttributes } from './service-url-fetch';

export interface ServiceMetadata {
  title?: string;
  description?: string;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (entity, rawName: string) => {
    const name = rawName.toLowerCase();

    if (name.startsWith('#x')) {
      const codePoint = Number.parseInt(name.slice(2), 16);
      try {
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      } catch {
        return entity;
      }
    }

    if (name.startsWith('#')) {
      const codePoint = Number.parseInt(name.slice(1), 10);
      try {
        return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
      } catch {
        return entity;
      }
    }

    return HTML_ENTITIES[name] ?? entity;
  });
}

function normalizeMetadataText(value: string, maxLength: number): string | undefined {
  const normalized = decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return undefined;
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function extractTitle(html: string): string | undefined {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] ? normalizeMetadataText(match[1], SERVICE_NAME_MAX_LENGTH) : undefined;
}

function extractDescription(html: string): string | undefined {
  const metaPattern = /<meta\b[^>]*>/gi;

  for (const match of html.matchAll(metaPattern)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.name?.toLowerCase() !== 'description') continue;
    if (!attrs.content) continue;

    const description = normalizeMetadataText(attrs.content, SERVICE_DESCRIPTION_MAX_LENGTH);
    if (description) return description;
  }

  return undefined;
}

export function parseServiceMetadata(html: string): ServiceMetadata {
  return {
    title: extractTitle(html),
    description: extractDescription(html),
  };
}

export async function fetchServiceMetadata(serviceUrl: string): Promise<ServiceMetadata | null> {
  try {
    const url = new URL(serviceUrl);
    if (!isHttpUrl(url)) return null;

    const page = await fetchPageHtml(url);
    if (!page) return null;

    const metadata = parseServiceMetadata(page.html);
    return metadata.title || metadata.description ? metadata : null;
  } catch (error) {
    if (error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'AbortError') {
      console.error('Service metadata fetch error:', error);
    }
    return null;
  }
}
