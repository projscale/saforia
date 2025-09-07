use argon2::{Argon2, password_hash::{PasswordHasher, SaltString}, Params, Algorithm, Version};
use aes_gcm::{aead::{Aead, KeyInit}, Aes256Gcm, Key, Nonce};
use chacha20poly1305::{aead::Aead as ChAead, ChaCha20Poly1305, Key as ChKey, Nonce as ChNonce};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;
use std::{fs, path::PathBuf};
use base64::{engine::general_purpose, Engine as _};
use thiserror::Error;
use md5;

use crate::paths::{app_data_dir, ensure_dir, masters_dir};

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("io: {0}")] Io(#[from] std::io::Error),
    #[error("json: {0}")] Json(#[from] serde_json::Error),
    #[error("decryption failed")] Decryption,
    #[error("master not found")] NotFound,
}

#[derive(Serialize, Deserialize)]
pub struct MasterFile {
    pub version: u32,
    pub salt_b64: String,
    pub nonce_b64: String,
    pub ciphertext_b64: String,
}

fn derive_key(viewer_password: &str, salt: &[u8]) -> [u8; 32] {
    // Memory and time cost balanced for desktop and mobile
    let mut out = [0u8; 32];
    // Reduce memory on mobile targets
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let params = Params::new(8192, 2, 1, Some(32)).unwrap();
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let params = Params::new(19456, 2, 1, Some(32)).unwrap();

    let alg = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    alg.hash_password_into(viewer_password.as_bytes(), salt, &mut out).unwrap();
    out
}

pub fn master_file_path_for(fp: &str) -> PathBuf {
    let mut dir = masters_dir();
    dir.push(format!("{}.enc", fp));
    dir
}

pub fn save_master(viewer_password: &str, master_password: &str) -> Result<String, CryptoError> {
    let _ = masters_dir();

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let key_bytes = derive_key(viewer_password, &salt);
    let key = Key::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, master_password.as_bytes())
        .map_err(|_| CryptoError::Decryption)?;

    let file = MasterFile {
        version: 2,
        salt_b64: general_purpose::STANDARD_NO_PAD.encode(&salt),
        nonce_b64: general_purpose::STANDARD_NO_PAD.encode(&nonce_bytes),
        ciphertext_b64: general_purpose::STANDARD_NO_PAD.encode(&ciphertext),
    };

    // best-effort zeroize sensitive material
    let mut vp = viewer_password.as_bytes().to_vec();
    vp.zeroize();

    let data = serde_json::to_vec_pretty(&file)?;
    // fingerprint as md5 hex of plaintext master
    let digest = md5::compute(master_password.as_bytes());
    let fp = format!("{:x}", digest);
    let path = master_file_path_for(&fp);
    fs::write(path, data)?;
    Ok(fp)
}

pub fn load_master(viewer_password: &str, fingerprint: &str) -> Result<String, CryptoError> {
    let path = master_file_path_for(fingerprint);
    if !path.exists() { return Err(CryptoError::NotFound); }
    let data = fs::read(path)?;
    let parsed: MasterFile = serde_json::from_slice(&data)?;
    let salt = general_purpose::STANDARD_NO_PAD.decode(parsed.salt_b64).map_err(|_| CryptoError::Decryption)?;
    let nonce_bytes = general_purpose::STANDARD_NO_PAD.decode(parsed.nonce_b64).map_err(|_| CryptoError::Decryption)?;
    let ciphertext = general_purpose::STANDARD_NO_PAD.decode(parsed.ciphertext_b64).map_err(|_| CryptoError::Decryption)?;

    let key_bytes = derive_key(viewer_password, &salt);
    match parsed.version {
        2 => {
            let key = Key::from_slice(&key_bytes);
            let cipher = Aes256Gcm::new(key);
            let nonce = Nonce::from_slice(&nonce_bytes);
            let plaintext = cipher
                .decrypt(nonce, ciphertext.as_ref())
                .map_err(|_| CryptoError::Decryption)?;
            let s = String::from_utf8(plaintext).map_err(|_| CryptoError::Decryption)?;
            Ok(s)
        },
        1 | _ => {
            // Legacy v1 used ChaCha20-Poly1305; decrypt and migrate to v2 (AES-GCM)
            let key = ChKey::from_slice(&key_bytes);
            let cipher = ChaCha20Poly1305::new(key);
            let nonce = ChNonce::from_slice(&nonce_bytes);
            let plaintext = cipher
                .decrypt(nonce, ciphertext.as_ref())
                .map_err(|_| CryptoError::Decryption)?;
            let s = String::from_utf8(plaintext.clone()).map_err(|_| CryptoError::Decryption)?;
            // migrate to v2 in-place best-effort
            if !plaintext.is_empty() {
                let key_v2 = Key::from_slice(&key_bytes);
                let cipher_v2 = Aes256Gcm::new(key_v2);
                let mut new_nonce = [0u8; 12];
                OsRng.fill_bytes(&mut new_nonce);
                if let Ok(ct2) = cipher_v2.encrypt(Nonce::from_slice(&new_nonce), s.as_bytes()) {
                    let new_file = MasterFile {
                        version: 2,
                        salt_b64: general_purpose::STANDARD_NO_PAD.encode(&salt),
                        nonce_b64: general_purpose::STANDARD_NO_PAD.encode(&new_nonce),
                        ciphertext_b64: general_purpose::STANDARD_NO_PAD.encode(&ct2),
                    };
                    if let Ok(bytes) = serde_json::to_vec_pretty(&new_file) {
                        let _ = fs::write(master_file_path_for(fingerprint), bytes);
                    }
                }
            }
            Ok(s)
        }
    }
}

pub fn has_master() -> bool { masters_dir().exists() && fs::read_dir(masters_dir()).map(|mut it| it.next().is_some()).unwrap_or(false) }

pub fn list_master_fingerprints() -> Vec<String> {
    let dir = masters_dir();
    let mut v = vec![];
    if let Ok(rd) = fs::read_dir(dir) {
        for e in rd.flatten() {
            if let Some(name) = e.path().file_stem().and_then(|s| s.to_str()) { v.push(name.to_string()); }
        }
    }
    v
}

pub fn master_fingerprint(viewer_password: &str, fingerprint: &str) -> Result<String, CryptoError> {
    let master = load_master(viewer_password, fingerprint)?;
    let digest = md5::compute(master.as_bytes());
    Ok(format!("{:x}", digest))
}

pub fn delete_master(fp: &str) -> bool {
    let path = master_file_path_for(fp);
    if path.exists() { std::fs::remove_file(path).is_ok() } else { false }
}
