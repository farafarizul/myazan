# Azan Malaysia 🕌

A lightweight **Electron.js** desktop application that displays accurate Islamic prayer times for every state in Malaysia. It runs on **Windows** (x64 / ia32) and can be installed with a one-click NSIS installer.

---

## Features

| Feature | Details |
|---------|---------|
| 🕐 Live clock | Real-time 12-hour clock with Gregorian & Hijri dates |
| 🗺️ 25+ Malaysian zones | All JAKIM zones from WLY (KL) to SWK (Sarawak) |
| 🟢 Current prayer highlight | Active prayer row highlighted in the table |
| ⏱️ Countdown | Live countdown to the next prayer |
| 🔔 Desktop notifications | System notification at each prayer time |
| 📌 System tray | Minimises to tray; tray tooltip shows next prayer |
| 📦 Windows installer | NSIS installer with optional directory selection |
| 🚀 Portable build | Single `.exe` for users who prefer no installation |

Prayer times are calculated locally using the **adhan** library with JAKIM Malaysia parameters:
- Fajr angle: **20°** | Isha angle: **18°** | Madhab: **Shafi**

---

## Requirements

- [Node.js](https://nodejs.org/) ≥ 18
- npm ≥ 9

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/farafarizul/azanmalaysia.git
cd azanmalaysia

# 2. Install dependencies (also generates app icons automatically)
npm install

# 3. Launch in development mode
npm start
```

---

## Building a Windows Installer

```bash
npm run build
```

Output files are placed in the **`dist/`** folder:
- `Azan Malaysia Setup x.x.x.exe` – NSIS installer (x64 + ia32)
- `Azan Malaysia x.x.x.exe` – portable single-file executable (x64)

> **Note:** Building the Windows installer from a non-Windows machine requires
> Wine or a CI pipeline (e.g. GitHub Actions with a `windows-latest` runner).

---

## Project Structure

```
azanmalaysia/
├── main.js              # Electron main process
├── preload.js           # Secure IPC bridge (contextBridge)
├── index.html           # Main window HTML
├── styles.css           # Dark-theme UI styles
├── renderer.js          # Prayer-time calculation & live-clock logic
├── assets/
│   ├── icon.png         # 256×256 app icon
│   ├── tray-icon.png    # 16×16 system-tray icon
│   └── icon.ico         # Windows ICO
├── scripts/
│   └── generate-icons.js  # Regenerate icons (run: node scripts/generate-icons.js)
├── package.json
└── LICENSE
```

---

## License

[MIT](LICENSE) © 2024 farafarizul
