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

## Usage
- First run: set a master password and a viewer password. The master is encrypted on disk by the viewer password.
- Quick generate: type a postfix, pick a method (or use default), enter the viewer password, and generate.
- Saved postfixes: add label/postfix/method. Double‑click an entry (or press Generate) to enter the viewer password and copy the result.

## Build (Desktop)
- Prereqs: Node 18+, Rust stable, Tauri 2 toolchain.
- Install deps: `npm install`
- Dev: `npm run tauri:dev`
- Release: `npm run tauri:build`

## Build (Mobile)
- iOS: Xcode + Rust targets installed; open generated project after `tauri build`.
- Android: Android Studio; ensure NDK, toolchains, and Rust `aarch64-linux-android` target.

Mobile setup steps will be expanded during development; Tauri 2 mobile is supported, but extra platform config is required (e.g., signing configs, Android manifest flags).

## Security Notes
- Viewer password is never persisted; it’s only used transiently to decrypt the master in memory.
- Key derivation: Argon2id (balanced params for desktop/mobile) + ChaCha20‑Poly1305 AEAD.
- Clipboard copy happens only on explicit user action; content is cleared in the UI after ~30s.
- Screen capture prevention: best‑effort (SetWindowDisplayAffinity on Windows, `NSWindow` sharingType on macOS). Mobile flags will be added next (Android FLAG_SECURE, iOS capture detection overlays).

## Algorithms
- Legacy v1: password = Base64(MD5(master||postfix)) without padding `=`.
- Legacy v2: password = Base64(SHA256(master||postfix)) with replacements `=`→`.`, `+`→`-`, `/`→`_`.
- New methods (len10/20/36, alnum/strong): stream from iterative SHA‑256 of `master||"::"||postfix||"::"||method_id`, mapped to the chosen alphabet using rejection sampling to avoid bias.

Verification (legacy): see `references/password-store/manager.py` commands `readv1` and `read`.

## Folder Layout
- `src/` React + Vite UI.
- `src-tauri/` Rust backend (Tauri 2), crypto/generation/storage.
- `references/` legacy Python script used today by users (for compatibility).

## Roadmap
- Implement Android/iOS secure window flags and clipboard integration.
- Add import/export of postfix list (optionally encrypted archive).
- Add UI fingerprint display to verify the active master.
- Harden build settings (disable devtools in release, CSP tightening).

---
This README will evolve with each milestone commit.
