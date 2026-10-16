import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Apple requires a bundle id nobody else has registered. Override with
  // IOS_BUNDLE_ID=... when running scripts/ios-setup.sh if Xcode rejects this one.
  appId: process.env.IOS_BUNDLE_ID || "app.liner.personal",
  appName: "Liner",
  webDir: "dist-ios",
  backgroundColor: "#000000",
  ios: {
    // the web layer handles notch / home-indicator insets itself (env(safe-area-inset-*))
    contentInset: "never",
  },
  plugins: {
    // The desktop app runs with webSecurity disabled, so the renderer fetches the
    // api and media hosts freely. WKWebView enforces CORS, so route fetch/XHR
    // through native networking instead, which has no CORS restriction.
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
