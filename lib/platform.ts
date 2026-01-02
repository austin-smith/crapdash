const APPLE_PLATFORM_REGEX = /mac|ios|ipad|iphone|ipod/i;

type NavigatorWithUAData = Navigator & { userAgentData?: { platform?: string } };

export const MODIFIER_CMD = "cmd";
export const MODIFIER_CTRL = "ctrl";
export type ModifierPlatform = typeof MODIFIER_CMD | typeof MODIFIER_CTRL;

function isApplePlatform(value?: string | null) {
  return value ? APPLE_PLATFORM_REGEX.test(value) : false;
}

export function platformFromUserAgent(ua?: string | null): ModifierPlatform {
  // Default to cmd when UA is missing/unknown
  if (!ua) return MODIFIER_CMD;
  return isApplePlatform(ua) ? MODIFIER_CMD : MODIFIER_CTRL;
}

export function platformFromNavigator(nav?: NavigatorWithUAData): ModifierPlatform {
  // Default to cmd when navigator is unavailable (SSR)
  if (!nav) return MODIFIER_CMD;

  const uaDataPlatform = nav.userAgentData?.platform;
  if (uaDataPlatform) {
    return isApplePlatform(uaDataPlatform) ? MODIFIER_CMD : MODIFIER_CTRL;
  }

  if (isApplePlatform(nav.platform)) return MODIFIER_CMD;
  if (isApplePlatform(nav.userAgent)) return MODIFIER_CMD;
  return MODIFIER_CTRL;
}
