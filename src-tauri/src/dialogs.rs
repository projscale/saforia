use tauri::api::dialog::FileDialogBuilder;
use std::path::PathBuf;

use crate::paths;

fn default_name(ext: &str) -> String {
    let stamp = chrono::Utc::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    format!("saforia-backup-{}.{}", stamp, ext)
}

fn normalize_ext(ext: &str) -> String {
    ext.trim_start_matches('.').to_lowercase()
}

pub fn pick_backup_target(ext: &str) -> Result<String, String> {
    let ext = normalize_ext(ext);
    let suggested = default_name(&ext);
    let mut picked: Option<PathBuf> = None;
    FileDialogBuilder::new()
        .set_title("Save backup")
        .add_filter("Backup", &[ext.as_str()])
        .set_file_name(&suggested)
        .save_file(|p| picked = p);
    if let Some(p) = picked {
        return Ok(p.to_string_lossy().to_string());
    }
    // fallback: save into app data dir
    let mut path = paths::app_data_dir();
    let _ = paths::ensure_dir(&path);
    path.push(suggested);
    Ok(path.to_string_lossy().to_string())
}

pub fn pick_backup_source(exts: Vec<String>) -> Result<String, String> {
    let filters: Vec<String> = exts.into_iter().map(|e| normalize_ext(&e)).collect();
    let mut picked: Option<PathBuf> = None;
    FileDialogBuilder::new()
        .set_title("Open backup")
        .add_filter("Backup", filters.iter().map(|s| s.as_str()).collect::<Vec<_>>())
        .pick_file(|p| picked = p);
    picked
        .map(|p| p.to_string_lossy().to_string())
        .ok_or_else(|| "no file selected".to_string())
}
