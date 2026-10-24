/**
 * Widget Manager — Controller (manager.js)
 * Controls Widget Visibility, Companion Theme Selection, and Live Telemetry
 */

document.addEventListener('DOMContentLoaded', () => {
    const api = window.electronAPI || window.syncerAPI;

    // Elements
    const pathDisplay = document.getElementById('md-path-display');
    const btnChange = document.getElementById('btn-change-path');
    const visibilityToggle = document.getElementById('visibility-toggle');
    const desktopPinToggle = document.getElementById('desktop-pin-toggle') || document.getElementById('pin-toggle');
    const alwaysOnTopToggle = document.getElementById('always-on-top-toggle');
    const themeSelect = document.getElementById('theme-select');
    const closeBtn = document.getElementById('manager-close-btn');
    const metricPrimary = document.getElementById('metric-primary');
    const metricSub = document.getElementById('metric-sub');

    // 1. Initial State Sync
    if (api) {
        if (api.getCurrentPath && pathDisplay) {
            api.getCurrentPath().then(p => {
                pathDisplay.textContent = p || 'None selected (Click Browse)';
                pathDisplay.title = p || '';
            }).catch(() => {});
        }

        if (api.getWidgetVisibility) {
            api.getWidgetVisibility().then(isVisible => {
                if (visibilityToggle) visibilityToggle.checked = !!isVisible;
            }).catch(() => {});
        }

        if (api.getDesktopPinned) {
            api.getDesktopPinned().then(isPinned => {
                if (desktopPinToggle) desktopPinToggle.checked = !!isPinned;
            }).catch(() => {});
        } else if (api.getWidgetPinned) {
            api.getWidgetPinned().then(isPinned => {
                if (desktopPinToggle) desktopPinToggle.checked = !!isPinned;
            }).catch(() => {});
        }

        if (api.getAlwaysOnTop) {
            api.getAlwaysOnTop().then(isOnTop => {
                if (alwaysOnTopToggle) alwaysOnTopToggle.checked = !!isOnTop;
            }).catch(() => {});
        }

        if (api.getCurrentTheme) {
            api.getCurrentTheme().then(theme => {
                if (theme && themeSelect) themeSelect.value = theme;
            }).catch(() => {});
        }

        // Listener for visibility changes emitted from main/widget
        if (api.onWidgetVisibilityChanged) {
            api.onWidgetVisibilityChanged(isVisible => {
                if (visibilityToggle) visibilityToggle.checked = isVisible;
            });
        }

        // Listener for real-time telemetry metrics (every 2s)
        const updateMetricsDisplay = (metrics) => {
            if (!metrics) return;
            const totalCpu = Number(metrics.totalCpu || 0).toFixed(1);
            const totalRam = Math.round(Number(metrics.totalRamMb || metrics.totalMem || 0));
            const widgetCpu = Number(metrics.widgetCpu || 0).toFixed(1);
            const widgetRam = Math.round(Number(metrics.widgetRamMb || metrics.widgetMem || 0));

            if (metricPrimary) {
                metricPrimary.textContent = `TOTAL CPU: ${totalCpu}% | RAM: ${totalRam} MB`;
            }
            if (metricSub) {
                metricSub.textContent = `Task Dex Usage: CPU ${widgetCpu}% | RAM ${widgetRam} MB`;
            }
        };

        if (api.onResourceMetrics) {
            api.onResourceMetrics(updateMetricsDisplay);
        } else if (api.onMetricsUpdate) {
            api.onMetricsUpdate(updateMetricsDisplay);
        }
    }

    // 2. Control Event Listeners
    if (btnChange && api && api.pickMdFile) {
        btnChange.addEventListener('click', async () => {
            try {
                const newPath = await api.pickMdFile();
                if (newPath && pathDisplay) {
                    pathDisplay.textContent = newPath;
                    pathDisplay.title = newPath;
                }
            } catch (err) {
                console.error('[Manager Error] Failed picking MD file:', err);
            }
        });
    }

    if (visibilityToggle && api && api.toggleWidget) {
        visibilityToggle.addEventListener('change', async () => {
            const isChecked = visibilityToggle.checked;
            try {
                await api.toggleWidget(isChecked);
            } catch (err) {
                console.error('[Manager Error] Failed toggling widget visibility:', err);
            }
        });
    }

    if (desktopPinToggle && api && (api.toggleDesktopPin || api.toggleWidgetPin)) {
        desktopPinToggle.addEventListener('change', async () => {
            const isPinned = desktopPinToggle.checked;
            try {
                if (api.toggleDesktopPin) {
                    await api.toggleDesktopPin(isPinned);
                } else {
                    await api.toggleWidgetPin(isPinned);
                }
            } catch (err) {
                console.error('[Manager Error] Failed toggling desktop pin:', err);
            }
        });
    }

    if (alwaysOnTopToggle && api && api.toggleAlwaysOnTop) {
        alwaysOnTopToggle.addEventListener('change', async () => {
            const isOnTop = alwaysOnTopToggle.checked;
            try {
                await api.toggleAlwaysOnTop(isOnTop);
            } catch (err) {
                console.error('[Manager Error] Failed toggling always on top:', err);
            }
        });
    }

    if (themeSelect && api && api.setTheme) {
        themeSelect.addEventListener('change', async () => {
            const selectedTheme = themeSelect.value;
            try {
                await api.setTheme(selectedTheme);
            } catch (err) {
                console.error('[Manager Error] Failed updating theme:', err);
            }
        });
    }

    if (closeBtn && api && api.closeManager) {
        closeBtn.addEventListener('click', () => {
            api.closeManager();
        });
    }

    // Window Dragging for Manager Header
    const managerDrag = document.getElementById('manager-drag');
    if (managerDrag && api && api.moveWindowDelta) {
        let isDragging = false;
        let lastScreenX = 0;
        let lastScreenY = 0;

        managerDrag.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('button')) return;

            isDragging = true;
            lastScreenX = e.screenX;
            lastScreenY = e.screenY;
            try { managerDrag.setPointerCapture(e.pointerId); } catch (err) {}
            document.body.classList.add('is-dragging');
        });

        managerDrag.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const dx = e.screenX - lastScreenX;
            const dy = e.screenY - lastScreenY;
            if (dx !== 0 || dy !== 0) {
                lastScreenX = e.screenX;
                lastScreenY = e.screenY;
                api.moveWindowDelta(dx, dy);
            }
        });

        const stopDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            try { managerDrag.releasePointerCapture(e.pointerId); } catch (err) {}
            document.body.classList.remove('is-dragging');
        };

        managerDrag.addEventListener('pointerup', stopDrag);
        managerDrag.addEventListener('pointercancel', stopDrag);
    }
});
