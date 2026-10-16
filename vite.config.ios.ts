// web bundle for the iOS (capacitor) app. same renderer as desktop, minus the
// electron plugin, with an entry that installs the iOS bridge first.
//   pnpm build:ios   ->  dist-ios/   (capacitor copies this into the Xcode project)
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import pkg from "./package.json" with { type: "json" };

// swap the desktop entry for the iOS one without maintaining a second html file
function iosEntry(): Plugin {
  return {
    name: "liner-ios-entry",
    transformIndexHtml: {
      order: "pre",
      handler: (html) => html.replace("/src/main.tsx", "/src/main.ios.tsx"),
    },
  };
}

export default defineConfig({
  base: "./",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [iosEntry(), react(), tailwindcss()],
  clearScreen: false,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "next/navigation": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
      "next/link": path.resolve(import.meta.dirname, "./src/lib/navigation.tsx"),
      "next/image": path.resolve(import.meta.dirname, "./src/components/ui/AppImage.tsx"),
    },
  },
  build: {
    outDir: "dist-ios",
    emptyOutDir: true,
    // WKWebView on iOS 15+
    target: "safari15",
  },
});
