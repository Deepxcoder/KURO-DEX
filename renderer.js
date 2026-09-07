/**
 * Frontend Renderer Script (renderer.js)
 * Obsidian Daily Note IPC Integration for Syncer Desktop Widget
 */

// ==========================================
// 1. OBSIDIAN IPC BRIDGE HELPER
// ==========================================
const ObsidianBridge = {
    /**
     * Checks if running inside Electron with the Obsidian preload API available
     */
    isAvailable() {
        return typeof window.obsidianAPI !== 'undefined';
    },

    /**
     * Triggers IPC to append completed Pomodoro session to today's note
     * @param {string} [time] - Timestamp string
     * @param {string} [category="Work"] - Focus category
     */
    async logPomodoro(time, category = 'Work') {
        if (!this.isAvailable()) {
            console.info('[ObsidianBridge] Running outside Electron. Skipped IPC log.');
            return;
        }

        const logTime = time || new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });

        try {
            const result = await window.obsidianAPI.savePomodoro(logTime, category);
            console.log('[Obsidian IPC] Pomodoro logged:', result);
            return result;
        } catch (error) {
            console.error('[Obsidian IPC Error] Failed to log Pomodoro:', error);
        }
    },

    /**
     * Triggers IPC to append checked-off task to today's note
     * @param {string} taskText - Description of the completed task
     */
    async logCompletedTodo(taskText) {
        if (!this.isAvailable()) {
            console.info('[ObsidianBridge] Running outside Electron. Skipped IPC log.');
            return;
        }

        if (!taskText || !taskText.trim()) return;

        try {
            const result = await window.obsidianAPI.saveTodo(taskText.trim());
            console.log('[Obsidian IPC] Task logged:', result);
            return result;
        } catch (error) {
            console.error('[Obsidian IPC Error] Failed to log Todo:', error);
        }
    },

    /**
     * Window Controls & Visibility for Frameless Electron Window
     */
    initWindowControls() {
        const api = window.syncerAPI || window.obsidianAPI;
        if (!api) return;

        const pinBtn = document.getElementById('win-pin-btn');
        const minBtn = document.getElementById('win-min-btn');
        const hideBtn = document.getElementById('win-hide-btn') || document.getElementById('win-close-btn');

        if (pinBtn && api.toggleAlwaysOnTop) {
            // Check initial pin state (unpinned by default)
            if (api.getAlwaysOnTop) {
                api.getAlwaysOnTop().then(isPinned => {
                    pinBtn.classList.toggle('pinned', !!isPinned);
                    pinBtn.title = isPinned ? 'Pinned on Top (Click to Unpin)' : 'Unpinned (Click to Pin on Top)';
                }).catch(() => {});
            }

            pinBtn.addEventListener('click', async () => {
                const isPinned = await api.toggleAlwaysOnTop();
                pinBtn.classList.toggle('pinned', !!isPinned);
                pinBtn.title = isPinned ? 'Pinned on Top (Click to Unpin)' : 'Unpinned (Click to Pin on Top)';
            });
        }

        if (minBtn && api.minimizeWindow) {
            minBtn.addEventListener('click', () => api.minimizeWindow());
        }

        if (hideBtn && api.closeWindow) {
            hideBtn.addEventListener('click', () => api.closeWindow());
        }
    }
};

