# Copilot Instructions for myAzan

## Project Goal
Build **myAzan**, an **Electron.js desktop app** for **Windows 10/11**.

This app must:
- use **Bahasa Melayu** for all user-facing UI,
- play **azan automatically** based on JAKIM prayer times,
- support **offline operation** after yearly prayer data is downloaded and cached locally,
- run reliably for **long periods** on a mini PC.

## Core Rules
- Use **TypeScript**.
- Use **SQLite** for local persistence.
- Keep logic **modular** and separate from UI.
- Follow **Electron security best practices**.
- Prefer **clear, maintainable code** over clever shortcuts.

## Prayer Time Rules
- Source prayer times from JAKIM yearly API:
  `https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&period=year&zone={zone}`
- Cache prayer times by **zone** and **year**.
- Reuse cached data when available.
- On app startup, check whether the selected zone and current year already exist locally.
- On **year rollover**, download new yearly data only if not already cached.
- The app must continue working **without internet** if local data exists.

## Zone Rules
- Store all supported JAKIM zones in SQLite.
- Users can change zone in Settings.
- Do not redownload prayer data for a zone/year that already exists locally.

## Audio Rules
Use **3 separate audio players**:
1. `azanPlayer`
2. `notificationPlayer`
3. `idlePlayer` for Quran/zikir

Priority order:
1. **Azan**
2. **Notification**
3. **Idle audio**

Behavior:
- Idle audio plays continuously when the app is idle.
- When notification starts, idle audio must pause or stop.
- When azan starts, it must override notification and idle audio immediately.
- After azan or notification finishes, idle audio should resume safely.

## Azan Rules
- Monitor time continuously.
- Play azan when prayer time starts.
- Support two azan files:
  - **Subuh**
  - **Selain Subuh**

## Notification Rules
- Support notification playback **X minutes before** configured times.
- Allow separate MP3 selection and enable/disable per time:
  - imsak
  - fajr/subuh
  - syuruk
  - dhuha
  - zohor/dhuhr
  - asar
  - maghrib
  - isyak/isha
- Never trigger the same event more than once per day.

## Idle Audio Rules
- Users choose a folder of MP3 files.
- Play files in **filename order**.
- Loop back to the first file after the last file ends.
- Pause/stop idle audio when azan or notification needs playback.
- Idle playback can be enabled or disabled in Settings.

## Architecture Expectations
Prefer this separation:
- `main/` for app bootstrap, services, database, scheduler, audio, IPC
- `preload/` for safe API exposure
- `renderer/` for UI only
- `shared/` for types/constants

Recommended modules:
- bootstrap
- database
- settings
- zones
- prayer-time-sync
- scheduler
- audio-engine
- about-page

## Database Expectations
Use SQLite tables for:
- `zones`
- `settings`
- `prayer_times`
- `audio_settings`
- `notification_settings`
- `trigger_log` or equivalent

Store only **file paths** and **folder paths**, not MP3 binary data.

## UI Rules
- All labels, messages, buttons, and settings text must be in **Bahasa Melayu**.
- Keep UI simple for non-technical users.
- Include a **Tentang Pembangun** page.

About page must show:
- **Fara Farizul**
- **farxpeace@gmail.com**
- **+60137974467**
- short project objective
- proprietary software notice

## Coding Rules
- Do not mix renderer UI with database or system logic.
- Do not hardcode prayer times.
- Do not duplicate business logic.
- Use `async/await` for async flows.
- Validate API responses before saving.
- Validate file paths before playback.
- Handle missing files and network failures gracefully.
- Use deterministic scheduling logic.
- Write code that is easy to test and maintain.

## Avoid
- One shared player for all audio
- English UI text unless explicitly requested
- Hidden side effects in scheduler logic
- Repeated daily triggers for the same event
- Tight coupling between UI and system services
