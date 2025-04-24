<p align="center">
  <img src="./src-tauri/icons/icon.svg" alt="Saforia 标志" width="120">
</p>

<p align="center">
  面向桌面与移动端的确定性密码生成器。
</p>

<p align="center">
  <a href="https://github.com/projscale/saforia/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/projscale/saforia/e2e.yml?style=flat-square&label=CI" alt="CI 状态">
  </a>
  <a href="https://github.com/projscale/saforia/releases">
    <img src="https://img.shields.io/github/v/release/projscale/saforia?style=flat-square" alt="最新版本">
  </a>
  <img src="https://img.shields.io/github/license/projscale/saforia?style=flat-square" alt="许可证">
  <img src="https://img.shields.io/github/stars/projscale/saforia?style=flat-square&color=facc15" alt="GitHub stars">
  <img src="https://img.shields.io/badge/stack-Rust%20%2B%20Tauri%20%7C%20React%20%2B%20TS-6366f1?style=flat-square" alt="技术栈">
</p>

<p align="center">
  语言:
  <a href="./README.md">English</a> ·
  <a href="./README.ru.md">Русский</a> ·
  <a href="./README.zh.md">简体中文</a>
</p>

---

## Saforia 是什么？

Saforia 是一个确定性密码生成与管理工具：

- 使用单一主密码，并通过 viewer 密码在本地加密保存。
- 每个服务拥有后缀（postfix）与生成方法，决定最终密码。
- 基于 Tauri 的桌面应用，界面简洁、键盘友好。
- 支持 `.safe` 加密备份和 CSV 导入/导出，用于迁移（格式和加密细节可在应用内 “How it works” 查看）。

所有运算和存储均在本地完成，不依赖远程服务器。

---

## 快速开始

### 开发模式运行

```bash
npm install
npm run dev        # 启动 Web 开发服务器
npm run tauri:dev  # 以 Tauri 方式运行桌面应用
```

在浏览器中可以访问：

```text
http://localhost:5173/?test=1
```

在 mock 后端下调试纯前端界面。

### 构建

```bash
npm run build        # 生产环境 Web 构建
npm run tauri:build  # 打包桌面应用
```

移动端构建（需要先配置 Tauri mobile 环境）：

```bash
npm run mobile:android
npm run mobile:ios
```

---

## 主要特性

- 多种确定性密码生成方法（包括兼容历史格式的方案）。
- 主密码仅以加密形式保存（Argon2id + ChaCha20‑Poly1305）。
- Viewer 密码只在本机使用，用于解密主密码，不会持久化。
- 按主密码档案划分的保存列表，支持拖拽排序。
- 备份与迁移：
  - `.safe` 备份文件（加密的结构化数据），
  - CSV 导出/导入（一次性迁移与外部工具集成）。

更多内部工作方式与安全模型，请在应用内的 “How it works / 关于” 页面查看。
