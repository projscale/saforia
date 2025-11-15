use directories::ProjectDirs;
use std::{fs, path::PathBuf};

pub fn app_data_dir() -> PathBuf {
    if let Ok(custom) = std::env::var("SAFORIA_DATA_DIR") {
        let p = PathBuf::from(custom);
        let _ = ensure_dir(&p);
        return p;
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn uses_custom_env_dir_when_set() {
        let tmp = tempfile::tempdir().unwrap();
        env::set_var("SAFORIA_DATA_DIR", tmp.path());
        let p = app_data_dir();
        assert!(p.starts_with(tmp.path()));
        env::remove_var("SAFORIA_DATA_DIR");
    }
}
