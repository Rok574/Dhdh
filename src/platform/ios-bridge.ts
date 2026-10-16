// iOS stand-in for the electron preload bridge.
//
// the renderer talks to the desktop shell through `window.linerElectron`. inside
// the capacitor webview there is no electron main process, so this module
// installs an object with the same shape and implements what an iPhone can do:
//
//   - request / cover signing, by running the same rust wasm module the main
//     process uses, directly in the webview (wasm is supported by WKWebView)
//   - liner:// deeplinks via @capacitor/app
//   - app version
//
// desktop-only features (window chrome, touch bar, overlay, self-updater, OTA
// bundles) are inert no-ops. a few methods are deliberately NOT defined
// (see OmittedOnIOS) because the renderer feature-detects them and already
// has a plain-browser fallback.
//
// import this module first, before the app entry, so the bridge exists before
// any renderer module reads it. see src/main.ios.tsx.
import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import type { LinerElectronApi } from "../../electron/preload";
import { SIGNER_WASM_BASE64 } from "../../electron/signer";
import { parseDeeplink } from "../../electron/deeplink";
import { APP_VERSION } from "@/shared/config/version";
import { isNativeIOS } from "./platform";

// ---------------------------------------------------------------------------
// wasm signer (port of electron/crypto.ts using web apis instead of node's)
// ---------------------------------------------------------------------------

interface WasmSignerExports {
  liner_alloc: (len: number) => number;
  liner_dealloc: (ptr: number, len: number) => void;
  liner_get_result_ptr: () => number;
  liner_get_result_len: () => number;
  liner_sign_cover_url: (ptr: number, len: number) => number;
  liner_sign_request: (
    methodPtr: number,
    methodLen: number,
    pathPtr: number,
    pathLen: number,
    bodyPtr: number,
    bodyLen: number,
    timestamp: bigint,
    noncePtr: number,
    nonceLen: number,
  ) => number;
  liner_sign_monitor_request: WasmSignerExports["liner_sign_request"];
  liner_sign_raw_payload: (ptr: number, len: number) => number;
  memory: WebAssembly.Memory;
}

