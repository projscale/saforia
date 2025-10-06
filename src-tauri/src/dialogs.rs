use std::path::PathBuf;
use crate::paths;
use rfd::FileDialog;

fn default_name(ext: &str) -> String {
    let ts = chrono::Utc::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    format!("saforia-backup-{}.{}", ts, ext.trim_start_matches('.'))
}

fn ensure_app_dir() -> PathBuf {
    let dir = paths::app_data_dir();
    let _ = paths::ensure_dir(&dir);
    dir
}

pub fn pick_save(ext: &str) -> String {
    let picked = FileDialog::new()
        .set_title("Save backup")
        .add_filter("Backup", &[ext.trim_start_matches('.')])
        .set_file_name(&default_name(ext))
        .save_file();
    picked.map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| {
        let mut d = ensure_app_dir();
        d.push(default_name(ext));
        d.to_string_lossy().to_string()
    })
}

pub fn pick_open(exts: Vec<String>) -> Result<String, String> {
    if let Some(p) = FileDialog::new()
        .set_title("Open backup")
        .add_filter(
            "Backup",
            &exts.iter().map(|e| e.trim_start_matches('.').to_string()).collect::<Vec<_>>(),
        )
        .pick_file()
    {
        return Ok(p.to_string_lossy().to_string());
    };
    // Fallback: first matching file in app data dir
    let dir = ensure_app_dir();
    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if exts.iter().any(|x| x.trim_start_matches('.').eq_ignore_ascii_case(ext)) {
                    return Ok(entry.path().to_string_lossy().to_string());
                }
            }
        }
    }
    Err("no backup file selected".into())
}