// ==========================================
// 1.5. COMPACT FOCUS TASK MANAGER
// ==========================================
const CompactTaskManager = {
    activeTask: null,

    init() {
        const form = document.getElementById('compact-task-form');
        const input = document.getElementById('compact-task-input');
        const checkBtn = document.getElementById('compact-task-check-btn');
        const clearBtn = document.getElementById('compact-task-clear-btn');

        if (form && input) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = input.value.trim();
                if (text) {
                    this.setActiveTask(text);
                    input.value = '';
                    // Mirror into TodoList if not already present
                    if (typeof TodoList !== 'undefined' && TodoList.addTask) {
                        const exists = (TodoList.tasks || []).some(t => t.text.toLowerCase() === text.toLowerCase() && !t.completed);
                        if (!exists) {
                            TodoList.addTask(text);
                        }
                    }
                }
            });
        }

        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                if (this.activeTask) {
                    // Log to Obsidian daily note
                    ObsidianBridge.logCompletedTodo(this.activeTask);

                    // Mark completed in TodoList if found
                    if (typeof TodoList !== 'undefined' && TodoList.tasks) {
                        const match = TodoList.tasks.find(t => t.text.trim() === this.activeTask.trim() && !t.completed);
                        if (match) {
                            TodoList.toggleTask(match.id);
                        }
                    }

                    // Pick next or clear
                    this.pickNextTaskOrClear();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearActiveTask();
            });
        }

        // Restore saved active task or sync from TodoList
        const savedTask = localStorage.getItem('syncer_compact_active_task');
        if (savedTask) {
            this.setActiveTask(savedTask, false);
        } else {
            this.syncWithTodoList();
        }
    },

    syncWithTodoList() {
        if (this.activeTask) return;
        if (typeof TodoList !== 'undefined' && Array.isArray(TodoList.tasks)) {
            const firstPending = TodoList.tasks.find(t => !t.completed);
            if (firstPending) {
                this.setActiveTask(firstPending.text, false);
            }
        }
    },

    setActiveTask(taskName, save = true) {
        this.activeTask = taskName;
        const form = document.getElementById('compact-task-form');
        const activeWrap = document.getElementById('compact-task-active');
        const taskText = document.getElementById('compact-active-task-name');

        if (form && activeWrap && taskText) {
            taskText.textContent = taskName;
            taskText.title = `Active Focus Task: ${taskName}`;
            form.classList.add('hidden');
            activeWrap.classList.remove('hidden');
        }

        if (save) {
            localStorage.setItem('syncer_compact_active_task', taskName);
        }
    },

    clearActiveTask() {
        this.activeTask = null;
        localStorage.removeItem('syncer_compact_active_task');

        const form = document.getElementById('compact-task-form');
        const activeWrap = document.getElementById('compact-task-active');
        if (form && activeWrap) {
            activeWrap.classList.add('hidden');
            form.classList.remove('hidden');
            const input = document.getElementById('compact-task-input');
            if (input) input.focus();
        }
    },

    pickNextTaskOrClear() {
        this.activeTask = null;
        localStorage.removeItem('syncer_compact_active_task');

        if (typeof TodoList !== 'undefined' && Array.isArray(TodoList.tasks)) {
            const nextPending = TodoList.tasks.find(t => !t.completed);
            if (nextPending) {
                this.setActiveTask(nextPending.text);
                return;
            }
        }

        this.clearActiveTask();
    }
};

// ==========================================
// 1.6. COMPACT MODE MANAGER (320x115 HUD)
// ==========================================
const CompactModeManager = {
    isCompact: false,

    async init() {
        const compactBtn = document.getElementById('compact-toggle-btn');
        if (!compactBtn) return;

        // Restore saved preference if any
        const saved = localStorage.getItem('syncer_compact_mode') === 'true';
        if (saved) {
            await this.setCompact(true);
        }

        compactBtn.addEventListener('click', async () => {
            await this.toggle();
        });
    },

    async toggle() {
        await this.setCompact(!this.isCompact);
    },

    async setCompact(compact) {
        this.isCompact = compact;
        document.body.classList.toggle('compact-mode', compact);
        localStorage.setItem('syncer_compact_mode', compact);

        if (compact) {
            CompactTaskManager.syncWithTodoList();
        }

        const compactBtn = document.getElementById('compact-toggle-btn');
        if (compactBtn) {
            compactBtn.title = compact ? 'Expand Widget (400x600)' : 'Compact Mode (320x115)';
            compactBtn.textContent = compact ? '⤡' : '⤢';
        }

        const api = window.syncerAPI || window.obsidianAPI;
        if (api && api.toggleCompactMode) {
            try {
                await api.toggleCompactMode(compact);
            } catch (err) {
                console.error('[Compact Mode IPC Error]', err);
            }
        }
    }
};

// ==========================================
// 2. THEME MANAGER
// ==========================================
const ThemeManager = {
    STORAGE_KEY: 'syncer_widget_theme',
    DEFAULT_THEME: 'theme-default',

    init() {
        const selectorContainer = document.getElementById('theme-selector');
        if (!selectorContainer) return;

        const savedTheme = localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
        this.applyTheme(savedTheme);

        const themeDots = selectorContainer.querySelectorAll('.theme-dot');
        themeDots.forEach(dot => {
            dot.addEventListener('click', () => {
                const targetTheme = dot.dataset.theme;
                if (targetTheme) {
                    this.applyTheme(targetTheme);
                    this.saveTheme(targetTheme);
                }
            });
        });
    },

    applyTheme(themeName) {
        const validThemes = ['theme-default', 'theme-pikachu', 'theme-charizard', 'theme-gengar'];
        const effectiveTheme = validThemes.includes(themeName) ? themeName : this.DEFAULT_THEME;

        validThemes.forEach(cls => document.body.classList.remove(cls));
        document.body.classList.add(effectiveTheme);

        const dots = document.querySelectorAll('.theme-dot');
        dots.forEach(dot => {
            dot.classList.toggle('active', dot.dataset.theme === effectiveTheme);
        });
    },

    saveTheme(themeName) {
        localStorage.setItem(this.STORAGE_KEY, themeName);
    }
};