interface SignInput {
  method: string;
  path: string;
  body?: string | null;
  timestamp?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let wasmPromise: Promise<WasmSignerExports> | null = null;

function loadWasm(): Promise<WasmSignerExports> {
  if (!wasmPromise) {
    wasmPromise = (async () => {
      const binary = atob(SIGNER_WASM_BASE64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const { instance } = await WebAssembly.instantiate(bytes, {});
      return instance.exports as unknown as WasmSignerExports;
    })();
    // a failed load must not poison every later call
    wasmPromise.catch(() => {
      wasmPromise = null;
    });
  }
  return wasmPromise;
}

function passBytes(wasm: WasmSignerExports, bytes: Uint8Array) {
  const ptr = wasm.liner_alloc(bytes.length);
  // build the view after alloc: alloc may grow (and detach) wasm memory
  new Uint8Array(wasm.memory.buffer, ptr, bytes.length).set(bytes);
  return { ptr, len: bytes.length, free: () => wasm.liner_dealloc(ptr, bytes.length) };
}

function readResult(wasm: WasmSignerExports): string {
  const ptr = wasm.liner_get_result_ptr();
  const len = wasm.liner_get_result_len();
  if (!ptr || len === 0) return "";
  return decoder.decode(new Uint8Array(wasm.memory.buffer, ptr, len));
}

function randomNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// clock delta between this device and the api server (ms)
let serverTimeOffsetMs = 0;

function adjustedTimestamp(): number {
  return Math.floor((Date.now() + serverTimeOffsetMs) / 1000);
}

async function signWithCanonical(
  kind: "request" | "monitor",
  input: SignInput,
): Promise<{ signature: string; timestamp: number; nonce: string }> {
  const wasm = await loadWasm();
  const timestamp = input.timestamp ?? adjustedTimestamp();
  const nonce = randomNonce();

  const method = passBytes(wasm, encoder.encode(input.method));
  const path = passBytes(wasm, encoder.encode(input.path));
  const body = passBytes(wasm, encoder.encode(input.body ?? ""));
  const nonceBuf = passBytes(wasm, encoder.encode(nonce));

  try {
    const fn = kind === "request" ? wasm.liner_sign_request : wasm.liner_sign_monitor_request;
    const code = fn(
      method.ptr,
      method.len,
      path.ptr,
      path.len,
      body.ptr,
      body.len,
      BigInt(timestamp),
      nonceBuf.ptr,
      nonceBuf.len,
    );
    if (code !== 0) throw new Error(`wasm sign_${kind}_request failed with code ${code}`);
    return { signature: readResult(wasm), timestamp, nonce };
  } finally {
    method.free();
    path.free();
    body.free();
    nonceBuf.free();
  }
}

async function signString(
  fn: "liner_sign_cover_url" | "liner_sign_raw_payload",
  bytes: Uint8Array,
): Promise<string> {
  const wasm = await loadWasm();
  const buf = passBytes(wasm, bytes);
  try {
    const code = wasm[fn](buf.ptr, buf.len);
    if (code !== 0) throw new Error(`wasm ${fn} failed with code ${code}`);
    return readResult(wasm);
  } finally {
    buf.free();
  }
}

// ---------------------------------------------------------------------------
// deeplinks
// ---------------------------------------------------------------------------

// a cold-start url is delivered once; effects that resubscribe must not replay it
let launchUrlHandled = false;

function subscribeDeeplinks(cb: Parameters<LinerElectronApi["onDeeplink"]>[0]): () => void {
  let disposed = false;
  let handle: PluginListenerHandle | undefined;

  const deliver = (url: string | undefined | null) => {
    if (!url) return;
    // same strict allowlist the desktop main process applies
    const target = parseDeeplink(url);
    if (target) cb(target);
  };

  void App.addListener("appUrlOpen", ({ url }) => deliver(url)).then((h) => {
    if (disposed) void h.remove();
    else handle = h;
  });

  if (!launchUrlHandled) {
    launchUrlHandled = true;
    void App.getLaunchUrl()
      .then((res) => deliver(res?.url))
      .catch(() => {});
  }

  return () => {
    disposed = true;
    void handle?.remove();
  };
}

// ---------------------------------------------------------------------------
// the bridge object
// ---------------------------------------------------------------------------

// renderer code feature-detects these and falls back to its browser path, so
// leaving them off is what makes the fallback kick in
type OmittedOnIOS =
  | "diagnoseNetwork" // needs node sockets; browser-based diagnostics are used
  | "openDownloads"
  | "openExportFolder"
  | "saveDump"
  | "setAppIcon"
  | "getCacheStats"
  | "openCacheFolder"
  | "clearCoversCache"
  | "clearAudioCache"
  | "clearHttpCache";

const noopUnsubscribe = () => () => {};

const iosBridge: Omit<LinerElectronApi, OmittedOnIOS> = {
  platform: "ios",
  isHyprland: false,

  // window chrome: the app owns the whole screen
  minimize: async () => {},
  toggleMaximize: async () => {},
  toggleFullScreen: async () => {},
  close: async () => {},
  isMaximized: async () => false,
  isFullScreen: async () => true,
  onWindowStateChange: noopUnsubscribe,
  startWindowMove: () => {},
  dragStart: () => {},
  dragMove: () => {},
  dragEnd: () => {},

  // signing
  signRequest: async (input) => {
    try {
      return await signWithCanonical("request", input);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
  signMonitorRequest: async (input) => {
    try {
      return await signWithCanonical("monitor", input);
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
  syncServerTime: async (dateHeaderOrMs) => {
    const serverMs = typeof dateHeaderOrMs === "number" ? dateHeaderOrMs : Date.parse(dateHeaderOrMs);
    if (!Number.isNaN(serverMs) && serverMs > 0) {
      serverTimeOffsetMs = serverMs - Date.now();
    }
    return serverTimeOffsetMs;
  },
  getServerTimeOffset: async () => serverTimeOffsetMs,
  signCoverUrl: (payload) => signString("liner_sign_cover_url", encoder.encode(payload)),
  signRawPayload: (payload) => signString("liner_sign_raw_payload", Uint8Array.from(payload)),

  onDeeplink: subscribeDeeplinks,

  getAppVersion: async () => APP_VERSION,

  // desktop self-updater and OTA bundle swapper: updates ship by rebuilding the app
  checkForUpdates: async () => ({ available: false }),
  downloadUpdate: async () => ({ success: false, error: "Updates are not supported on iOS" }),
  quitAndInstall: async () => false,
  onUpdateAvailable: noopUnsubscribe,
  onUpdateDownloadProgress: noopUnsubscribe,
  onUpdateDownloaded: noopUnsubscribe,
  onUpdateError: noopUnsubscribe,
  bundleCheck: async () => ({ available: false, reason: "ios" }),
  bundleDownloadAndInstall: async () => ({ success: false, error: "OTA bundles are not supported on iOS" }),
  bundleHotSwap: async () => false,
  bundleRollback: async () => false,
  bundleGetStatus: async () => ({
    appVersion: APP_VERSION,
    bundleVersion: APP_VERSION,
    isOta: false,
    sha256: null,
    effectivePath: "",
  }),
  onBundleAvailable: noopUnsubscribe,
  onBundleDownloadProgress: noopUnsubscribe,
  onBundleReady: noopUnsubscribe,

  // macOS touch bar and the always-on-top mini overlay window
  touchbarUpdateState: () => {},
  onTouchBarAction: noopUnsubscribe,
  sendTouchBarAction: () => {},
  getTouchBarInitialState: async () => null,
  onTouchBarRequestSync: noopUnsubscribe,
  overlayUpdateState: () => {},
  onOverlayAction: noopUnsubscribe,
  sendOverlayAction: () => {},
  toggleOverlay: async () => false,
  isOverlayOpen: async () => false,
  closeOverlay: () => {},
  onOverlayState: noopUnsubscribe,
  getOverlayInitialState: async () => null,
  updateOverlaySettings: () => {},
  onOverlaySettingsChanged: noopUnsubscribe,
  onOverlayVisibility: noopUnsubscribe,
};

export function installIosBridge(): void {
  if (!isNativeIOS()) return;

  window.linerElectron = iosBridge as LinerElectronApi;
  document.documentElement.classList.add("platform-ios");

  // "playback" keeps audio going with the ringer switch on silent and after
  // the screen locks (webkit audio session api, ios 16.4+)
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
  } catch {
    // older webview, native AVAudioSession config still applies
  }
}

installIosBridge();
