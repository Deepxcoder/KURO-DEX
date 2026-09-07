/**
 * Electron Main Process (main.js)
 * Poké-Pomo & Task Dex — Dual-Window Desktop System
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

let widgetWindow = null;
let managerWindow = null;
let tray = null;
let isQuitting = false;
let metricsInterval = null;
let currentTheme = 'charizard';

// ==========================================
// 1. OBSIDIAN VAULT PATH RESOLUTION & LOGGING
// ==========================================

function resolveObsidianDailyDir() {
    try {
        const configPath = path.join(__dirname, 'Scripts', 'config.json');
        if (fs.existsSync(configPath)) {
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

    const fallback = path.join(__dirname, '01_Daily');
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
    return fallback;
}

let writeQueue = Promise.resolve();

/**
 * Appends completed task or session to YYYY-MM-DD.md
 */
async function appendObsidianSession(payload) {
    writeQueue = writeQueue.then(async () => {
        const dailyDir = resolveObsidianDailyDir();
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const filePath = path.join(dailyDir, `${dateStr}.md`);

        const taskName = (payload.task || 'Focus Session').trim();
        const duration = parseInt(payload.duration || 25, 10);
        const target = parseInt(payload.target || 25, 10);
        const isEarly = !!payload.early;
        const timeStr = payload.timestamp || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Required Formats:
        // Standard: - [x] **[Task Name]** — Focused for [X]m (Completed at [HH:MM])
        // Early:    - [x] **[Task Name]** — Finished early: [X]m / [Y]m target (Completed at [HH:MM])
        const entry = isEarly
            ? `- [x] **${taskName}** — Finished early: ${duration}m / ${target}m target (Completed at ${timeStr})\n`
            : `- [x] **${taskName}** — Focused for ${duration}m (Completed at ${timeStr})\n`;

        try {
            let content = '';
            if (fs.existsSync(filePath)) {
                content = await fs.promises.readFile(filePath, 'utf8');
            } else {
                content = `# Daily Note - ${dateStr}\n\n`;
            }

            const headerRegex = /(##\s*⏱️\s*Focus Sessions\s*\n+)/i;
            if (headerRegex.test(content)) {
                content = content.replace(headerRegex, `$1${entry}`);
            } else {
                const trimmed = content.trimEnd();
                content = `${trimmed}\n\n## ⏱️ Focus Sessions\n\n${entry}`;
            }

            await fs.promises.writeFile(filePath, content, 'utf8');
            console.log(`[Obsidian Log] Appended: ${entry.trim()} -> ${path.basename(filePath)}`);
            return { success: true, file: filePath, entry: entry.trim() };
        } catch (err) {
            console.error(`[Obsidian Error] Write failed:`, err);
            throw err;
        }
    });

    return writeQueue;
}

// ==========================================
// 1B. OBSIDIAN TODO'S READER & SYNC
// ==========================================

function resolveObsidianTodoPath() {
    try {
        const configPath = path.join(__dirname, 'Scripts', 'config.json');
        if (fs.existsSync(configPath)) {
            const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (parsed.paths && parsed.paths.todo_folder) {
                const folder = path.resolve(parsed.paths.todo_folder);
                if (fs.existsSync(folder)) {
                    const todoFile = path.join(folder, 'todo.md');
                    if (fs.existsSync(todoFile)) return todoFile;
                    // Look for any .md file in the todo folder
                    const files = fs.readdirSync(folder).filter(f => f.endsWith('.md'));
                    if (files.length > 0) return path.join(folder, files[0]);
                    return todoFile;
                }
            }
        }
    } catch (err) {
        console.warn('[Todo Path Error]', err.message);
    }
    return path.join(__dirname, 'todo.md');
}

function parseMarkdownTasks(content) {
    const lines = content.split(/\r?\n/);
    const tasks = [];
    const pattern = /\s*(?:\((\d+m)\)\s*at\s*[\d:]+\s*(?:AM|PM)?|\(\d+m(?:\s*at\s*[^)]+)?\))\s*$/i;

    lines.forEach((line, idx) => {
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
    });
    return tasks;
}

let isInternalTodoWrite = false;

async function getObsidianTasks() {
    try {
        const todoPath = resolveObsidianTodoPath();
        if (!fs.existsSync(todoPath)) return [];
        const content = await fs.promises.readFile(todoPath, 'utf8');
        return parseMarkdownTasks(content);
    } catch (err) {
        console.error('[Get Obsidian Tasks Error]', err);
        return [];
    }
}

