use directories::ProjectDirs;
use std::{fs, path::PathBuf};

pub fn app_data_dir() -> PathBuf {
    let proj = ProjectDirs::from("com", "Saforia", "Saforia").expect("project dirs");
    proj.data_dir().to_path_buf()
}

pub fn ensure_dir(path: &PathBuf) -> std::io::Result<()> {
    if !path.exists() { fs::create_dir_all(path)?; }
    Ok(())
}

pub fn entries_file() -> PathBuf {
    let mut dir = app_data_dir();
    let _ = ensure_dir(&dir);
    dir.push("postfixes.json");
    dir
}

pub fn masters_dir() -> PathBuf {
    let mut dir = app_data_dir();
    let _ = ensure_dir(&dir);
    dir.push("masters");
    let _ = ensure_dir(&dir);
    dir
}
