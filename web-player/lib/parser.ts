import { WorkoutSession, WorkoutExercise, WorkoutSet } from './types';

const DEFAULT_BW_KG = 75; // Baseline weight for bodyweight movements

const EXERCISE_SPLIT_MAP: { match: RegExp; split: string }[] = [
  { match: /wlp|wlpd|lat pull|wbrows|barbell row|machine row|rear delt|back|pulldown|pec dec fly|row/i, split: 'Pull / Back' },
  { match: /dip|cmp|ccf|cohp|incline push|chest press|chest fly|incline press|flat press|push tricep|chest|bench/i, split: 'Push / Chest' },
  { match: /le|llc|sce|calf|leg ext|leg curl|seated calf|squat|bulgerian|bulgarian|rdl|deadlift|leg press|split squat|legs/i, split: 'Legs' },
  { match: /pb|absm|prrral bar|parallel bar|abs machine|abs|core|plank|rollout|leg raise|crunch/i, split: 'Abs / Core' },
  { match: /bayesian|curl|chammer|hammer curl|barbell curl|forearm|cross te|bar te|tricep extension|bicep|tricep|skull crusher|preacher|rope pushdown|pushdown|arms/i, split: 'Arms' },
  { match: /dlr|lateral raise|smith shurg|smith shrug|shrug|shoulder|overhead press|ohp|face pull|seated shoulder/i, split: 'Shoulders' }
];

export function inferSplit(text: string): string {
  if (!text) return 'Strength';
  for (const item of EXERCISE_SPLIT_MAP) {
    if (item.match.test(text)) {
      return item.split;
    }
  }
  return 'Strength & Hypertrophy';
}

/**
 * Parses individual set tokens:
 * e.g., 10x50, 8_2x50, 11_1'x60, 10_1*x10, 15x10-10, 20,5,5 X BW, 0to9x24, 1m37xBW
 */
