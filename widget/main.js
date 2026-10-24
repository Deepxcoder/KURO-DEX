/**
 * Electron Main Process (widget/main.js)
 * Poké-Pomo & Task Dex — Standalone Desktop Productivity App
 */

const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, spawn } = require('child_process');

// Single instance lock to prevent duplicate ghost processes
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
} else {
    app.on('second-instance', () => {
        if (widgetWindow && !widgetWindow.isDestroyed()) {
            if (!widgetWindow.isVisible()) widgetWindow.show();
            widgetWindow.focus();
        }
    });
}

// Establish Windows Application Identity
app.name = 'Poké-Pomo & Task Dex';
if (process.platform === 'win32') {
    app.setAppUserModelId('com.deepx.pokepomo');
}

let widgetWindow = null;
let managerWindow = null;
let tray = null;
let isQuitting = false;
let metricsInterval = null;
let currentTheme = 'charizard';

// ==========================================
// 1. CONFIGURATION & RUNTIME STATE
// ==========================================

const CONFIG_FILE = path.join(app.getPath('userData'), 'kurodex_config.json');

function findConfigPath() {
    const candidatePaths = [
        path.join(__dirname, 'config.json'),
        path.join(__dirname, '..', 'vault', 'Scripts', 'config.json'),
        path.join(__dirname, '..', 'Scripts', 'config.json'),
        path.join(process.cwd(), 'vault', 'Scripts', 'config.json'),
        path.join(process.cwd(), 'Scripts', 'config.json'),
        path.join(process.cwd(), 'config.json')
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (parsed.pinnedToDesktop !== undefined) isPinnedToDesktop = !!parsed.pinnedToDesktop;
                if (parsed.alwaysOnTop !== undefined) isAlwaysOnTop = !!parsed.alwaysOnTop;
                if (parsed.theme) currentTheme = parsed.theme;
                return parsed;
            }
        }
    } catch (err) {
        console.error('Error reading config:', err);
    }

    // Fallback: check legacy config paths
    const legacyPath = findConfigPath();
    if (legacyPath) {
        try {
            const parsed = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
            let mdPath = '';
            if (parsed.paths && parsed.paths.daily_notes) {
                const dir = path.resolve(parsed.paths.daily_notes);
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                const todayFile = path.join(dir, `${yyyy}-${mm}-${dd}.md`);
                if (fs.existsSync(todayFile)) mdPath = todayFile;
            }
            if (!mdPath && parsed.paths && parsed.paths.todo_folder) {
                const todoFile = path.join(path.resolve(parsed.paths.todo_folder), 'todo.md');
                if (fs.existsSync(todoFile)) mdPath = todoFile;
            }
            if (mdPath) return { mdPath };
        } catch (e) {}
    }

    return { mdPath: '' };
}

function saveConfig(cfg) {
    try {
        const userDataDir = app.getPath('userData');
        if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
        }
        let existing = {};
        if (fs.existsSync(CONFIG_FILE)) {
            try {
                existing = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) || {};
            } catch (e) {}
        }
        const updated = {
            ...existing,
            ...cfg,
            pinnedToDesktop: isPinnedToDesktop,
            alwaysOnTop: isAlwaysOnTop,
            theme: currentTheme
        };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error saving config:', err);
    }
}

function resolveObsidianDailyDir() {
    try {
        const configPath = findConfigPath();
        if (configPath) {
            const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (parsed.paths && parsed.paths.daily_notes) {
                const dir = path.resolve(parsed.paths.daily_notes);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                return dir;
            }
            if (parsed.vault_path) {
                const dir = path.join(parsed.vault_path, '01_Daily');
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                return dir;
            }
        }
    } catch (err) {
        console.warn('[Config Error] Could not read daily notes path:', err.message);
    }

    if (!app.isPackaged) {
        const vaultDaily = path.join(__dirname, '..', 'vault', '01_Daily');
        if (fs.existsSync(vaultDaily)) return vaultDaily;
        const parentDaily = path.join(__dirname, '..', '01_Daily');
        if (fs.existsSync(parentDaily)) return parentDaily;
        const localDaily = path.join(__dirname, '01_Daily');
        if (fs.existsSync(localDaily)) return localDaily;
    }

    const fallback = path.join(app.getPath('userData'), '01_Daily');
    try {
        if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    } catch (e) {
        console.warn('[Daily Dir Error] Could not create fallback daily dir:', e.message);
    }
    return fallback;
}

