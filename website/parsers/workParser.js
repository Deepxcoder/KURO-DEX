/**
 * Production Deep Work & Todo Markdown Parser
 * Parses pomodoro focus sessions with duration and timestamps,
 * clusters topics, computes daily & aggregate focus metrics,
 * and extracts untimed operational tasks with completion status.
 */

// Normalization dictionary for subject clustering
const TOPIC_CLUSTERS = [
  { match: /node/i, topic: 'Node.js Development' },
  { match: /mongo|mongoose/i, topic: 'MongoDB & Database' },
  { match: /gym/i, topic: 'Fitness & Health' },
  { match: /syncer|dex|widget/i, topic: 'Syncer Protocol' },
  { match: /react|frontend|css|ui/i, topic: 'Frontend Engineering' },
  { match: /python|ai|agent/i, topic: 'AI & Automation' }
];

function normalizeTopic(rawTitle) {
  if (!rawTitle) return 'General Focus';
  for (const cluster of TOPIC_CLUSTERS) {
    if (cluster.match.test(rawTitle)) {
      return cluster.topic;
    }
  }
  // Title-case fallback
  return rawTitle.split(/\s+/).slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Parses full todo.md content into daily sessions, focus metrics, and checklist items
 */
function parseTodoMarkdown(content) {
  if (!content || typeof content !== 'string') {
    return {
      days: [],
      sessionsFeed: [],
      topicLeaderboard: [],
      totalFocusTodayMinutes: 0,
      avgDailyFocusMinutes: 0,
      untimedTodos: [],
      totalTasksCount: 0,
      completedTasksCount: 0
    };
  }

  const lines = content.split(/\r?\n/);
  const days = [];
  let currentDay = null;

  // Date line pattern: e.g. "9/7/26", "9/8/26", "9/10/26", "2026-09-08"
  const dateHeaderRegex = /^#*\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\s*$/;

  // Checkbox task pattern: e.g.
  // - [x] Node Course (90m) at 11:12 AM
  // - [x] Mongo DB (38) at 11:21 AM
  // - [ ] clean wardrobe
  const taskRegex = /^-\s*\[([ xX])\]\s*(.*)$/;

  // Timed session pattern within task description:
  // e.g. "Node Course (90m) at 11:12 AM", "Go to gym early 5:30 AM (25m) at 7:57 AM", "Mongo DB (38) at 11:21 AM"
  const timedPattern = /^(.*?)\s*\((\d+)\s*m?\)\s*(?:at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?))?/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Check for date header
    const dateMatch = line.match(dateHeaderRegex);
    if (dateMatch) {
      if (currentDay) {
        days.push(finalizeDay(currentDay));
      }
      currentDay = {
        date: dateMatch[1],
        focusMinutes: 0,
        sessions: [],
        checklist: [],
        rawLines: [rawLine]
      };
      continue;
    }

    if (!currentDay) {
      // Default to "Current" if tasks appear before a date header
      currentDay = {
        date: 'Recent',
        focusMinutes: 0,
        sessions: [],
        checklist: [],
        rawLines: []
      };
    }

    currentDay.rawLines.push(rawLine);

    const taskMatch = line.match(taskRegex);
    if (taskMatch) {
      const isCompleted = taskMatch[1].toLowerCase() === 'x';
      const text = taskMatch[2].trim();

      if (!text) continue;

      const timedMatch = text.match(timedPattern);
      if (timedMatch) {
        const title = timedMatch[1].trim() || 'Focus Session';
        const minutes = parseInt(timedMatch[2], 10);
        const atTime = timedMatch[3] ? timedMatch[3].trim() : 'Logged';
        const topic = normalizeTopic(title);

        const sessionObj = {
          date: currentDay.date,
          title,
          topic,
          minutes,
          atTime,
          isCompleted,
          raw: line
        };

        currentDay.sessions.push(sessionObj);
        currentDay.focusMinutes += minutes;
      } else {
        // Untimed operational task
        currentDay.checklist.push({
          id: `task-${i}-${Math.random().toString(36).substr(2, 5)}`,
          date: currentDay.date,
          text,
          isCompleted,
          raw: line
        });
      }
    }
  }

  if (currentDay) {
    days.push(finalizeDay(currentDay));
  }

  return aggregateWorkData(days);
}

function finalizeDay(day) {
  return {
    date: day.date,
    focusMinutes: day.focusMinutes,
    hoursFormatted: (day.focusMinutes / 60).toFixed(1),
    sessions: day.sessions,
    checklist: day.checklist,
    rawSnippet: day.rawLines.join('\n')
  };
}

function aggregateWorkData(days) {
  // Sort days chronologically
  days.sort((a, b) => {
    const parseD = (str) => {
      const parts = str.split('/');
      if (parts.length === 3) {
        const year = parseInt(parts[2], 10) + (parts[2].length === 2 ? 2000 : 0);
        return new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10)).getTime();
      }
      return 0;
    };
    return parseD(a.date) - parseD(b.date);
  });

  const allSessions = [];
  const untimedTodos = [];
  const topicMap = {};
  let totalMinutesAll = 0;
  let totalTasks = 0;
  let completedTasks = 0;

  days.forEach(day => {
    day.sessions.forEach(sess => {
      allSessions.push(sess);
      totalMinutesAll += sess.minutes;
      topicMap[sess.topic] = (topicMap[sess.topic] || 0) + sess.minutes;
      totalTasks++;
      if (sess.isCompleted) completedTasks++;
    });

    day.checklist.forEach(item => {
      untimedTodos.push(item);
      totalTasks++;
      if (item.isCompleted) completedTasks++;
    });
  });

  // Latest day's focus
  const latestDay = days.length > 0 ? days[days.length - 1] : null;
  const totalFocusTodayMinutes = latestDay ? latestDay.focusMinutes : 0;
  const avgDailyFocusMinutes = days.length > 0 ? Math.round(totalMinutesAll / days.length) : 0;

  // Build topic leaderboard with percentage
  const topicLeaderboard = Object.entries(topicMap)
    .map(([topic, minutes]) => ({
      topic,
      minutes,
      hours: (minutes / 60).toFixed(1),
      percentage: totalMinutesAll > 0 ? Math.round((minutes / totalMinutesAll) * 100) : 0
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Reverse chronological session feed for dashboard timeline
  const sessionsFeed = [...allSessions].reverse();

  return {
    days,
    sessionsFeed,
    topicLeaderboard,
    totalFocusTodayMinutes,
    totalFocusTodayHours: (totalFocusTodayMinutes / 60).toFixed(1),
    avgDailyFocusMinutes,
    avgDailyFocusHours: (avgDailyFocusMinutes / 60).toFixed(1),
    totalFocusHours: (totalMinutesAll / 60).toFixed(1),
    untimedTodos,
    totalTasksCount: totalTasks,
    completedTasksCount: completedTasks,
    completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  };
}

module.exports = {
  parseTodoMarkdown,
  normalizeTopic
};