export function parseSetToken(token: string, index: number, isExerciseDone: boolean = false): WorkoutSet | null {
  const clean = token.trim().replace(/[;,]+$/, '');
  if (!clean) return null;

  const tags: string[] = [];
  let reps = 0;
  let weight = 0;
  let totalReps = 0;
  let isBW = false;
  let addedWeight = 0;

  // 1. Drop Set notation: e.g. 0to9x24, 9to18x19, 19to48x9
  const dropMatch = clean.match(/^(\d+)to(\d+)[xX](\d+(?:\.\d+)?)$/i);
  if (dropMatch) {
    const from = parseInt(dropMatch[1], 10);
    const to = parseInt(dropMatch[2], 10);
    reps = Math.max(1, to - from);
    totalReps = reps;
    weight = parseFloat(dropMatch[3]);
    tags.push('Drop Set');
    return {
      setId: `set-${index}-${clean}`,
      reps,
      totalReps,
      weight,
      isBW: false,
      tags,
      raw: clean,
      completed: isExerciseDone
    };
  }

  // 2. Bilateral Dumbbell notation: e.g. 15x10-10 or 12x12.5-12.5
  const dbMatch = clean.match(/^([^xX]+)[xX](\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/i);
  if (dbMatch) {
    const repPart = dbMatch[1].trim();
    const segs = repPart.split(/[_,\s]+/).map(seg => {
      const num = parseInt(seg.replace(/['*]/g, ''), 10);
      return isNaN(num) ? 0 : num;
    });
    totalReps = segs.reduce((sum, n) => sum + n, 0);
    reps = segs[0] || totalReps;
    // Total bilateral moving mass is both dumbbells combined
    const singleDb = parseFloat(dbMatch[2]);
    weight = singleDb + parseFloat(dbMatch[3]);
    tags.push(`Dumbbells (${singleDb}kg ea)`);
    return {
      setId: `set-${index}-${clean}`,
      reps,
      totalReps,
      weight,
      isBW: false,
      tags,
      raw: clean,
      completed: isExerciseDone
    };
  }

  // 3. Bodyweight cluster notation: e.g. 20,5,5 X BW or 10,5 X BW
  const bwClusterMatch = clean.match(/^([\d,\s_]+)[xX]\s*BW(?:\+(\d+(?:\.\d+)?))?$/i);
  if (bwClusterMatch) {
    const repParts = bwClusterMatch[1].split(/[,_]/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    totalReps = repParts.reduce((a, b) => a + b, 0);
    addedWeight = bwClusterMatch[2] ? parseFloat(bwClusterMatch[2]) : 0;
    weight = DEFAULT_BW_KG + addedWeight;
    isBW = true;
    tags.push('Bodyweight Cluster');
    return {
      setId: `set-${index}-${clean}`,
      reps: repParts[0] || totalReps,
      clusterReps: repParts,
      totalReps,
      weight,
      addedWeight,
      isBW: true,
      tags,
      raw: clean,
      completed: isExerciseDone
    };
  }

  // 4. Timed isometric hold: e.g. 1m37xBW or 1m02xBW
  const timeHoldMatch = clean.match(/^(\d+)m(\d+)(?:s)?[xX]\s*BW/i);
  if (timeHoldMatch) {
    totalReps = parseInt(timeHoldMatch[1], 10) * 60 + parseInt(timeHoldMatch[2], 10);
    reps = totalReps;
    weight = DEFAULT_BW_KG;
    isBW = true;
    tags.push('Timed Hold (Plank)');
    return {
      setId: `set-${index}-${clean}`,
      reps,
      totalReps,
      weight,
      isBW: true,
      tags,
      raw: clean,
      completed: isExerciseDone
    };
  }

  // 5. Bodyweight single notation: e.g. 15xBW or 22xBW
  if (/x\s*bw/i.test(clean) || /^bw/i.test(clean)) {
    const bwMatch = clean.match(/(\d+)\s*[xX]\s*BW(?:\+(\d+(?:\.\d+)?))?/i);
    if (bwMatch) {
      reps = parseInt(bwMatch[1], 10);
      addedWeight = bwMatch[2] ? parseFloat(bwMatch[2]) : 0;
      weight = DEFAULT_BW_KG + addedWeight;
      tags.push('Bodyweight');
      return {
        setId: `set-${index}-${clean}`,
        reps,
        totalReps: reps,
        weight,
        addedWeight,
        isBW: true,
        tags,
        raw: clean,
        completed: isExerciseDone
      };
    }
  }

  // 6. Standard and specialized rep x weight notations
  // e.g. 12_1'x40, 10_1*x10, 8_2x50, 15X60, 16X12.5
  const standardMatch = clean.match(/^([^xX]+)[xX](.+)$/i);
  if (!standardMatch) return null;

  const repPart = standardMatch[1].trim();
  const weightPart = standardMatch[2].trim().replace(/[';*]+$/, '');
  weight = /bw/i.test(weightPart) ? DEFAULT_BW_KG : (parseFloat(weightPart) || 0);

  if (repPart.includes('*')) {
    tags.push('Near-Full (1*)');
  }
  if (repPart.includes("'")) {
    tags.push("Half Rep (1')");
  }
  if (repPart.includes('_')) {
    tags.push(`Rest-Pause (${repPart})`);
  }

  const segments = repPart.split(/[_,\s]+/).map(seg => {
    const num = parseInt(seg.replace(/['*]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  });

  totalReps = segments.reduce((sum, n) => sum + n, 0);
  reps = segments[0] || totalReps;

  if (tags.length === 0) {
    tags.push(index === 0 && weight <= 30 && reps <= 10 ? 'Warmup' : 'Working');
  }

  return {
    setId: `set-${index}-${clean}`,
    reps,
    totalReps: totalReps || reps,
    weight,
    isBW: false,
    tags,
    raw: clean,
    completed: isExerciseDone
  };
}

/**
 * Calculates day of week and 4-week cycle number using DD/MM/YYYY
 */
export function parseDateMetadata(dateStr: string) {
  let parsedDate: Date | null = null;
  const clean = dateStr.replace(/\.$/, '').trim();
  const parts = clean.split(/[\/\-\.]/);

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      // DD/MM/YYYY or DD/MM/YY
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      parsedDate = new Date(year, month, day);
    }
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = parsedDate ? days[parsedDate.getDay()] : 'Workout Day';

  // Calculate Week Number in 4-Week Arnold Split cycle
  let weekNumber = 1;
  if (parsedDate) {
    const dayOfYear = Math.floor((parsedDate.getTime() - new Date(parsedDate.getFullYear(), 0, 1).getTime()) / 86400000);
    const weekOfYear = Math.ceil((dayOfYear + 1) / 7);
    weekNumber = ((weekOfYear - 1) % 4) + 1;
  }

  return { dayOfWeek, weekNumber, parsedDate };
}

/**
 * Comprehensive Workout.md grammar parser with multi-line exercise & indented Got/Target support
 */
export function parseWorkoutMarkdown(content: string): WorkoutSession[] {
  if (!content || typeof content !== 'string') return [];

  const lines = content.split(/\r?\n/);
  const sessions: WorkoutSession[] = [];
  let currentSession: WorkoutSession | null = null;
  let currentExercise: WorkoutExercise | null = null;
  let currentSplitHeading: string | null = null;

  // Session date pattern: e.g. "### 09/09/2026 (Wednesday) - Upper / Pull & Arms 5:44 AM"
  // or "### 27/09/2026 (Sunday) - Rest Day" or shorthand "9/14/26 6:15 AM"
  const dateRegex = /^(?:###\s*)?(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})(?:\s*\(([^)]+)\))?(?:\s*[-—]\s*(.+))?$/i;

  const flushExercise = () => {
    if (currentExercise && currentSession) {
      currentSession.exercises.push(currentExercise);
      currentExercise = null;
    }
  };

  const flushSession = () => {
    flushExercise();
    if (currentSession) {
      finalizeSession(currentSession);
      sessions.push(currentSession);
      currentSession = null;
    }
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) return;

    // 1. Session Header
    const isExplicitHeader = line.startsWith('### ') || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line);
    const dateMatch = line.match(dateRegex);

    if (isExplicitHeader && dateMatch) {
      flushSession();

      const rawDate = dateMatch[1].replace(/\.$/, '');
      const dayName = dateMatch[2] || '';
      const extraInfo = (dateMatch[3] || '').trim();
      const { dayOfWeek, weekNumber } = parseDateMetadata(rawDate);

      // Extract time if present
      let timeStr = '06:00 AM';
      const timeMatch = extraInfo.match(/(\d{1,2}[:\s]\d{2}\s*(?:AM|PM)?)/i);
      if (timeMatch) timeStr = timeMatch[1].toUpperCase();

      let splitName = extraInfo
        .replace(/(\d{1,2}[:\s]\d{2}\s*(?:AM|PM)?)/i, '')
        .replace(/[-—]\s*$/, '')
        .replace(/^\[|\]$/g, '')
        .trim();

      if (!splitName) {
        splitName = /rest\s*day/i.test(line) ? 'Rest Day' : 'Gym Session';
      }

      currentSession = {
        id: `session-${sessions.length + 1}-${rawDate.replace(/[\/\.]/g, '-')}`,
        dateStr: rawDate,
        rawDate: line,
        timeStr,
        dayOfWeek: dayName || dayOfWeek,
        muscleSplit: splitName,
        warmupMinutes: 0,
        exercises: [],
        totalVolumeKg: 0,
        totalSets: 0,
        completedSets: 0,
        completionRate: 0,
        weekNumber
      };

      currentSplitHeading = null;
      return;
    }

    if (!currentSession) return;

    // 2. Section Heading (e.g. "LEG", "ABS", "CHEST")
    if (/^[A-Z\s\/]{3,15}$/.test(line) && !line.includes('=') && !line.includes('X') && !line.includes('x')) {
      currentSplitHeading = line;
      if (currentSession.muscleSplit === 'Gym Session') {
        currentSession.muscleSplit = line;
      }
      return;
    }

    // 3. Stretching note: e.g. "_Stretching: 5:44 AM to 5:54 AM (10 mins)_"
    const stretchMatch = line.match(/Stretching:?\s*(\d{1,2}[:\s]\d{2}\s*[APM]*)\s*(?:to|till|-)\s*(\d{1,2}[:\s]\d{2}\s*[APM]*)?(?:\s*\((\d+)\s*mins?\))?/i);
    if (/stretching|warmup/i.test(line)) {
      currentSession.stretchingNotes = line;
      if (stretchMatch && stretchMatch[3]) {
        currentSession.warmupMinutes = parseInt(stretchMatch[3], 10);
      } else {
        currentSession.warmupMinutes = 8;
      }
      return;
    }

    // 4. Exercise Parent Line: e.g. "- [x] **Wide-Grip Lat Pulldown**"
    const checkboxMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (checkboxMatch) {
      flushExercise();

      const isCompleted = checkboxMatch[1].toLowerCase() === 'x';
      const payload = checkboxMatch[2].trim();
      const boldMatch = payload.match(/^\*\*(.+?)\*\*(.*)$/);

      const exerciseName = boldMatch ? boldMatch[1].trim() : payload;
      const inlineRest = boldMatch ? boldMatch[2].trim() : '';

      currentExercise = {
        id: `ex-${currentSession.exercises.length}-${exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: exerciseName,
        code: '',
        completed: isCompleted,
        rawLine,
        lineIndex,
        sets: [],
        muscleSplit: currentSplitHeading || inferSplit(exerciseName)
      };

      // If inline target/got exists on same line
      if (inlineRest) {
        parseInlineExerciseDetails(inlineRest, currentExercise);
      }
      return;
    }

    // 5. Indented Sub-bullet: Target
    if (currentExercise && /^[-\s]*Target:\s*(.+)$/i.test(line)) {
      const targetMatch = line.match(/Target:\s*(\d+)\s*set(?:s)?(?:\s*(\d+(?:-\d+)?)\s*rep)?/i);
      if (targetMatch) {
        currentExercise.targetSets = parseInt(targetMatch[1], 10);
        if (targetMatch[2]) {
          const repParts = targetMatch[2].split('-');
          currentExercise.targetReps = parseInt(repParts[repParts.length - 1], 10);
        }
      }
      return;
    }

    // 6. Indented Sub-bullet: Got
    if (currentExercise && /^[-\s]*Got:\s*(.*)$/i.test(line)) {
      let gotContent = (line.match(/Got:\s*(.*)$/i) || [])[1]?.trim() || '';
      if (!gotContent) return;

      // Check for Warmup bracket: [Warmup: 7x30]
      const warmupMatch = gotContent.match(/\[Warmup:\s*([^\]]+)\]/i);
      if (warmupMatch) {
        warmupMatch[1].split(/\s+/).forEach((tok, idx) => {
          const parsed = parseSetToken(tok, idx, currentExercise!.completed);
          if (parsed) {
            parsed.tags.push('Warmup');
            currentExercise!.sets.push(parsed);
          }
        });
        gotContent = gotContent.replace(warmupMatch[0], '');
      }

      // Check for Drop set bracket: [Drop set: 0to9x24, 9to18x19, 19to48x9]
      const dropMatch = gotContent.match(/\[Drop set:\s*([^\]]+)\]/i);
      if (dropMatch) {
        dropMatch[1].split(/[,\s]+/).forEach((tok, idx) => {
          const parsed = parseSetToken(tok, idx, currentExercise!.completed);
          if (parsed) {
            currentExercise!.sets.push(parsed);
          }
        });
        gotContent = gotContent.replace(dropMatch[0], '');
      }

      // Remaining set tokens
      gotContent.trim().split(/\s+/).forEach((tok, idx) => {
        const parsed = parseSetToken(tok, currentExercise!.sets.length, currentExercise!.completed);
        if (parsed) currentExercise!.sets.push(parsed);
      });
      return;
    }

    // 7. Shorthand single-line format: e.g. "wild lat pull down = WLP 13X30 15X30 16X30"
    if (line.includes('=') && (line.includes('X') || line.includes('x'))) {
      flushExercise();
      const parts = line.split('=');
      const name = parts[0].trim();
      const tokens = parts[1].trim().split(/\s+/);
      const code = tokens[0] || '';
      const setTokens = tokens.slice(1);

      const sets: WorkoutSet[] = [];
      setTokens.forEach((tok, sIdx) => {
        const parsed = parseSetToken(tok, sIdx, true);
        if (parsed) sets.push(parsed);
      });

      currentSession.exercises.push({
        id: `ex-${currentSession.exercises.length}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name,
        code,
        completed: true,
        rawLine,
        lineIndex,
        sets,
        muscleSplit: currentSplitHeading || inferSplit(name)
      });
    }
  });

  flushSession();
  return sessions;
}

/**
 * Handles legacy inline exercise details
 */
function parseInlineExerciseDetails(text: string, ex: WorkoutExercise) {
  const gotMatch = text.match(/Got:\s*(.+)$/i);
  if (gotMatch) {
    const tokens = gotMatch[1].trim().split(/\s+/);
    tokens.forEach((tok, idx) => {
      const parsed = parseSetToken(tok, idx, ex.completed);
      if (parsed) ex.sets.push(parsed);
    });
  }
}

/**
 * Calculates summary metrics for a workout session
 */
function finalizeSession(session: WorkoutSession) {
  let volume = 0;
  let totalSetsCount = 0;
  let completedSetsCount = 0;

  session.exercises.forEach(ex => {
    ex.sets.forEach(set => {
      totalSetsCount++;
      if (set.completed || ex.completed) {
        completedSetsCount++;
      }
      // Calculate tonnage in kg (reps * weight)
      volume += set.totalReps * set.weight;
    });
  });

  session.totalVolumeKg = Math.round(volume);
  session.totalSets = totalSetsCount;
  session.completedSets = completedSetsCount;
  session.completionRate = totalSetsCount > 0 ? Math.round((completedSetsCount / totalSetsCount) * 100) : 0;

  // Auto-infer session muscle split if generic
  if (session.muscleSplit === 'Gym Session' && session.exercises.length > 0) {
    const primary = session.exercises[0].muscleSplit;
    session.muscleSplit = primary;
  }
}

/**
 * Toggles a checkbox `- [ ]` <-> `- [x]` in raw Markdown text surgically
 */
export function toggleMarkdownCheckbox(
  rawMarkdown: string,
  targetExerciseName: string,
  newCompleted: boolean
): string {
  const lines = rawMarkdown.split(/\r?\n/);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(targetExerciseName.toLowerCase())) {
      if (newCompleted) {
        if (line.includes('- [ ]')) {
          lines[i] = line.replace('- [ ]', '- [x]');
          updated = true;
          break;
        } else if (!line.startsWith('- [')) {
          lines[i] = `- [x] ${line.replace(/^-\s*/, '')}`;
          updated = true;
          break;
        }
      } else {
        if (line.includes('- [x]')) {
          lines[i] = line.replace('- [x]', '- [ ]');
          updated = true;
          break;
        } else if (line.includes('- [X]')) {
          lines[i] = line.replace('- [X]', '- [ ]');
          updated = true;
          break;
        }
      }
    }
  }

  return updated ? lines.join('\n') : rawMarkdown;
}