function resolveObsidianMdPath() {
    const config = loadConfig();
    if (config.mdPath && fs.existsSync(config.mdPath)) {
        return config.mdPath;
    }

    // Daily note fallback
    const dailyDir = resolveObsidianDailyDir();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayFile = path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
    if (fs.existsSync(todayFile)) return todayFile;

    // Parent todo fallback (only outside packaged asar)
    if (!app.isPackaged) {
        const vaultTodo = path.join(__dirname, '..', 'vault', 'todo.md');
        if (fs.existsSync(vaultTodo)) return vaultTodo;
        const parentTodo = path.join(__dirname, '..', 'todo.md');
        if (fs.existsSync(parentTodo)) return parentTodo;
    }

    // Fallback: Default tasks in userData
    const defaultTasks = path.join(app.getPath('userData'), 'Default_Tasks.md');
    if (!fs.existsSync(defaultTasks)) {
        try {
            fs.writeFileSync(defaultTasks, "# Daily\n\n## 🎯 Active Tasks\n- [ ] Example Task 1\n- [ ] Example Task 2\n\n## ⏱️ Focus Sessions\n", 'utf-8');
        } catch (e) {}
    }
    return defaultTasks;
}

// ==========================================
// 1B. LIVE OBSIDIAN DATA PARSER & WATCHER
// ==========================================

let fileWatcher = null;
let isInternalWrite = false;

function readObsidianData(filePath) {
    if (!filePath || !fs.existsSync(filePath)) {
        return { tasks: [], sessions: [], rawPath: filePath || '' };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const tasks = [];
    const sessions = [];

    let inTasksSection = false;
    let inSessionsSection = false;
    let hasExplicitTaskHeader = false;

    // Detect if explicit header exists
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith('## 🎯 Active Tasks') || line.toLowerCase().startsWith('## active tasks') || line.toLowerCase() === '## tasks') {
            hasExplicitTaskHeader = true;
            break;
        }
    }

    const pattern = /\s*(?:\((\d+m)\)\s*at\s*[\d:]+\s*(?:AM|PM)?|\(\d+m(?:\s*at\s*[^)]+)?\))\s*$/i;

    lines.forEach((rawLine, idx) => {
        const line = rawLine.trim();

        if (line.startsWith('## 🎯 Active Tasks') || line.toLowerCase().startsWith('## active tasks') || line.toLowerCase() === '## tasks') {
            inTasksSection = true;
            inSessionsSection = false;
            return;
        } else if (line.startsWith('## ⏱️ Focus Sessions') || line.toLowerCase().startsWith('## focus sessions')) {
            inTasksSection = false;
            inSessionsSection = true;
            return;
        } else if (line.startsWith('## ') || line.startsWith('# ')) {
            inTasksSection = false;
            inSessionsSection = false;
        }

        if (inSessionsSection) {
            if (line.startsWith('- [x]')) {
                sessions.push(line.replace('- [x]', '').trim());
            }
        }

        const isTaskCandidate = hasExplicitTaskHeader ? inTasksSection : !inSessionsSection;
        if (isTaskCandidate) {
            const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
            if (match) {
                const rawText = match[2].trim();
                if (rawText.length > 0) {
                    const baseText = rawText.replace(pattern, '').trim();
                    const tagMatch = rawText.match(/\((\d+m)\)\s*at\s*([\d:]+\s*(?:AM|PM)?)|\((\d+m(?:\s*at\s*[^)]+)?)\)/i);
                    let timeTag = null;
                    if (tagMatch) {
                        timeTag = (tagMatch[1] && tagMatch[2]) ? `${tagMatch[1]} at ${tagMatch[2]}` : (tagMatch[3] || tagMatch[1]);
                    }
                    tasks.push({
                        id: `obsidian-${idx}`,
                        lineIndex: idx,
                        text: baseText,
                        rawText: rawText,
                        timeTag: timeTag,
                        completed: match[1].toLowerCase() === 'x'
                    });
                }
            }
        }
    });

    return { tasks, sessions, rawPath: filePath };
}

function watchFile(filePath) {
    if (fileWatcher) {
        try { fileWatcher.close(); } catch (e) {}
        fileWatcher = null;
    }

    if (filePath && fs.existsSync(filePath)) {
        try {
            fileWatcher = fs.watch(filePath, (eventType) => {
                if (isInternalWrite) return;
                if (eventType === 'change' || eventType === 'rename') {
                    if (!fs.existsSync(filePath)) return;
                    const data = readObsidianData(filePath);
                    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.webContents) {
                        widgetWindow.webContents.send('file-updated', data);
                        widgetWindow.webContents.send('tasks-updated', data.tasks);
                    }
                }
            });
        } catch (err) {
            console.warn('[File Watcher Error]', err.message);
        }
    }
}

