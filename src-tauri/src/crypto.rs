use argon2::{Argon2, password_hash::{PasswordHasher, SaltString}, Params, Algorithm, Version};
use chacha20poly1305::{aead::{Aead, KeyInit}, ChaCha20Poly1305, Key, Nonce};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use zeroize::Zeroize;
use std::{fs, path::PathBuf};
use base64::{engine::general_purpose, Engine as _};
use thiserror::Error;
use md5;

use crate::paths::{app_data_dir, ensure_dir};

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("io: {0}")] Io(#[from] std::io::Error),
    #[error("json: {0}")] Json(#[from] serde_json::Error),
    #[error("decryption failed")] Decryption,
    #[error("master not found")] NotFound,
}

#[derive(Serialize, Deserialize)]
pub struct MasterFileV1 {
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

pub fn master_file_path() -> PathBuf {
    let mut dir = app_data_dir();
    dir.push("master.enc");
    dir
}

pub fn save_master(viewer_password: &str, master_password: &str) -> Result<(), CryptoError> {
    let mut dir = app_data_dir();
    ensure_dir(&dir)?;
    dir.push("master.enc");

    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    let key_bytes = derive_key(viewer_password, &salt);
    let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
    let cipher = ChaCha20Poly1305::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, master_password.as_bytes())
        .map_err(|_| CryptoError::Decryption)?;

    let file = MasterFileV1 {
        version: 1,
        salt_b64: general_purpose::STANDARD_NO_PAD.encode(&salt),
        nonce_b64: general_purpose::STANDARD_NO_PAD.encode(&nonce_bytes),
        ciphertext_b64: general_purpose::STANDARD_NO_PAD.encode(&ciphertext),
    };

    // best-effort zeroize sensitive material
    let mut vp = viewer_password.as_bytes().to_vec();
    vp.zeroize();

    let data = serde_json::to_vec_pretty(&file)?;
    fs::write(dir, data)?;
    Ok(())
}

pub fn load_master(viewer_password: &str) -> Result<String, CryptoError> {
    let path = master_file_path();
    if !path.exists() { return Err(CryptoError::NotFound); }
    let data = fs::read(path)?;
    let parsed: MasterFileV1 = serde_json::from_slice(&data)?;
    let salt = general_purpose::STANDARD_NO_PAD.decode(parsed.salt_b64).map_err(|_| CryptoError::Decryption)?;
    let nonce = general_purpose::STANDARD_NO_PAD.decode(parsed.nonce_b64).map_err(|_| CryptoError::Decryption)?;
    let ciphertext = general_purpose::STANDARD_NO_PAD.decode(parsed.ciphertext_b64).map_err(|_| CryptoError::Decryption)?;

    let key_bytes = derive_key(viewer_password, &salt);
    let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
    let cipher = ChaCha20Poly1305::new(key);

    let nonce = Nonce::from_slice(&nonce);
    let plaintext = cipher
        .decrypt(nonce, ciphertext.as_ref())
        .map_err(|_| CryptoError::Decryption)?;

    let s = String::from_utf8(plaintext).map_err(|_| CryptoError::Decryption)?;
    Ok(s)
}

pub fn has_master() -> bool { master_file_path().exists() }

pub fn master_fingerprint(viewer_password: &str) -> Result<String, CryptoError> {
    let master = load_master(viewer_password)?;
    let digest = md5::compute(master.as_bytes());
    Ok(format!("{:x}", digest))
}

