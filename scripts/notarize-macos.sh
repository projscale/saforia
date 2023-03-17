#!/usr/bin/env bash
set -euo pipefail

# Notarize a signed .app or .dmg with Apple notarization service using notarytool.
# Prereqs: Xcode Command Line Tools, signed artifact.
# Usage (keychain profile):
#   xcrun notarytool store-credentials "saforia-notary" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"
#   ./scripts/notarize-macos.sh "/path/to/Saforia.dmg" "saforia-notary"

ARTIFACT=${1:-}
PROFILE=${2:-}
if [ -z "$ARTIFACT" ] || [ -z "$PROFILE" ]; then
  echo "Usage: $0 /path/to/Saforia.dmg notary-profile" >&2
  exit 2
fi

echo "Submitting $ARTIFACT for notarization (profile: $PROFILE)"
REQUEST=$(xcrun notarytool submit "$ARTIFACT" --keychain-profile "$PROFILE" --wait --output-format json)
echo "$REQUEST"

echo "Stapling ticket"
xcrun stapler staple "$ARTIFACT"
echo "Notarized and stapled: $ARTIFACT"

