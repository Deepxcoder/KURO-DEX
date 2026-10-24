/**
 * Deep Work & Study Tracker View Renderer
 * Manages Focus KPI rail, Topic Leaderboard progress bars,
 * Chronological Session Feed, and Interactive To-Do Checklist.
 */

export function renderWorkView(workData) {
  if (!workData) return;

  // 1. Render Top Focus KPIs
  document.getElementById('work-today-hours').textContent = workData.totalFocusTodayHours;
  document.getElementById('work-today-sub').textContent = `${workData.totalFocusTodayMinutes} min focused today`;
  document.getElementById('work-avg-hours').textContent = workData.avgDailyFocusHours;
  document.getElementById('work-total-hours').textContent = workData.totalFocusHours;
  document.getElementById('work-completion-rate').textContent = `${workData.completionRate}%`;

  // 2. Render Topic Leaderboard
  renderTopicLeaderboard(workData.topicLeaderboard);

  // 3. Render Chronological Session Feed
  renderSessionFeed(workData.sessionsFeed);

  // 4. Render Interactive To-Do Checklist
  renderChecklist(workData.untimedTodos);
}

function renderTopicLeaderboard(topics) {
  const container = document.getElementById('topic-leaderboard-list');
  if (!container) return;

  if (!topics || topics.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">No topics logged yet.</p>`;
    return;
  }

  container.innerHTML = topics.map(t => `
    <div class="topic-row">
      <div class="topic-row-header">
        <span class="topic-name">
          <span style="color:var(--accent-work);">●</span> ${escapeHtml(t.topic)}
        </span>
        <span class="topic-time">${t.hours}h (${t.percentage}%)</span>
      </div>
      <div class="topic-bar-bg">
        <div class="topic-bar-fill" style="width: ${Math.max(5, t.percentage)}%;"></div>
      </div>
    </div>
  `).join('');
}

function renderSessionFeed(sessions) {
  const container = document.getElementById('work-session-feed');
  if (!container) return;

  if (!sessions || sessions.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">No focus sessions logged yet.</p>`;
    return;
  }

  container.innerHTML = sessions.map(s => `
    <div class="work-session-card">
      <div class="work-session-info">
        <div class="work-session-title">${escapeHtml(s.title)}</div>
        <div class="work-session-meta">
          <span>📅 ${escapeHtml(s.date)}</span>
          <span>⏱️ ${escapeHtml(s.atTime)}</span>
          <span style="color:var(--accent-work);">${escapeHtml(s.topic)}</span>
        </div>
      </div>
      <div class="duration-pill">
        ${s.minutes}m
      </div>
    </div>
  `).join('');
}

function renderChecklist(todos) {
  const container = document.getElementById('untimed-checklist-feed');
  if (!container) return;

  if (!todos || todos.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:13px;">No untimed tasks in todo.md.</p>`;
    return;
  }

  container.innerHTML = todos.map(todo => `
    <div class="checklist-item ${todo.isCompleted ? 'completed' : ''}" data-id="${todo.id}">
      <div class="custom-checkbox">
        <svg viewBox="0 0 24 24" fill="none">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span class="checklist-text">${escapeHtml(todo.text)}</span>
      <span class="checklist-date">${escapeHtml(todo.date)}</span>
    </div>
  `).join('');

  // Interactive toggle with instant strikethrough feedback
  container.querySelectorAll('.checklist-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('completed');
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
