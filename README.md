```markdown
# KuroDex (黒Dex)
> A privacy-first, local telemetry pipeline, gaming HUD overlay, and autonomous AI accountability agent.

---

## ⚡ Overview

**KuroDex** is a fully offline, self-hosted productivity ecosystem built to eliminate procrastination through objective data collection. 

Traditional productivity systems fail because they rely on self-reporting and willpower. KuroDex passively logs hardware activity across PC and mobile, cross-references physical performance metrics, and pairs an always-on-top desktop gaming HUD with an autonomous local AI coach that intervenes when you lose momentum.

---

## 🏗️ Architecture


```

[Phone Tracker / Gym Logs] ---> Syncthing / Local Sync ---> Vault Inbox
|
[PC Background Daemon] ------------------------------------>   v
[Obsidian Vault] <--- [Local LLM / Ollama]
[Poké-Pomo & Task Dex] <--- Electron IPC ----------->          |                 |
^                                                     v                 v
[Widget Manager (Tray)]                                 Daily Notes      Agent Directives

```

* **HUD Layer:** A frameless, transparent Electron overlay ("Poké-Pomo & Task Dex") with dynamic skins, bound task timers, and instant Obsidian logging.
* **Tray Manager:** A lightweight desktop daemon monitoring real-time CPU/RAM footprints and handling widget state toggles.
* **Telemetry Daemons:** Silent background daemons collecting active window titles, idle states, and mobile screen usage into newline-delimited JSON (`.jsonl`).
* **The Overseer:** A local Python agent querying an on-device LLM via Ollama to detect focus gaps and write actionable directives into daily notes.
* **Unified Vault:** Markdown notes powered by YAML frontmatter, readable by both human eyes and machine parsers.

---

## 📂 Vault Directory Structure

```text
KuroDex_Vault/
├── 00_Agent/
│   ├── _Inbox/            # Raw JSONL telemetry from PC & Phone
│   ├── _Processing/       # Staging area for agent aggregation
│   └── _Gym_Logs/         # Synced mobile workout Markdown/YAML files
├── 01_Daily/              # Daily Markdown notes (YYYY-MM-DD.md)
└── Scripts/               # Daemons, bridge scripts, and Ollama configs

```

---

## 🛠️ Tech Stack

* **Desktop Application:** Electron, HTML5, CSS3, Vanilla JavaScript
* **Operating System Daemons:** Python (`psutil`, `pygetwindow`, `pynput`)
* **Mobile Automation:** MacroDroid / Tasker
* **Database & File Store:** Obsidian (Markdown, YAML Frontmatter, Dataview)
* **Inference Engine:** Ollama (Qwen / Gemma local models)
* **Synchronization:** Syncthing / Local Storage

---

## 🚀 Installation & Setup

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v18+)
* [Python](https://www.python.org/) (3.10+)
* [Ollama](https://ollama.com/) running locally
* [Obsidian](https://obsidian.md/)

### 2. Electron Widget & Manager

```bash
# Navigate to the widget directory
cd src/widget

# Install dependencies
npm install electron --save-dev

# Launch the widget and manager
npm start

```

### 3. PC Telemetry Daemon

```bash
# Navigate to scripts directory
cd src/scripts

# Install required Python modules
pip install psutil pygetwindow pynput requests

# Run the background logger
python pc_logger.py

```

### 4. Running the Agent Interrupter

```bash
# Ensure Ollama is running your target model
ollama run qwen2.5-coder:latest

# Trigger the agent evaluation loop
python agent_bridge.py

```

---

## 📝 Daily Note Protocol

Each day, `01_Daily/YYYY-MM-DD.md` accumulates structured metrics:

```markdown
---
date: 2026-09-07
energy_level: high
procrastination_score: 1
---

## 🎯 Active Tasks
- [x] Train push session to failure
- [ ] Implement Electron tray IPC bridge
- [ ] Review daily telemetry logs

## ⏱️ Focus Sessions
- [x] **IPC Bridge Setup** — Focused for 45m (Completed at 14:30)
- [x] **Agent Debugging** — Finished early: 20m / 45m target (Completed at 15:15)

## 🏋️ Physical & Telemetry
**Gym Session:**
- Routine: Push Hypertrophy
- Fuel: High-protein vegetarian (Whey-free)

**System Telemetry:**
- Active Time: 5h 10m
- Top Process: VS Code (3h 40m)

---

## 🧠 Agent Directives
- **Observation:** 25-minute gap detected between focus sessions with browser in foreground.
- **Next Action:** Close non-essential tabs. Begin next 45-minute block on IPC handlers immediately.

```

---

## 🔒 Privacy & Offline Autonomy

KuroDex operates strictly on local hardware. No activity logs, screen metrics, or health data leave your personal local network. All model inferences execute on-device through Ollama.

```

```
