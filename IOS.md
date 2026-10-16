# Liner for iOS (personal build)

The iOS app is the existing React renderer running in a Capacitor `WKWebView`. There is no
Electron on iOS, so `src/platform/ios-bridge.ts` installs a stand-in for `window.linerElectron`
(request/cover signing via the same Rust WASM module, `liner://` deeplinks, no-ops for window
chrome / touch bar / overlay / updaters). Desktop builds are unaffected.

## Build and run

Needs a Mac with Xcode and pnpm.

```bash
pnpm ios:setup        # installs capacitor, builds web bundle, generates ios/, patches Info.plist, syncs
pnpm ios:open         # opens Xcode
```

In Xcode: target **App** > Signing & Capabilities > choose your Team (a free Apple ID works) >
pick your iPhone > Run. If Xcode says the bundle id is taken, re-run with
`IOS_BUNDLE_ID=com.yourname.liner pnpm ios:setup` (or change it in Xcode).

After changing web code: `pnpm ios:sync`, then Run again. Free Apple ID builds expire after 7 days
and need re-running from Xcode.

## What `ios:setup` changes

- Adds `@capacitor/core`, `@capacitor/app`, `@capacitor/ios` and `@capacitor/cli` (updates `package.json` and `pnpm-lock.yaml`).
- Builds `dist-ios/` with `vite.config.ios.ts` (same renderer, entry `src/main.ios.tsx`, no Electron plugin).
- Generates the Xcode project in `ios/` and patches `Info.plist`:
  background audio mode, the `liner://` URL scheme, and an HTTP exception for `edge.tryliner.fun`
  (the app's plain-http fallback API).

## How iOS differs from desktop

| Area | iOS behavior |
| --- | --- |
| Networking | Capacitor's native HTTP layer handles `fetch`/XHR, because Electron ran with `webSecurity: false` and WKWebView enforces CORS. |
| Audio | Plays through the native media element (lock screen controls, background audio). The Web Audio effects chain is skipped, so **pitch shifting and reverb are unavailable**; speed still works. |
| Window chrome | Minimize/maximize/close buttons hidden; content respects the notch and home indicator. |
| Updates | No self-updater or OTA bundles; rebuild and reinstall. |
| Cache tools, network diagnostics, export folder, app icon sync | Use the renderer's browser fallbacks or are hidden. |
| Layout | The desktop layout at phone width (slim left rail, bottom mini player, drawer capped to screen width). It works but is not a redesigned mobile UI. |

## Not verified yet

This was written without access to a Mac, the npm registry, or a device, so the following has **not**
been run: `pnpm build:ios`, the Xcode build, and anything on a simulator or iPhone. What was checked:
the new TypeScript type-checks against the existing `LinerElectronApi` interface, and the bridge's WASM
signing produces byte-identical signatures to `electron/crypto.ts` for the same inputs.

Things most likely to need a tweak on first run:

1. **Streaming through Capacitor HTTP.** Audio is fetched whole (`Range: bytes=0-`) for caching, which
   goes through the native layer as a full body. Fine for songs; very long tracks may be slow.
2. **Background playback** depends on the `audio` background mode plus the webview staying alive;
   test with the screen locked.
3. **Layout polish** on small screens (settings modal, fullscreen player, search popup).

## License

Liner's license allows personal, non-commercial local builds. Don't distribute this build or publish
a fork; see `LICENSE`.
