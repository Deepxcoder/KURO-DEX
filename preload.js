/**
 * Electron Preload Script (preload.js)
 * Secure context bridge exposing window.electronAPI
 */

const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
    // 1. Widget Visibility & Pinning
    toggleWidget: (visible) => ipcRenderer.invoke('toggle-widget-visibility', visible),
    getWidgetVisibility: () => ipcRenderer.invoke('get-widget-visibility'),
    toggleWidgetPin: (pinned) => ipcRenderer.invoke('toggle-widget-pin', pinned),
    getWidgetPinned: () => ipcRenderer.invoke('get-widget-pinned'),
    onWidgetVisibilityChanged: (callback) => {
        const handler = (_event, isVisible) => callback(isVisible);
        ipcRenderer.on('widget-visibility-changed', handler);
        return () => ipcRenderer.removeListener('widget-visibility-changed', handler);
    },

    // 2. Resource Telemetry Metrics (Manager Window)
    onResourceMetrics: (callback) => {
        const handler = (_event, metrics) => callback(metrics);
        ipcRenderer.on('resource-metrics-update', handler);
        return () => ipcRenderer.removeListener('resource-metrics-update', handler);
    },

    // 3. Theme Management
    setTheme: (themeName) => ipcRenderer.invoke('update-theme', themeName),
    getCurrentTheme: () => ipcRenderer.invoke('get-current-theme'),
    onThemeChange: (callback) => {
        const handler = (_event, themeName) => callback(themeName);
        ipcRenderer.on('theme-changed', handler);
        return () => ipcRenderer.removeListener('theme-changed', handler);
    },

    // 4. Obsidian Focus Logging & Todo Dex
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

    // 5. Window Frame Actions
    minimizeWidget: () => ipcRenderer.send('widget-minimize'),
    closeWidget: () => ipcRenderer.send('widget-close'),
    closeManager: () => ipcRenderer.send('manager-close')
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
// Backward compatibility fallback
contextBridge.exposeInMainWorld('syncerAPI', electronAPI);
