use serde::{Deserialize, Serialize};
use std::fs;
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use argon2::{Algorithm, Version, Params, Argon2};
use chacha20poly1305::{aead::{Aead, KeyInit}, ChaCha20Poly1305, Key, Nonce};

use crate::store::{self, Entry, EntriesFile};

#[derive(Serialize, Deserialize)]
struct EncFileV1 {
    version: u32,
    salt_b64: String,
    nonce_b64: String,
    ciphertext_b64: String,
}

fn derive_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    #[cfg(any(target_os = "android", target_os = "ios"))]
    let params = Params::new(8192, 2, 1, Some(32)).unwrap();
    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let params = Params::new(19456, 2, 1, Some(32)).unwrap();
    let alg = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    alg.hash_password_into(passphrase.as_bytes(), salt, &mut out).unwrap();
    out
}

pub fn export_to_path(path: &str, passphrase: Option<String>) -> Result<(), String> {
    let entries = store::list();
    if let Some(pw) = passphrase.and_then(|s| (!s.is_empty()).then_some(s)) {
        let mut salt = [0u8; 16]; OsRng.fill_bytes(&mut salt);
        let key_bytes = derive_key(&pw, &salt);
        let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
        let cipher = ChaCha20Poly1305::new(key);
        let mut nonce_bytes = [0u8; 12]; OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext = serde_json::to_vec(&EntriesFile { entries }).map_err(|e| e.to_string())?;
        let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|_| "encryption failed".to_string())?;
        let out = EncFileV1{
            version: 1,
            salt_b64: STANDARD_NO_PAD.encode(&salt),
            nonce_b64: STANDARD_NO_PAD.encode(&nonce_bytes),
            ciphertext_b64: STANDARD_NO_PAD.encode(&ciphertext),
        };
        let data = serde_json::to_vec_pretty(&out).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        let data = serde_json::to_vec_pretty(&EntriesFile { entries }).map_err(|e| e.to_string())?;
        fs::write(path, data).map_err(|e| e.to_string())?;
        Ok(())
    }
}

pub fn import_from_path(path: &str, passphrase: Option<String>, overwrite: bool) -> Result<usize, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    // Try encrypted first
    let try_enc: Result<EncFileV1, _> = serde_json::from_slice(&data);
    if let Ok(enc) = try_enc {
        let salt = STANDARD_NO_PAD.decode(enc.salt_b64).map_err(|_| "bad salt".to_string())?;
        let nonce = STANDARD_NO_PAD.decode(enc.nonce_b64).map_err(|_| "bad nonce".to_string())?;
        let ciphertext = STANDARD_NO_PAD.decode(enc.ciphertext_b64).map_err(|_| "bad ciphertext".to_string())?;
        let pw = passphrase.filter(|s| !s.is_empty()).ok_or_else(|| "passphrase required".to_string())?;
        let key_bytes = derive_key(&pw, &salt);
        let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
        let cipher = ChaCha20Poly1305::new(key);
        let nonce = Nonce::from_slice(&nonce);
        let plaintext = cipher.decrypt(nonce, ciphertext.as_ref()).map_err(|_| "decryption failed".to_string())?;
        let parsed: EntriesFile = serde_json::from_slice(&plaintext).map_err(|e| e.to_string())?;
        if overwrite { Ok(store::replace_all(parsed.entries)) } else { Ok(store::merge(parsed.entries)) }
    } else {
        let parsed: EntriesFile = serde_json::from_slice(&data).map_err(|e| e.to_string())?;
        if overwrite { Ok(store::replace_all(parsed.entries)) } else { Ok(store::merge(parsed.entries)) }
    }
}

