use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use crate::paths::{app_data_dir, ensure_dir};

#[derive(Serialize, Deserialize, Clone)]
pub struct Prefs {
    pub default_method: String,
}

fn prefs_path() -> PathBuf {
    let mut dir = app_data_dir();
    let _ = ensure_dir(&dir);
    dir.push("config.json");
    dir
}

pub fn read_prefs() -> Prefs {
    let path = prefs_path();
    if let Ok(data) = fs::read_to_string(path) {
        if let Ok(p) = serde_json::from_str::<Prefs>(&data) { return p; }
    }
    Prefs { default_method: "len36_strong".into() }
}

pub fn write_prefs(p: &Prefs) -> Result<(), std::io::Error> {
    let path = prefs_path();
    fs::write(path, serde_json::to_string_pretty(p).unwrap())
}

