use cfg_if::cfg_if;

// Best-effort content protection per-platform.
// Not guaranteed to block all capture on all display servers.

cfg_if! {
    if #[cfg(target_os = "windows")] {
        use windows_sys::Win32::{UI::WindowsAndMessaging::*, Foundation::HWND};
        pub fn enable_content_protection_for_hwnd(hwnd: isize) -> bool {
            unsafe { SetWindowDisplayAffinity(hwnd as HWND, WDA_MONITOR) != 0 }
        }
    } else if #[cfg(target_os = "macos")] {
        use objc::{class, msg_send, sel, sel_impl};
        use objc::runtime::Object;
        pub fn enable_content_protection_for_nswindow(nswindow: *mut std::ffi::c_void) -> bool {
            // NSWindowSharingNone = 0 per AppKit
            unsafe {
                let win: *mut Object = nswindow as _;
                let _: () = msg_send![win, setSharingType: 0u64];
            }
            true
        }
    } else {
        pub fn enable_content_protection_noop() -> bool { false }
    }
}

