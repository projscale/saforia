#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows release

mod crypto;
mod gen;
mod store;
mod paths;
mod security;

use serde::Serialize;
use zeroize::Zeroizing;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct ApiError { message: String }

#[tauri::command]
fn has_master() -> bool { crypto::has_master() }

#[tauri::command]
fn setup_set_master(viewer_password: String, master_password: String) -> Result<(), ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let master = Zeroizing::new(master_password);
    crypto::save_master(&viewer, &master).map_err(|e| ApiError{ message: e.to_string() })
}

#[tauri::command]
fn master_fingerprint(viewer_password: String) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    crypto::master_fingerprint(&viewer).map_err(|e| ApiError { message: e.to_string() })
}

#[tauri::command]
fn generate_password(viewer_password: String, postfix: String, method_id: String) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let master = crypto::load_master(&viewer).map_err(|e| ApiError { message: e.to_string() })?;
    let result = gen::generate(&master, &postfix, &method_id);
    Ok(result)
}

#[tauri::command]
fn list_entries() -> Vec<store::Entry> { store::list() }

#[tauri::command]
fn add_entry(label: String, postfix: String, method_id: String) -> store::Entry { store::add(label, postfix, method_id) }

#[tauri::command]
fn delete_entry(id: String) -> bool { store::delete(id) }

#[tauri::command]
fn generate_saved(id: String, viewer_password: String) -> Result<String, ApiError> {
    let Some(entry) = store::get(&id) else { return Err(ApiError{ message: "Entry not found".into() }); };
    let viewer = Zeroizing::new(viewer_password);
    let master = crypto::load_master(&viewer).map_err(|e| ApiError { message: e.to_string() })?;
    let result = gen::generate(&master, &entry.postfix, &entry.method_id);
    Ok(result)
}

#[tauri::command]
fn storage_paths() -> (String, String) {
    let dir = paths::app_data_dir();
    let master = crypto::master_file_path();
    (dir.display().to_string(), master.display().to_string())
}
#[tauri::command]
fn enable_content_protection(window: tauri::Window) -> bool {
    #[cfg(target_os = "windows")]
    {
        use tauri::runtime::window::RawWindowHandle;
        if let Ok(handle) = window.raw_window_handle() { return security::enable_content_protection_for_hwnd(handle.hwnd() as isize) }
        return false;
    }
    #[cfg(target_os = "macos")]
    {
        use tauri::runtime::window::HasWindowHandle;
        if let Ok(h) = window.ns_window() { return security::enable_content_protection_for_nswindow(h as *mut _) }
        return false;
    }
    #[allow(unreachable_code)]
    false
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            has_master,
            setup_set_master,
            master_fingerprint,
            generate_password,
            list_entries,
            add_entry,
            delete_entry,
            generate_saved,
            enable_content_protection,
            storage_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
