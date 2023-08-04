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
    #[serde(default)]
    pub fingerprint: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct EntriesFile { pub entries: Vec<Entry> }

fn read_all() -> EntriesFile {
    let path = entries_file();
    if !path.exists() { return EntriesFile { entries: vec![] } }
    let data = match fs::read_to_string(path) { Ok(s) => s, Err(_) => return EntriesFile { entries: vec![] } };
    serde_json::from_str(&data).unwrap_or(EntriesFile { entries: vec![] })
}

pub fn write_all(all: &EntriesFile) -> Result<(), std::io::Error> {
    let path = entries_file();
    fs::write(path, serde_json::to_string_pretty(all).unwrap())
}

fn new_id() -> String {
    let mut rnd = [0u8; 8]; OsRng.fill_bytes(&mut rnd);
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    format!("{:x}-{:x}", t, u64::from_le_bytes(rnd))
}

pub fn list_for_fingerprint(active: &Option<String>) -> Vec<Entry> {
    let all = read_all().entries;
    match active {
        Some(fp) => all.into_iter().filter(|e| e.fingerprint.as_deref() == Some(fp.as_str()) || e.fingerprint.is_none()).collect(),
        None => all,
    }
}

pub fn add(label: String, postfix: String, method_id: String, active: &Option<String>) -> Entry {
    let mut all = read_all();
    let entry = Entry {
        id: new_id(),
        label, postfix, method_id,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs()
    };
    let mut entry = entry;
    if let Some(fp) = active { entry.fingerprint = Some(fp.clone()); }
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

pub fn replace_all(entries: Vec<Entry>) -> usize {
    let all = EntriesFile { entries };
    let _ = write_all(&all);
    all.entries.len()
}

pub fn merge(entries: Vec<Entry>) -> usize {
    let mut existing = read_all();
    let mut count = 0usize;
    for e in entries.into_iter() {
        if existing.entries.iter().any(|x| x.id == e.id) {
            continue;
        }
        existing.entries.push(e);
        count += 1;
    }
    let _ = write_all(&existing);
    count
}