// ==========================================
// 3. STORAGE SERVICE
// ==========================================
const StorageService = {
    KEYS: {
        TASKS: 'syncer_widget_tasks',
        COMPLETED_SESSIONS: 'syncer_widget_completed_sessions',
        TOTAL_MINUTES: 'syncer_widget_total_minutes'
    },

    loadTasks() {
        const data = localStorage.getItem(this.KEYS.TASKS);
        return data ? JSON.parse(data) : [];
    },

    saveTasks(tasks) {
        localStorage.setItem(this.KEYS.TASKS, JSON.stringify(tasks));
    },

    loadStats() {
        return {
            completedSessions: parseInt(localStorage.getItem(this.KEYS.COMPLETED_SESSIONS) || '0', 10),
            totalMinutes: parseInt(localStorage.getItem(this.KEYS.TOTAL_MINUTES) || '0', 10)
        };
    },

    saveStats(stats) {
        localStorage.setItem(this.KEYS.COMPLETED_SESSIONS, stats.completedSessions.toString());
        localStorage.setItem(this.KEYS.TOTAL_MINUTES, stats.totalMinutes.toString());
    }
};

// ==========================================
// 4. POMODORO TIMER (HOOKED TO OBSIDIAN IPC)
// ==========================================
const PomodoroTimer = {
    MODES: {
        WORK: { name: 'WORK', durationMinutes: 25 },
        BREAK: { name: 'BREAK', durationMinutes: 5 }
    },

    currentMode: null,
    timeRemaining: 0,
    intervalId: null,
    isRunning: false,

    stats: {
        completedSessions: 0,
        totalMinutes: 0
    },

    elements: {},

    init(elements) {
        this.elements = elements;
        this.currentMode = this.MODES.WORK;
        this.timeRemaining = this.currentMode.durationMinutes * 60;
        
        this.stats = StorageService.loadStats();
        this.attachEventListeners();
        this.updateUI();
    },

    attachEventListeners() {
        this.elements.workBtn.addEventListener('click', () => this.switchMode(this.MODES.WORK));
        this.elements.breakBtn.addEventListener('click', () => this.switchMode(this.MODES.BREAK));
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
    },

    switchMode(mode) {
        if (this.isRunning) this.pause();
        this.currentMode = mode;
        this.timeRemaining = mode.durationMinutes * 60;
        
        this.elements.workBtn.classList.toggle('active', mode === this.MODES.WORK);
        this.elements.breakBtn.classList.toggle('active', mode === this.MODES.BREAK);
        this.elements.statusIndicator.textContent = mode.name;
        
        this.updateUI();
    },

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        
        this.elements.startBtn.disabled = true;
        this.elements.pauseBtn.disabled = false;

        this.intervalId = setInterval(() => this.tick(), 1000);
    },

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.intervalId);

        this.elements.startBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
    },

    reset() {
        this.pause();
        this.timeRemaining = this.currentMode.durationMinutes * 60;
        this.updateUI();
    },

    tick() {
        if (this.timeRemaining > 0) {
            this.timeRemaining--;
            this.updateUI();
        } else {
            this.onTimerComplete();
        }
    },

    onTimerComplete() {
        this.pause();
        
        if (this.currentMode === this.MODES.WORK) {
            this.stats.completedSessions += 1;
            this.stats.totalMinutes += this.MODES.WORK.durationMinutes;
            StorageService.saveStats(this.stats);

            // ==============================================================
            // REQUIREMENT HOOK 1: Auto-trigger savePomodoro on timer 00:00
            // ==============================================================
            const completionTime = new Date().toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
            });
            ObsidianBridge.logPomodoro(completionTime, 'Focus');

            alert("Work session complete! Appended to Obsidian Daily Note.");
            this.switchMode(this.MODES.BREAK);
        } else {
            alert("Break complete! Ready to start work.");
            this.switchMode(this.MODES.WORK);
        }
    },

    updateUI() {
        const minutes = Math.floor(this.timeRemaining / 60).toString().padStart(2, '0');
        const seconds = (this.timeRemaining % 60).toString().padStart(2, '0');
        this.elements.display.textContent = `${minutes}:${seconds}`;

        this.elements.completedSessionsCount.textContent = this.stats.completedSessions;
        this.elements.totalFocusMinutes.textContent = this.stats.totalMinutes;
    }
};