async function promptForMdFile() {
    const parentWin = (managerWindow && !managerWindow.isDestroyed() && managerWindow.isVisible())
        ? managerWindow
        : (widgetWindow && !widgetWindow.isDestroyed() ? widgetWindow : null);

    const result = await dialog.showOpenDialog(parentWin || undefined, {
        title: 'Select Daily Note or Master Markdown File',
        properties: ['openFile'],
        filters: [
            { name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const chosenPath = result.filePaths[0];
        const config = loadConfig();
        config.mdPath = chosenPath;
        saveConfig(config);
        watchFile(chosenPath);

        const data = readObsidianData(chosenPath);
        if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.webContents) {
            widgetWindow.webContents.send('file-updated', data);
            widgetWindow.webContents.send('tasks-updated', data.tasks);
        }
        return chosenPath;
    }
    return null;
}

// ==========================================
// 1C. OBSIDIAN WRITERS (Tasks & Sessions)
// ==========================================

let writeQueue = Promise.resolve();

async function appendObsidianSession(payload) {
    writeQueue = writeQueue.then(async () => {
        let filePath = resolveObsidianMdPath();
        if (!filePath) {
            const dailyDir = resolveObsidianDailyDir();
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            filePath = path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);
        }

        const taskName = (payload.task || 'Focus Session').trim();
        const duration = parseInt(payload.duration || 25, 10);
        const target = parseInt(payload.target || 25, 10);
        const isEarly = !!payload.early;
        const timeStr = payload.timestamp || (new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const entry = isEarly
            ? `- [x] **${taskName}** — Finished early: ${duration}m / ${target}m target (Completed at ${timeStr})\n`
            : `- [x] **${taskName}** — Focused for ${duration}m (Completed at ${timeStr})\n`;

        try {
            isInternalWrite = true;
            let content = '';
            if (fs.existsSync(filePath)) {
                content = await fs.promises.readFile(filePath, 'utf8');
            } else {
                content = `# Daily Note\n\n`;
            }

            const headerRegex = /(##\s*⏱️\s*Focus Sessions\s*\n+)/i;
            if (headerRegex.test(content)) {
                content = content.replace(headerRegex, `$1${entry}`);
            } else {
                const trimmed = content.trimEnd();
                content = `${trimmed}\n\n## ⏱️ Focus Sessions\n\n${entry}`;
            }

            await fs.promises.writeFile(filePath, content, 'utf8');
            setTimeout(() => { isInternalWrite = false; }, 600);
            console.log(`[Obsidian Log] Appended: ${entry.trim()} -> ${path.basename(filePath)}`);
            return { success: true, file: filePath, entry: entry.trim() };
        } catch (err) {
            isInternalWrite = false;
            console.error(`[Obsidian Error] Write failed:`, err);
            throw err;
        }
    });

    return writeQueue;
}

async function logPomodoroSession(logString) {
    const filePath = resolveObsidianMdPath();
    if (!filePath) return false;

    try {
        isInternalWrite = true;
        let content = '';
        if (fs.existsSync(filePath)) {
            content = await fs.promises.readFile(filePath, 'utf8');
        } else {
            content = '# Tasks & Sessions\n\n';
        }

        const targetHeader = '## ⏱️ Focus Sessions';
        if (content.includes(targetHeader)) {
            content = content.replace(targetHeader, `${targetHeader}\n${logString}`);
        } else {
            const trimmed = content.trimEnd();
            content = `${trimmed}\n\n${targetHeader}\n${logString}\n`;
        }

        await fs.promises.writeFile(filePath, content, 'utf8');
        setTimeout(() => { isInternalWrite = false; }, 600);
        return true;
    } catch (err) {
        isInternalWrite = false;
        console.error('[Log Session Error]', err);
        return false;
    }
}

async function getObsidianTasks() {
    try {
        const filePath = resolveObsidianMdPath();
        const data = readObsidianData(filePath);
        return data.tasks;
    } catch (err) {
        console.error('[Get Obsidian Tasks Error]', err);
        return [];
    }
}

async function updateObsidianTask(taskPayload) {
    try {
        const filePath = resolveObsidianMdPath();
        if (!filePath || !fs.existsSync(filePath)) return { success: false, error: 'File not found' };
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        let found = false;

        const pattern = /\s*(?:\(\d+m\)\s*at\s*[\d:]+\s*(?:AM|PM)?|\(\d+m(?:\s*at\s*[^)]+)?\))\s*$/i;
        const targetClean = taskPayload.text.replace(pattern, '').trim();

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/^-\s*\[([ xX])\]\s*(.*)$/);
            if (match) {
                const lineClean = match[2].replace(pattern, '').trim();
                if (lineClean === targetClean) {
                    if (taskPayload.completed) {
                        const durationMins = parseInt(taskPayload.duration || 25, 10);
                        const now = new Date();
                        const timeStr = taskPayload.timestamp || now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                        lines[i] = `- [x] ${lineClean} (${durationMins}m) at ${timeStr}`;
                    } else {
                        lines[i] = `- [ ] ${lineClean}`;
                    }
                    found = true;
                    break;
                }
            }
        }

        if (found) {
            isInternalWrite = true;
            await fs.promises.writeFile(filePath, lines.join('\n'), 'utf8');
            setTimeout(() => { isInternalWrite = false; }, 600);
        }
        return { success: true };
    } catch (err) {
        isInternalWrite = false;
        console.error('[Update Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

async function saveTaskCompletion({ taskText, completed }) {
    return await updateObsidianTask({ text: taskText, completed });
}

async function addObsidianTask(taskText) {
    try {
        const filePath = resolveObsidianMdPath();
        if (!filePath) return { success: false, error: 'No file configured' };
        const line = `- [ ] ${taskText.trim()}`;
        isInternalWrite = true;

        let content = '';
        if (fs.existsSync(filePath)) {
            content = await fs.promises.readFile(filePath, 'utf8');
        } else {
            content = '# Tasks\n\n## 🎯 Active Tasks\n';
        }

        const headerRegex = /(##\s*🎯\s*Active Tasks[^\n]*\n)/i;
        if (headerRegex.test(content)) {
            content = content.replace(headerRegex, `$1${line}\n`);
        } else {
            const trimmed = content.trimEnd();
            content = `${trimmed}\n${line}\n`;
        }

        await fs.promises.writeFile(filePath, content, 'utf8');
        setTimeout(() => { isInternalWrite = false; }, 600);
        return { success: true };
    } catch (err) {
        isInternalWrite = false;
        console.error('[Add Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

async function deleteObsidianTask(taskText) {
    try {
        const filePath = resolveObsidianMdPath();
        if (!filePath || !fs.existsSync(filePath)) return { success: false };
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split(/\r?\n/);
        const pattern = /\s*(?:\(\d+m\)\s*at\s*[\d:]+\s*(?:AM|PM)?|\(\d+m(?:\s*at\s*[^)]+)?\))\s*$/i;
        const targetClean = taskText.replace(pattern, '').trim();

        const filtered = lines.filter(l => {
            const match = l.match(/^-\s*\[([ xX])\]\s*(.*)$/);
            if (match) {
                const lineClean = match[2].replace(pattern, '').trim();
                if (lineClean === targetClean) return false;
            }
            return true;
        });

        isInternalWrite = true;
        await fs.promises.writeFile(filePath, filtered.join('\n'), 'utf8');
        setTimeout(() => { isInternalWrite = false; }, 600);
        return { success: true };
    } catch (err) {
        isInternalWrite = false;
        console.error('[Delete Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

// ==========================================
// 2. WINDOW CREATION (Widget & Manager)
// ==========================================

let isUserMinimizing = false;
let isIntentionalHide = false;
let isManagerActionInProgress = false;

let isPinnedToDesktop = false; // Default: Float mode so user sees the widget on start
let isAlwaysOnTop = true;     // Default: Float above all windows so timer is visible

let desktopDaemonProc = null;

function findAttachScript() {
    // In packaged app, extract attach_to_desktop.py out of app.asar into userData so Python can run it
    const userDataScript = path.join(app.getPath('userData'), 'attach_to_desktop.py');
    try {
        const bundledScript = path.join(__dirname, 'attach_to_desktop.py');
        if (fs.existsSync(bundledScript)) {
            const bundledContent = fs.readFileSync(bundledScript, 'utf8');
            let shouldWrite = true;
            if (fs.existsSync(userDataScript)) {
                const existing = fs.readFileSync(userDataScript, 'utf8');
                if (existing === bundledContent) shouldWrite = false;
            }
            if (shouldWrite) {
                fs.writeFileSync(userDataScript, bundledContent, 'utf8');
            }
            return userDataScript;
        }
    } catch (e) {
        console.warn('[Desktop Attach] Error preparing attach_to_desktop.py:', e.message);
    }

    if (fs.existsSync(userDataScript)) return userDataScript;

    const candidatePaths = [
        path.join(process.resourcesPath || '', 'app.asar.unpacked', 'attach_to_desktop.py'),
        path.join(__dirname, 'attach_to_desktop.py'),
        path.join(__dirname, '..', 'Scripts', 'attach_to_desktop.py'),
        path.join(process.cwd(), 'Scripts', 'attach_to_desktop.py'),
        path.join(process.cwd(), 'widget', 'attach_to_desktop.py')
    ];
    for (const p of candidatePaths) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function sendDaemonCommand(cmd) {
    if (desktopDaemonProc && !desktopDaemonProc.killed && desktopDaemonProc.stdin && desktopDaemonProc.stdin.writable) {
        try {
            desktopDaemonProc.stdin.write(`${cmd}\n`);
        } catch (e) {
            console.warn('[Daemon Command Warning]', e.message);
        }
    }
}

function stopDesktopDaemon() {
    if (desktopDaemonProc) {
        sendDaemonCommand('quit');
        try {
            desktopDaemonProc.kill();
        } catch (e) {}
        desktopDaemonProc = null;
    }
}

function startDesktopDaemon(win) {
    if (!win || win.isDestroyed()) return;
    stopDesktopDaemon();
    try {
        const handle = win.getNativeWindowHandle();
        const hwnd = process.arch === 'x64' ? handle.readBigInt64LE(0).toString() : handle.readInt32LE(0).toString();
        const scriptPath = findAttachScript();
        if (!scriptPath) {
            console.warn('[Desktop Attach] attach_to_desktop.py not found');
            return;
        }

        desktopDaemonProc = spawn('python', ['-u', scriptPath, hwnd], {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        });

        sendDaemonCommand(`pin ${isPinnedToDesktop ? 1 : 0}`);
        sendDaemonCommand(`topmost ${isAlwaysOnTop ? 1 : 0}`);

        desktopDaemonProc.on('error', (err) => {
            console.warn('[Desktop Daemon Error]', err.message);
            desktopDaemonProc = null;
        });

        desktopDaemonProc.on('exit', () => {
            desktopDaemonProc = null;
        });
    } catch (e) {
        console.warn('[Desktop Daemon Start Error]', e.message);
    }
}

function attachWidgetToDesktop(win) {
    if (!win || win.isDestroyed()) return;
    if (!desktopDaemonProc) {
        startDesktopDaemon(win);
    } else {
        sendDaemonCommand('pin 1');
    }
}

function detachWidgetFromDesktop(win) {
    sendDaemonCommand('pin 0');
}

function createWidgetWindow() {
    const iconPath = path.join(__dirname, 'icon.ico');
    const config = loadConfig();
    let initialX, initialY;
    if (config.windowPosition && typeof config.windowPosition.x === 'number' && typeof config.windowPosition.y === 'number') {
        initialX = Math.round(config.windowPosition.x);
        initialY = Math.round(config.windowPosition.y);
    }

    widgetWindow = new BrowserWindow({
        title: 'Poké-Pomo & Task Dex',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        width: 385,
        height: 231,
        x: initialX,
        y: initialY,
        frame: false,
        transparent: true,
        alwaysOnTop: isAlwaysOnTop,
        skipTaskbar: isPinnedToDesktop,
        resizable: false,
        minimizable: false,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            backgroundThrottling: false
        }
    });

    if (isAlwaysOnTop) {
        widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    } else {
        widgetWindow.setAlwaysOnTop(false);
    }

    widgetWindow.loadFile(path.join(__dirname, 'widget.html'));

    widgetWindow.once('ready-to-show', () => {
        widgetWindow.show();
        widgetWindow.focus();
        if (isPinnedToDesktop) {
            attachWidgetToDesktop(widgetWindow);
        }
    });

    widgetWindow.on('show', () => {
        if (isPinnedToDesktop) {
            attachWidgetToDesktop(widgetWindow);
        }
    });

    // Protect widget from being minimized during Windows "Show Desktop" (Win+D or 3-finger swipe down)
    widgetWindow.on('minimize', (e) => {
        if (isPinnedToDesktop && !isUserMinimizing && !isIntentionalHide) {
            e.preventDefault();
            widgetWindow.restore();
            widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            widgetWindow.showInactive();
        }
        isUserMinimizing = false;
    });

    widgetWindow.on('hide', () => {
        if (isPinnedToDesktop && !isIntentionalHide) {
            widgetWindow.restore();
            widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            widgetWindow.showInactive();
        }
    });

    widgetWindow.on('restore', () => {
        if (isPinnedToDesktop) {
            attachWidgetToDesktop(widgetWindow);
        }
    });

    widgetWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            isIntentionalHide = true;
            widgetWindow.hide();
            notifyManagerWidgetVisibility();
            setTimeout(() => { isIntentionalHide = false; }, 500);
        }
    });

    widgetWindow.on('closed', () => {
        stopDesktopDaemon();
        widgetWindow = null;
        notifyManagerWidgetVisibility();
    });
}

function createManagerWindow() {
    if (managerWindow && !managerWindow.isDestroyed()) {
        positionManagerWindow();
        managerWindow.show();
        managerWindow.focus();
        return;
    }

    const iconPath = path.join(__dirname, 'icon.ico');
    managerWindow = new BrowserWindow({
        title: 'Task Dex Manager',
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        width: 330,
        height: 420,
        frame: false,
        transparent: true,
        resizable: false,
        skipTaskbar: true,
        show: false,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    managerWindow.loadFile(path.join(__dirname, 'manager.html'));

    managerWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            managerWindow.hide();
        }
    });

    managerWindow.on('closed', () => {
        managerWindow = null;
    });

    managerWindow.on('blur', () => {
        if (isManagerActionInProgress) return;
        setTimeout(() => {
            if (isManagerActionInProgress) return;
            if (managerWindow && !managerWindow.isDestroyed() && managerWindow.isVisible()) {
                if (!managerWindow.isFocused()) {
                    managerWindow.hide();
                }
            }
        }, 200);
    });
}

function positionManagerWindow() {
    if (!managerWindow || managerWindow.isDestroyed()) return;

    let trayBounds = null;
    if (tray) {
        try {
            trayBounds = tray.getBounds();
        } catch (e) {}
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const workArea = primaryDisplay.workArea;

    let x = workArea.x + workArea.width - 340;
    let y = workArea.y + workArea.height - 430;

    if (trayBounds && trayBounds.width > 0) {
        x = Math.round(trayBounds.x + trayBounds.width / 2 - 165);
        y = Math.round(trayBounds.y - 428);

        if (x + 330 > workArea.x + workArea.width) x = workArea.x + workArea.width - 338;
        if (x < workArea.x) x = workArea.x + 8;
        if (y < workArea.y) y = workArea.y + 8;
    }

    managerWindow.setPosition(x, y);
}

function notifyManagerWidgetVisibility() {
    if (managerWindow && !managerWindow.isDestroyed() && managerWindow.webContents) {
        const isVisible = !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
        managerWindow.webContents.send('widget-visibility-changed', isVisible);
    }
}

// ==========================================
// 3. RESOURCE METRICS TELEMETRY (2s interval)
// ==========================================

function collectResourceMetrics() {
    try {
        const metrics = app.getAppMetrics();
        let totalCpu = 0;
        let totalRamKb = 0;

        const widgetPid = (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.webContents)
            ? widgetWindow.webContents.getOSProcessId()
            : null;

        let widgetCpu = 0;
        let widgetRamKb = 0;

        for (const item of metrics) {
            const cpu = Number(item.cpu.percentCPUUsage || 0);
            const ram = Number(item.memory.workingSetSize || 0);
            totalCpu += cpu;
            totalRamKb += ram;

            if (widgetPid && item.pid === widgetPid) {
                widgetCpu = cpu;
                widgetRamKb = ram;
            }
        }

        const totalRamMb = Math.round(totalRamKb / 1024);
        const widgetRamMb = Math.round(widgetRamKb / 1024);

        return {
            totalCpu: Math.round(totalCpu * 10) / 10,
            totalRamMb: totalRamMb,
            totalMem: totalRamMb,
            widgetCpu: Math.round(widgetCpu * 10) / 10,
            widgetRamMb: widgetRamMb,
            widgetMem: widgetRamMb
        };
    } catch (err) {
        console.error('[Telemetry Error]', err);
        return null;
    }
}

function startResourceMonitoring() {
    if (metricsInterval) clearInterval(metricsInterval);
    metricsInterval = setInterval(() => {
        if (managerWindow && !managerWindow.isDestroyed() && managerWindow.isVisible()) {
            const data = collectResourceMetrics();
            if (data && managerWindow.webContents) {
                managerWindow.webContents.send('resource-metrics-update', data);
                managerWindow.webContents.send('metrics-update', data);
            }
        }
    }, 2000);
}

// ==========================================
// 4. SYSTEM TRAY INITIALIZATION
// ==========================================

function setupSystemTray() {
    const iconPath = path.join(__dirname, 'icon.ico');
    let trayIcon;
    if (fs.existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath);
    } else {
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon);
    tray.setToolTip('Poké-Pomo & Task Dex');

    const updateContextMenu = () => {
        const isVisible = !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Open Widget Manager',
                click: () => {
                    if (!managerWindow || managerWindow.isDestroyed()) createManagerWindow();
                    positionManagerWindow();
                    managerWindow.show();
                    managerWindow.focus();
                }
            },
            {
                label: isVisible ? 'Hide Task Dex' : 'Show Task Dex',
                click: () => {
                    if (widgetWindow && !widgetWindow.isDestroyed()) {
                        if (isVisible) widgetWindow.hide();
                        else widgetWindow.show();
                    } else {
                        createWidgetWindow();
                    }
                    notifyManagerWidgetVisibility();
                    updateContextMenu();
                }
            },
            {
                label: 'Change Obsidian Note...',
                click: async () => {
                    await promptForMdFile();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit Poké-Pomo',
                click: () => {
                    isQuitting = true;
                    app.quit();
                }
            }
        ]);
        tray.setContextMenu(contextMenu);
    };

    updateContextMenu();

    tray.on('click', () => {
        if (!managerWindow || managerWindow.isDestroyed()) {
            createManagerWindow();
        }
        if (managerWindow.isVisible()) {
            managerWindow.hide();
        } else {
            positionManagerWindow();
            managerWindow.show();
            managerWindow.focus();
            notifyManagerWidgetVisibility();
            const metrics = collectResourceMetrics();
            if (metrics && managerWindow.webContents) {
                managerWindow.webContents.send('resource-metrics-update', metrics);
                managerWindow.webContents.send('metrics-update', metrics);
            }
        }
    });
}

// ==========================================
// 5. IPC HANDLERS
// ==========================================

// Obsidian Dynamic Path & Data Handlers
ipcMain.handle('get-initial-data', () => {
    return readObsidianData(resolveObsidianMdPath());
});

ipcMain.handle('get-current-path', () => {
    return resolveObsidianMdPath();
});

ipcMain.handle('pick-md-file', async () => {
    return await promptForMdFile();
});

ipcMain.handle('save-task-completion', async (event, payload) => {
    return await saveTaskCompletion(payload);
});

ipcMain.handle('log-pomodoro-session', async (event, logString) => {
    return await logPomodoroSession(logString);
});

// Toggle Desktop Pinning (Stick to Desktop Background)
ipcMain.handle('toggle-desktop-pin', (event, pinned) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);
    isPinnedToDesktop = !!pinned;
    saveConfig({ pinnedToDesktop: isPinnedToDesktop });
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setSkipTaskbar(isPinnedToDesktop);
        if (isPinnedToDesktop) {
            attachWidgetToDesktop(widgetWindow);
        } else {
            detachWidgetFromDesktop(widgetWindow);
        }
    }
    return isPinnedToDesktop;
});

