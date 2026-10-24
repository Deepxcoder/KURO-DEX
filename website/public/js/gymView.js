/**
 * Gym Analytics View Renderer
 * Manages KPI metric cards, Chart.js progressive overload graph,
 * and expandable session timeline cards with raw snippet toggles.
 */

let overloadChart = null;
let currentExerciseKey = null;

export function renderGymView(gymData) {
  if (!gymData) return;

  // 1. Render Top KPI Metric Cards
  document.getElementById('gym-weekly-tonnage').textContent = gymData.weeklyTonnage.toLocaleString();
  document.getElementById('gym-volume-density').textContent = gymData.volumeDensity;
  document.getElementById('gym-warmup-rate').textContent = gymData.warmupConsistency;
  document.getElementById('gym-total-workouts').textContent = gymData.totalWorkouts;

  // 2. Setup Progressive Overload Chart & Exercise Dropdown
  setupOverloadChart(gymData.exercisesCatalog);

  // 3. Render Session Timeline Cards
  renderSessionTimeline(gymData.sessions);
}

/**
 * Initializes and updates Progressive Overload Chart
 */
function setupOverloadChart(catalog) {
  const dropdown = document.getElementById('exercise-select');
  if (!dropdown) return;

  const exerciseKeys = Object.keys(catalog || {});
  if (exerciseKeys.length === 0) return;

  // Preserve selection if still valid, else pick first popular exercise
  const previousVal = dropdown.value;
  dropdown.innerHTML = '';

  exerciseKeys.sort().forEach(key => {
    const item = catalog[key];
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${item.name} (${item.code || key}) - ${item.history.length} sessions`;
    dropdown.appendChild(opt);
  });

  if (previousVal && catalog[previousVal]) {
    dropdown.value = previousVal;
    currentExerciseKey = previousVal;
  } else {
    // Pick WLP or DIP or first key
    const preferred = exerciseKeys.find(k => /wlp|dip|bayesian/i.test(k)) || exerciseKeys[0];
    dropdown.value = preferred;
    currentExerciseKey = preferred;
  }

  dropdown.onchange = () => {
    currentExerciseKey = dropdown.value;
    updateChartData(catalog[currentExerciseKey]);
  };

  updateChartData(catalog[currentExerciseKey]);
}

function updateChartData(exerciseItem) {
  if (!exerciseItem || !window.Chart) return;

  const ctx = document.getElementById('overload-chart-canvas').getContext('2d');
  const history = exerciseItem.history || [];

  const labels = history.map(h => h.date);
  const weights = history.map(h => h.maxWeight);
  const totalReps = history.map(h => h.totalReps);

  if (overloadChart) {
    overloadChart.destroy();
  }

  // Create gradient for Weight
  const gradientAmber = ctx.createLinearGradient(0, 0, 0, 300);
  gradientAmber.addColorStop(0, 'rgba(255, 107, 0, 0.45)');
  gradientAmber.addColorStop(1, 'rgba(255, 107, 0, 0.0)');

  overloadChart = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Max Load (kg)',
          data: weights,
          borderColor: '#FF6B00',
          backgroundColor: gradientAmber,
          borderWidth: 3,
          pointBackgroundColor: '#FF6B00',
          pointBorderColor: '#08080A',
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          fill: true,
          tension: 0.35,
          yAxisID: 'y'
        },
        {
          label: 'Total Reps',
          data: totalReps,
          borderColor: '#00E5FF',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#00E5FF',
          pointBorderColor: '#08080A',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.35,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#FFFFFF',
            font: { family: 'Space Mono', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(18, 18, 24, 0.95)',
          titleColor: '#FF6B00',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          titleFont: { family: 'Space Mono', weight: 'bold' },
          bodyFont: { family: 'Space Mono' }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { family: 'Space Mono' } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#FF6B00', font: { family: 'Space Mono' } },
          title: { display: true, text: 'Weight (kg)', color: '#FF6B00', font: { family: 'Space Mono', size: 11 } }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { drawOnChartArea: false },
          ticks: { color: '#00E5FF', font: { family: 'Space Mono' } },
          title: { display: true, text: 'Reps', color: '#00E5FF', font: { family: 'Space Mono', size: 11 } }
        }
      }
    }
  });
}

/**
 * Renders Session Timeline Feed
 */
function renderSessionTimeline(sessions) {
  const container = document.getElementById('gym-timeline-feed');
  if (!container) return;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `<div class="glass-card"><p style="color:var(--text-muted);">No workout sessions logged yet.</p></div>`;
    return;
  }

  // Display sessions in reverse chronological order
  const displaySessions = [...sessions].reverse();

  container.innerHTML = displaySessions.map((sess, idx) => {
    const cardId = `gym-session-${idx}`;
    const cleanViewId = `clean-view-${cardId}`;
    const rawViewId = `raw-view-${cardId}`;

    const exercisesHtml = sess.exercises.map(ex => {
      const setsHtml = ex.sets.map(s => {
        const repsText = s.clusterReps ? s.clusterReps.join('+') : (s.totalReps || s.reps);
        const weightText = s.isBW ? (s.addedWeight ? `BW+${s.addedWeight}` : 'BW') : `${s.weight}kg`;
        return `
          <div class="set-chip" title="${s.raw}">
            <span class="reps-num">${repsText}</span>
            <span class="weight-num">@ ${weightText}</span>
          </div>
        `;
      }).join('');

      const tagsHtml = ex.tags.map(t => {
        let tagClass = 'rest-pause';
        if (t.includes('Partial')) tagClass = 'partial';
        else if (t.includes('Near-Full')) tagClass = 'near-full';
        else if (t.includes('Drop')) tagClass = 'drop-set';
        else if (t.includes('Bodyweight')) tagClass = 'bw-cluster';
        return `<span class="tag-chip ${tagClass}">${t}</span>`;
      }).join(' ');

      return `
        <div class="exercise-item">
          <div class="exercise-identity">
            <div class="exercise-title">
              ${escapeHtml(ex.name)}
              <span class="exercise-code-badge">${escapeHtml(ex.code)}</span>
              ${tagsHtml}
            </div>
            <div class="exercise-split-sub">
              ${escapeHtml(ex.split)} • Max: ${ex.maxWeight}kg • Vol: ${ex.totalVolume}kg
            </div>
          </div>
          <div class="sets-wrap">
            ${setsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="session-card" id="${cardId}">
        <div class="session-header-row">
          <div class="session-date-badge">
            <span class="date-tag">${sess.date}</span>
            <span class="split-pill">${escapeHtml(sess.split)}</span>
            ${sess.hasStretching ? `<span class="tag-chip bw-cluster" style="font-size:11px;">🧘 ${escapeHtml(sess.stretchingDetails || 'Warmup')}</span>` : ''}
          </div>
          <div class="session-meta-stats">
            <span>⚡ <strong>${sess.totalVolumeKg.toLocaleString()}</strong> kg</span>
            <span>🔥 <strong>${sess.totalSets}</strong> sets</span>
            <span>⏱️ <strong>${sess.estimatedMinutes}</strong>m</span>
            <div class="card-view-toggle">
              <button class="card-view-btn active" data-target="clean" data-card="${cardId}">Parsed Card</button>
              <button class="card-view-btn" data-target="raw" data-card="${cardId}">Raw Snippet</button>
            </div>
          </div>
        </div>

        <div class="exercise-list" id="${cleanViewId}">
          ${exercisesHtml}
        </div>

        <pre class="raw-snippet-container" id="${rawViewId}">${escapeHtml(sess.rawSnippet)}</pre>
      </div>
    `;
  }).join('');

  // Attach card toggle listeners
  container.querySelectorAll('.card-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const cardId = e.currentTarget.getAttribute('data-card');
      const target = e.currentTarget.getAttribute('data-target');
      const cardEl = document.getElementById(cardId);
      if (!cardEl) return;

      const cleanEl = cardEl.querySelector(`#clean-view-${cardId}`);
      const rawEl = cardEl.querySelector(`#raw-view-${cardId}`);
      const buttons = cardEl.querySelectorAll('.card-view-btn');

      buttons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      if (target === 'raw') {
        cleanEl.style.display = 'none';
        rawEl.classList.add('active');
      } else {
        cleanEl.style.display = 'flex';
        rawEl.classList.remove('active');
      }
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
