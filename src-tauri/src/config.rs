use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use crate::paths::{app_data_dir, ensure_dir};

#[derive(Serialize, Deserialize, Clone)]
pub struct Prefs {
    pub default_method: String,
    pub auto_clear_seconds: u32,
    pub mask_sensitive: bool,
    pub autosave_quick: bool,
    #[serde(default)]
    pub pinned_ids: Vec<String>,
    #[serde(default)]
    pub active_fingerprint: Option<String>,
    #[serde(default = "default_lang")]
    pub lang: String,
    #[serde(default = "default_true")]
    pub block_while_captured: bool,
    #[serde(default)]
    pub show_postfix_in_list: bool,
    #[serde(default = "default_viewer_prompt_secs")]
    pub viewer_prompt_timeout_seconds: u32,
    #[serde(default = "default_output_clear_secs")]
    pub output_clear_seconds: u32,
    #[serde(default)]
    pub copy_on_console_generate: bool,
    #[serde(default)]
    pub hold_only_reveal: bool,
    #[serde(default)]
    pub clear_clipboard_on_blur: bool,
}

fn prefs_path() -> PathBuf {
    let mut dir = app_data_dir();
    let _ = ensure_dir(&dir);
    dir.push("config.json");
    dir
}

fn default_lang() -> String { "en".into() }
fn default_true() -> bool { true }
fn default_viewer_prompt_secs() -> u32 { 30 }
fn default_output_clear_secs() -> u32 { 60 }

pub fn read_prefs() -> Prefs {
    let path = prefs_path();
    if let Ok(data) = fs::read_to_string(path) {
        if let Ok(p) = serde_json::from_str::<Prefs>(&data) {
            if p.auto_clear_seconds == 0 { /* allow zero as disabled */ }
            // fill defaults for newly added fields
            if !p.autosave_quick { /* already false by default if missing */ }
            return p;
        }
    }
    Prefs {
        default_method: "len36_strong".into(),
        auto_clear_seconds: 30,
        mask_sensitive: false,
        autosave_quick: false,
        pinned_ids: vec![],
        active_fingerprint: None,
        lang: default_lang(),
        block_while_captured: default_true(),
        show_postfix_in_list: false,
        viewer_prompt_timeout_seconds: default_viewer_prompt_secs(),
        output_clear_seconds: default_output_clear_secs(),
        copy_on_console_generate: false,
        hold_only_reveal: false,
        clear_clipboard_on_blur: false,
    }
}

pub fn write_prefs(p: &Prefs) -> Result<(), std::io::Error> {
    let path = prefs_path();
    fs::write(path, serde_json::to_string_pretty(p).unwrap())
}
