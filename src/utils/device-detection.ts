/**
 * Device detection utility for determining app store redirects
 */

export type DeviceType = "ios" | "android" | "web";

export function getDeviceType(): DeviceType {
  if (typeof window === "undefined") {
    return "web";
  }

  const userAgent = window.navigator.userAgent.toLowerCase();

  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  // Android detection
  if (/android/.test(userAgent)) {
    return "android";
  }

  // Default to web
  return "web";
}

export function getMobileDownloadUrl(deviceType: DeviceType): string {
  switch (deviceType) {
    case "ios":
      // TODO: Replace with actual App Store URL when available
      return "https://apps.apple.com/app/rem-dream-journal/id123456789";
    case "android":
      // TODO: Replace with actual Google Play URL when available
      return "https://play.google.com/store/apps/details?id=com.rem.dreamjournal";
    case "web":
    default:
      return "/auth";
  }
}
