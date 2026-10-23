/**
 * Poké-Pomo & Task Dex — Controller Engine (widget.js)
 * Implements Pomodoro Engine, Task Dex Binding, Theme Switching & Obsidian IPC Bridge
 */

const PokePomo = {
    state: {
        mode: 'focus', // 'focus' | 'break'
        isRunning: false,
        timerInterval: null,

        focusMinutes: 25, // Base focus duration (preserves target across break & extensions)
        targetMinutes: 25,
        totalSeconds: 25 * 60,
        remainingSeconds: 25 * 60,
        sessionStartTime: null,

        activeTaskId: null,
        activeTaskName: null,

        accumulatedMinutes: 0, // Accumulated focus minutes across extensions for active task
        continueAfterBreak: false, // Automatically restart focus session after break completes

        theme: 'charizard',
        tasks: []
    },

    elements: {},

    // ==========================================
    // 1. INITIALIZATION
    // ==========================================
    init() {
        this.cacheElements();
        this.loadTasks();
        this.initTheme();
        this.loadTimerState();
        this.bindEvents();
        this.updateTimerDisplay();
        this.renderSprite();
    },

    cacheElements() {
        this.elements = {
            body: document.body,
            activeTaskSubheader: document.getElementById('active-task-subheader'),
            activeTaskName: document.getElementById('active-task-name'),
            statusBadge: document.getElementById('status-badge'),
            spriteWrapper: document.getElementById('sprite-wrapper'),

            // Window Controls
            minBtn: document.getElementById('win-min-btn'),
            closeBtn: document.getElementById('win-close-btn'),

            // Timer Elements
            timerReadoutWrap: document.getElementById('timer-readout-wrap'),
            timerReadout: document.getElementById('timer-readout'),
            timerSublabel: document.getElementById('timer-sublabel'),
            durationPopover: document.getElementById('duration-popover'),
            durationOptions: document.querySelectorAll('.duration-select-btn'),
            startBtn: document.getElementById('timer-start-btn'),
            resetBtn: document.getElementById('timer-reset-btn'),
            breakBtn: document.getElementById('timer-break-btn'),
            breakPopover: document.getElementById('break-popover'),
            breakOptions: document.querySelectorAll('.break-select-btn'),
            endEarlyBtn: document.getElementById('end-task-early-btn'),

            // Tasks Dex Elements
            dexCounter: document.getElementById('dex-counter'),
            dexTaskList: document.getElementById('dex-task-list'),
            dexAddForm: document.getElementById('dex-add-form'),
            dexTaskInput: document.getElementById('dex-task-input'),

            // Pomodoro Completion Modal Elements
            completionModal: document.getElementById('completion-modal'),
            completionTaskName: document.getElementById('completion-task-name'),
            completionTimeTag: document.getElementById('completion-time-tag'),
            completionCloseBtn: document.getElementById('completion-close-btn'),
            taskCompleteBtn: document.getElementById('task-complete-btn'),
            taskExtendBtn: document.getElementById('task-extend-btn'),
            extendDropdownWrap: document.getElementById('extend-dropdown-wrap'),
            extendPopover: document.getElementById('extend-popover'),
            extendOptions: document.querySelectorAll('.extend-select-btn'),
            taskBreakBtn: document.getElementById('task-break-btn'),

            // Toast
            toast: document.getElementById('poke-toast')
        };
    },

    // ==========================================
    // 2. THEME SYSTEM & SPRITES
    // ==========================================
    initTheme() {
        const api = window.electronAPI || window.syncerAPI;

        if (api && api.getCurrentTheme) {
            api.getCurrentTheme().then(theme => {
                if (theme) this.applyTheme(theme);
            }).catch(() => {});
        }

        if (api && api.onThemeChange) {
            api.onThemeChange(themeName => {
                this.applyTheme(themeName);
            });
        }
    },

    applyTheme(themeName) {
        this.state.theme = themeName || 'charizard';
        this.elements.body.className = `theme-${this.state.theme}`;

        const badgeMap = {
            charizard: 'FLAMING FOCUS',
            pikachu: 'THUNDER CHARGE',
            gengar: 'SHADOW FOCUS'
        };

        if (this.elements.statusBadge) {
            this.elements.statusBadge.textContent = badgeMap[this.state.theme] || 'FLAMING FOCUS';
        }

        this.renderSprite();
    },

    renderSprite() {
        if (!this.elements.spriteWrapper) return;

        // Authentic Pixel SVGs for Charizard, Pikachu, Gengar
        let svg = '';
        if (this.state.theme === 'charizard') {
            svg = `
            <svg viewBox="0 0 48 48" width="36" height="36" shape-rendering="crispEdges">
                <!-- Tail Flame -->
                <rect x="6" y="24" width="4" height="4" fill="#FFD000" />
                <rect x="8" y="22" width="4" height="6" fill="#FF3B30" />
                <rect x="10" y="26" width="4" height="4" fill="#FF7A00" />
                <!-- Tail & Body -->
                <rect x="12" y="28" width="6" height="4" fill="#E65100" />
                <rect x="16" y="22" width="14" height="16" fill="#FF7A00" />
                <rect x="18" y="24" width="10" height="12" fill="#FFA726" />
                <!-- Wings -->
                <rect x="8" y="14" width="8" height="8" fill="#00897B" />
                <rect x="12" y="12" width="6" height="4" fill="#26A69A" />
                <rect x="30" y="14" width="8" height="8" fill="#00897B" />
                <rect x="28" y="12" width="6" height="4" fill="#26A69A" />
                <!-- Head & Horns -->
                <rect x="20" y="8" width="12" height="12" fill="#FF7A00" />
                <rect x="18" y="6" width="4" height="4" fill="#E65100" />
                <rect x="30" y="6" width="4" height="4" fill="#E65100" />
                <!-- Snout & Eyes -->
                <rect x="28" y="12" width="8" height="6" fill="#FFA726" />
                <rect x="24" y="10" width="3" height="3" fill="#FFFFFF" />
                <rect x="25" y="10" width="2" height="2" fill="#000000" />
                <!-- Feet -->
                <rect x="16" y="38" width="6" height="4" fill="#E65100" />
                <rect x="26" y="38" width="6" height="4" fill="#E65100" />
            </svg>`;
        } else if (this.state.theme === 'pikachu') {
            svg = `
            <svg viewBox="0 0 48 48" width="36" height="36" shape-rendering="crispEdges">
                <!-- Ears with Black Tips -->
                <rect x="10" y="6" width="4" height="6" fill="#000000" />
                <rect x="12" y="10" width="6" height="8" fill="#FFD000" />
                <rect x="34" y="6" width="4" height="6" fill="#000000" />
                <rect x="30" y="10" width="6" height="8" fill="#FFD000" />
                <!-- Head & Body -->
                <rect x="14" y="14" width="20" height="16" fill="#FFD000" />
                <rect x="16" y="28" width="16" height="12" fill="#FFCA28" />
                <!-- Eyes & Cheeks -->
                <rect x="16" y="18" width="4" height="4" fill="#000000" />
                <rect x="17" y="19" width="2" height="2" fill="#FFFFFF" />
                <rect x="28" y="18" width="4" height="4" fill="#000000" />
                <rect x="29" y="19" width="2" height="2" fill="#FFFFFF" />
                <rect x="12" y="22" width="4" height="4" fill="#FF3B30" />
                <rect x="32" y="22" width="4" height="4" fill="#FF3B30" />
                <!-- Lightning Tail -->
                <rect x="6" y="20" width="6" height="4" fill="#FFD000" />
                <rect x="8" y="24" width="6" height="4" fill="#FFD000" />
                <rect x="10" y="28" width="6" height="4" fill="#8D6E63" />
                <!-- Feet -->
                <rect x="16" y="40" width="4" height="3" fill="#FFCA28" />
                <rect x="28" y="40" width="4" height="3" fill="#FFCA28" />
            </svg>`;
        } else {
            // Gengar
            svg = `
            <svg viewBox="0 0 48 48" width="36" height="36" shape-rendering="crispEdges">
                <!-- Spikes & Ears -->
                <rect x="10" y="6" width="6" height="8" fill="#7B1FA2" />
                <rect x="32" y="6" width="6" height="8" fill="#7B1FA2" />
                <rect x="22" y="4" width="4" height="6" fill="#9C27B0" />
                <!-- Body -->
                <rect x="12" y="12" width="24" height="26" fill="#6A1B9A" />
                <rect x="14" y="14" width="20" height="22" fill="#7B1FA2" />
                <!-- Red Menacing Eyes -->
                <rect x="16" y="18" width="6" height="4" fill="#D50000" />
                <rect x="18" y="19" width="3" height="2" fill="#FFFFFF" />
                <rect x="26" y="18" width="6" height="4" fill="#D50000" />
                <rect x="27" y="19" width="3" height="2" fill="#FFFFFF" />
                <!-- Grinning Teeth -->
                <rect x="16" y="26" width="16" height="6" fill="#EDE7F6" />
                <rect x="19" y="26" width="2" height="6" fill="#4A148C" />
                <rect x="23" y="26" width="2" height="6" fill="#4A148C" />
                <rect x="27" y="26" width="2" height="6" fill="#4A148C" />
                <!-- Feet -->
                <rect x="12" y="38" width="8" height="4" fill="#4A148C" />
                <rect x="28" y="38" width="8" height="4" fill="#4A148C" />
            </svg>`;
        }

        this.elements.spriteWrapper.innerHTML = svg;
    },

    // ==========================================
    // 3. TASKS DEX MANAGEMENT (Obsidian Sync)
    // ==========================================
    async loadTasks() {
        const api = window.electronAPI || window.syncerAPI;
        if (api && api.getObsidianTasks) {
            try {
                const obsidianTasks = await api.getObsidianTasks();
                if (obsidianTasks && obsidianTasks.length > 0) {
                    this.state.tasks = obsidianTasks;
                    this.saveTasks();
                    this.renderTasks();
                    this.bindDefaultPendingTask();
                    return;
                }
            } catch (err) {
                console.warn('[Obsidian Tasks Fetch Error]', err);
            }
        }

        // Fallback to local storage
        try {
            const raw = localStorage.getItem('poke_tasks_dex');
            this.state.tasks = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this.state.tasks = [];
        }

        this.renderTasks();
        this.bindDefaultPendingTask();
    },

    bindDefaultPendingTask() {
        const pending = this.state.tasks.find(t => !t.completed);
        if (pending) {
            this.bindActiveTask(pending.id, pending.text);
        } else if (this.state.tasks.length > 0) {
            this.bindActiveTask(this.state.tasks[0].id, this.state.tasks[0].text);
        } else {
            this.clearActiveTask();
        }
    },

    saveTasks() {
        localStorage.setItem('poke_tasks_dex', JSON.stringify(this.state.tasks));
    },

    saveTimerState() {
        try {
            const data = {
                mode: this.state.mode,
                isRunning: this.state.isRunning,
                targetMinutes: this.state.targetMinutes,
                focusMinutes: this.state.focusMinutes,
                totalSeconds: this.state.totalSeconds,
                remainingSeconds: this.state.remainingSeconds,
                accumulatedMinutes: this.state.accumulatedMinutes,
                continueAfterBreak: this.state.continueAfterBreak,
                activeTaskId: this.state.activeTaskId,
                activeTaskName: this.state.activeTaskName,
                lastTickTimestamp: Date.now()
            };
            localStorage.setItem('poke_pomo_timer_state', JSON.stringify(data));
        } catch (e) {
            console.warn('[Timer Storage Error]', e);
        }
    },

    loadTimerState() {
        try {
            const raw = localStorage.getItem('poke_pomo_timer_state');
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (!saved) return;

            this.state.mode = saved.mode || 'focus';
            this.state.focusMinutes = saved.focusMinutes || 25;
            this.state.targetMinutes = saved.targetMinutes || 25;
            this.state.totalSeconds = saved.totalSeconds || 25 * 60;
            this.state.accumulatedMinutes = saved.accumulatedMinutes || 0;
            this.state.continueAfterBreak = Boolean(saved.continueAfterBreak);

            if (saved.activeTaskId && saved.activeTaskName) {
                this.bindActiveTask(saved.activeTaskId, saved.activeTaskName);
            }

            if (saved.isRunning && saved.lastTickTimestamp) {
                const elapsedSecs = Math.max(0, Math.floor((Date.now() - saved.lastTickTimestamp) / 1000));
                const remaining = Math.max(0, saved.remainingSeconds - elapsedSecs);
                this.state.remainingSeconds = remaining;

                if (remaining > 0) {
                    this.startTimer();
                } else {
                    this.state.remainingSeconds = 0;
                    this.updateTimerDisplay();
                    setTimeout(() => this.handleSessionComplete(), 300);
                }
            } else {
                this.state.remainingSeconds = typeof saved.remainingSeconds === 'number' ? saved.remainingSeconds : this.state.totalSeconds;
            }

            if (this.state.mode === 'break') {
                const taskSuffix = (this.state.continueAfterBreak && this.state.activeTaskName)
                    ? ` · ${this.state.activeTaskName}`
                    : '';
                if (this.elements.timerSublabel) {
                    this.elements.timerSublabel.textContent = `☕ REST BREAK (${this.state.targetMinutes}M)${taskSuffix}`;
                }
            } else if (this.state.accumulatedMinutes > 0) {
                if (this.elements.timerSublabel) {
                    this.elements.timerSublabel.textContent = `FOCUS (+${this.state.accumulatedMinutes}M) ▾`;
                }
            }
        } catch (e) {
            console.warn('[Timer Storage Error]', e);
        }
    },

    clearTimerState() {
        try {
            localStorage.removeItem('poke_pomo_timer_state');
        } catch (e) {}
    },

    renderTasks() {
        if (!this.elements.dexTaskList) return;
        this.elements.dexTaskList.innerHTML = '';

        const caughtCount = this.state.tasks.filter(t => t.completed).length;
        const totalCount = this.state.tasks.length;
        if (this.elements.dexCounter) {
            this.elements.dexCounter.textContent = `${caughtCount}/${totalCount} CAUGHT`;
        }

        this.state.tasks.forEach(task => {
            const li = document.createElement('li');
            const isBound = task.id === this.state.activeTaskId;
            li.className = `dex-task-item ${task.completed ? 'completed' : ''} ${isBound ? 'is-bound' : ''}`;
            li.title = task.completed ? 'Completed Task' : 'Click to bind as Current Task';

            // Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'dex-checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                this.completeTaskViaCheckbox(task.id);
            });

            // Task Text
            const span = document.createElement('span');
            span.className = 'dex-task-text';
            span.textContent = task.text;
            if (task.timeTag) {
                const tag = document.createElement('span');
                tag.className = 'task-time-tag';
                tag.textContent = task.timeTag;
                span.appendChild(tag);
            }

            // Delete Button
            const delBtn = document.createElement('button');
            delBtn.className = 'dex-task-del';
            delBtn.textContent = '✕';
            delBtn.title = 'Remove from Dex';
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(task.id);
            });

            // Clicking task item binds it
            li.addEventListener('click', () => {
                if (!task.completed) {
                    this.bindActiveTask(task.id, task.text);
                }
            });

            li.appendChild(checkbox);
            li.appendChild(span);
            li.appendChild(delBtn);
            this.elements.dexTaskList.appendChild(li);
        });
    },

    bindActiveTask(id, text) {
        this.state.activeTaskId = id;
        this.state.activeTaskName = text;

        if (this.elements.activeTaskName) {
            this.elements.activeTaskName.textContent = text;
        }

        this.renderTasks();
    },

    clearActiveTask() {
        this.state.activeTaskId = null;
        this.state.activeTaskName = null;

        if (this.elements.activeTaskName) {
            this.elements.activeTaskName.textContent = 'None Selected';
        }

        this.renderTasks();
    },

    async addTask(text) {
        const clean = (text || '').trim();
        if (!clean) return;

        const newTask = {
            id: `task-${Date.now()}`,
            text: clean,
            completed: false
        };

        this.state.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        this.bindActiveTask(newTask.id, newTask.text);

        const api = window.electronAPI || window.syncerAPI;
        if (api && api.addObsidianTask) {
            try {
                await api.addObsidianTask(clean);
            } catch (err) {
                console.error('[Add Task IPC Error]', err);
            }
        }
    },

    async deleteTask(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.state.tasks = this.state.tasks.filter(t => t.id !== taskId);
        if (this.state.activeTaskId === taskId) {
            this.bindDefaultPendingTask();
        }
        this.saveTasks();
        this.renderTasks();

        const api = window.electronAPI || window.syncerAPI;
        if (api && api.deleteObsidianTask) {
            try {
                await api.deleteObsidianTask(task.text);
            } catch (err) {
                console.error('[Delete Task IPC Error]', err);
            }
        }
    },

    async completeTaskViaCheckbox(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.completed = !task.completed;
        const isActive = (taskId === this.state.activeTaskId);
        let duration = this.state.targetMinutes;
        let isEarly = false;

        const timestamp = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

        if (task.completed) {
            // If completing the active task while the timer was running, compute actual focus time
            if (isActive && this.state.mode === 'focus' && this.state.isRunning) {
                const elapsedSecs = this.state.totalSeconds - this.state.remainingSeconds;
                const elapsedMins = Math.max(1, Math.round(elapsedSecs / 60));
                duration = (this.state.accumulatedMinutes || 0) + elapsedMins;
                isEarly = elapsedMins < this.state.targetMinutes;
                this.resetTimer();
            }
            task.timeTag = `${duration}m at ${timestamp}`;
        } else {
            task.timeTag = null;
        }

        this.saveTasks();
        this.renderTasks();

        const api = window.electronAPI || window.syncerAPI;

        if (api && api.updateObsidianTask) {
            try {
                await api.updateObsidianTask({
                    text: task.text,
                    completed: task.completed,
                    duration: duration,
                    timestamp: timestamp
                });
            } catch (err) {
                console.error('[Update Task IPC Error]', err);
            }
        }

        if (task.completed) {
            // Log completed task to Obsidian daily note via IPC
            await this.logToObsidian({
                task: task.text,
                duration: duration,
                target: this.state.targetMinutes,
                early: isEarly,
                timestamp: timestamp
            });

            this.showToast(`CAUGHT: ${task.text} (${duration}m)`);

            if (isActive) {
                this.bindDefaultPendingTask();
                this.resetTimer();
            } else {
                this.renderTasks();
            }
        }
    },

    // ==========================================
    // 4. POMODORO TIMER ENGINE
    // ==========================================
    setTargetMinutes(minutes) {
        const mins = Math.max(1, parseInt(minutes, 10) || 25);
        this.state.targetMinutes = mins;
        this.state.totalSeconds = mins * 60;
        this.state.remainingSeconds = mins * 60;
        this.updateTimerDisplay();
    },

    setFocusDuration(minutes) {
        const mins = parseInt(minutes, 10) || 25;
        this.pauseTimer();
        this.hideCompletionModal();
        this.state.accumulatedMinutes = 0;
        this.state.continueAfterBreak = false;
        this.state.mode = 'focus';
        this.state.focusMinutes = mins;
        this.setTargetMinutes(mins);
        if (this.elements.timerSublabel) {
            this.elements.timerSublabel.textContent = 'FOCUS STAGE ▾';
        }
        if (this.elements.durationPopover) {
            this.elements.durationPopover.classList.add('hidden');
        }
        this.saveTimerState();
        this.showToast(`TIMER SET: ${mins} MINS`);
    },

    startTimer() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.state.sessionStartTime = Date.now();
        this.state.lastTickTimestamp = Date.now();

        this.elements.startBtn.textContent = 'PAUSE';
        this.elements.startBtn.classList.add('secondary-btn');
        this.elements.startBtn.classList.remove('primary-btn');

        // Show context-aware "End Task Early" button if focusing
        if (this.state.mode === 'focus') {
            this.elements.endEarlyBtn.classList.remove('hidden');
        }

        this.saveTimerState();

        this.state.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
    },

    pauseTimer() {
        if (!this.state.isRunning) return;

        this.state.isRunning = false;
        clearInterval(this.state.timerInterval);
        this.state.timerInterval = null;

        this.elements.startBtn.textContent = 'START';
        this.elements.startBtn.classList.add('primary-btn');
        this.elements.startBtn.classList.remove('secondary-btn');
        this.saveTimerState();
    },

    resetTimer() {
        this.pauseTimer();
        this.hideCompletionModal();
        this.state.accumulatedMinutes = 0;
        this.state.continueAfterBreak = false;
        this.state.mode = 'focus';
        const mins = this.state.focusMinutes || 25;
        this.setTargetMinutes(mins);
        this.elements.endEarlyBtn.classList.add('hidden');
        if (this.elements.timerSublabel) {
            this.elements.timerSublabel.textContent = 'FOCUS STAGE ▾';
        }
        this.clearTimerState();
        this.updateTimerDisplay();
    },

    tick() {
        if (this.state.remainingSeconds > 0) {
            this.state.remainingSeconds--;
            this.state.lastTickTimestamp = Date.now();
            this.updateTimerDisplay();
            this.saveTimerState();
        } else {
            this.handleSessionComplete();
        }
    },

    updateTimerDisplay() {
        const mins = Math.floor(this.state.remainingSeconds / 60);
        const secs = this.state.remainingSeconds % 60;
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        if (this.elements.timerReadout) {
            this.elements.timerReadout.textContent = formatted;
        }
    },

    startBreak(mins, continueAfterBreak = false) {
        this.pauseTimer();
        this.hideCompletionModal();
        this.state.mode = 'break';
        this.state.continueAfterBreak = Boolean(continueAfterBreak);
        this.setTargetMinutes(mins);

        const taskSuffix = (this.state.continueAfterBreak && this.state.activeTaskName)
            ? ` · ${this.state.activeTaskName}`
            : '';
        if (this.elements.timerSublabel) {
            this.elements.timerSublabel.textContent = `☕ REST BREAK (${mins}M)${taskSuffix}`;
        }
        this.elements.endEarlyBtn.classList.add('hidden');
        if (this.elements.breakPopover) {
            this.elements.breakPopover.classList.add('hidden');
        }

        this.saveTimerState();
        this.startTimer();
    },

    returnToFocus(autoStart = false) {
        this.pauseTimer();
        this.hideCompletionModal();
        this.state.mode = 'focus';
        const focusMins = this.state.focusMinutes || 25;
        this.setTargetMinutes(focusMins);

        if (this.elements.timerSublabel) {
            if (this.state.accumulatedMinutes > 0) {
                this.elements.timerSublabel.textContent = `FOCUS (+${this.state.accumulatedMinutes}M) ▾`;
            } else {
                this.elements.timerSublabel.textContent = 'FOCUS STAGE ▾';
            }
        }

        this.saveTimerState();

        if (autoStart) {
            this.startTimer();
        }
    },

    /**
     * Requirement: Context-aware "End Task Early" button
     * Calculates elapsed active minutes + accumulated minutes, logs via IPC, applies strike-through, clears current task.
     */
    async handleEndTaskEarly() {
        if (this.state.mode !== 'focus') return;

        const taskName = this.state.activeTaskName || 'Active Focus Session';
        const targetMins = (this.state.accumulatedMinutes || 0) + this.state.targetMinutes;

        // Exact elapsed minutes (min 1 minute)
        const elapsedSecs = this.state.totalSeconds - this.state.remainingSeconds;
        const currentElapsedMins = Math.max(1, Math.round(elapsedSecs / 60));
        const totalElapsedMins = (this.state.accumulatedMinutes || 0) + currentElapsedMins;
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 1. Reset timer & accumulated minutes
        this.resetTimer();

        // 2. Mark task completed in Dex & update Obsidian todo.md
        if (this.state.activeTaskId) {
            const task = this.state.tasks.find(t => t.id === this.state.activeTaskId);
            if (task) {
                task.completed = true;
                task.timeTag = `${totalElapsedMins}m`;
                this.saveTasks();
                this.renderTasks();
                const api = window.electronAPI || window.syncerAPI;
                if (api && api.updateObsidianTask) {
                    api.updateObsidianTask({
                        text: task.text,
                        completed: true,
                        duration: totalElapsedMins,
                        timestamp: timestamp
                    }).catch(console.error);
                }
            }
        }

        // 3. Log to Obsidian with early format
        await this.logToObsidian({
            task: taskName,
            duration: totalElapsedMins,
            target: targetMins,
            early: true,
            timestamp: timestamp
        });

        // 4. Clear current task and pick next
        const nextPending = this.state.tasks.find(t => !t.completed);
        if (nextPending) {
            this.bindActiveTask(nextPending.id, nextPending.text);
        } else {
            this.clearActiveTask();
        }

        this.showToast(`EARLY CLEAR: ${taskName} (${totalElapsedMins}m / ${targetMins}m)`);
    },

    /**
     * Synthesize 8-bit retro victory chime using Web Audio API
     */
    playChime() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 retro fanfare
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
                gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + idx * 0.1);
                osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
            });
        } catch (e) {
            console.warn('[Audio Chime Error]', e);
        }
    },

    /**
     * Requirement: Pomodoro completion at 00:00
     * Asks user if the task is complete or to add 10 minutes (with 20, 30 min options).
     * Occurs each time pomodoro is completed!
     */
    async handleSessionComplete() {
        this.pauseTimer();
        this.state.remainingSeconds = 0;
        this.updateTimerDisplay();

        if (this.state.mode === 'focus') {
            this.playChime();
            const currentTotalMins = (this.state.accumulatedMinutes || 0) + this.state.targetMinutes;
            const taskName = this.state.activeTaskName || 'Pomodoro Session';

            if (this.elements.completionTaskName) {
                this.elements.completionTaskName.textContent = taskName;
            }
            if (this.elements.completionTimeTag) {
                this.elements.completionTimeTag.textContent = `Focused for ${currentTotalMins}m`;
            }
            if (this.elements.extendPopover) {
                this.elements.extendPopover.classList.add('hidden');
            }
            if (this.elements.completionModal) {
                this.elements.completionModal.classList.remove('hidden');
            }
            if (this.elements.endEarlyBtn) {
                this.elements.endEarlyBtn.classList.add('hidden');
            }
        } else {
            this.playChime();
            const shouldAutoRestart = this.state.continueAfterBreak;
            this.state.continueAfterBreak = false;

            if (shouldAutoRestart) {
                const taskName = this.state.activeTaskName ? `: ${this.state.activeTaskName}` : '';
                this.showToast(`REST OVER — RESTARTING FOCUS${taskName}`);
                this.returnToFocus(true);
            } else {
                this.showToast('REST COMPLETE — READY TO BATTLE!');
                this.returnToFocus(false);
            }
        }
    },

    hideCompletionModal() {
        if (this.elements.completionModal) {
            this.elements.completionModal.classList.add('hidden');
        }
        if (this.elements.extendPopover) {
            this.elements.extendPopover.classList.add('hidden');
        }
    },

    /**
     * Extends focus session by 10, 20, or 30 minutes.
     * Accumulates past focused minutes, starts countdown, and prompts again upon completion!
     */
    extendFocusSession(extraMinutes) {
        const mins = parseInt(extraMinutes, 10) || 10;
        // Accumulate previously completed focus time
        this.state.accumulatedMinutes = (this.state.accumulatedMinutes || 0) + this.state.targetMinutes;

        this.hideCompletionModal();
        this.state.mode = 'focus';
        this.setTargetMinutes(mins);

        if (this.elements.timerSublabel) {
            this.elements.timerSublabel.textContent = `FOCUS (+${mins}M) ▾`;
        }

        this.startTimer();
        this.showToast(`EXTENDED: +${mins} MINS`);
    },

    /**
     * Confirms task completion: marks complete in Dex & Obsidian, logs to daily note.
     */
    async confirmTaskComplete() {
        const totalMins = (this.state.accumulatedMinutes || 0) + this.state.targetMinutes;
        const taskName = this.state.activeTaskName || 'Pomodoro Session';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this.hideCompletionModal();
        this.resetTimer();
        this.state.accumulatedMinutes = 0;

        // Mark completed in Dex & update Obsidian todo.md
        if (this.state.activeTaskId) {
            const task = this.state.tasks.find(t => t.id === this.state.activeTaskId);
            if (task) {
                task.completed = true;
                task.timeTag = `${totalMins}m`;
                this.saveTasks();
                this.renderTasks();
                const api = window.electronAPI || window.syncerAPI;
                if (api && api.updateObsidianTask) {
                    api.updateObsidianTask({
                        text: task.text,
                        completed: true,
                        duration: totalMins,
                        timestamp: timestamp
                    }).catch(console.error);
                }
            }
        }

        // Log standard completion with total accumulated minutes
        await this.logToObsidian({
            task: taskName,
            duration: totalMins,
            target: totalMins,
            early: false,
            timestamp: timestamp
        });

        // Clear current task and pick next
        const nextPending = this.state.tasks.find(t => !t.completed);
        if (nextPending) {
            this.bindActiveTask(nextPending.id, nextPending.text);
        } else {
            this.clearActiveTask();
        }

        this.showToast(`COMPLETED: ${taskName} (${totalMins}m)`);

        // Suggest break
        if (this.elements.breakPopover) {
            this.elements.breakPopover.classList.remove('hidden');
        }
    },

    // ==========================================
    // 5. OBSIDIAN IPC LOGGING
    // ==========================================
    async logToObsidian(payload) {
        const api = window.electronAPI || window.syncerAPI;
        if (!api || !api.saveToObsidian) {
            console.warn('[IPC Warning] saveToObsidian not exposed:', payload);
            return;
        }

        try {
            const res = await api.saveToObsidian(payload);
            console.log('[Obsidian IPC Result]', res);
            return res;
        } catch (err) {
            console.error('[Obsidian IPC Error]', err);
        }
    },

    showToast(msg) {
        if (!this.elements.toast) return;
        this.elements.toast.textContent = msg;
        this.elements.toast.classList.remove('hidden');
        setTimeout(() => {
            this.elements.toast.classList.add('hidden');
        }, 3200);
    },

    // ==========================================
    // 6. EVENT BINDINGS
    // ==========================================
    bindEvents() {
        const api = window.electronAPI || window.syncerAPI;

        // Wall-clock time resync when window becomes visible (after swipe down / restore)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                if (this.state.isRunning && this.state.lastTickTimestamp) {
                    const elapsed = Math.floor((Date.now() - this.state.lastTickTimestamp) / 1000);
                    if (elapsed > 1) {
                        this.state.remainingSeconds = Math.max(0, this.state.remainingSeconds - elapsed);
                        this.state.lastTickTimestamp = Date.now();
                        this.updateTimerDisplay();
                        this.saveTimerState();
                        if (this.state.remainingSeconds === 0) {
                            this.handleSessionComplete();
                        }
                    }
                }
            }
        });

        // Window Controls
        if (this.elements.minBtn && api && api.minimizeWidget) {
            this.elements.minBtn.addEventListener('click', () => api.minimizeWidget());
        }
        if (this.elements.closeBtn && api && api.closeWidget) {
            this.elements.closeBtn.addEventListener('click', () => api.closeWidget());
        }

        // Timer Controls
        if (this.elements.startBtn) {
            this.elements.startBtn.addEventListener('click', () => {
                if (this.state.isRunning) this.pauseTimer();
                else this.startTimer();
            });
        }

        if (this.elements.resetBtn) {
            this.elements.resetBtn.addEventListener('click', () => {
                if (this.state.mode === 'break') {
                    this.state.continueAfterBreak = false;
                    this.returnToFocus(false);
                } else {
                    this.resetTimer();
                }
            });
        }

        // Duration Selector Popover Trigger (Clicking on the time readout)
        if (this.elements.timerReadoutWrap && this.elements.durationPopover) {
            this.elements.timerReadoutWrap.addEventListener('click', (e) => {
                e.stopPropagation();
                this.elements.durationPopover.classList.toggle('hidden');
                if (this.elements.breakPopover) this.elements.breakPopover.classList.add('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!this.elements.durationPopover.contains(e.target) && !this.elements.timerReadoutWrap.contains(e.target)) {
                    this.elements.durationPopover.classList.add('hidden');
                }
            });
        }

        // Duration Options (25, 45, 60, 90 mins)
        if (this.elements.durationOptions) {
            this.elements.durationOptions.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mins = parseInt(btn.dataset.minutes, 10) || 25;
                    this.setFocusDuration(mins);
                });
            });
        }

        // Break Popover Trigger
        if (this.elements.breakBtn && this.elements.breakPopover) {
            this.elements.breakBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.elements.breakPopover.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!this.elements.breakPopover.contains(e.target) && e.target !== this.elements.breakBtn) {
                    this.elements.breakPopover.classList.add('hidden');
                }
            });
        }

        // Break Duration Options
        this.elements.breakOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                const mins = parseInt(btn.dataset.minutes, 10) || 5;
                this.startBreak(mins);
            });
        });

        // Context-aware End Task Early
        if (this.elements.endEarlyBtn) {
            this.elements.endEarlyBtn.addEventListener('click', () => this.handleEndTaskEarly());
        }

        // Add Task Form
        if (this.elements.dexAddForm) {
            this.elements.dexAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const text = this.elements.dexTaskInput.value;
                this.addTask(text);
                this.elements.dexTaskInput.value = '';
            });
        }

        // Pomodoro Completion Modal Event Handlers
        if (this.elements.taskCompleteBtn) {
            this.elements.taskCompleteBtn.addEventListener('click', () => {
                this.confirmTaskComplete();
            });
        }

        // Toggle +10 MIN ▾ extend popover
        if (this.elements.taskExtendBtn && this.elements.extendPopover) {
            this.elements.taskExtendBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.elements.extendPopover.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (this.elements.extendPopover && !this.elements.extendPopover.contains(e.target) && e.target !== this.elements.taskExtendBtn) {
                    this.elements.extendPopover.classList.add('hidden');
                }
            });
        }

        // Extend options (+10m, +20m, +30m)
        if (this.elements.extendOptions) {
            this.elements.extendOptions.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mins = parseInt(btn.dataset.minutes, 10) || 10;
                    this.extendFocusSession(mins);
                });
            });
        }

        // Completion Break Button (Rest before continuing pomodoro)
        if (this.elements.taskBreakBtn) {
            this.elements.taskBreakBtn.addEventListener('click', () => {
                this.hideCompletionModal();
                // Accumulate focus time from completed session before resting
                this.state.accumulatedMinutes = (this.state.accumulatedMinutes || 0) + (this.state.targetMinutes || this.state.focusMinutes || 25);
                this.startBreak(5, true);
            });
        }

        // Completion Close Button (Dismiss)
        if (this.elements.completionCloseBtn) {
            this.elements.completionCloseBtn.addEventListener('click', () => {
                this.hideCompletionModal();
                this.resetTimer();
            });
        }

        // Live Obsidian Sync Listener
        if (api && api.onTasksUpdated) {
            api.onTasksUpdated((tasks) => {
                if (tasks && Array.isArray(tasks) && tasks.length > 0) {
                    this.state.tasks = tasks;
                    this.saveTasks();
                    this.renderTasks();
                    // If current active task is no longer pending or gone, pick next
                    const current = this.state.tasks.find(t => t.id === this.state.activeTaskId);
                    if (!current || current.completed) {
                        this.bindDefaultPendingTask();
                    }
                }
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    PokePomo.init();
});
