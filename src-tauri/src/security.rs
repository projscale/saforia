#![allow(unexpected_cfgs)]
use cfg_if::cfg_if;

// Best-effort content protection per-platform.
// Not guaranteed to block all capture on all display servers.

cfg_if! {
    if #[cfg(target_os = "windows")] {
        use windows_sys::Win32::{UI::WindowsAndMessaging::*, Foundation::HWND};
        pub fn enable_content_protection_windows(window: &tauri::Window) -> bool {
            if let Ok(raw) = window.hwnd() {
                unsafe { SetWindowDisplayAffinity(raw.0 as HWND, WDA_MONITOR) != 0 }
            } else {
                false
            }
        }
    } else if #[cfg(target_os = "macos")] {
        use objc::{msg_send, sel, sel_impl};
        use objc::runtime::Object;
        pub fn enable_content_protection_macos(window: &tauri::Window) -> bool {
            if let Ok(ns) = window.ns_window() {
                unsafe {
                    let win: *mut Object = ns as _;
                    let _: () = msg_send![win, setSharingType: 0u64];
                }
                return true;
            }
            false
        }
    } else if #[cfg(target_os = "android")] {
        use jni::objects::JValue;
        use jni::JNIEnv;
        use ndk_context::android_context;

        pub fn enable_content_protection_android() -> bool {
            // Add WindowManager.LayoutParams.FLAG_SECURE to Activity window
            let ctx = android_context();
            if ctx.vm().is_null() || ctx.activity().is_null() { return false; }
            let jvm = unsafe { jni::JavaVM::from_raw(ctx.vm() as *mut _) };
            if let Ok(jvm) = jvm {
                if let Ok(mut env) = jvm.attach_current_thread() {
                    unsafe {
                        let activity = jni::objects::JObject::from_raw(ctx.activity() as jni::sys::jobject);
                        let window = env.call_method(activity, "getWindow", "()Landroid/view/Window;", &[]);
                        if let Ok(w) = window {
                            let window_obj = w.l().unwrap();
                            let lp_cls = env.find_class("android/view/WindowManager$LayoutParams").unwrap();
                            let flag_secure = env.get_static_field(lp_cls, "FLAG_SECURE", "I").unwrap().i().unwrap();
                            let _ = env.call_method(window_obj, "addFlags", "(I)V", &[JValue::from(flag_secure)]);
                            return true;
                        }
                    }
                }
            }
            false
        }
    } else if #[cfg(target_os = "ios")] {
        // iOS has no direct equivalent of FLAG_SECURE; we can detect capture
        // and hide/blur sensitive content at the UI layer.
        pub fn enable_content_protection_ios() -> bool { false }

        use objc::{class, msg_send, sel, sel_impl};
        use objc::runtime::Object;
        pub fn is_screen_captured_ios() -> bool {
            unsafe {
                let cls = class!(UIScreen);
                if cls.is_null() { return false; }
                let screen: *mut Object = msg_send![cls, mainScreen];
                let captured: bool = msg_send![screen, isCaptured];
                captured
            }
        }
    } else {
        pub fn enable_content_protection_noop() -> bool { false }
        pub fn enable_content_protection_windows(_window: &tauri::Window) -> bool { false }
        pub fn enable_content_protection_macos(_window: &tauri::Window) -> bool { false }
    }
}
