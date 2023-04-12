#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")] // hide console window on Windows release

mod crypto;
mod gen;
mod store;
mod paths;
mod security;
mod backup;
mod config;

use serde::Serialize;
use zeroize::Zeroizing;
use tauri::{AppHandle, Manager, Emitter};
use std::{thread, time::Duration, sync::{Arc, atomic::{AtomicBool, Ordering}}};
use std::env;

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
    #[cfg(target_os = "android")]
    {
        return security::enable_content_protection_android();
    }
    #[cfg(target_os = "ios")]
    {
        return security::enable_content_protection_ios();
    }
    #[allow(unreachable_code)]
    false
}

#[tauri::command]
fn is_screen_captured() -> bool {
    #[cfg(target_os = "ios")]
    { return security::is_screen_captured_ios(); }
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
            storage_paths,
            export_entries,
            import_entries,
            get_prefs,
            set_prefs,
            is_screen_captured,
            platform_info,
            clear_clipboard_native,
            write_clipboard_native
        ])
        .setup(|app| {
            // iOS: emit screen capture changes periodically to avoid UI polling
            #[cfg(target_os = "ios")]
            {
                let app_handle = app.handle();
                thread::spawn(move || {
                    let last = Arc::new(AtomicBool::new(false));
                    loop {
                        let current = crate::security::is_screen_captured_ios();
                        let prev = last.swap(current, Ordering::SeqCst);
                        if current != prev {
                            let _ = app_handle.emit_all("screen_capture_changed", &current);
                        }
                        thread::sleep(Duration::from_millis(1200));
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn export_entries(path: String, passphrase: Option<String>) -> Result<(), ApiError> {
    backup::export_to_path(&path, passphrase).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries(path: String, passphrase: Option<String>, overwrite: bool) -> Result<usize, ApiError> {
    backup::import_from_path(&path, passphrase, overwrite).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn get_prefs() -> config::Prefs { config::read_prefs() }

#[tauri::command]
fn set_prefs(default_method: Option<String>, auto_clear_seconds: Option<u32>, mask_sensitive: Option<bool>) -> Result<config::Prefs, ApiError> {
    let mut p = config::read_prefs();
    if let Some(dm) = default_method { p.default_method = dm; }
    if let Some(sec) = auto_clear_seconds { p.auto_clear_seconds = sec; }
    if let Some(ms) = mask_sensitive { p.mask_sensitive = ms; }
    config::write_prefs(&p).map_err(|e| ApiError { message: e.to_string() })?;
    Ok(p)
}
#[tauri::command]
fn clear_clipboard_native() -> bool {
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        if let Ok(mut cb) = arboard::Clipboard::new() {
            if cb.set_text(String::new()).is_ok() { return true; }
            let _ = cb.set_text(" ".to_string());
            return true;
        }
        return false;
    }
    #[allow(unreachable_code)]
    false
}

#[tauri::command]
fn write_clipboard_native(text: String) -> bool {
    #[cfg(not(any(target_os = "ios", target_os = "android")))]
    {
        if let Ok(mut cb) = arboard::Clipboard::new() {
            return cb.set_text(text).is_ok();
        }
        return false;
    }
    #[allow(unreachable_code)]
    false
}

#[derive(Serialize)]
struct PlatformInfo { os: String, wayland: bool }

#[tauri::command]
fn platform_info() -> PlatformInfo {
    #[cfg(target_os = "linux")]
    {
        let wayland = env::var("XDG_SESSION_TYPE").map(|v| v.to_lowercase() == "wayland").unwrap_or(false)
            || env::var("WAYLAND_DISPLAY").is_ok();
        return PlatformInfo { os: "linux".into(), wayland };
    }
    #[cfg(target_os = "windows")]
    { return PlatformInfo { os: "windows".into(), wayland: false }; }
    #[cfg(target_os = "macos")]
    { return PlatformInfo { os: "macos".into(), wayland: false }; }
    #[cfg(target_os = "android")]
    { return PlatformInfo { os: "android".into(), wayland: false }; }
    #[cfg(target_os = "ios")]
    { return PlatformInfo { os: "ios".into(), wayland: false }; }
}
