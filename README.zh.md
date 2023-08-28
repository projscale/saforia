# Saforia

基于主密码的确定性密码生成器：每个网站/服务的密码由“主密码 + 后缀”生成。主密码仅以加密形式保存在磁盘上，加密密钥为独立的 viewer 密码——可在公众场合输入而不泄露主密码。

状态：早期脚手架。跨平台（Tauri 2）应用，Rust 后端 + React/Vite 前端。

## 核心概念
- 单个主密码（从不明文存储），使用 Argon2id + ChaCha20‑Poly1305 以 viewer 密码加密存储。Web/mock 开发模式同样使用 viewer 密码加密主密码：在安全上下文（localhost/https）优先使用 WebCrypto 的 AES‑GCM，在不安全上下文（如 host.docker.internal）下采用仅限开发的密钥流回退方案（带完整性标签），确保不会以明文保存主密码。
- 每个服务保存一个后缀（postfix），并为其选择一种生成方法。
- 确定性生成：对 `master + postfix` 进行哈希并映射到目标字符集。
- 兼容旧格式：支持两个历史格式（v1 MD5+B64，v2 SHA256+URL‑B64）。
- 新方法：10/20/36 位，支持“仅字母数字”和“包含符号”。默认：36 位 + 符号。
- 安全：默认隐藏、点击复制、自动清除；尽力阻止屏幕录制（Windows/macOS）。
  - Android：启用 FLAG_SECURE 以禁止截图/录屏。
  - iOS：检测到录屏时显示遮罩并禁用敏感操作（查看/复制）。
  - 可选剪贴板自动清除：复制后在指定延迟清空系统剪贴板。

## 使用
- 首次运行：设置主密码与 viewer 密码。主密码会用 viewer 密码加密后保存在磁盘。
- 统一视图：
  - 顶部：搜索 — 输入即过滤保存的条目。
  - 中部：可滚动的保存列表（名称 • 方法徽章 • 后缀）。点击 Generate 会弹出 viewer 提示并复制结果。
  - 底部：控制台 — 输入后缀、选择方法、点击 Generate（viewer 提示）。启用“保存该后缀”以立即写入保存列表。
 - 偏好设置：选择默认生成方法，用于快速生成和新条目。
 - 偏好设置：在 Linux/Wayland 上可启用“隐藏敏感内容”，在录屏不可可靠阻止的平台保持内容遮蔽。
 - 备份：导出/导入后缀（JSON）；可选口令加密（Argon2id + ChaCha20‑Poly1305）。
 - 剪贴板：设置自动清除（秒，0 = 关闭）。复制后在延迟到期时清空剪贴板。
 - 按住显示：长按“显示”按钮以短暂显示生成的密码，松开后立即隐藏。

## 构建（桌面）
- 需要：Node 18+、Rust stable、Tauri 2。
- 安装依赖：`npm install`
- 生成图标：`npm run tauri:icons`（源文件 `src-tauri/icons/icon.svg`）
- 开发：`npm run tauri:dev`
- 构建：`npm run tauri:build`

平台说明：
- macOS：安装 Xcode CLT；分发需要代码签名与公证。
- Windows：安装 Visual Studio Build Tools（C++ 组件）。
- Linux：安装系统依赖（GTK/WebKit，参考 Tauri 文档）。

## 构建（移动端）
- iOS：Xcode + Rust 目标；`tauri build` 后打开工程。
- Android：Android Studio；安装 NDK 和相应 Rust 目标（如 `aarch64-linux-android`）。

移动端额外配置（安全标志、签名等）将逐步补充。

图标
- 编辑 `src-tauri/icons/icon.svg`，运行 `npm run tauri:icons` 生成各平台图标到 `src-tauri/icons/`，供打包使用。

## 发行前检查表
- 运行 `npm run preflight`（检查旧格式输出与图标资源存在）。
- 验证 UI 行为：
  - 每次生成均要求输入 viewer 密码；调用后不在内存保留。
  - 快速生成与保存条目在会话之间保持一致输出。
  - 剪贴板自动清除按设置延迟工作。
  - Windows/macOS：内容保护启用；尝试录制时窗口受保护。
  - Android：截图/录屏被阻止（FLAG_SECURE）。
  - iOS：检测到捕获时显示遮罩并禁用敏感操作。
