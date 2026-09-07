/**
 * Widget Manager — Controller (manager.js)
 * Controls Widget Visibility, Companion Theme Selection, and Live Telemetry
 */

document.addEventListener('DOMContentLoaded', () => {
    const api = window.electronAPI || window.syncerAPI;

    // Elements
    const visibilityToggle = document.getElementById('visibility-toggle');
    const pinToggle = document.getElementById('pin-toggle');
    const themeSelect = document.getElementById('theme-select');
    const closeBtn = document.getElementById('manager-close-btn');
    const metricPrimary = document.getElementById('metric-primary');
    const metricSub = document.getElementById('metric-sub');

    // 1. Initial State Sync
    if (api) {
        if (api.getWidgetVisibility) {
            api.getWidgetVisibility().then(isVisible => {
                if (visibilityToggle) visibilityToggle.checked = !!isVisible;
            }).catch(() => {});
        }

        if (api.getWidgetPinned) {
            api.getWidgetPinned().then(isPinned => {
                if (pinToggle) pinToggle.checked = !!isPinned;
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
        if (api.onResourceMetrics) {
            api.onResourceMetrics(metrics => {
                if (!metrics) return;

                const totalCpu = Number(metrics.totalCpu || 0).toFixed(1);
                const totalRam = Math.round(Number(metrics.totalRamMb || 0));
                const widgetCpu = Number(metrics.widgetCpu || 0).toFixed(1);
                const widgetRam = Math.round(Number(metrics.widgetRamMb || 0));

                if (metricPrimary) {
                    metricPrimary.textContent = `TOTAL CPU: ${totalCpu}% | RAM: ${totalRam} MB`;
                }
                if (metricSub) {
                    metricSub.textContent = `Task Dex Usage: CPU ${widgetCpu}% | RAM ${widgetRam} MB`;
                }
            });
        }
    }

    // 2. Control Event Listeners
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

    if (pinToggle && api && api.toggleWidgetPin) {
        pinToggle.addEventListener('change', async () => {
            const isPinned = pinToggle.checked;
            try {
                await api.toggleWidgetPin(isPinned);
            } catch (err) {
                console.error('[Manager Error] Failed toggling widget pin:', err);
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
});
