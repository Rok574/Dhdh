// entry used by the iOS (capacitor) build only, see vite.config.ios.ts.
// the bridge must be evaluated before the app so `window.linerElectron`
// exists by the time any renderer module reads it; es module imports
// evaluate in order, so keep this import first.
import "./platform/ios-bridge";
import "./main";