- 构建：
  - Desktop: `npm run tauri:build`
  - Android: `npm run mobile:android`
  - iOS: `npm run mobile:ios`
- 签名/公证：参见 `RELEASE.md`。

## 开发/测试
- 模拟 UI：运行 `npm run dev`，打开 `http://localhost:5173/?test=1`，在 DevTools 中执行 `window.SAFORIA_MOCK = true`。测试面板可在无 Rust 后端的情况下生成 v1/v2。

## 多主密码（Profiles）
- 可保存多个主密码（每个使用其对应的 viewer 密码加密）。每个主密码以其指纹（fingerprint）标识。
- 顶部右侧切换器：
  - 显示当前指纹；可切换（Use）、新增（Add Master…）或删除（Del）。
  - 保存条目与当前指纹绑定（旧条目未绑定指纹时兼容显示）。

## CSV 备份与导入
- 导出 CSV：每条记录一行 — “fingerprint,label,postfix,method_id,created_at,id”。
- 预览导入：显示导入指纹及数量；将本地指纹拖到导入目标上进行映射，或拖到 “Ignore” 忽略。
- 应用导入：忽略的不会导入；其余按映射目标导入（Overwrite 替换，否则合并）。

CSV 示例（表头 + 一条记录）：
```
fingerprint,label,postfix,method_id,created_at,id
9f86d081884c7d659a2feaa0c55ad015,Example,example.com,len36_strong,1730900000,1730900000-abcdef01
```

## 安全说明
- viewer 密码不会持久化；每次生成都会临时请求。
- KDF：Argon2id（桌面/移动参数）+ ChaCha20‑Poly1305。
- 剪贴板仅在用户点击复制时写入；UI 中约 30 秒后清除显示。
- 屏幕录制防护：尽力而为（Windows SetWindowDisplayAffinity、macOS NSWindow sharingType）。Android/iOS 方案将随后加入（FLAG_SECURE/捕获检测）。
  - iOS：原生捕获检测会触发 `screen_capture_changed` 事件；激活时禁用敏感操作并显示遮罩层。
  - Linux/Wayland：全局阻止录屏并不总是可靠；可在偏好设置中启用“隐藏敏感内容”（Wayland 默认开启）。

## 算法
- Legacy v1：`Base64(MD5(master||postfix))`，去掉 `=`。
- Legacy v2：`Base64(SHA256(master||postfix))`，并替换 `=`→`.`、`+`→`-`、`/`→`_`。
- 新方法（len10/20/36，alnum/strong）：对 `master||"::"||postfix||"::"||method_id` 反复 SHA‑256，使用拒绝采样映射到字符集，避免偏差。

兼容性验证（legacy）：参见 `references/password-store/manager.py` 的 `readv1` 与 `read` 命令。
快速校验（Node）：`npm run check:legacy` 输出示例的 v1/v2；自定义输入：`npm run check:legacy -- <master> <postfix>`。

## 目录结构
- `src/`：React + Vite UI。
- `src-tauri/`：Rust（Tauri 2），包含加密/生成/存储模块。
- `references/`：旧版脚本（兼容格式）。

## 数据位置
- 应用数据目录遵循各平台约定（如 macOS `~/Library/Application Support/Saforia`，Windows `%APPDATA%/Saforia`，Linux `~/.local/share/Saforia`）。
- 文件：`master.enc`、`postfixes.json`、`config.json`。
- 诊断命令：`storage_paths`（Tauri invoke）返回应用数据目录与 master 文件路径。

## 计划
- 完成移动端屏幕录制防护与剪贴板集成。
- 导入/导出后缀列表（可选加密归档）。
- UI 中显示主密码指纹（fingerprint）。
- 强化发布配置（禁用 devtools、收紧 CSP 等）。

该文档将随每次迭代更新。
## 签名与公证（概览）
- macOS：使用 Developer ID Application 证书签名，并通过 `notarytool` 公证；可在钥匙串或环境变量配置凭据。
- Windows：使用 `signtool.exe` 对 MSI/EXE 进行签名（建议 EV 证书），配置时间戳服务器 `/tr`。
- Android：配置 keystore 与 Gradle 签名（Tauri mobile）。
- iOS：在 Xcode 中配置签名身份与描述文件；确保 bundle identifier 一致。
