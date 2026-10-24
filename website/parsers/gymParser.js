/**
 * Production Gym Grammar & Workout Markdown Parser
 * Parses sessions, warmups, set/reps syntax, rest-pause clusters, drop sets,
 * bodyweight clusters, and infers muscle splits automatically.
 */

const DEFAULT_BW_KG = 75; // Baseline bodyweight for BW exercises

// Exercise split dictionary for auto-categorization
const EXERCISE_SPLIT_MAP = [
  { match: /wlp|wlpd|lat pull|wbrows|barbell row|machine row|rear delt/i, split: 'Pull / Back' },
  { match: /dip|cmp|ccf|cohp|incline push|chest press|chest fl|push tricep/i, split: 'Push / Chest' },
  { match: /le|llc|sce|calf|leg ext|leg curl|seated calf/i, split: 'Legs' },
  { match: /pb|absm|prrral bar|parallel bar|abs machine|abs/i, split: 'Abs / Core' },
  { match: /bayesian|curl|chammer|hammer curl|barbell curl|forearm|cross te|bar te|tricep extension/i, split: 'Arms' },
  { match: /dlr|lateral raise|smith shurg|smith shrug|shrug/i, split: 'Shoulders' }
];

/**
 * Auto-categorizes an exercise or session based on code or name
 */
function inferSplit(nameOrCode) {
  if (!nameOrCode) return 'Full Body';
  for (const entry of EXERCISE_SPLIT_MAP) {
    if (entry.match.test(nameOrCode)) {
      return entry.split;
    }
  }
  return 'Strength';
}

/**
 * Parse a single set token (e.g. 10x50, 8_2x50, 12_1'x40, 10_1*x10, 20,5,5 X BW, 0to9x24)
 */
