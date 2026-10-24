/**
 * Electron Preload Script (preload.js)
 * Secure context bridge exposing window.electronAPI
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
    // 1. Dynamic File Picker & Obsidian Note Path
    getCurrentPath: () => ipcRenderer.invoke('get-current-path'),
    pickMdFile: () => ipcRenderer.invoke('pick-md-file'),
    getInitialData: () => ipcRenderer.invoke('get-initial-data'),
    saveTaskCompletion: (payload) => ipcRenderer.invoke('save-task-completion', payload),
    logPomodoroSession: (logString) => ipcRenderer.invoke('log-pomodoro-session', logString),
    onFileUpdated: (callback) => {
        const handler = (_event, data) => callback(data);
        ipcRenderer.on('file-updated', handler);
        return () => ipcRenderer.removeListener('file-updated', handler);
    },

    // 2. Widget Visibility, Desktop Pinning & Always on Top
    toggleWidget: (visible) => ipcRenderer.invoke('toggle-widget-visibility', visible),
    getWidgetVisibility: () => ipcRenderer.invoke('get-widget-visibility'),
    toggleDesktopPin: (pinned) => ipcRenderer.invoke('toggle-desktop-pin', pinned),
    getDesktopPinned: () => ipcRenderer.invoke('get-desktop-pinned'),
    toggleAlwaysOnTop: (onTop) => ipcRenderer.invoke('toggle-always-on-top', onTop),
    getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
    // Backward compatibility for existing pin toggles
    toggleWidgetPin: (pinned) => ipcRenderer.invoke('toggle-desktop-pin', pinned),
    getWidgetPinned: () => ipcRenderer.invoke('get-desktop-pinned'),
    onWidgetVisibilityChanged: (callback) => {
        const handler = (_event, isVisible) => callback(isVisible);
        ipcRenderer.on('widget-visibility-changed', handler);
        return () => ipcRenderer.removeListener('widget-visibility-changed', handler);
    },

    // 3. Resource Telemetry Metrics (Manager Window)
    onResourceMetrics: (callback) => {
        const handler = (_event, metrics) => callback(metrics);
        ipcRenderer.on('resource-metrics-update', handler);
        return () => ipcRenderer.removeListener('resource-metrics-update', handler);
    },
    onMetricsUpdate: (callback) => {
        const handler = (_event, metrics) => callback(metrics);
        ipcRenderer.on('metrics-update', handler);
        return () => ipcRenderer.removeListener('metrics-update', handler);
    },

    // 4. Theme Management
    setTheme: (themeName) => ipcRenderer.invoke('update-theme', themeName),
    getCurrentTheme: () => ipcRenderer.invoke('get-current-theme'),
    onThemeChange: (callback) => {
        const handler = (_event, themeName) => callback(themeName);
        ipcRenderer.on('theme-changed', handler);
        return () => ipcRenderer.removeListener('theme-changed', handler);
    },

    // 5. Obsidian Focus Logging & Todo Dex
    saveToObsidian: (payload) => ipcRenderer.invoke('save-obsidian-session', payload),
    getObsidianTasks: () => ipcRenderer.invoke('get-obsidian-tasks'),
    updateObsidianTask: (task) => ipcRenderer.invoke('update-obsidian-task', task),
    addObsidianTask: (text) => ipcRenderer.invoke('add-obsidian-task', text),
    deleteObsidianTask: (text) => ipcRenderer.invoke('delete-obsidian-task', text),
    onTasksUpdated: (callback) => {
        const handler = (_event, tasks) => callback(tasks);
        ipcRenderer.on('tasks-updated', handler);
        return () => ipcRenderer.removeListener('tasks-updated', handler);
    },

    // 6. Window Frame Actions
    minimizeWidget: () => ipcRenderer.send('widget-minimize'),
    closeWidget: () => ipcRenderer.send('widget-close'),
    closeManager: () => ipcRenderer.send('manager-close'),

    // 7. Window Dragging & Position
    moveWindowDelta: (dx, dy) => ipcRenderer.send('move-window-delta', { dx, dy }),
    setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', { x, y }),
    getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
    saveWindowPosition: () => ipcRenderer.invoke('save-window-position')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// Backward compatibility fallback
contextBridge.exposeInMainWorld('syncerAPI', electronAPI);
