use serde::{Deserialize, Serialize};
use std::{collections::{HashMap, HashSet}, fs};
use base64::{engine::general_purpose::STANDARD_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use argon2::{Algorithm, Version, Params, Argon2};
use chacha20poly1305::{aead::{Aead, KeyInit}, ChaCha20Poly1305, Key, Nonce};

use crate::store::{self, Entry, EntriesFile};
use std::io::Write;

const ARGON_MEM_DESKTOP: u32 = 19456;
const ARGON_MEM_MOBILE: u32 = 8192;
const ARGON_ITERATIONS: u32 = 2;
const ARGON_PARALLELISM: u32 = 1;

#[derive(Serialize, Deserialize, Clone)]
struct EncFileV1 {
    version: u32,
    salt_b64: String,
    nonce_b64: String,
    ciphertext_b64: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct EncFileV2 {
    version: u32,
    kdf: String,
    mem_kib: u32,
    iterations: u32,
    parallelism: u32,
    cipher: String,
    salt_b64: String,
    nonce_b64: String,
    ciphertext_b64: String,
}

fn derive_key_with(passphrase: &str, salt: &[u8], mem_kib: u32, iterations: u32, parallelism: u32) -> [u8; 32] {
    let mut out = [0u8; 32];
    let params = Params::new(mem_kib, iterations, parallelism, Some(32)).unwrap();
    let alg = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    alg.hash_password_into(passphrase.as_bytes(), salt, &mut out).unwrap();
    out
}

fn default_mem() -> u32 {
    #[cfg(any(target_os = "android", target_os = "ios"))] { return ARGON_MEM_MOBILE; }
    #[cfg(not(any(target_os = "android", target_os = "ios")))] { return ARGON_MEM_DESKTOP; }
}

fn derive_key(passphrase: &str, salt: &[u8]) -> [u8; 32] {
    derive_key_with(passphrase, salt, default_mem(), ARGON_ITERATIONS, ARGON_PARALLELISM)
}

fn encrypt_entries(entries: Vec<Entry>, passphrase: Option<String>) -> Result<Vec<u8>, String> {
    if let Some(pw) = passphrase.and_then(|s| (!s.is_empty()).then_some(s)) {
        let mut salt = [0u8; 16]; OsRng.fill_bytes(&mut salt);
        let mut nonce_bytes = [0u8; 12]; OsRng.fill_bytes(&mut nonce_bytes);
        let key_bytes = derive_key(&pw, &salt);
        let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
        let cipher = ChaCha20Poly1305::new(key);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let plaintext = serde_json::to_vec(&EntriesFile { entries }).map_err(|e| e.to_string())?;
        let ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).map_err(|_| "encryption failed".to_string())?;
        let out = EncFileV2{
            version: 2,
            kdf: "argon2id".into(),
            mem_kib: default_mem(),
            iterations: ARGON_ITERATIONS,
            parallelism: ARGON_PARALLELISM,
            cipher: "chacha20poly1305".into(),
            salt_b64: STANDARD_NO_PAD.encode(&salt),
            nonce_b64: STANDARD_NO_PAD.encode(&nonce_bytes),
            ciphertext_b64: STANDARD_NO_PAD.encode(&ciphertext),
        };
        serde_json::to_vec_pretty(&out).map_err(|e| e.to_string())
    } else {
        serde_json::to_vec_pretty(&EntriesFile { entries }).map_err(|e| e.to_string())
    }
}

fn decrypt_entries(data: &[u8], passphrase: Option<String>) -> Result<Vec<Entry>, String> {
    // Try encrypted first (v2 with params)
    if let Ok(enc2) = serde_json::from_slice::<EncFileV2>(data) {
        let salt = STANDARD_NO_PAD.decode(enc2.salt_b64).map_err(|_| "bad salt".to_string())?;
        let nonce = STANDARD_NO_PAD.decode(enc2.nonce_b64).map_err(|_| "bad nonce".to_string())?;
        let ciphertext = STANDARD_NO_PAD.decode(enc2.ciphertext_b64).map_err(|_| "bad ciphertext".to_string())?;
        let pw = passphrase.filter(|s| !s.is_empty()).ok_or_else(|| "passphrase required".to_string())?;
        let key_bytes = derive_key_with(&pw, &salt, enc2.mem_kib.max(1024), enc2.iterations.max(1), enc2.parallelism.max(1));
        let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
        let cipher = ChaCha20Poly1305::new(key);
        let nonce = Nonce::from_slice(&nonce);
        let plaintext = cipher.decrypt(nonce, ciphertext.as_ref()).map_err(|_| "decryption failed".to_string())?;
        let parsed: EntriesFile = serde_json::from_slice(&plaintext).map_err(|e| e.to_string())?;
        return Ok(parsed.entries);
    }
    // Legacy encrypted file without params
    if let Ok(enc) = serde_json::from_slice::<EncFileV1>(data) {
        let salt = STANDARD_NO_PAD.decode(enc.salt_b64).map_err(|_| "bad salt".to_string())?;
        let nonce = STANDARD_NO_PAD.decode(enc.nonce_b64).map_err(|_| "bad nonce".to_string())?;
        let ciphertext = STANDARD_NO_PAD.decode(enc.ciphertext_b64).map_err(|_| "bad ciphertext".to_string())?;
        let pw = passphrase.filter(|s| !s.is_empty()).ok_or_else(|| "passphrase required".to_string())?;
        let nonce = Nonce::from_slice(&nonce);
        for mem in [ARGON_MEM_DESKTOP, ARGON_MEM_MOBILE] {
            let key_bytes = derive_key_with(&pw, &salt, mem, ARGON_ITERATIONS, ARGON_PARALLELISM);
            let key = Key::<ChaCha20Poly1305>::from_slice(&key_bytes);
            let cipher = ChaCha20Poly1305::new(key);
            if let Ok(plaintext) = cipher.decrypt(nonce, ciphertext.as_ref()) {
                let parsed: EntriesFile = serde_json::from_slice(&plaintext).map_err(|e| e.to_string())?;
                return Ok(parsed.entries);
            }
        }
        return Err("decryption failed".to_string());
    }
    // Plain JSON
    let parsed: EntriesFile = serde_json::from_slice(data).map_err(|e| e.to_string())?;
    Ok(parsed.entries)
}

pub fn export_to_path(path: &str, passphrase: Option<String>) -> Result<(), String> {
    let entries = store::list();
    let data = encrypt_entries(entries, passphrase)?;
    fs::write(path, data).map_err(|e| e.to_string())
}

pub fn import_from_path(path: &str, passphrase: Option<String>, overwrite: bool) -> Result<usize, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    let entries = decrypt_entries(&data, passphrase)?;
    if overwrite { Ok(store::replace_all(entries)) } else { Ok(store::merge(entries)) }
}

