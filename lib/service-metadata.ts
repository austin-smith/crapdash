import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { SERVICE_DESCRIPTION_MAX_LENGTH, SERVICE_NAME_MAX_LENGTH } from './types';
import { fetchPageHtml, isHttpUrl } from './service-url-fetch';

export interface ServiceMetadata {
  title?: string;
  description?: string;
}

function normalizeMetadataText(value: string, maxLength: number): string | undefined {
  const normalized = value
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return undefined;
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trim() : normalized;
}

function isElement(node: DefaultTreeAdapterTypes.Node): node is DefaultTreeAdapterTypes.Element {
  return 'tagName' in node;
}

function isTextNode(node: DefaultTreeAdapterTypes.Node): node is DefaultTreeAdapterTypes.TextNode {
  return node.nodeName === '#text' && 'value' in node;
}

function getAttribute(node: DefaultTreeAdapterTypes.Element, name: string): string | undefined {
  const attr = node.attrs.find((item) => item.name.toLowerCase() === name);
  return attr?.value;
}

function getTextContent(node: DefaultTreeAdapterTypes.Node): string {
  if (isTextNode(node)) {
    return node.value;
  }

  if ('childNodes' in node) {
    return node.childNodes.map(getTextContent).join('');
  }

  return '';
}

function findElement(
  node: DefaultTreeAdapterTypes.Node,
  predicate: (element: DefaultTreeAdapterTypes.Element) => boolean
): DefaultTreeAdapterTypes.Element | undefined {
  if (isElement(node) && predicate(node)) {
    return node;
  }

  if (!('childNodes' in node)) {
    return undefined;
  }

  for (const child of node.childNodes) {
    const match = findElement(child, predicate);
    if (match) return match;
  }

  return undefined;
}

function extractTitle(document: DefaultTreeAdapterTypes.Document): string | undefined {
  const title = findElement(document, (element) => element.tagName === 'title');
  return title ? normalizeMetadataText(getTextContent(title), SERVICE_NAME_MAX_LENGTH) : undefined;
}

function extractDescription(document: DefaultTreeAdapterTypes.Document): string | undefined {
  const meta = findElement(document, (element) => {
    if (element.tagName !== 'meta') return false;
    return getAttribute(element, 'name')?.toLowerCase() === 'description';
  });

  const content = meta ? getAttribute(meta, 'content') : undefined;
  return content ? normalizeMetadataText(content, SERVICE_DESCRIPTION_MAX_LENGTH) : undefined;
}

export function parseServiceMetadata(html: string): ServiceMetadata {
  const document = parse(html);

  return {
    title: extractTitle(document),
    description: extractDescription(document),
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