ipcMain.handle('get-desktop-pinned', () => isPinnedToDesktop);

// Toggle Always on Top (Float Above All Windows)
ipcMain.handle('toggle-always-on-top', (event, onTop) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);
    isAlwaysOnTop = !!onTop;
    saveConfig({ alwaysOnTop: isAlwaysOnTop });
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setAlwaysOnTop(isAlwaysOnTop, isAlwaysOnTop ? 'screen-saver' : 'normal');
        sendDaemonCommand(`topmost ${isAlwaysOnTop ? 1 : 0}`);
    }
    return isAlwaysOnTop;
});

ipcMain.handle('get-always-on-top', () => isAlwaysOnTop);

// Backward compatibility aliases
ipcMain.handle('toggle-widget-pin', (event, pinned) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);
    isPinnedToDesktop = !!pinned;
    saveConfig({ pinnedToDesktop: isPinnedToDesktop });
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setSkipTaskbar(isPinnedToDesktop);
        if (isPinnedToDesktop) {
            attachWidgetToDesktop(widgetWindow);
        } else {
            detachWidgetFromDesktop(widgetWindow);
        }
    }
    return isPinnedToDesktop;
});

ipcMain.handle('get-widget-pinned', () => isPinnedToDesktop);

// Toggle Widget Visibility
ipcMain.handle('toggle-widget-visibility', (event, visible) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);

    if (!widgetWindow || widgetWindow.isDestroyed()) {
        if (visible) createWidgetWindow();
    } else {
        if (visible) {
            widgetWindow.show();
            widgetWindow.focus();
            if (isAlwaysOnTop) {
                widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            } else {
                widgetWindow.setAlwaysOnTop(false);
            }
            if (isPinnedToDesktop) attachWidgetToDesktop(widgetWindow);
        } else {
            isIntentionalHide = true;
            widgetWindow.hide();
            setTimeout(() => { isIntentionalHide = false; }, 500);
        }
    }
    notifyManagerWidgetVisibility();
    return !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
});

