// platform detection with no dependencies, so desktop code can import it without
// pulling in capacitor. the capacitor native bridge injects `window.Capacitor`
// into the webview before any app script runs; in electron or a plain browser
// it simply doesn't exist.
interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

export function isNativeIOS(): boolean {
  const cap = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  if (!cap) return false;
  try {
    return cap.getPlatform?.() === "ios" && cap.isNativePlatform?.() !== false;
  } catch {
    return false;
  }
}
