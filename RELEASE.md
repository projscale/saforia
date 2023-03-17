# Saforia Release Guide

This guide summarizes signing, notarization, and packaging steps across platforms.

## Prerequisites
- Node 18+, Rust stable, Tauri 2 CLI
- Icons generated: `npm run tauri:icons`
- Build artifacts produced: `npm run tauri:build`

## macOS (Sign & Notarize)
1. Sign .app or .dmg using Developer ID Application certificate:
   - Set `MACOS_IDENTITY="Developer ID Application: Your Name (TEAMID)"`
   - `./scripts/sign-macos.sh "dist/<your>.app|.dmg"`
2. Notarize with `notarytool`:
   - `xcrun notarytool store-credentials "saforia-notary" --apple-id "$APPLE_ID" --team-id "$APPLE_TEAM_ID" --password "$APPLE_APP_PASSWORD"`
   - `./scripts/notarize-macos.sh "dist/<your>.dmg" "saforia-notary"`

## Windows (Sign)
- Run PowerShell:
  - `pwsh ./scripts/sign-windows.ps1 -Path dist\\bundle\\msi\\Saforia_0.1.0_x64_en-US.msi -Pfx C:\\\\certs\\\\codesign.pfx -Password (Read-Host -AsSecureString)`

## Linux
- Distribution-specific signing (e.g., GPG) or app store policies; not covered here.

## Android (Signing)
- Configure keystore and signing in Tauri mobile’s Gradle settings.
- Ensure release build uses your keystore and alias.

## iOS (Signing)
- Configure signing identities and provisioning profiles in Xcode.
- Ensure bundle identifier matches your profiles.

Notes
- Do not commit certificates or secrets. Use keychain/secure storage.
- Verify that the app launches and content protection, clipboard behavior, and password generation all function as expected on each target before release.