ipcMain.handle('get-widget-visibility', () => {
    return !!(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
});

// Update Theme across renderers
ipcMain.handle('update-theme', (event, themeName) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);
    currentTheme = themeName || 'charizard';
    saveConfig({ theme: currentTheme });
    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.webContents) {
        widgetWindow.webContents.send('theme-changed', currentTheme);
    }
    return currentTheme;
});

ipcMain.handle('get-current-theme', () => currentTheme);

// Save Session to Obsidian
ipcMain.handle('save-obsidian-session', async (event, payload) => {
    try {
        if (!payload) return { success: false, error: 'No session payload' };
        return await appendObsidianSession(payload);
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// Obsidian Todo's IPC
ipcMain.handle('get-obsidian-tasks', async () => {
    return await getObsidianTasks();
});

ipcMain.handle('update-obsidian-task', async (event, task) => {
    return await updateObsidianTask(task);
});

ipcMain.handle('add-obsidian-task', async (event, text) => {
    return await addObsidianTask(text);
});

ipcMain.handle('delete-obsidian-task', async (event, text) => {
    return await deleteObsidianTask(text);
});

// Window controls
ipcMain.on('widget-minimize', () => {
    isIntentionalHide = true;
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.hide();
        notifyManagerWidgetVisibility();
    }
    setTimeout(() => { isIntentionalHide = false; }, 500);
});

ipcMain.on('widget-close', () => {
    isIntentionalHide = true;
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.hide();
        notifyManagerWidgetVisibility();
    }
    setTimeout(() => { isIntentionalHide = false; }, 500);
});

ipcMain.on('manager-close', () => {
    if (managerWindow && !managerWindow.isDestroyed()) managerWindow.hide();
});

// Window Dragging & Positioning Handlers (both send and invoke supported)
ipcMain.on('move-window-delta', (event, { dx, dy }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        win.setPosition(Math.round(x + (dx || 0)), Math.round(y + (dy || 0)));
    }
});

