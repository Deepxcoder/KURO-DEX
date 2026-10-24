# KURO-DEX | Glassmorphic Obsidian Analytics Dashboard

A dark minimalist, production-ready web dashboard with real-time file-watching for Obsidian Vault markdown files (`Workout.md` and `todo.md`). Built with **Express**, **Chokidar**, **Server-Sent Events (SSE)**, and a **Glassmorphic Obsidian UI** with smooth view switching between **Gym Analytics** and **Deep Work & Study Tracker**.

---

## 🌟 Key Features

1. **Gym Analytics (`Workout.md`):**
   - Automatically tracks **Weekly Tonnage**, **Volume Density** (kg/min), and **Warmup Consistency**.
   - **Progressive Overload Chart:** Interactive dual-axis Chart.js line graph (Max Weight vs. Total Reps) for all tracked movements (e.g. `WLP`, `DIP`, `Bayesian curl`, `LE`).
   - **Special Rep Scheme Tags:** Instant detection of `Rest-Pause`, `Partial Rep (1')`, `Near-Full (1*)`, `Drop Set`, and `Bodyweight Clusters`.
   - **Dual Card View:** Per-session toggle between **Clean Parsed Card** and **Raw Text Snippet**.
   - **Auto-Categorization:** Inifers muscle splits (Pull/Back, Push/Chest, Legs, Abs, Arms, Shoulders) even when split headings are omitted.

2. **Deep Work & Study Tracker (`todo.md`):**
   - Daily focus rail: Total focus hours today, daily average focus, and overall focus hours.
   - **Subject Leaderboard:** Grouped and normalized focus topics with animated glowing progress bars (e.g. *Node.js Development*, *MongoDB & Database*).
   - **Chronological Session Feed:** Timeline of focus blocks with duration pills (e.g., `Node Course • 90m`).
   - **Interactive Checklist:** Untimed tasks rendered with interactive strikethrough state.

3. **Real-Time Reactive Updates:**
   - Powered by `chokidar` watching your local Obsidian Vault files.
   - Server-Sent Events (`/api/stream`) push updates instantaneously with zero page reloads.
   - Floating header with a real-time connection status pill.

---

## 🚀 Running Locally

From the project root:
```bash
# Start the web server on http://localhost:3000
npm run web:start

# Or run with live file-watcher auto-reload:
npm run web:dev
```

Or from the `web/` directory:
```bash
cd web
npm install
npm start
```

Visit: **`http://localhost:3000`**

---

## 🌐 How to Deploy ONLY the Website on Vercel (Monorepo Setup)

Because your repository contains both the desktop widget and the website in subdirectories, you can configure Vercel to only build and deploy the **`web/`** directory.

### Step-by-Step Vercel Deployment:

1. **Push your changes to GitHub:**
   ```bash
   git add .
   git commit -m "feat: glassmorphic obsidian dashboard & vercel config"
   git push origin main
   ```

2. **Import the Repository in Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and log in.
   - Select your GitHub repository (`Syncer` / `KURO-DEX`).

3. **Configure Root Directory (Crucial Step):**
   - On the **"Configure Project"** screen, locate **Root Directory**.
   - Click **Edit** next to Root Directory and select:
     ```
     web
     ```
   - Click **Continue**.

4. **Build & Development Settings:**
   - **Framework Preset:** Leave as `Other`.
   - **Build Command:** `npm run build` (or leave default).
   - **Output Directory:** `public` (or leave default).
   - **Install Command:** `npm install`.

5. **Deploy:**
   - Click **Deploy**.
   - Vercel will only deploy the `web/` subfolder.

---

### 💡 Vercel Deployment Note: Local Files vs Cloud

- **When running locally:** The app automatically reads and watches your live Obsidian Vault at:
  - `C:\Users\deepx\OneDrive\Documents\Obsidian Vault\Workout.md`
  - `C:\Users\deepx\OneDrive\Documents\Obsidian Vault\Todo's\todo.md`
- **When running on Vercel Cloud:** Because cloud servers cannot access your local Windows C:\ drive, the app automatically falls back to the bundled snapshot data in `web/data/Workout.sample.md` and `web/data/todo.sample.md`, ensuring your online Vercel preview is always fully interactive, visually stunning, and error-free!
- If you ever want Vercel to reflect custom notes, you can either update the sample files in `web/data/` or set environment variables in the Vercel dashboard.

---

## 📂 Directory Structure

```
web/
├── api/
│   └── index.js              # Vercel Serverless Function entrypoint
├── data/
│   ├── Workout.sample.md     # Snapshot sample for cloud/demo fallback
│   └── todo.sample.md        # Snapshot sample for cloud/demo fallback
├── parsers/
│   ├── gymParser.js          # Grammar parser for reps, clusters, drop sets
│   ├── workParser.js         # Grammar parser for pomodoros, topics, todos
│   └── test-parsers.js       # Test runner for validating parser grammar
├── public/
│   ├── css/
│   │   └── dashboard.css     # Obsidian glassmorphic design system tokens
│   ├── js/
│   │   ├── app.js            # Main controller, SSE subscriber, state
│   │   ├── gymView.js        # Gym KPIs, Chart.js overload graph, cards
│   │   └── workView.js       # Focus metrics rail, topic leaderboard, todo
│   └── index.html            # Dark minimalist glassmorphic SPA
├── package.json              # Web dependencies & scripts
├── server.js                 # Express server + chokidar watcher + SSE stream
├── vercel.json               # Vercel route rewrites & static asset config
└── README.md                 # Deployment & setup documentation
```
