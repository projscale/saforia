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
fn setup_set_master(viewer_password: String, master_password: String) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let master = Zeroizing::new(master_password);
    let fp = crypto::save_master(&viewer, &master).map_err(|e| ApiError{ message: e.to_string() })?;
    let mut p = config::read_prefs();
    p.active_fingerprint = Some(fp.clone());
    let _ = config::write_prefs(&p);
    Ok(fp)
}

#[tauri::command]
fn master_fingerprint(viewer_password: String) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let p = config::read_prefs();
    let fp = p.active_fingerprint.clone().ok_or(ApiError{ message: "no active master".into() })?;
    crypto::master_fingerprint(&viewer, &fp).map_err(|e| ApiError { message: e.to_string() })
}

#[tauri::command]
fn reveal_master(viewer_password: String, fingerprint: Option<String>) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let fp = fingerprint
        .or_else(|| config::read_prefs().active_fingerprint)
        .ok_or(ApiError{ message: "no active master".into() })?;
    crypto::load_master(&viewer, &fp).map_err(|e| ApiError { message: e.to_string() })
}

#[tauri::command]
fn generate_password(viewer_password: String, postfix: String, method_id: String) -> Result<String, ApiError> {
    let viewer = Zeroizing::new(viewer_password);
    let p = config::read_prefs();
    let fp = p.active_fingerprint.clone().ok_or(ApiError{ message: "no active master".into() })?;
    let master = crypto::load_master(&viewer, &fp).map_err(|e| ApiError { message: e.to_string() })?;
    let result = gen::generate(&master, &postfix, &method_id);
    Ok(result)
}

#[tauri::command]
fn list_entries() -> Vec<store::Entry> { let p = config::read_prefs(); store::list_for_fingerprint(&p.active_fingerprint) }

#[tauri::command]
fn add_entry(label: String, postfix: String, method_id: String) -> store::Entry { let p = config::read_prefs(); store::add(label, postfix, method_id, &p.active_fingerprint) }

#[tauri::command]
fn delete_entry(id: String) -> bool { store::delete(id) }

#[tauri::command]
fn reorder_entries(ids: Vec<String>) -> Result<(), ApiError> {
    let p = config::read_prefs();
    store::reorder_for_fingerprint(&p.active_fingerprint, ids)
        .map_err(|e| ApiError { message: e.to_string() })
}

#[tauri::command]
fn generate_saved(id: String, viewer_password: String) -> Result<String, ApiError> {
    let Some(entry) = store::get(&id) else { return Err(ApiError{ message: "Entry not found".into() }); };
    let viewer = Zeroizing::new(viewer_password);
    let fp = entry.fingerprint.clone().or_else(|| config::read_prefs().active_fingerprint).ok_or(ApiError{ message: "no active master".into() })?;
    let master = crypto::load_master(&viewer, &fp).map_err(|e| ApiError { message: e.to_string() })?;
    let result = gen::generate(&master, &entry.postfix, &entry.method_id);
    Ok(result)
}

