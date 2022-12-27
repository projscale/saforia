use serde::{Deserialize, Serialize};
use std::{fs, time::{SystemTime, UNIX_EPOCH}};
use rand::{RngCore, rngs::OsRng};

use crate::paths::entries_file;

#[derive(Serialize, Deserialize, Clone)]
pub struct Entry {
    pub id: String,
    pub label: String,
    pub postfix: String,
    pub method_id: String,
    pub created_at: u64,
}

#[derive(Serialize, Deserialize)]
pub struct EntriesFile { pub entries: Vec<Entry> }

fn read_all() -> EntriesFile {
    let path = entries_file();
    if !path.exists() { return EntriesFile { entries: vec![] } }
    let data = match fs::read_to_string(path) { Ok(s) => s, Err(_) => return EntriesFile { entries: vec![] } };
    serde_json::from_str(&data).unwrap_or(EntriesFile { entries: vec![] })
}

fn write_all(all: &EntriesFile) -> Result<(), std::io::Error> {
    let path = entries_file();
    fs::write(path, serde_json::to_string_pretty(all).unwrap())
}

fn new_id() -> String {
    let mut rnd = [0u8; 8]; OsRng.fill_bytes(&mut rnd);
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    format!("{:x}-{:x}", t, u64::from_le_bytes(rnd))
}

pub fn list() -> Vec<Entry> { read_all().entries }

pub fn add(label: String, postfix: String, method_id: String) -> Entry {
    let mut all = read_all();
    let entry = Entry {
        id: new_id(),
        label, postfix, method_id,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    };
    all.entries.insert(0, entry.clone());
    let _ = write_all(&all);
    entry
}

pub fn delete(id: String) -> bool {
    let mut all = read_all();
    let before = all.entries.len();
    all.entries.retain(|e| e.id != id);
    let _ = write_all(&all);
    all.entries.len() < before
}

pub fn get(id: &str) -> Option<Entry> {
    read_all().entries.into_iter().find(|e| e.id == id)
}

