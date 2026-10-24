const fs = require('fs');
const path = require('path');
const { parseWorkoutMarkdown } = require('./gymParser');
const { parseTodoMarkdown } = require('./workParser');

console.log('=== TESTING PARSERS ===\n');

// 1. Test Gym Parser with real file or sample
const workoutPath = 'C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault\\Workout.md';
let workoutContent = '';
if (fs.existsSync(workoutPath)) {
  workoutContent = fs.readFileSync(workoutPath, 'utf8');
  console.log(`[OK] Loaded real Workout.md (${workoutContent.length} bytes)`);
} else {
  console.log('[WARN] Workout.md not found, using mock string');
  workoutContent = `9/9/26. 5 44AM
5:44 TO 5 :54 STRETCHING
wild lat pull down = WLP 13X30 15X30 16X30
bar tricep extension = BAR TE 13X40 14X40 13X40

9/10/26 6:22 AM
LEG
leg externsion = LE 15X60 11_1'X60 11X60
ABS
prrral bar = PB 20,5,5 X BW 10,5 X BW

9/14/26 6:15 AM
Stretching till 6 24
Drop set 0to9x24,9to18x19,19to48x9
Hammer curl cable 10x50 8_2x50 8_1* _1x50'`;
}

const gymData = parseWorkoutMarkdown(workoutContent);
console.log(`Parsed ${gymData.sessions.length} gym sessions`);
console.log(`Weekly Tonnage: ${gymData.weeklyTonnage} kg`);
console.log(`Volume Density: ${gymData.volumeDensity} kg/min`);
console.log(`Warmup Consistency: ${gymData.warmupConsistency}%`);
console.log(`Total Workouts: ${gymData.totalWorkouts}`);
console.log(`Exercises Tracked: ${Object.keys(gymData.exercisesCatalog).length}`);
if (gymData.sessions[0]) {
  console.log('\nSample Session 0:');
  console.log(`  Date: ${gymData.sessions[0].date}, Time: ${gymData.sessions[0].startTime}`);
  console.log(`  Split: ${gymData.sessions[0].split}, Stretching: ${gymData.sessions[0].stretchingDetails}`);
  console.log(`  Exercises count: ${gymData.sessions[0].exercises.length}`);
  console.log(`  First exercise:`, JSON.stringify(gymData.sessions[0].exercises[0]));
}

// 2. Test Work Parser with real file or sample
const possibleTodoPaths = [
  "C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault\\Personal\\todo.md",
  "C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault\\Todo's\\todo.md",
  "C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault\\todo.md"
];
const todoPath = possibleTodoPaths.find(p => fs.existsSync(p));
let todoContent = '';
if (todoPath) {
  todoContent = fs.readFileSync(todoPath, 'utf8');
  console.log(`\n[OK] Loaded real todo.md from ${todoPath} (${todoContent.length} bytes)`);
} else {
  console.log('\n[WARN] todo.md not found, using mock string');
  todoContent = `9/7/26
- [x] Go to gym early 5:30 AM (25m) at 7:57 AM
- [x] start the node course (178m) at 10:55 AM
- [ ] clean wardrobe

9/8/26
- [x] Node Course (90m) at 11:12 AM
- [x] Node Course (43m) at 11:55 AM`;
}

const workData = parseTodoMarkdown(todoContent);
console.log(`\nParsed ${workData.days.length} work days`);
console.log(`Total Focus Today: ${workData.totalFocusTodayMinutes} min (${workData.totalFocusTodayHours}h)`);
console.log(`Avg Daily Focus: ${workData.avgDailyFocusMinutes} min`);
console.log(`Topic Leaderboard:`, workData.topicLeaderboard);
console.log(`Total Feed Sessions: ${workData.sessionsFeed.length}`);
console.log(`Untimed Tasks: ${workData.untimedTodos.length}`);
console.log(`Completion Rate: ${workData.completionRate}%`);

console.log('\n=== PARSER TESTS COMPLETED SUCCESSFULLY ===');