// ==========================================
// 5. TO-DO LIST (HOOKED TO OBSIDIAN IPC)
// ==========================================
const TodoList = {
    tasks: [],
    elements: {},

    init(elements) {
        this.elements = elements;
        this.tasks = StorageService.loadTasks();
        this.attachEventListeners();
        this.render();
    },

    attachEventListeners() {
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTask(this.elements.input.value.trim());
            this.elements.input.value = '';
        });
    },

    addTask(text) {
        if (!text) return;
        const newTask = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        this.tasks.push(newTask);
        this.saveAndRender();
    },

    toggleTask(id) {
        const targetTask = this.tasks.find(t => t.id === id);
        const wasPreviouslyCompleted = targetTask ? targetTask.completed : false;

        this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        this.saveAndRender();

        // ==============================================================
        // REQUIREMENT HOOK 2: Auto-trigger saveTodo when task is checked off
        // ==============================================================
        if (targetTask && !wasPreviouslyCompleted) {
            ObsidianBridge.logCompletedTodo(targetTask.text);
        }
    },

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveAndRender();
    },

    saveAndRender() {
        StorageService.saveTasks(this.tasks);
        this.render();
    },

    render() {
        this.elements.list.innerHTML = '';

        if (this.tasks.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'todo-item';
            emptyItem.style.color = 'var(--text-muted)';
            emptyItem.textContent = 'NO ACTIVE TASKS';
            this.elements.list.appendChild(emptyItem);
            return;
        }

        this.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `todo-item ${task.completed ? 'completed' : ''}`;

            const contentDiv = document.createElement('div');
            contentDiv.className = 'todo-content';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => this.toggleTask(task.id));

            const textSpan = document.createElement('span');
            textSpan.className = 'todo-text';
            textSpan.textContent = task.text;

            contentDiv.appendChild(checkbox);
            contentDiv.appendChild(textSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '✕';
            deleteBtn.title = 'Delete Task';
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

            li.appendChild(contentDiv);
            li.appendChild(deleteBtn);

            this.elements.list.appendChild(li);
        });
    }
};

// ==========================================
// 6. SESSION EXPORTER
// ==========================================
const SessionExporter = {
    init(exportBtn, toastElement) {
        exportBtn.addEventListener('click', () => this.exportSession(toastElement));
    },

    generateMarkdownPayload() {
        const stats = StorageService.loadStats();
        const tasks = StorageService.loadTasks();

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0];

        const completedTasks = tasks.filter(t => t.completed);
        const pendingTasks = tasks.filter(t => !t.completed);

        let md = `# Session Log - ${dateStr} ${timeStr}\n\n`;
        md += `## ⏱️ Pomodoro Stats\n`;
        md += `- **Completed Work Sessions:** ${stats.completedSessions}\n`;
        md += `- **Total Focus Time:** ${stats.totalMinutes} Minutes\n\n`;

        md += `## ✅ Completed Tasks\n`;
        if (completedTasks.length === 0) {
            md += `- *No tasks completed during this session*\n`;
        } else {
            completedTasks.forEach(t => {
                md += `- [x] ${t.text}\n`;
            });
        }

        md += `\n## 📌 Pending Tasks\n`;
        if (pendingTasks.length === 0) {
            md += `- *All tasks completed*\n`;
        } else {
            pendingTasks.forEach(t => {
                md += `- [ ] ${t.text}\n`;
            });
        }

        return { dateStr, markdown: md };
    },

    exportSession(toastElement) {
        const payload = this.generateMarkdownPayload();
        const blob = new Blob([payload.markdown], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session_summary_${payload.dateStr}.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toastElement.classList.remove('hidden');
        setTimeout(() => toastElement.classList.add('hidden'), 3000);
    }
};

// ==========================================
// 7. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Window Controls, Compact Mode & Compact Task Manager
    ObsidianBridge.initWindowControls();
    CompactModeManager.init();
    CompactTaskManager.init();

    // 2. Initialize Dynamic Theme Manager
    ThemeManager.init();

    // 3. Initialize Pomodoro Timer
    PomodoroTimer.init({
        display: document.getElementById('timer-display'),
        workBtn: document.getElementById('mode-work-btn'),
        breakBtn: document.getElementById('mode-break-btn'),
        startBtn: document.getElementById('timer-start-btn'),
        pauseBtn: document.getElementById('timer-pause-btn'),
        resetBtn: document.getElementById('timer-reset-btn'),
        statusIndicator: document.getElementById('status-indicator'),
        completedSessionsCount: document.getElementById('completed-sessions-count'),
        totalFocusMinutes: document.getElementById('total-focus-minutes')
    });

    // 4. Initialize To-Do List
    TodoList.init({
        form: document.getElementById('todo-form'),
        input: document.getElementById('todo-input'),
        list: document.getElementById('todo-list')
    });

    // 5. Initialize Session Exporter
    SessionExporter.init(
        document.getElementById('export-session-btn'),
        document.getElementById('export-toast')
    );
});
