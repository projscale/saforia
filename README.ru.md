<img src="./src-tauri/icons/icon.svg" alt="Saforia логотип" width="120">

Детерминированный генератор паролей для десктопа и мобильных устройств.

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
- Резервные копии в формате `.safe` (шифрованный архив) и экспорт/импорт CSV для миграции (подробности — в разделе «How it works» внутри приложения).

Все вычисления выполняются локально, без отправки секретов на сторонние серверы.

---

## Быстрый старт

### Разработка

```bash
npm install
npm run dev        # веб‑сервер разработки
npm run tauri:dev  # десктоп через Tauri
```

Для браузера можно открыть `http://localhost:5173/?test=1`, чтобы быстро потыкать UI с mock‑бэкендом.

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

## CI/CD

- `.github/workflows/ci.yml`: `npm run build` (type check) + `cargo check` для Tauri; на Linux ставятся GTK/WebKit зависимости.
- `.github/workflows/e2e.yml`: Playwright E2E.
- `.github/workflows/release.yml`: собирает Tauri‑бандлы на теги `v*` (macOS/Windows/Linux); при наличии секретов для подписи артефакты подписываются.

## Основные возможности

- Детерминированная генерация паролей по современным и legacy‑методам.
- Мастер‑пароль хранится только в шифрованном виде (Argon2id + ChaCha20‑Poly1305).
- Viewer‑пароль используется только локально для расшифровки мастера и не сохраняется.
- Сохранённые записи по профилям мастера с drag‑and‑drop‑упорядочиванием.
- Бэкапы: `.safe` (шифр) и CSV (миграции).

## Данные и хранение

- По умолчанию: macOS `~/Library/Application Support/Saforia`, Windows `%APPDATA%/Saforia`, Linux `~/.local/share/Saforia`.
- Портативный режим: перед запуском задайте `SAFORIA_DATA_DIR=/путь/к/папке` — все файлы (мастера, postfixes, дефолтные бэкапы) будут там.

## Безопасность

- Viewer‑пароль не сохраняется и используется только для расшифровки мастера в памяти.
- Авто‑очистка буфера обмена по таймеру (настраивается).
- Best‑effort защита от захвата экрана: Windows (SetWindowDisplayAffinity), macOS (NSWindow sharingType=none), Android (FLAG_SECURE), iOS — детект захвата и скрытие чувствительных данных.

## Алгоритмы (кратко)

- Legacy v1: Base64(MD5(master||postfix)) без `=`.
- Legacy v2: Base64(SHA256(master||postfix)) с заменами `=`→`.`, `+`→`-`, `/`→`_`.
- Новые lenXX (alnum/strong): поток из SHA‑256, маппинг в алфавит через rejection sampling.

## Подготовка релизов

- Прогнать `npm run preflight`, `npm run build`, `cargo check`.
- Desktop: `npm run tauri:build`; мобильные: `npm run mobile:android` / `npm run mobile:ios`.
- Подпись/нотаризация: зависит от платформы (см. `release.yml` и документацию Tauri).