function parseSetToken(token) {
  token = token.trim();
  if (!token) return null;

  const tags = [];
  let reps = 0;
  let weight = 0;
  let isBW = false;
  let raw = token;

  // Drop set notation: e.g. 0to9x24, 9to18x19, 19to48x9
  const dropMatch = token.match(/^(\d+)to(\d+)[xX](\d+(?:\.\d+)?)$/i);
  if (dropMatch) {
    const from = parseInt(dropMatch[1], 10);
    const to = parseInt(dropMatch[2], 10);
    reps = Math.max(1, to - from);
    weight = parseFloat(dropMatch[3]);
    tags.push('Drop Set');
    return { reps, weight, isBW: false, tags, raw, totalReps: reps };
  }

  // Bodyweight cluster: e.g. 20,5,5 X BW or 10,5 X BW or BW+10
  const bwClusterMatch = token.match(/^([\d,\s_]+)[xX]\s*BW(\+(\d+(?:\.\d+)?))?$/i);
  if (bwClusterMatch) {
    const repParts = bwClusterMatch[1].split(/[,_]/).map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const totalReps = repParts.reduce((a, b) => a + b, 0);
    const addedWeight = bwClusterMatch[3] ? parseFloat(bwClusterMatch[3]) : 0;
    weight = DEFAULT_BW_KG + addedWeight;
    isBW = true;
    tags.push('Bodyweight Cluster');
    return {
      reps: repParts[0] || totalReps,
      clusterReps: repParts,
      totalReps,
      weight,
      addedWeight,
      isBW: true,
      tags,
      raw
    };
  }

  // Check for Bodyweight single: e.g. 15xBW or BW+15
  if (/x\s*bw/i.test(token) || /^bw/i.test(token)) {
    const match = token.match(/(\d+)\s*[xX]\s*BW(?:\+(\d+(?:\.\d+)?))?/i);
    if (match) {
      reps = parseInt(match[1], 10);
      const added = match[2] ? parseFloat(match[2]) : 0;
      weight = DEFAULT_BW_KG + added;
      tags.push('Bodyweight');
      return { reps, totalReps: reps, weight, isBW: true, tags, raw };
    }
  }

  // Standard or complex rep notation: [reps]x[weight]
  // e.g. 12_1'x40, 10_1*x10, 8_2x50, 8_1* _1x50', 8_1_1;x55, 10'x10, 15X60
  // Clean trailing apostrophes or semicolons in weight part
  const standardMatch = token.match(/^([^xX]+)[xX](.+)$/i);
  if (!standardMatch) return null;

  const repPart = standardMatch[1].trim();
  const weightPart = standardMatch[2].trim().replace(/[';*]+$/, '');
  weight = parseFloat(weightPart) || 0;

  let totalReps = 0;

  // Check for Near-Full (1*)
  if (repPart.includes('*')) {
    tags.push('Near-Full (1*)');
  }

  // Check for Partial Rep (1')
  if (repPart.includes("'")) {
    tags.push("Partial Rep (1')");
  }

  // Check for Rest-Pause cluster (e.g. 8_2 or 8_1_1 or 6_3)
  if (repPart.includes('_')) {
    tags.push('Rest-Pause');
  }

  // Calculate total reps by summing numeric segments
  // e.g. 8_2 -> 10, 12_1' -> 13, 10' -> 10, 8_1* _1 -> 10
  const segments = repPart.split(/[_,\s]+/).map(seg => {
    const num = parseInt(seg.replace(/['*]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  });

  totalReps = segments.reduce((sum, n) => sum + n, 0);
  reps = segments[0] || totalReps;

  return {
    reps,
    totalReps: totalReps || reps,
    weight,
    isBW: false,
    tags,
    raw
  };
}

/**
 * Parses full raw Workout.md string into structured sessions, exercises, and metrics
 */
function parseWorkoutMarkdown(content) {
  if (!content || typeof content !== 'string') {
    return { sessions: [], exercisesCatalog: {}, weeklyTonnage: 0, volumeDensity: 0, warmupConsistency: 0, totalWorkouts: 0 };
  }

  const lines = content.split(/\r?\n/);
  const sessions = [];
  let currentSession = null;
  let currentSplitHeading = null;

  // Session date pattern: M/D/YY [optional .] H[: ]MM AM/PM
  // Examples: "9/9/26. 5 44AM", "9/10/26 6:22 AM", "9/11/26 6:42 AM"
  const dateRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\.?\s+(\d{1,2})[:\s](\d{2})\s*(AM|PM)?/i;

  // Split headers like "LEG", "ABS", "PUSH", "PULL", "CHEST"
  const splitHeaderRegex = /^(LEG|ABS|PUSH|PULL|CHEST|BACK|ARMS|SHOULDERS|LEGS)$/i;

  // Stretching patterns
  const stretchRangeRegex = /(\d{1,2})[:\s](\d{2})\s*(?:TO|-)\s*(\d{1,2})[:\s](\d{2})\s*(?:AM|PM)?\s*STRETCHING/i;
  const stretchTillRegex = /stretching\s+till\s+(\d{1,2})[:\s](\d{2})\s*(?:AM|PM)?/i;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Check if line is a session header
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      if (currentSession) {
        sessions.push(finalizeSession(currentSession));
      }

      const dateStr = dateMatch[1];
      const hour = parseInt(dateMatch[2], 10);
      const min = parseInt(dateMatch[3], 10);
      const meridiem = (dateMatch[4] || 'AM').toUpperCase();

      currentSession = {
        date: dateStr,
        startTime: `${hour}:${min < 10 ? '0' + min : min} ${meridiem}`,
        startHour: meridiem === 'PM' && hour < 12 ? hour + 12 : (meridiem === 'AM' && hour === 12 ? 0 : hour),
        startMinute: min,
        stretchingMinutes: 0,
        hasStretching: false,
        stretchingDetails: null,
        explicitSplits: [],
        exercises: [],
        rawLines: [rawLine]
      };
      currentSplitHeading = null;
      continue;
    }

    if (!currentSession) continue;
    currentSession.rawLines.push(rawLine);

    // Check for stretching
    const stretchRangeMatch = line.match(stretchRangeRegex);
    if (stretchRangeMatch) {
      const sH = parseInt(stretchRangeMatch[1], 10);
      const sM = parseInt(stretchRangeMatch[2], 10);
      const eH = parseInt(stretchRangeMatch[3], 10);
      const eM = parseInt(stretchRangeMatch[4], 10);
      const dur = (eH * 60 + eM) - (sH * 60 + sM);
      currentSession.hasStretching = true;
      currentSession.stretchingMinutes = dur > 0 ? dur : 10;
      currentSession.stretchingDetails = `${dur > 0 ? dur : 10}m (${line})`;
      continue;
    }

    const stretchTillMatch = line.match(stretchTillRegex);
    if (stretchTillMatch) {
      const tillH = parseInt(stretchTillMatch[1], 10);
      const tillM = parseInt(stretchTillMatch[2], 10);
      const dur = (tillH * 60 + tillM) - (currentSession.startHour * 60 + currentSession.startMinute);
      currentSession.hasStretching = true;
      currentSession.stretchingMinutes = dur > 0 ? dur : 9;
      currentSession.stretchingDetails = `${dur > 0 ? dur : 9}m (${line})`;
      continue;
    }

    if (/stretching/i.test(line)) {
      currentSession.hasStretching = true;
      currentSession.stretchingMinutes = currentSession.stretchingMinutes || 10;
      currentSession.stretchingDetails = `${currentSession.stretchingMinutes}m (${line})`;
      continue;
    }

    // Check for explicit split heading (e.g. LEG, ABS)
    const splitMatch = line.match(splitHeaderRegex);
    if (splitMatch) {
      currentSplitHeading = splitMatch[1].toUpperCase();
      if (!currentSession.explicitSplits.includes(currentSplitHeading)) {
        currentSession.explicitSplits.push(currentSplitHeading);
      }
      continue;
    }

    // Ignore syntax explanations at bottom of file like "for example 10 x 50 => ..."
    if (/^for example/i.test(line) || /^\d+\s*x\s*\d+\s*=>/i.test(line)) {
      continue;
    }

    // Parse Exercise Line:
    // Examples:
    // "wild lat pull down = WLP 13X30 15X30 16X30"
    // "RRD 17X30 19X40 17X45"
    // "leg externsion = LE 15X60 11_1'X60 11X60"
    // "prrral bar = PB 20,5,5 X BW 10,5 X BW 10,5 X BW"
    // "Bayesian curl 15x15 10x20 7x20"
    // "Drop set 0to9x24,9to18x19,19to48x9"
    // "warm up 7x30"
    // "Regular 11_2x55 8_1_1;x55 7_2x55"

    const parsedExercise = parseExerciseLine(line, currentSplitHeading);
    if (parsedExercise) {
      currentSession.exercises.push(parsedExercise);
    }
  }

  if (currentSession) {
    sessions.push(finalizeSession(currentSession));
  }

  // Build aggregate metrics and exercise catalog
  return aggregateGymData(sessions);
}

/**
 * Parses an individual exercise line
 */
function parseExerciseLine(line, currentSplitHeading) {
  // Check if line contains a set token pattern (digit + x + digit, or X BW, or drop set)
  if (!/\d+[xX]\d+|[xX]\s*BW|\dto\d+[xX]\d+/i.test(line)) {
    return null;
  }

  let exerciseName = '';
  let exerciseCode = '';
  let setsPart = '';

  // Case 1: Name = Code Sets... e.g. "wild lat pull down = WLP 13X30 15X30 16X30"
  if (line.includes('=')) {
    const [namePart, rest] = line.split('=').map(s => s.trim());
    exerciseName = namePart;
    const tokens = rest.split(/\s+/);
    // The first token in rest is often the code (e.g. WLP, LE, PB)
    // Check if first token is code or set
    if (!/\d+[xX]\d+|[xX]\s*BW/i.test(tokens[0])) {
      exerciseCode = tokens[0];
      setsPart = tokens.slice(1).join(' ');
    } else {
      setsPart = rest;
    }
  } else {
    // Case 2: No '=' sign.
    // e.g. "Bayesian curl 15x15 10x20 7x20" or "RRD 17X30 19X40 17X45" or "Drop set 0to9x24,9to18x19,19to48x9"
    // Find the first token that matches set pattern
    const tokens = line.split(/\s+/);
    let firstSetIdx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (/\d+[xX]\d+|\dto\d+[xX]\d+/i.test(tokens[i]) || (tokens[i].toUpperCase() === 'BW' && i > 0)) {
        firstSetIdx = i;
        // If previous token was part of a BW cluster like "20,5,5 X BW"
        if (i >= 2 && tokens[i-1].toUpperCase() === 'X') {
          firstSetIdx = i - 2;
        } else if (i >= 1 && tokens[i].toUpperCase() === 'BW' && tokens[i-1].toUpperCase() === 'X') {
          firstSetIdx = i - 2;
        }
        break;
      }
    }

    if (firstSetIdx > 0) {
      exerciseName = tokens.slice(0, firstSetIdx).join(' ');
      setsPart = tokens.slice(firstSetIdx).join(' ');
    } else {
      exerciseName = tokens[0];
      setsPart = tokens.slice(1).join(' ');
    }
  }

  // Tokenize set parts: respect comma lists (e.g. drop sets 0to9x24,9to18x19 or 20,5,5 X BW)
  const setTokens = extractSetTokens(setsPart);
  const sets = [];
  const allTags = new Set();
  let totalExerciseVolume = 0;
  let maxWeight = 0;
  let totalExerciseReps = 0;

  for (const rawToken of setTokens) {
    const parsedSet = parseSetToken(rawToken);
    if (parsedSet) {
      sets.push(parsedSet);
      parsedSet.tags.forEach(t => allTags.add(t));
      const setVol = (parsedSet.weight || 0) * (parsedSet.totalReps || parsedSet.reps || 0);
      totalExerciseVolume += setVol;
      totalExerciseReps += (parsedSet.totalReps || parsedSet.reps || 0);
      if (parsedSet.weight > maxWeight) {
        maxWeight = parsedSet.weight;
      }
    }
  }

  if (sets.length === 0) return null;

  const displayName = exerciseName || exerciseCode || 'Exercise';
  const inferredSplit = currentSplitHeading || inferSplit(displayName + ' ' + exerciseCode);

  return {
    raw: line,
    name: displayName,
    code: exerciseCode || displayName.split(/\s+/).map(w => w[0]).join('').toUpperCase(),
    split: inferredSplit,
    sets,
    totalVolume: Math.round(totalExerciseVolume),
    maxWeight,
    totalReps: totalExerciseReps,
    tags: Array.from(allTags)
  };
}

/**
 * Extracts individual set tokens from string, handling drop sets and space-separated BW clusters
 */
function extractSetTokens(str) {
  str = str.trim();
  const tokens = [];

  // Drop set comma-separated list e.g. "0to9x24,9to18x19,19to48x9"
  if (/\dto\d+[xX]\d+/i.test(str)) {
    const commaParts = str.split(',');
    for (const part of commaParts) {
      if (part.trim()) tokens.push(part.trim());
    }
    return tokens;
  }

  // Handle BW clusters e.g. "20,5,5 X BW 10,5 X BW"
  // Replace " X BW" or " x BW" with an unbroken token or split properly
  const normalized = str.replace(/([\d,]+)\s*[xX]\s*BW(\+\d+)?/gi, '$1xBW$2 ');
  const rawParts = normalized.split(/\s+/);

  for (const part of rawParts) {
    if (!part) continue;
    // Check if part contains comma-separated drop set without spaces
    if (part.includes(',') && !part.toLowerCase().includes('xbw')) {
      const sub = part.split(',');
      sub.forEach(s => s && tokens.push(s.trim()));
    } else {
      tokens.push(part.trim());
    }
  }

  return tokens;
}

/**
 * Finalizes session aggregates
 */
function finalizeSession(session) {
  let sessionVolume = 0;
  let sessionReps = 0;
  const sessionTags = new Set();
  const splitsInSession = new Set(session.explicitSplits);

  session.exercises.forEach(ex => {
    sessionVolume += ex.totalVolume;
    sessionReps += ex.totalReps;
    ex.tags.forEach(t => sessionTags.add(t));
    splitsInSession.add(ex.split);
  });

  // Calculate estimated duration: stretching minutes + 4 mins per exercise set
  const totalSets = session.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const estimatedWorkoutMinutes = (session.stretchingMinutes || 10) + Math.max(20, totalSets * 3.5);

  const dominantSplit = Array.from(splitsInSession).filter(Boolean)[0] || 'Strength';

  return {
    date: session.date,
    startTime: session.startTime,
    stretchingMinutes: session.stretchingMinutes,
    hasStretching: session.hasStretching,
    stretchingDetails: session.stretchingDetails,
    split: dominantSplit,
    splits: Array.from(splitsInSession),
    exercises: session.exercises,
    totalVolumeKg: Math.round(sessionVolume),
    totalReps: sessionReps,
    totalSets,
    estimatedMinutes: Math.round(estimatedWorkoutMinutes),
    intensityTags: Array.from(sessionTags),
    rawSnippet: session.rawLines.join('\n')
  };
}

/**
 * Aggregates statistics across all sessions
 */
function aggregateGymData(sessions) {
  // Sort sessions chronologically (parse M/D/YY)
  sessions.sort((a, b) => {
    const parseD = (str) => {
      const parts = str.split('/');
      const year = parseInt(parts[2], 10) + (parts[2].length === 2 ? 2000 : 0);
      return new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10)).getTime();
    };
    return parseD(a.date) - parseD(b.date);
  });

  let totalTonnage = 0;
  let totalMinutes = 0;
  let sessionsWithWarmup = 0;
  const exercisesCatalog = {};

  sessions.forEach(sess => {
    totalTonnage += sess.totalVolumeKg;
    totalMinutes += sess.estimatedMinutes;
    if (sess.hasStretching) sessionsWithWarmup++;

    sess.exercises.forEach(ex => {
      const key = (ex.code || ex.name).toUpperCase().trim();
      if (!exercisesCatalog[key]) {
        exercisesCatalog[key] = {
          name: ex.name,
          code: ex.code,
          split: ex.split,
          history: []
        };
      }
      exercisesCatalog[key].history.push({
        date: sess.date,
        maxWeight: ex.maxWeight,
        totalVolume: ex.totalVolume,
        totalReps: ex.totalReps,
        setsCount: ex.sets.length,
        sets: ex.sets,
        tags: ex.tags
      });
    });
  });

  const totalWorkouts = sessions.length;
  const warmupConsistency = totalWorkouts > 0 ? Math.round((sessionsWithWarmup / totalWorkouts) * 100) : 0;
  const volumeDensity = totalMinutes > 0 ? Math.round((totalTonnage / totalMinutes) * 10) / 10 : 0;

  // Weekly tonnage (take all sessions in the latest 7-day range or total if short history)
  const weeklyTonnage = totalTonnage;

  return {
    sessions,
    exercisesCatalog,
    weeklyTonnage,
    volumeDensity,
    warmupConsistency,
    totalWorkouts
  };
}

module.exports = {
  parseWorkoutMarkdown,
  parseSetToken,
  parseExerciseLine,
  inferSplit
};