async function updateObsidianTask(taskPayload) {
    try {
        const todoPath = resolveObsidianTodoPath();
        if (!fs.existsSync(todoPath)) return { success: false, error: 'File not found' };
        const content = await fs.promises.readFile(todoPath, 'utf8');
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
                        // Format: task (time) at completion time -> - [x] Task (25m) at 12:44 AM
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
            isInternalTodoWrite = true;
            await fs.promises.writeFile(todoPath, lines.join('\n'), 'utf8');
            setTimeout(() => { isInternalTodoWrite = false; }, 600);
        }
        return { success: true };
    } catch (err) {
        console.error('[Update Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

async function addObsidianTask(taskText) {
    try {
        const todoPath = resolveObsidianTodoPath();
        const line = `- [ ] ${taskText.trim()}\n`;
        isInternalTodoWrite = true;
        if (fs.existsSync(todoPath)) {
            const content = await fs.promises.readFile(todoPath, 'utf8');
            const newContent = content.endsWith('\n') ? `${content}${line}` : `${content}\n${line}`;
            await fs.promises.writeFile(todoPath, newContent, 'utf8');
        } else {
            await fs.promises.writeFile(todoPath, line, 'utf8');
        }
        setTimeout(() => { isInternalTodoWrite = false; }, 600);
        return { success: true };
    } catch (err) {
        console.error('[Add Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

async function deleteObsidianTask(taskText) {
    try {
        const todoPath = resolveObsidianTodoPath();
        if (!fs.existsSync(todoPath)) return { success: false };
        const content = await fs.promises.readFile(todoPath, 'utf8');
        const lines = content.split(/\r?\n/);
        const filtered = lines.filter(l => {
            const match = l.match(/^-\s*\[([ xX])\]\s*(.*)$/);
            if (match && match[2].trim() === taskText.trim()) return false;
            return true;
        });
        isInternalTodoWrite = true;
        await fs.promises.writeFile(todoPath, filtered.join('\n'), 'utf8');
        setTimeout(() => { isInternalTodoWrite = false; }, 600);
        return { success: true };
    } catch (err) {
        console.error('[Delete Obsidian Task Error]', err);
        return { success: false, error: err.message };
    }
}

function setupTodoWatcher() {
    try {
        const todoPath = resolveObsidianTodoPath();
        const dir = path.dirname(todoPath);
        if (fs.existsSync(dir)) {
            fs.watch(dir, async (eventType, filename) => {
                if (isInternalTodoWrite) return;
                if (!filename || filename.endsWith('.md')) {
                    const tasks = await getObsidianTasks();
                    if (widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.webContents) {
                        widgetWindow.webContents.send('tasks-updated', tasks);
                    }
                }
            });
        }
    } catch (err) {
        console.warn('[Todo Watcher Error]', err.message);
    }
}

// ==========================================
// 2. WINDOW CREATION (Widget & Manager)
// ==========================================

let isUserMinimizing = false;
let isIntentionalHide = false;
let isManagerActionInProgress = false;

function attachWidgetToDesktop(win) {
    if (!win || win.isDestroyed()) return;
    try {
        const handle = win.getNativeWindowHandle();
        const hwnd = process.arch === 'x64' ? handle.readBigInt64LE(0).toString() : handle.readInt32LE(0).toString();
        const scriptPath = path.join(__dirname, 'Scripts', 'attach_to_desktop.py');
        execFile('python', [scriptPath, hwnd], (err, stdout, stderr) => {
            if (err) {
                console.warn('[Desktop Attach Warning]', err.message);
            }
        });
    } catch (e) {
        console.warn('[Desktop Attach Error]', e.message);
    }
}

function restoreDesktopWidget() {
    if (!widgetWindow || widgetWindow.isDestroyed()) return;
    if (!isWidgetPinned || isUserMinimizing || isIntentionalHide) return;

    if (widgetWindow.isMinimized()) {
        widgetWindow.restore();
    }
    widgetWindow.showInactive();
    widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    attachWidgetToDesktop(widgetWindow);
}

function createWidgetWindow() {
    widgetWindow = new BrowserWindow({
        width: 385,
        height: 231,
        frame: false,
        transparent: true,
        alwaysOnTop: isWidgetPinned,
        skipTaskbar: true,
        resizable: false,
        minimizable: true,
        backgroundColor: '#00000000',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false,
            backgroundThrottling: false
        }
    });

    if (isWidgetPinned) {
        widgetWindow.setAlwaysOnTop(true, 'screen-saver');
    }

    widgetWindow.loadFile('widget.html');

    widgetWindow.once('ready-to-show', () => {
        attachWidgetToDesktop(widgetWindow);
    });

    widgetWindow.on('show', () => {
        attachWidgetToDesktop(widgetWindow);
    });

    // Prevent system "Show Desktop" (Win+D or 3-finger swipe down) from minimizing or hiding the widget
    widgetWindow.on('minimize', (e) => {
        if (!isUserMinimizing && isWidgetPinned) {
            e.preventDefault();
            setTimeout(restoreDesktopWidget, 100);
            setTimeout(restoreDesktopWidget, 250);
            setTimeout(restoreDesktopWidget, 450);
            setTimeout(restoreDesktopWidget, 650);
        }
        isUserMinimizing = false;
    });

    widgetWindow.on('hide', () => {
        if (!isIntentionalHide && isWidgetPinned) {
            setTimeout(restoreDesktopWidget, 100);
            setTimeout(restoreDesktopWidget, 250);
            setTimeout(restoreDesktopWidget, 450);
        }
    });

    widgetWindow.on('blur', () => {
        if (!isUserMinimizing && !isIntentionalHide && isWidgetPinned) {
            setTimeout(restoreDesktopWidget, 250);
            setTimeout(restoreDesktopWidget, 500);
        }
    });

    widgetWindow.on('restore', () => {
        if (isWidgetPinned) {
            widgetWindow.setAlwaysOnTop(true, 'screen-saver');
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

    managerWindow = new BrowserWindow({
        width: 320,
        height: 300,
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

    managerWindow.loadFile('manager.html');

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

    let x = workArea.x + workArea.width - 330;
    let y = workArea.y + workArea.height - 310;

    if (trayBounds && trayBounds.width > 0) {
        x = Math.round(trayBounds.x + trayBounds.width / 2 - 160);
        y = Math.round(trayBounds.y - 308);

        // Keep inside workArea
        if (x + 320 > workArea.x + workArea.width) x = workArea.x + workArea.width - 328;
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

        return {
            totalCpu: Math.round(totalCpu * 10) / 10,
            totalRamMb: Math.round(totalRamKb / 1024),
            widgetCpu: Math.round(widgetCpu * 10) / 10,
            widgetRamMb: Math.round(widgetRamKb / 1024)
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

    // Left click toggles Manager Window at tray location
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
            // Send immediate metrics
            const metrics = collectResourceMetrics();
            if (metrics) managerWindow.webContents.send('resource-metrics-update', metrics);
        }
    });
}

// ==========================================
// 5. IPC HANDLERS
// ==========================================

let isWidgetPinned = true;

// Toggle Widget Pinning (Always on Top)
ipcMain.handle('toggle-widget-pin', (event, pinned) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);
    isWidgetPinned = !!pinned;
    if (widgetWindow && !widgetWindow.isDestroyed()) {
        widgetWindow.setAlwaysOnTop(isWidgetPinned, isWidgetPinned ? 'screen-saver' : 'normal');
        if (isWidgetPinned) attachWidgetToDesktop(widgetWindow);
    }
    return isWidgetPinned;
});

ipcMain.handle('get-widget-pinned', () => isWidgetPinned);

// Toggle Widget Visibility
ipcMain.handle('toggle-widget-visibility', (event, visible) => {
    isManagerActionInProgress = true;
    setTimeout(() => { isManagerActionInProgress = false; }, 500);

    if (!widgetWindow || widgetWindow.isDestroyed()) {
        if (visible) createWidgetWindow();
    } else {
        if (visible) {
            widgetWindow.showInactive();
            if (isWidgetPinned) widgetWindow.setAlwaysOnTop(true, 'screen-saver');
            attachWidgetToDesktop(widgetWindow);
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

// ==========================================
// 6. APP LIFECYCLE
// ==========================================

app.whenReady().then(() => {
    createWidgetWindow();
    createManagerWindow();
    setupSystemTray();
    startResourceMonitoring();
    setupTodoWatcher();

    app.on('activate', () => {
        if (!widgetWindow || widgetWindow.isDestroyed()) {
            createWidgetWindow();
        } else {
            widgetWindow.show();
        }
    });
});

app.on('before-quit', () => {
    isQuitting = true;
    if (metricsInterval) clearInterval(metricsInterval);
});

app.on('window-all-closed', () => {
    if (process.platform === 'darwin') {
        // MacOS
    }
});
