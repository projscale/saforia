use sha2::{Sha256, Digest};
use base64::{engine::general_purpose::STANDARD, Engine as _};

fn sha256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}

fn extend_stream(mut seed: Vec<u8>, need: usize) -> Vec<u8> {
    let mut out = seed.clone();
    let mut counter: u32 = 1;
    while out.len() < need {
        let mut h = Sha256::new();
        h.update(&out[out.len().saturating_sub(32)..]);
        h.update(&counter.to_le_bytes());
        out.extend_from_slice(&h.finalize());
        counter = counter.wrapping_add(1);
    }
    out.truncate(need);
    out
}

fn map_to_alphabet(mut stream: Vec<u8>, alphabet: &[u8], size: usize) -> String {
    let mut out = String::with_capacity(size);
    let m = alphabet.len() as u32;
    let limit = (u32::from(u8::MAX) / m) * m; // rejection threshold
    let mut idx = 0;
    while out.len() < size {
        if idx >= stream.len() { stream = extend_stream(stream, stream.len() + 32); }
        let v = u32::from(stream[idx]); idx += 1;
        if v < limit { let c = alphabet[(v % m) as usize] as char; out.push(c) }
    }
    out
}

fn b64_no_pad(data: &[u8]) -> String { STANDARD.encode(data).trim_end_matches('=').to_string() }

pub fn generate(master: &str, postfix: &str, method_id: &str) -> String {
    match method_id {
        // Legacy formats compatible with references/password-store/manager.py
        "legacy_v1" => {
            let mut md5_ctx = md5::Context::new();
            md5_ctx.consume(master.as_bytes());
            md5_ctx.consume(postfix.as_bytes());
            let digest = md5_ctx.compute();
            b64_no_pad(&digest.0)
        }
        "legacy_v2" => {
            let mut h = Sha256::new();
            h.update(master.as_bytes());
            h.update(postfix.as_bytes());
            let digest = h.finalize();
            let s = STANDARD.encode(digest);
            s.replace('=', ".").replace('+', "-").replace('/', "_")
        }
        // New deterministic length-limited methods
        id if id.starts_with("len") => {
            let parts: Vec<&str> = id.split('_').collect();
            let len: usize = parts.get(0).and_then(|v| v.strip_prefix("len")).and_then(|n| n.parse().ok()).unwrap_or(36);
            let strong = parts.get(1).map(|s| *s).unwrap_or("alnum");
            let alnum = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            let strong_alphabet = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?/<>~";
            let alphabet: &[u8] = if strong == &"strong" { strong_alphabet } else { alnum };

            let mut seed = Vec::new();
            seed.extend_from_slice(master.as_bytes());
            seed.extend_from_slice(b"::");
            seed.extend_from_slice(postfix.as_bytes());
            seed.extend_from_slice(b"::");
            seed.extend_from_slice(id.as_bytes());

            let digest = sha256(&seed);
            let stream = extend_stream(digest.to_vec(), len * 2);
            map_to_alphabet(stream, alphabet, len)
        }
        _ => {
            // Fallback to default strong 36
            generate(master, postfix, "len36_strong")
        }
    }
}