pub fn preview_backup(path: &str, passphrase: Option<String>) -> Result<CsvPreview, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    let entries = decrypt_entries(&data, passphrase)?;
    Ok(CsvPreview { fingerprints: summarize_fingerprints(&entries) })
}

fn summarize_fingerprints(entries: &Vec<Entry>) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for e in entries.iter() {
        let fp = e.fingerprint.clone().unwrap_or_else(|| "".to_string());
        *counts.entry(fp).or_insert(0) += 1;
    }
    let mut v: Vec<(String, usize)> = counts.into_iter().collect();
    v.sort_by(|a,b| a.0.cmp(&b.0));
    v
}

pub fn import_with_mapping(path: &str, passphrase: Option<String>, mapping: Vec<CsvMapping>, overwrite: bool) -> Result<usize, String> {
    let data = fs::read(path).map_err(|e| e.to_string())?;
    let entries = decrypt_entries(&data, passphrase)?;
    let mapped = map_entries(entries, mapping);
    if overwrite { Ok(store::replace_all(mapped)) } else { Ok(store::merge(mapped)) }
}

fn map_entries(entries: Vec<Entry>, mapping: Vec<CsvMapping>) -> Vec<Entry> {
    let map: HashMap<String, Option<String>> = mapping.into_iter().map(|m| (m.from, m.to)).collect();
    let allowed: HashSet<String> = crate::crypto::list_master_fingerprints().into_iter().collect();
    let mut out: Vec<Entry> = vec![];
    for mut e in entries.into_iter() {
        let from = e.fingerprint.clone().unwrap_or_else(|| "".to_string());
        let target = map.get(&from).cloned().unwrap_or(None);
        if let Some(fp) = target {
            if allowed.contains(&fp) {
                e.fingerprint = Some(fp.clone());
                out.push(e);
            }
        }
    }
    out
}

