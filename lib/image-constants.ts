export const MAX_FILE_SIZE = 2 * 1024 * 1024;

const IMAGE_TYPE_MAP = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
} as const;

type ImageExtension = keyof typeof IMAGE_TYPE_MAP;
type ImageMimeType = (typeof IMAGE_TYPE_MAP)[ImageExtension];

const IMAGE_EXTENSIONS = Object.keys(IMAGE_TYPE_MAP) as ImageExtension[];
const IMAGE_MIME_TYPES = Object.values(IMAGE_TYPE_MAP) as ImageMimeType[];

const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');
const IMAGE_TYPE_LABEL = IMAGE_EXTENSIONS.map(ext => ext.slice(1).toUpperCase()).join(', ');
const IMAGE_TYPE_ERROR = `Invalid file type. Only ${IMAGE_TYPE_LABEL} are allowed.`;

function extractExtension(value: string): string {
  const lastDot = value.lastIndexOf('.');
  if (lastDot === -1) return '';
  return value.slice(lastDot).toLowerCase();
}

export function isAllowedImageExtension(value: string): value is ImageExtension {
  const ext = extractExtension(value);
  return IMAGE_EXTENSIONS.includes(ext as ImageExtension);
}

export function isAllowedImageMime(value: string): value is ImageMimeType {
  return IMAGE_MIME_TYPES.includes(value as ImageMimeType);
}

export function getImageContentType(value: string): ImageMimeType | null {
  const ext = extractExtension(value);
  return (IMAGE_TYPE_MAP as Record<string, ImageMimeType>)[ext] ?? null;
}

export {
  IMAGE_TYPE_MAP as EXTENSION_TO_MIME,
  IMAGE_ACCEPT,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  IMAGE_TYPE_ERROR,
  IMAGE_TYPE_LABEL,
};