#[tauri::command]
fn storage_paths() -> (String, String) {
    let dir = paths::app_data_dir();
    let masters = paths::masters_dir();
    (dir.display().to_string(), masters.display().to_string())
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
            reveal_master,
            list_masters,
            get_active_fingerprint,
            set_active_fingerprint,
            delete_master,
            bind_unbound_entries,
            generate_password,
            list_entries,
            add_entry,
            delete_entry,
            reorder_entries,
            generate_saved,
            enable_content_protection,
            storage_paths,
            export_entries,
            export_entries_csv,
            import_entries_preview,
            import_entries_apply,
            import_entries_payload,
            import_entries_csv_preview,
            import_entries_csv_apply,
            import_entries,
            dump_entries,
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
fn export_entries_csv(path: String) -> Result<(), ApiError> {
    backup::export_to_csv(&path).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries(path: String, passphrase: Option<String>, overwrite: bool) -> Result<usize, ApiError> {
    backup::import_from_path(&path, passphrase, overwrite).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries_csv_preview(path: String) -> Result<backup::CsvPreview, ApiError> {
    backup::preview_csv(&path).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries_preview(path: String, passphrase: Option<String>) -> Result<backup::CsvPreview, ApiError> {
    backup::preview_backup(&path, passphrase).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries_apply(path: String, passphrase: Option<String>, mapping: Vec<backup::CsvMapping>, overwrite: bool) -> Result<usize, ApiError> {
    backup::import_with_mapping(&path, passphrase, mapping, overwrite).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries_payload(entries: Vec<store::Entry>, overwrite: bool) -> Result<usize, ApiError> {
    backup::import_entries_payload(entries, overwrite).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn import_entries_csv_apply(path: String, mapping: Vec<backup::CsvMapping>, overwrite: bool) -> Result<usize, ApiError> {
    backup::import_csv_apply(&path, mapping, overwrite).map_err(|e| ApiError { message: e })
}

#[tauri::command]
fn get_prefs() -> config::Prefs { config::read_prefs() }

#[tauri::command]
fn set_prefs(
    default_method: Option<String>,
    auto_clear_seconds: Option<u32>,
    mask_sensitive: Option<bool>,
    autosave_quick: Option<bool>,
    pinned_ids: Option<Vec<String>>,
    lang: Option<String>,
    block_while_captured: Option<bool>,
    show_postfix_in_list: Option<bool>,
    viewer_prompt_timeout_seconds: Option<u32>,
    output_clear_seconds: Option<u32>,
    copy_on_console_generate: Option<bool>,
    hold_only_reveal: Option<bool>,
    clear_clipboard_on_blur: Option<bool>,
) -> Result<config::Prefs, ApiError> {
    let mut p = config::read_prefs();
    if let Some(dm) = default_method { p.default_method = dm; }
    if let Some(sec) = auto_clear_seconds { p.auto_clear_seconds = sec; }
    if let Some(ms) = mask_sensitive { p.mask_sensitive = ms; }
    if let Some(aq) = autosave_quick { p.autosave_quick = aq; }
    if let Some(pi) = pinned_ids { p.pinned_ids = pi; }
    if let Some(l) = lang { p.lang = l; }
    if let Some(b) = block_while_captured { p.block_while_captured = b; }
    if let Some(s) = show_postfix_in_list { p.show_postfix_in_list = s; }
    if let Some(v) = viewer_prompt_timeout_seconds { p.viewer_prompt_timeout_seconds = v; }
    if let Some(o) = output_clear_seconds { p.output_clear_seconds = o; }
    if let Some(c) = copy_on_console_generate { p.copy_on_console_generate = c; }
    if let Some(h) = hold_only_reveal { p.hold_only_reveal = h; }
    if let Some(cb) = clear_clipboard_on_blur { p.clear_clipboard_on_blur = cb; }
    config::write_prefs(&p).map_err(|e| ApiError { message: e.to_string() })?;
    Ok(p)
}

#[tauri::command]
fn dump_entries() -> store::EntriesFile { store::dump_all() }
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

#[tauri::command]
fn list_masters() -> Vec<String> { crypto::list_master_fingerprints() }

#[tauri::command]
fn get_active_fingerprint() -> Option<String> { config::read_prefs().active_fingerprint }

#[tauri::command]
fn set_active_fingerprint(fp: String) -> Result<String, ApiError> {
    let mut p = config::read_prefs();
    p.active_fingerprint = Some(fp.clone());
    config::write_prefs(&p).map_err(|e| ApiError { message: e.to_string() })?;
    Ok(fp)
}

#[tauri::command]
fn delete_master(fp: String) -> Result<bool, ApiError> {
    let deleted = crypto::delete_master(&fp);
    if deleted {
        let mut p = config::read_prefs();
        if p.active_fingerprint.as_deref() == Some(&fp) {
            // pick first remaining, or None
            let list = crypto::list_master_fingerprints();
            p.active_fingerprint = list.into_iter().next();
        }
        let _ = config::write_prefs(&p);
    }
    Ok(deleted)
}

#[tauri::command]
fn bind_unbound_entries() -> Result<usize, ApiError> {
    let p = config::read_prefs();
    let fp = p.active_fingerprint.clone().ok_or(ApiError{ message: "no active master".into() })?;
    Ok(store::bind_unbound_to(&fp))
}
