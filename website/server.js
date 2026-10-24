/**
 * Glassmorphic Obsidian Dashboard - Production Express Server
 * Real-time Chokidar File Watcher + Server-Sent Events (SSE) Engine
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');

const { parseWorkoutMarkdown } = require('./parsers/gymParser');
const { parseTodoMarkdown } = require('./parsers/workParser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic file path resolution with multi-candidate search
const OBSIDIAN_VAULT_ROOT = process.env.OBSIDIAN_VAULT || 'C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault';

const SAMPLE_WORKOUT_PATH = path.join(__dirname, 'data', 'Workout.sample.md');
const SAMPLE_TODO_PATH = path.join(__dirname, 'data', 'todo.sample.md');

function findFirstExistingPath(candidates, fallback) {
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return fallback;
}

const workoutFilePath = process.env.WORKOUT_FILE || findFirstExistingPath([
  path.join(OBSIDIAN_VAULT_ROOT, 'Personal', 'Workout.md'),
  path.join(OBSIDIAN_VAULT_ROOT, 'Workout.md'),
  path.join(__dirname, '..', 'vault', 'Workout.md'),
  path.join(__dirname, '..', 'web-player', 'data', 'Workout.sample.md')
], SAMPLE_WORKOUT_PATH);

const todoFilePath = process.env.TODO_FILE || findFirstExistingPath([
  path.join(OBSIDIAN_VAULT_ROOT, 'Personal', 'todo.md'),
  path.join(OBSIDIAN_VAULT_ROOT, 'Todo\'s', 'todo.md'),
  path.join(OBSIDIAN_VAULT_ROOT, 'todo.md'),
  path.join(__dirname, '..', 'vault', 'todo.md'),
  path.join(__dirname, '..', 'web-player', 'data', 'todo.sample.md')
], SAMPLE_TODO_PATH);

const isUsingObsidianLive = workoutFilePath.startsWith(OBSIDIAN_VAULT_ROOT) || todoFilePath.startsWith(OBSIDIAN_VAULT_ROOT);

let lastSyncTimestamp = new Date().toISOString();
let cachedGymData = null;
let cachedWorkData = null;

// Read and parse files with error resilience
function readDataSources() {
  try {
    const workoutRaw = fs.existsSync(workoutFilePath)
      ? fs.readFileSync(workoutFilePath, 'utf8')
      : fs.readFileSync(SAMPLE_WORKOUT_PATH, 'utf8');
    cachedGymData = parseWorkoutMarkdown(workoutRaw);
  } catch (err) {
    console.error('[Gym Parser Error]', err);
    if (!cachedGymData) cachedGymData = parseWorkoutMarkdown('');
  }

  try {
    const todoRaw = fs.existsSync(todoFilePath)
      ? fs.readFileSync(todoFilePath, 'utf8')
      : fs.readFileSync(SAMPLE_TODO_PATH, 'utf8');
    cachedWorkData = parseTodoMarkdown(todoRaw);
  } catch (err) {
    console.error('[Work Parser Error]', err);
    if (!cachedWorkData) cachedWorkData = parseTodoMarkdown('');
  }

  lastSyncTimestamp = new Date().toISOString();
  return { gym: cachedGymData, work: cachedWorkData, lastSync: lastSyncTimestamp };
}

// Initial read
readDataSources();

// SSE Client Registry
const sseClients = new Set();

function broadcastSSE(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// Chokidar Watcher Setup
const filesToWatch = [workoutFilePath, todoFilePath].filter(p => fs.existsSync(p));

if (filesToWatch.length > 0) {
  const watcher = chokidar.watch(filesToWatch, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 150,
      pollInterval: 50
    }
  });

  let debounceTimeout = null;
  watcher.on('all', (event, filePath) => {
    console.log(`[Watcher] File ${event}: ${filePath}`);
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      const freshData = readDataSources();
      console.log(`[Watcher] Broadcast fresh state to ${sseClients.size} clients`);
      broadcastSSE('update', {
        type: 'file_change',
        filePath,
        data: freshData
      });
    }, 120);
  });

  console.log(`[Watcher] Actively watching ${filesToWatch.length} files:`);
  filesToWatch.forEach(f => console.log(`  -> ${f}`));
} else {
  console.log('[Watcher] Running in static/serverless mode without local watcher.');
}

// Keep-alive heartbeat every 20 seconds
setInterval(() => {
  if (sseClients.size > 0) {
    broadcastSSE('ping', { time: new Date().toISOString() });
  }
}, 20000);

// API Endpoints
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial payload
  const currentData = readDataSources();
  res.write(`event: initial\ndata: ${JSON.stringify({
    data: currentData,
    status: {
      isLiveObsidian: isUsingObsidianLive,
      workoutPath: workoutFilePath,
      todoPath: todoFilePath,
      lastSync: lastSyncTimestamp
    }
  })}\n\n`);

  sseClients.add(res);
  console.log(`[SSE] Client connected. Active clients: ${sseClients.size}`);

  req.on('close', () => {
    sseClients.delete(res);
    console.log(`[SSE] Client disconnected. Active clients: ${sseClients.size}`);
  });
});

app.get('/api/gym', (req, res) => {
  const data = readDataSources();
  res.json({ success: true, data: data.gym, lastSync: lastSyncTimestamp });
});

app.get('/api/work', (req, res) => {
  const data = readDataSources();
  res.json({ success: true, data: data.work, lastSync: lastSyncTimestamp });
});

app.get('/api/all', (req, res) => {
  const data = readDataSources();
  res.json({
    success: true,
    gym: data.gym,
    work: data.work,
    status: {
      isLiveObsidian: isUsingObsidianLive,
      workoutPath: workoutFilePath,
      todoPath: todoFilePath,
      lastSync: lastSyncTimestamp
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    isLiveObsidian: isUsingObsidianLive,
    workoutPath: workoutFilePath,
    todoPath: todoFilePath,
    clientSubscribers: sseClients.size,
    lastSync: lastSyncTimestamp,
    uptimeSeconds: Math.floor(process.uptime())
  });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Glassmorphic Obsidian Dashboard running at:`);
    console.log(`   http://localhost:${PORT}`);
    console.log(`   Live Vault Connection: ${isUsingObsidianLive ? '🟢 ONLINE (Obsidian Vault)' : '🟡 DEMO MODE (Snapshot)'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
