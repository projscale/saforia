#!/usr/bin/env bash
set -euo pipefail

# Sign a .app or .dmg using Developer ID Application certificate in keychain or a custom identity.
# Usage:
#   MACOS_IDENTITY="Developer ID Application: Your Name (TEAMID)" \
#   ./scripts/sign-macos.sh "/path/to/Saforia.app"

APP_PATH=${1:-}
if [ -z "$APP_PATH" ]; then
  echo "Usage: $0 /path/to/Saforia.app|.dmg" >&2
  exit 2
fi

IDENTITY=${MACOS_IDENTITY:-}
if [ -z "$IDENTITY" ]; then
  echo "Set MACOS_IDENTITY to your Developer ID Application identity" >&2
  exit 3
fi

echo "Signing $APP_PATH with identity: $IDENTITY"
codesign --force --options runtime --sign "$IDENTITY" --timestamp --deep "$APP_PATH"
codesign --verify --deep --strict --verbose=2 "$APP_PATH"

echo "Signed: $APP_PATH"

