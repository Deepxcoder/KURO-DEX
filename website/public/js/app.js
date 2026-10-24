/**
 * Main Application Orchestrator
 * View routing, Server-Sent Events (SSE) real-time subscriber,
 * system connection status, and visual state management.
 */

import { renderGymView } from './gymView.js';
import { renderWorkView } from './workView.js';

let currentMode = 'gym'; // 'gym' | 'work'
let latestData = { gym: null, work: null };
let sseConnection = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  initRealtimeSSE();
});

/**
 * Setup smooth toggle navigation
 */
function setupNavigation() {
  const toggleWrapper = document.getElementById('nav-toggle-wrapper');
  const gymBtn = document.getElementById('btn-nav-gym');
  const workBtn = document.getElementById('btn-nav-work');
  const gymPanel = document.getElementById('gym-view');
  const workPanel = document.getElementById('work-view');

  function switchView(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    if (mode === 'gym') {
      toggleWrapper.classList.remove('mode-work');
      gymBtn.classList.add('active');
      workBtn.classList.remove('active');

      workPanel.classList.remove('active');
      setTimeout(() => {
        workPanel.style.display = 'none';
        gymPanel.style.display = 'block';
        requestAnimationFrame(() => gymPanel.classList.add('active'));
      }, 150);

      if (latestData.gym) renderGymView(latestData.gym);
    } else {
      toggleWrapper.classList.add('mode-work');
      workBtn.classList.add('active');
      gymBtn.classList.remove('active');

      gymPanel.classList.remove('active');
      setTimeout(() => {
        gymPanel.style.display = 'none';
        workPanel.style.display = 'block';
        requestAnimationFrame(() => workPanel.classList.add('active'));
      }, 150);

      if (latestData.work) renderWorkView(latestData.work);
    }
  }

  gymBtn.addEventListener('click', () => switchView('gym'));
  workBtn.addEventListener('click', () => switchView('work'));
}

/**
 * Real-time SSE Connection & Auto-Reconnection
 */
function initRealtimeSSE() {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const lastSyncText = document.getElementById('last-sync-time');

  function connect() {
    if (sseConnection) {
      sseConnection.close();
    }

    try {
      sseConnection = new EventSource('/api/stream');

      sseConnection.addEventListener('initial', (e) => {
        const payload = JSON.parse(e.data);
        latestData = payload.data;
        updateStatus(true, payload.status?.isLiveObsidian, payload.status?.lastSync);
        renderCurrentView();
      });

      sseConnection.addEventListener('update', (e) => {
        const payload = JSON.parse(e.data);
        console.log('[SSE] Real-time file change detected:', payload.filePath);
        latestData = payload.data;
        flashSyncIndicator();
        updateStatus(true, true, payload.data.lastSync);
        renderCurrentView();
      });

      sseConnection.addEventListener('ping', () => {
        // Heartbeat received
      });

      sseConnection.onopen = () => {
        updateStatus(true, true, new Date().toISOString());
      };

      sseConnection.onerror = () => {
        console.warn('[SSE] Connection lost. Falling back to HTTP polling in 5s...');
        updateStatus(false, false);
        sseConnection.close();
        setTimeout(fallbackHttpFetch, 2000);
      };
    } catch (err) {
      console.error('[SSE Init Error]', err);
      fallbackHttpFetch();
    }
  }

  function updateStatus(isOnline, isLiveObsidian, lastSync) {
    if (isOnline) {
      statusDot.className = 'status-dot pulsing';
      statusText.textContent = isLiveObsidian ? 'Live Vault Connected' : 'Snapshot Demo Mode';
      if (lastSync) {
        const timeStr = new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        lastSyncText.textContent = `Synced ${timeStr}`;
      }
    } else {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Reconnecting...';
    }
  }

  function flashSyncIndicator() {
    statusDot.style.transform = 'scale(1.8)';
    setTimeout(() => {
      statusDot.style.transform = '';
    }, 400);
  }

  function fallbackHttpFetch() {
    fetch('/api/all')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          latestData = { gym: result.gym, work: result.work };
          updateStatus(true, result.status?.isLiveObsidian, result.status?.lastSync);
          renderCurrentView();
        }
      })
      .catch(err => {
        console.error('[Fallback Fetch Error]', err);
        updateStatus(false, false);
      });
  }

  connect();

  // Retry SSE connection every 15 seconds if disconnected
  setInterval(() => {
    if (!sseConnection || sseConnection.readyState === EventSource.CLOSED) {
      connect();
    }
  }, 15000);
}

function renderCurrentView() {
  if (latestData.gym) renderGymView(latestData.gym);
  if (latestData.work) renderWorkView(latestData.work);
}