ipcMain.handle('move-window-delta', (event, { dx, dy }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        const targetX = Math.round(x + (dx || 0));
        const targetY = Math.round(y + (dy || 0));
        win.setPosition(targetX, targetY);
        return { x: targetX, y: targetY };
    }
    return null;
});

ipcMain.handle('set-window-position', (event, { x, y }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        win.setPosition(Math.round(x), Math.round(y));
        return { x: Math.round(x), y: Math.round(y) };
    }
    return null;
});

ipcMain.handle('get-window-position', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        return { x, y };
    }
    return null;
});

ipcMain.handle('save-window-position', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        if (win === widgetWindow) {
            saveConfig({ windowPosition: { x, y } });
        }
        return { x, y };
    }
    return null;
});

// ==========================================
// 6. APP LIFECYCLE
// ==========================================

app.whenReady().then(async () => {
    try {
        let config = loadConfig();

        // If no MD path exists or file missing on first run, verify or fallback smoothly
        if (!config.mdPath || !fs.existsSync(config.mdPath)) {
            const dailyDir = resolveObsidianDailyDir();
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const todayFile = path.join(dailyDir, `${yyyy}-${mm}-${dd}.md`);

            if (fs.existsSync(todayFile)) {
                config.mdPath = todayFile;
            } else {
                const fallback = path.join(app.getPath('userData'), 'Default_Tasks.md');
                if (!fs.existsSync(fallback)) {
                    fs.writeFileSync(fallback, "# Daily\n\n## 🎯 Active Tasks\n- [ ] Example Task 1\n- [ ] Example Task 2\n\n## ⏱️ Focus Sessions\n", 'utf-8');
                }
                config.mdPath = fallback;
            }
            saveConfig(config);
        }

        createWidgetWindow();
        createManagerWindow();
        setupSystemTray();
        startResourceMonitoring();

        const activePath = config.mdPath || resolveObsidianMdPath();
        if (activePath) {
            watchFile(activePath);
        }
    } catch (err) {
        console.error('[Startup Error]', err);
        dialog.showErrorBox('Poké-Pomo Startup Error', err && err.message ? err.message : String(err));
    }

    app.on('activate', () => {
        if (!widgetWindow || widgetWindow.isDestroyed()) {
            createWidgetWindow();
        } else {
            widgetWindow.show();
            widgetWindow.focus();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
    stopDesktopDaemon();
    if (metricsInterval) clearInterval(metricsInterval);
    if (fileWatcher) {
        try { fileWatcher.close(); } catch (e) {}
    }
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        // MacOS
    }
});
