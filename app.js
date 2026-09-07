/**
 * Syncer Desktop Productivity Widget
 * Modular Vanilla JavaScript Architecture with Dynamic Pokémon Theming
 */

// ==========================================
// 1. THEME MANAGER (Pokémon Dynamic Theming)
// ==========================================
const ThemeManager = {
    STORAGE_KEY: 'syncer_widget_theme',
    DEFAULT_THEME: 'theme-default',

    init() {
        const selectorContainer = document.getElementById('theme-selector');
        if (!selectorContainer) return;

        // Restore saved theme or fallback to default
        const savedTheme = localStorage.getItem(this.STORAGE_KEY) || this.DEFAULT_THEME;
        this.applyTheme(savedTheme);

        // Bind click events on theme selector dots
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
        // Valid themes whitelist
        const validThemes = ['theme-default', 'theme-pikachu', 'theme-charizard', 'theme-gengar'];
        const effectiveTheme = validThemes.includes(themeName) ? themeName : this.DEFAULT_THEME;

        // Remove existing theme classes from body
        validThemes.forEach(cls => document.body.classList.remove(cls));
        document.body.classList.add(effectiveTheme);

        // Update active status on selector dots
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
// 2. STORAGE SERVICE (localStorage Auto-Save)
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
// 3. POMODORO TIMER MODULE
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
            alert("Work session complete! Take a 5-minute break.");
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
// 4. TO-DO LIST MODULE
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
        this.tasks = this.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        this.saveAndRender();
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
// 5. SESSION EXPORTER MODULE
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

        return {
            dateStr,
            markdown: md,
            rawJSON: {
                timestamp: now.toISOString(),
                stats,
                tasks
            }
        };
    },

    async exportSession(toastElement) {
        const payload = this.generateMarkdownPayload();

        // Python Backend Hook Call
        const backendResult = await this.sendToPythonBackend(payload);

        // Fallback: Local .md download
        if (!backendResult || !backendResult.success) {
            this.downloadMarkdownFile(payload.markdown, `session_summary_${payload.dateStr}.md`);
        }

        toastElement.classList.remove('hidden');
        setTimeout(() => toastElement.classList.add('hidden'), 3000);
    },

    downloadMarkdownFile(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    /**
     * Python Backend Hook:
     * Endpoint hook for sending session data to local Python server.
     */
    async sendToPythonBackend(payload) {
        /*
        try {
            const response = await fetch('http://localhost:8000/api/save-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (response.ok) {
                return { success: true, data: await response.json() };
            }
        } catch (error) {
            console.warn('Python backend unavailable. Defaulting to file download.', error);
        }
        */
        return { success: false };
    }
};


// ==========================================
// 6. APPLICATION INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Dynamic Theme Manager
    ThemeManager.init();

    // 2. Initialize Pomodoro Timer
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

    // 3. Initialize To-Do List
    TodoList.init({
        form: document.getElementById('todo-form'),
        input: document.getElementById('todo-input'),
        list: document.getElementById('todo-list')
    });

    // 4. Initialize Session Exporter
    SessionExporter.init(
        document.getElementById('export-session-btn'),
        document.getElementById('export-toast')
    );
});
