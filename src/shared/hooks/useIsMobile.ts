import { useSyncExternalStore } from "react";
import { isNativeIOS } from "@/platform/platform";

// below this width the desktop shell (side rail, floating search island,
// two-column fullscreen player) no longer fits, so the mobile layout is used.
export const MOBILE_MAX_WIDTH = 767;
const MOBILE_QUERY = `(max-width: ${MOBILE_MAX_WIDTH}px)`;

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  // the native iOS app always uses the mobile shell (iPhone and iPad)
  if (isNativeIOS()) return true;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useIsMobile;
