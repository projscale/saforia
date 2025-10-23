<img src="./src-tauri/icons/icon.svg" alt="Saforia logo" width="120">

Deterministic password generator for desktop and mobile.

<a href="https://github.com/projscale/saforia/actions">
  <img src="https://img.shields.io/github/actions/workflow/status/projscale/saforia/e2e.yml?style=flat-square&label=CI" alt="Build status">
</a>
<a href="https://github.com/projscale/saforia/releases">
  <img src="https://img.shields.io/github/v/release/projscale/saforia?style=flat-square" alt="Latest release">
</a>
<img src="https://img.shields.io/github/license/projscale/saforia?style=flat-square" alt="License">
<img src="https://img.shields.io/github/stars/projscale/saforia?style=flat-square&color=facc15" alt="GitHub stars">
<img src="https://img.shields.io/badge/stack-Rust%20%2B%20Tauri%20%7C%20React%20%2B%20TS-6366f1?style=flat-square" alt="Stack">

Languages:
<a href="./README.md">English</a> ·
<a href="./README.ru.md">Русский</a> ·
<a href="./README.zh.md">简体中文</a>

---

## What is Saforia?

Saforia is a deterministic password generator and manager:

- Single master password, encrypted at rest with a separate viewer password.
- Per‑service postfix (suffix) and method define each final password.
- Desktop (Tauri) app with a focused, keyboard‑friendly UI.
- Optional `.safe` encrypted backups and CSV export for migration (see in‑app “How it works” for details on formats and encryption).

Nothing is sent to servers: all derivation and storage happen on your device.

---

## Quick start

### Run in development

```bash
npm install
npm run dev        # web dev server
npm run tauri:dev  # desktop via Tauri
```

In a browser you can open:

```text
http://localhost:5173/?test=1
```

and use the mock backend to test the UI without native Rust.

### Build

```bash
npm run build        # production web build
npm run tauri:build  # desktop bundles
```

Mobile builds (after setting up Tauri mobile toolchain):

```bash
npm run mobile:android
npm run mobile:ios
```

## CI/CD

- `.github/workflows/ci.yml`: runs `npm run build` (type check) and `cargo check` for the Tauri backend on push/PR. Linux runners install Tauri GTK/WebKit deps.
- `.github/workflows/e2e.yml`: Playwright E2E suite.
- `.github/workflows/release.yml`: builds unsigned Tauri bundles on tag push (`v*`) for macOS, Windows, Linux. If signing secrets are provided (`TAURI_SIGNING_PRIVATE_KEY`), artifacts are signed automatically.

---

## Snapshot of features

- Deterministic password derivation with modern and legacy methods.
- Master stored only in encrypted form (Argon2id + ChaCha20‑Poly1305).
- Viewer password used locally to decrypt the master, never stored.
- Saved entries per master profile with drag‑and‑drop reordering.
- Backup/import:
  - `.safe` archives for encrypted structured backups,
  - CSV export/import for one‑off migrations and external tools.

For a deeper explanation of the security model and export formats, open the **How it works** section in the app.

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
- App data directory follows OS conventions (e.g., macOS `~/Library/Application Support/Saforia`, Windows `%APPDATA%/Saforia`, Linux `~/.local/share/Saforia`). Set `SAFORIA_DATA_DIR=/custom/path` to run in a portable mode.
- Files: `master.enc`, `postfixes.json`, `config.json`.
- Diagnostic command: `storage_paths` (Tauri invoke) returns the app data dir and master file path.

## Roadmap
- Implement Android/iOS secure window flags and clipboard integration.
- Refine backup & restore UX and add more automation around .safe/CSV migration flows.
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
