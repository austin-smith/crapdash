/**
 * Detects if the given user agent string is from macOS/iOS.
 * Works on both server and client.
 */
export function isMacUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /Mac|iPhone|iPad|iPod/.test(userAgent);
}

/**
 * Returns the appropriate modifier key symbol for the given platform.
 * ⌘ on Mac, Ctrl on Windows/Linux.
 */
export function getModifierKey(isMac: boolean): string {
  return isMac ? '⌘' : 'Ctrl';
}
