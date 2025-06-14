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
    pub order: i64,
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

pub fn dump_all() -> EntriesFile { read_all() }

pub fn write_all(all: &EntriesFile) -> Result<(), std::io::Error> {
    let path = entries_file();
    fs::write(path, serde_json::to_string_pretty(all).unwrap())
}

fn new_id() -> String {
    let mut rnd = [0u8; 8]; OsRng.fill_bytes(&mut rnd);
    let t = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    format!("{:x}-{:x}", t, u64::from_le_bytes(rnd))
}

pub fn list() -> Vec<Entry> {
    list_for_fingerprint(&None)
}

pub fn list_for_fingerprint(active: &Option<String>) -> Vec<Entry> {
    let all = read_all().entries;
    let mut v: Vec<Entry> = match active {
        Some(fp) => all
            .into_iter()
            .filter(|e| e.fingerprint.as_deref() == Some(fp.as_str()) || e.fingerprint.is_none())
            .collect(),
        None => all,
    };
    // Custom order wins when set (order != 0); otherwise fall back to created_at (newest first).
    v.sort_by(|a, b| {
        let ao = a.order;
        let bo = b.order;
        let a_has = ao != 0;
        let b_has = bo != 0;
        match (a_has, b_has) {
            (true, true) => ao.cmp(&bo),
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            (false, false) => b.created_at.cmp(&a.created_at),
        }
    });
    v
}

pub fn add(label: String, postfix: String, method_id: String, active: &Option<String>) -> Entry {
    let mut all = read_all();
    let entry = Entry {
        id: new_id(),
        label,
        postfix,
        method_id,
        created_at: SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs(),
        order: 0,
        fingerprint: None,
    };
    let mut entry = entry;
    if let Some(fp) = active {
        entry.fingerprint = Some(fp.clone());
    }
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
    // Determine existing max order (if any entries already have custom ordering).
    let mut max_order: i64 = existing
        .entries
        .iter()
        .filter(|e| e.order != 0)
        .map(|e| e.order)
        .max()
        .unwrap_or(-1);
    for mut e in entries.into_iter() {
        if existing.entries.iter().any(|x| x.id == e.id) {
            continue;
        }
        if max_order >= 0 {
            // Append imported entries after existing ordered ones, preserving their relative order.
            max_order += 1;
            if e.order == 0 {
                e.order = max_order;
            } else {
                e.order = max_order;
            }
        }
        existing.entries.push(e);
        count += 1;
    }
    let _ = write_all(&existing);
    count
}

pub fn reorder_for_fingerprint(active: &Option<String>, ids: Vec<String>) -> Result<(), std::io::Error> {
    use std::collections::HashMap;
    let mut all = read_all();
    let index_map: HashMap<String, i64> = ids.into_iter().enumerate().map(|(idx, id)| (id, idx as i64)).collect();
    let mut next = index_map.len() as i64;
    for e in all.entries.iter_mut() {
        let relevant = match active {
            Some(fp) => e.fingerprint.as_deref() == Some(fp.as_str()) || e.fingerprint.is_none(),
            None => true,
        };
        if !relevant {
            continue;
        }
        if let Some(idx) = index_map.get(&e.id) {
            e.order = *idx;
        } else {
            // Entries missing from the provided order (should not happen) are appended at the end.
            e.order = next;
            next += 1;
        }
    }
    write_all(&all)
}

pub fn bind_unbound_to(active: &str) -> usize {
    let mut all = read_all();
    let mut count = 0usize;
    for e in all.entries.iter_mut() {
        if e.fingerprint.is_none() {
            e.fingerprint = Some(active.to_string());
            count += 1;
        }
    }
    let _ = write_all(&all);
    count
}