pub fn import_entries_payload(entries: Vec<Entry>, overwrite: bool) -> Result<usize, String> {
    let allowed: HashSet<String> = crate::crypto::list_master_fingerprints().into_iter().collect();
    let filtered: Vec<Entry> = entries
        .into_iter()
        .filter(|e| e.fingerprint.as_ref().map(|fp| allowed.contains(fp)).unwrap_or(false))
        .collect();
    if overwrite { Ok(store::replace_all(filtered)) } else { Ok(store::merge(filtered)) }
}

// --- CSV support ---
pub fn export_to_csv(path: &str) -> Result<(), String> {
    let entries = store::list_for_fingerprint(&None);
    let mut wtr = Vec::new();
    // header
    writeln!(&mut wtr, "fingerprint,label,postfix,method_id,created_at,id").map_err(|e| e.to_string())?;
    for e in entries.into_iter() {
        let fp = e.fingerprint.clone().unwrap_or_default();
        let safe = |s: &str| s.replace('"', "\"");
        let line = format!(
            "{}\n",
            [fp, safe(&e.label), safe(&e.postfix), e.method_id.clone(), e.created_at.to_string(), e.id.clone()].join(",")
        );
        wtr.extend_from_slice(line.as_bytes());
    }
    std::fs::write(path, wtr).map_err(|e| e.to_string())
}

#[derive(Serialize)]
pub struct CsvPreview { pub fingerprints: Vec<(String, usize)>, }

pub fn preview_csv(path: &str) -> Result<CsvPreview, String> {
    let data = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut counts: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    for (i, line) in data.lines().enumerate() {
        if i == 0 { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 6 { continue; }
        let fp = parts[0].trim().to_string();
        *counts.entry(fp).or_insert(0) += 1;
    }
    let mut v: Vec<(String, usize)> = counts.into_iter().collect();
    v.sort_by(|a,b| a.0.cmp(&b.0));
    Ok(CsvPreview { fingerprints: v })
}

#[derive(Deserialize)]
pub struct CsvMapping { pub from: String, pub to: Option<String> }

pub fn import_csv_apply(path: &str, mapping: Vec<CsvMapping>, overwrite: bool) -> Result<usize, String> {
    let map: std::collections::HashMap<String, Option<String>> = mapping.into_iter().map(|m| (m.from, m.to)).collect();
    let data = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut list: Vec<Entry> = vec![];
    for (i, line) in data.lines().enumerate() {
        if i == 0 { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 6 { continue; }
        let from_fp = parts[0].trim().to_string();
        let target = map.get(&from_fp).cloned().unwrap_or(None);
        if target.is_none() { continue; }
        let label = parts[1].to_string();
        let postfix = parts[2].to_string();
        let method_id = parts[3].to_string();
        let created_at: u64 = parts[4].parse().unwrap_or(0);
        let id = parts[5].to_string();
        let mut e = Entry { id, label, postfix, method_id, created_at, order: 0, fingerprint: target.clone() };
        list.push(e);
    }
    if overwrite { Ok(store::replace_all(list)) } else { Ok(store::merge(list)) }
}
