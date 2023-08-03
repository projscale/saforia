# Saforia

Deterministic password generator that derives per‑site passwords from a single master password. The master password is encrypted at rest by a separate viewer password so you can type the viewer password in public without exposing the master.

Status: early scaffold. Cross‑platform (Tauri 2) desktop/mobile app with Rust backend and React + Vite frontend.

## Key Concepts
- Single master password (never stored in plaintext). Encrypted with viewer password via Argon2id + ChaCha20‑Poly1305.
- Per‑service postfix (suffix) stored locally. For each postfix you choose a generation method.
- Deterministic generation: hash(master + postfix) mapped to an alphabet.
- Legacy compatibility: two historical formats (v1 MD5+B64, v2 SHA256+URL‑B64) are supported.
- New methods: 10/20/36 char variants with alnum only, or with symbols. Default is 36 + symbols.
- Security features: content protection best‑effort (Windows/Mac), hidden by default, copy‑to‑clipboard on demand, auto‑clear.
  - Android: sets FLAG_SECURE to block screenshots/recording.
  - Optional clipboard auto‑clear delay resets system clipboard after copy.

## Usage
- First run: set a master password and a viewer password. The master is encrypted on disk by the viewer password.
- Unified view: 
  - Top: Search — filters saved entries instantly as you type.
  - Middle: scrollable saved entries (label • method badge • postfix). Click Generate to copy via viewer prompt.
  - Bottom: console — type a postfix, pick a method, and press Generate (viewer prompt). Enable “Save this postfix” to store it immediately.
- Preferences: set the default generation method used by quick generate and new entries.
- Preferences: autosave in Quick generate toggles whether the “Save this postfix” option is checked by default.
- Preferences: pin entries to keep frequently used sites at the top of the Saved list.
- Saved list: filter by method, switch sort (Recent vs A→Z), and paginate large lists; pinned items stay at the top.
- Preferences: on Linux/Wayland you can enable “Mask sensitive content” to keep secrets hidden on platforms where capture blocking isn’t reliable.
- Backup: export/import saved postfixes to a JSON file; optional passphrase uses Argon2id + ChaCha20‑Poly1305.
- Clipboard: set auto‑clear seconds (0 = off). After copying, clipboard is cleared after the delay.
 - Hold to reveal: press and hold the Reveal button to momentarily show a generated password; release to hide.

## Shortcuts & Tips
- Double‑click a Saved entry to open the viewer prompt quickly.
- Press Enter in prompts to confirm (Generate/Show).
- Hold “Hold to reveal” to peek; use “Reveal/Hide” for toggle.
- Use method badges (e.g., 36+) to recognize generation variants at a glance.
- Pin frequently used entries (☆/★) — they stay on top.

## Build (Desktop)
- Prereqs: Node 18+, Rust stable, Tauri 2 toolchain.
- Install deps: `npm install`
- Generate icons: `npm run tauri:icons` (from `src-tauri/icons/icon.svg`)
- Dev: `npm run tauri:dev`
- Release: `npm run tauri:build`

Platform notes:
- macOS: install Xcode CLT; codesign and notarization required for distribution.
- Windows: install Visual Studio Build Tools; enable `Desktop development with C++`.
- Linux: install system toolchains (GTK/WebKit backends as needed per Tauri docs).

## Build (Mobile)
- iOS: Xcode + Rust targets installed; open generated project after `tauri build`.
- Android: Android Studio; ensure NDK, toolchains, and Rust `aarch64-linux-android` target.

Mobile setup steps will be expanded during development; Tauri 2 mobile is supported, but extra platform config is required (e.g., signing configs, Android manifest flags).

Icons
- Edit `src-tauri/icons/icon.svg` and run `npm run tauri:icons` to generate platform icon sets in `src-tauri/icons/` used by bundling.

## Pre‑release Checklist
- Run `npm run preflight` (checks legacy outputs and icon assets present).
- Verify UI behaviors:
  - Viewer password prompts on each generation; not stored in memory beyond the call.
  - Quick generate and saved entries produce identical results across sessions.
  - Clipboard auto‑clear works with your configured delay.
  - On Windows/macOS: content protection active; attempts to capture show blank/blocked content.
  - On Android: screenshots/recording blocked (FLAG_SECURE).
  - On iOS: screen capture overlay appears; sensitive actions disabled.
