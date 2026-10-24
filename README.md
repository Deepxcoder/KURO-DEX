# KURO-DEX (黒Dex) // Monorepo Architecture
> A privacy-first, local telemetry pipeline, desktop gaming HUD overlay, workout web player, and autonomous productivity ecosystem.

---

## ⚡ Overview

**KuroDex** is a fully offline, self-hosted productivity and biometric ecosystem built to eliminate friction and track deep work objectively.

KuroDex pairs an always-on-top desktop gaming HUD with a workout biometric web player, real-time Obsidian analytics dashboard, and local automation scripts.

```
Syncer/
├── widget/          # Standalone Desktop Electron HUD (Poké-Pomo & Task Dex)
├── web-player/      # Next.js 15 Workout Web Player & Cyberpunk Biometric HUD
├── website/         # Glassmorphic Obsidian Analytics Dashboard Website (Express + SSE)
└── vault/           # Obsidian Vault Structure, Automation Scripts & Daily Notes
```

---

## 📂 Subsystems & Directories

### 1. 🖥️ `widget/` (Desktop HUD)
- **Role:** Always-on-top / pinned-to-desktop productivity timer and daily note task tracker ("Poké-Pomo & Task Dex").
- **Stack:** Electron, Vanilla JS, CSS, Python ctypes desktop-pinning.
- **Assets:** `widget/assets/` (`icon.ico`, `icon.png`).
- **Run:** `npm run widget` or `npm --prefix widget start`

### 2. ⚡ `web-player/` (Workout Web Player & Biometric HUD)
- **Role:** Interactive training analytics, kinetic muscle biometric skeleton, volume graphs, and direct vault sync for `Workout.md`.
- **Stack:** Next.js 15, React 19, Tailwind CSS v4, Lucide Icons, TypeScript.
- **Assets:** `web-player/public/` (`icon.png`).
- **Run Dev:** `npm run player` (runs on `http://localhost:3000`)
- **Run Production:** `npm run player:build && npm run player:start`

### 3. 🌐 `website/` (Obsidian Analytics Dashboard)
- **Role:** Glassmorphic analytics web dashboard with real-time `chokidar` file-watching, Server-Sent Events (SSE), and Vercel serverless support.
- **Stack:** Express, Chart.js, Vanilla CSS Glassmorphism, SSE.
- **Assets:** `website/public/` (`css/dashboard.css`, `js/app.js`, `js/gymView.js`, `js/workView.js`, `index.html`, `icon.png`).
- **Run:** `npm run website`

### 4. 📓 `vault/` (Obsidian Vault Automation)
- **Role:** Local daily notes, AI inbox queues, and automation utilities.
- **Subdirectories:**
  - `vault/00_Agent/`: Vault processing pipelines (`_Gym_Logs`, `_Inbox`, `_Processing`).
  - `vault/01_Daily/`: Daily markdown journals (`2026-09-06.md`, etc.).
  - `vault/Scripts/`: Python activity loggers (`pc_logger.py`, `setup_vault_structure.py`, `attach_to_desktop.py`).

---

## 🚀 Quick Commands

| Action | Command |
| :--- | :--- |
| **Launch Desktop Widget** | `npm run widget` |
| **Start Workout Web Player (Dev)** | `npm run player` |
| **Start Workout Web Player (Prod)** | `npm run player:start` |
| **Build Web Player** | `npm run player:build` |
| **Start Analytics Website** | `npm run website` |

---

## 🔒 Privacy & Offline Autonomy

KuroDex operates strictly on local hardware. No activity logs, screen metrics, or health data leave your personal local network. All model inferences execute on-device through Ollama.
