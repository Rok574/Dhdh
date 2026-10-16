#!/usr/bin/env bash
# One-time (and safe to re-run) setup for the iOS build. Needs a Mac with Xcode.
#
#   pnpm ios:setup
#   IOS_BUNDLE_ID=com.yourname.liner pnpm ios:setup   # if the default id is taken
#
# 1. installs the capacitor packages
# 2. builds the web bundle (dist-ios/)
# 3. generates the Xcode project in ios/ (first run only)
# 4. patches Info.plist: background audio, liner:// links, http exception for the fallback api
# 5. syncs the web bundle into the Xcode project
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "$(uname)" != "Darwin" ]]; then
  echo "error: the iOS project can only be built on macOS (Xcode required)." >&2
  exit 1
fi
if ! xcodebuild -version >/dev/null 2>&1; then
  echo "error: Xcode is not installed or its license/command line tools are not set up." >&2
  echo "       install Xcode from the App Store, open it once, then re-run." >&2
  exit 1
fi
if ! command -v pnpm >/dev/null 2>&1; then
  echo "error: pnpm not found (npm i -g pnpm)." >&2
  exit 1
fi

echo "==> installing capacitor packages"
pnpm install
has_dep() { node -e "const p=require('./package.json');process.exit((p.dependencies?.['$1']||p.devDependencies?.['$1'])?0:1)"; }
for pkg in @capacitor/core @capacitor/app @capacitor/ios; do
  has_dep "$pkg" || pnpm add "$pkg"
done
has_dep @capacitor/cli || pnpm add -D @capacitor/cli

echo "==> building web bundle"
pnpm build:ios

if [[ ! -d ios ]]; then
  echo "==> generating Xcode project"
  pnpm exec cap add ios
else
  echo "==> ios/ already exists, keeping it"
fi

PLIST="ios/App/App/Info.plist"
if [[ ! -f "$PLIST" ]]; then
  echo "error: $PLIST not found, 'cap add ios' did not produce the expected project." >&2
  exit 1
fi
PB=/usr/libexec/PlistBuddy
has_key() { "$PB" -c "Print $1" "$PLIST" >/dev/null 2>&1; }

echo "==> patching Info.plist"

# keep playing with the screen locked / app in the background
if ! has_key ":UIBackgroundModes"; then
  "$PB" -c "Add :UIBackgroundModes array" "$PLIST"
  "$PB" -c "Add :UIBackgroundModes:0 string audio" "$PLIST"
fi

# liner://artist?id=... style share links
if ! has_key ":CFBundleURLTypes"; then
  "$PB" -c "Add :CFBundleURLTypes array" "$PLIST"
  "$PB" -c "Add :CFBundleURLTypes:0 dict" "$PLIST"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLName string liner" "$PLIST"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST"
  "$PB" -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string liner" "$PLIST"
else
  echo "    CFBundleURLTypes already present, not touching it (make sure it lists the 'liner' scheme)"
fi

# the app's fallback api edge is plain http (see src/shared/api/baseUrl.ts);
# iOS blocks that unless the host is listed. scoped to this one host.
if ! has_key ":NSAppTransportSecurity:NSExceptionDomains:edge.tryliner.fun"; then
  has_key ":NSAppTransportSecurity" || "$PB" -c "Add :NSAppTransportSecurity dict" "$PLIST"
  has_key ":NSAppTransportSecurity:NSExceptionDomains" || "$PB" -c "Add :NSAppTransportSecurity:NSExceptionDomains dict" "$PLIST"
  "$PB" -c "Add :NSAppTransportSecurity:NSExceptionDomains:edge.tryliner.fun dict" "$PLIST"
  "$PB" -c "Add :NSAppTransportSecurity:NSExceptionDomains:edge.tryliner.fun:NSExceptionAllowsInsecureHTTPLoads bool true" "$PLIST"
fi

echo "==> syncing web bundle into the Xcode project"
pnpm exec cap sync ios

cat <<'EOF'

Done. Next:
  pnpm ios:open          # opens Xcode
In Xcode: select the "App" target > Signing & Capabilities > pick your Team
(a free Apple ID works), choose your iPhone, press Run.
After changing web code later:  pnpm ios:sync   then Run again.
EOF
