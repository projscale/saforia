<img src="./src-tauri/icons/icon.svg" alt="Saforia логотип" width="120">

Детерминированный генератор паролей для десктопа и мобильных устройств.

<a href="https://github.com/projscale/saforia/actions">
  <img src="https://img.shields.io/github/actions/workflow/status/projscale/saforia/e2e.yml?style=flat-square&label=CI" alt="Статус сборки">
</a>
<a href="https://github.com/projscale/saforia/releases">
  <img src="https://img.shields.io/github/v/release/projscale/saforia?style=flat-square" alt="Последний релиз">
</a>
<img src="https://img.shields.io/github/license/projscale/saforia?style=flat-square" alt="Лицензия">
<img src="https://img.shields.io/github/stars/projscale/saforia?style=flat-square&color=facc15" alt="Звёзды GitHub">
<img src="https://img.shields.io/badge/stack-Rust%20%2B%20Tauri%20%7C%20React%20%2B%20TS-6366f1?style=flat-square" alt="Стек">

Языки:
<a href="./README.md">English</a> ·
<a href="./README.ru.md">Русский</a> ·
<a href="./README.zh.md">简体中文</a>

---

## Что такое Saforia?

Saforia — детерминированный генератор и менеджер паролей:

- Один мастер‑пароль, который хранится только в зашифрованном виде под viewer‑паролем.
- Для каждого сервиса задаётся постфикс и метод генерации, определяющие финальный пароль.
- Десктопное приложение на Tauri с лаконичным UI.
- Резервные копии в формате `.safe` (шифрованный JSON) и экспорт/импорт CSV для миграции (подробности — в разделе «How it works» внутри приложения).

Все вычисления выполняются локально, без отправки секретов на сторонние серверы.

---

## Быстрый старт

### Запуск в режиме разработки

```bash
npm install
npm run dev        # веб‑сервер разработки
npm run tauri:dev  # десктоп через Tauri
```

Для браузера можно открыть:

```text
http://localhost:5173/?test=1
```

— так можно быстро потыкать UI с mock‑бэкендом без запуска нативного Rust.

### Сборка

```bash
npm run build        # production‑сборка веб‑части
npm run tauri:build  # пакет десктопного приложения
```

Мобильные сборки (после настройки Tauri mobile):

```bash
npm run mobile:android
npm run mobile:ios
```

---

## Основные возможности

- Детерминированная генерация паролей по современным и legacy‑методам.
- Мастер‑пароль хранится только в шифрованном виде (Argon2id + ChaCha20‑Poly1305).
- Viewer‑пароль используется только локально для расшифровки мастера и не сохраняется.
- Сохранённые записи по профилям мастера с drag‑and‑drop‑упорядочиванием.
- Резервное копирование:
  - `.safe`‑архивы для шифрованных структурированных бэкапов,
  - CSV‑экспорт/импорт для разовых миграций и интеграций.

Детальное описание алгоритмов, формата `.safe` и CSV приведено в разделе **How it works** в самом приложении.