- Build artifacts:
  - Desktop: `npm run tauri:build`
  - Android: `npm run mobile:android`
  - iOS: `npm run mobile:ios`
- Sign/Notarize: see `RELEASE.md`.

## Dev/Test
- Mock UI smoke test: run `npm run dev`, open `http://localhost:5173/?test=1`, and set `window.SAFORIA_MOCK = true` in DevTools. The test panel generates legacy v1/v2 outputs via the mock layer without the Rust backend.
 - Save-on-generate: In Quick generate, check “Save this postfix” to add the site immediately; the Saved list updates live.

## Security Notes
- Viewer password is never persisted; it’s only used transiently to decrypt the master in memory.
- Key derivation: Argon2id (balanced params for desktop/mobile) + ChaCha20‑Poly1305 AEAD.
- Web/mock dev mode also encrypts the master with the viewer password: AES‑GCM via WebCrypto on secure origins (localhost/https), and a dev‑only keystream fallback with integrity tag on insecure origins (e.g., host.docker.internal) so your master is never stored in plaintext.
- Clipboard copy happens only on explicit user action; content is cleared in the UI after ~30s.
- Screen capture prevention: best‑effort (SetWindowDisplayAffinity on Windows, `NSWindow` sharingType on macOS). Mobile flags will be added next (Android FLAG_SECURE, iOS capture detection overlays).
  - Android: the app sets `FLAG_SECURE` to block screenshots/recording on the Activity window.
  - iOS: capture detection triggers a UI overlay that hides sensitive content; revealing/copying is disabled while active.
  - iOS: native capture detection emits `screen_capture_changed` to the UI; sensitive actions are disabled and an overlay appears while active.
  - Linux/Wayland: global capture blocking is not guaranteed; enable the “Mask sensitive content” preference (defaults on Wayland).

## Algorithms
- Legacy v1: password = Base64(MD5(master||postfix)) without padding `=`.
- Legacy v2: password = Base64(SHA256(master||postfix)) with replacements `=`→`.`, `+`→`-`, `/`→`_`.
- New methods (len10/20/36, alnum/strong): stream from iterative SHA‑256 of `master||"::"||postfix||"::"||method_id`, mapped to the chosen alphabet using rejection sampling to avoid bias.

Verification (legacy): see `references/password-store/manager.py` commands `readv1` and `read`.
Quick parity check (Node): `npm run check:legacy` prints v1/v2 for sample inputs. Use `npm run check:legacy -- <master> <postfix>` for custom values.

## Folder Layout
- `src/` React + Vite UI.
- `src-tauri/` Rust backend (Tauri 2), crypto/generation/storage.
- `references/` legacy Python script used today by users (for compatibility).

## Data Location
- App data directory follows OS conventions (e.g., macOS `~/Library/Application Support/Saforia`, Windows `%APPDATA%/Saforia`, Linux `~/.local/share/Saforia`).
- Files: `master.enc`, `postfixes.json`, `config.json`.
- Diagnostic command: `storage_paths` (Tauri invoke) returns the app data dir and master file path.

## Roadmap
- Implement Android/iOS secure window flags and clipboard integration.
- Add import/export of postfix list (optionally encrypted archive).
- Add UI fingerprint display to verify the active master.
- Harden build settings (disable devtools in release, CSP tightening).

---
This README will evolve with each milestone commit.
## Signing & Notarization (Overview)
- macOS: sign with Developer ID Application certificate and notarize with `notarytool`. Set keychain identity or use environment variables; Tauri bundles support notarization.
- Windows: sign MSI/EXE with `signtool.exe` using a code signing certificate (EV recommended). Provide `/tr` timestamp server.
- Android: set up a keystore and configure Gradle signing (Tauri mobile). Align/zipalign handled by the toolchain.
- iOS: configure signing identities and provisioning profiles in Xcode; ensure bundle identifier matches.
## Mobile Hardening
- Android: the app calls a native helper that sets `FLAG_SECURE` on the Activity window to block screenshots/recording.
- iOS: capture detection emits an event and the UI masks sensitive content with an overlay while active; actions like reveal/copy are disabled until capture stops.
- Linux/Wayland: global capture blocking is not guaranteed; enable “Mask sensitive content” in Preferences.
- Desktop (Windows/macOS): best‑effort content protection (SetWindowDisplayAffinity on Windows, NSWindow sharingType on macOS). Not all tools respect it.
