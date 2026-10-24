import { WorkoutSession, WorkoutExercise } from './types';

export interface MuscleGroup {
  id: string;
  name: string;
  shortName: string;
  latinName: string;
  category: 'torso' | 'arms' | 'legs' | 'head_neck';
  view: 'front' | 'back' | 'both';
  synergists: string[]; // Related muscles trained or engaged together
  description: string;
  cyberColor: string;
  matchPattern: RegExp;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    id: 'chest',
    name: 'Chest',
    shortName: 'Pecs',
    latinName: 'Pectoralis Major & Minor',
    category: 'torso',
    view: 'front',
    synergists: ['triceps', 'shoulders'],
    description: 'Upper, mid, and lower pectoral fibers. Main pushing kinetic chain with triceps & anterior deltoids.',
    cyberColor: '#00F0FF',
    matchPattern: /chest|incline|bench|dip\b|cmp\b|ccf\b|push\s*up|pec\b|fly|flies/i
  },
  {
    id: 'back',
    name: 'Back & Lats',
    shortName: 'Lats',
    latinName: 'Latissimus Dorsi & Rhomboids',
    category: 'torso',
    view: 'back',
    synergists: ['biceps', 'forearms', 'neck'],
    description: 'Upper back, lats, and mid-back width & thickness. Primary pulling kinetic chain.',
    cyberColor: '#10B981',
    matchPattern: /lat\b|wlp|wlpd|wbrows|row|rows|pull\s*up|pulldown|close let|machine row/i
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    shortName: 'Delts',
    latinName: 'Anterior, Lateral & Posterior Deltoids',
    category: 'torso',
    view: 'both',
    synergists: ['triceps', 'neck', 'chest'],
    description: '3-head deltoid complex governing vertical pressing and arm abduction.',
    cyberColor: '#F59E0B',
    matchPattern: /shoulder|overhead|ohp|dlr\b|lateral raise|rear delt|rrd\b|deltoid|upright row/i
  },
  {
    id: 'biceps',
    name: 'Biceps',
    shortName: 'Biceps',
    latinName: 'Biceps Brachii & Brachialis',
    category: 'arms',
    view: 'front',
    synergists: ['forearms', 'back'],
    description: 'Anterior arm flexors responsible for elbow flexion & forearm supination.',
    cyberColor: '#8B5CF6',
    matchPattern: /bicep|curl|bayesian|chammer|hammer curl|barbell curl/i
  },
  {
    id: 'triceps',
    name: 'Triceps',
    shortName: 'Triceps',
    latinName: 'Triceps Brachii (Long, Lateral, Medial)',
    category: 'arms',
    view: 'back',
    synergists: ['chest', 'shoulders'],
    description: 'Elbow extensor forming 60% of upper arm mass. Direct antagonist to biceps.',
    cyberColor: '#EC4899',
    matchPattern: /tricep|bar te|cross te|single cross te|cohp|pushdown|skull\s*crusher|dip\b|kickback/i
  },
  {
    id: 'forearms',
    name: 'Forearms',
    shortName: 'Grip',
    latinName: 'Brachioradialis & Wrist Flexors',
    category: 'arms',
    view: 'both',
    synergists: ['biceps'],
    description: 'Wrist stabilization and grip strength for heavy deadlifts, pullups and rows.',
    cyberColor: '#06B6D4',
    matchPattern: /forearm|wrist|grip|reverse curl/i
  },
  {
    id: 'abs',
    name: 'Abdominals & Core',
    shortName: 'Abs',
    latinName: 'Rectus Abdominis & Obliques',
    category: 'torso',
    view: 'front',
    synergists: ['neck', 'quads'],
    description: 'Core stabilization, intra-abdominal pressure and spinal flexion resistance.',
    cyberColor: '#EAB308',
    matchPattern: /abs|absm|pb\b|prrral bar|parallel bar|core|crunch|plank|leg raise/i
  },
  {
    id: 'quads',
    name: 'Quads',
    shortName: 'Quads',
    latinName: 'Quadriceps Femoris',
    category: 'legs',
    view: 'front',
    synergists: ['glutes', 'calves'],
    description: 'Front thigh knee extensors (Vastus Lateralis, Medialis, Intermedius & Rectus Femoris).',
    cyberColor: '#3B82F6',
    matchPattern: /quad|leg ext|le\b|squat|hack squat|leg press|sissy squat/i
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    shortName: 'Hams',
    latinName: 'Biceps Femoris & Semitendinosus',
    category: 'legs',
    view: 'back',
    synergists: ['glutes', 'calves'],
    description: 'Posterior thigh knee flexors and hip extensors. Critical for sprint speed and knee protection.',
    cyberColor: '#6366F1',
    matchPattern: /hamstring|leg curl|llc\b|rdl\b|romanian|stiff leg/i
  },
  {
    id: 'glutes',
    name: 'Glutes',
    shortName: 'Glutes',
    latinName: 'Gluteus Maximus & Medius',
    category: 'legs',
    view: 'back',
    synergists: ['hamstrings', 'quads'],
    description: 'Primary hip extension powerhouse in human locomotion and compound lifts.',
    cyberColor: '#D946EF',
    matchPattern: /glute|hip thrust|kickback|deadlift|sumo/i
  },
  {
    id: 'calves',
    name: 'Calves',
    shortName: 'Calves',
    latinName: 'Gastrocnemius & Soleus',
    category: 'legs',
    view: 'both',
    synergists: ['hamstrings', 'quads'],
    description: 'Plantar flexors of the ankle joint, stabilizing all standing athletic output.',
    cyberColor: '#14B8A6',
    matchPattern: /calf|calves|sce\b|bar cr\b|seated calf|standing calf/i
  },
  {
    id: 'neck',
    name: 'Neck & Traps',
    shortName: 'Traps',
    latinName: 'Trapezius (Upper) & Splenius',
    category: 'head_neck',
    view: 'both',
    synergists: ['shoulders', 'back'],
    description: 'Scapular elevation and cervical spine stabilization against heavy impact.',
    cyberColor: '#F97316',
    matchPattern: /shrug|smith shurg|neck|trap|traps/i
  },
  {
    id: 'head',
    name: 'Mind-Muscle (Neural)',
    shortName: 'Neural',
    latinName: 'Cortex & Neuromuscular Drive',
    category: 'head_neck',
    view: 'both',
    synergists: ['neck'],
    description: 'Central Nervous System motor unit recruitment and mental focus.',
    cyberColor: '#A855F7',
    matchPattern: /focus|mind|neuro/i
  }
];

export const ALL_MUSCLE_META = {
  id: 'all',
  name: 'Total Training Volume',
  shortName: 'All Systems',
  latinName: 'Full Musculoskeletal Grid',
  category: 'torso' as const,
  view: 'both' as const,
  synergists: [],
  description: 'Aggregate workload, volume tonnage, and session density across all muscle groups.',
  cyberColor: '#FF7A00',
  matchPattern: /.*/
};

/**
 * Classifies an exercise into its primary muscle group
 */
export function classifyExerciseMuscle(name: string, code?: string): MuscleGroup {
  const text = `${name} ${code || ''}`.trim();

  // Specific priority matches for common abbreviations
  if (/^wlp|wlpd|wbrows|lat pull|machine row/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'back')!;
  }
  if (/^dip\b|cmp\b|ccf\b|incline push|chest/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'chest')!;
  }
  if (/^le\b|leg ext/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'quads')!;
  }
  if (/^llc\b|leg curl/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'hamstrings')!;
  }
  if (/^sce\b|bar cr\b|calf/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'calves')!;
  }
  if (/^pb\b|absm\b|abs\b/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'abs')!;
  }
  if (/^dlr\b|rrd\b|lateral raise|rear delt/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'shoulders')!;
  }
  if (/^bar te\b|single cross te\b|cohp\b|tricep/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'triceps')!;
  }
  if (/bayesian|chammer|bicep|barbell curl/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'biceps')!;
  }
  if (/forearm/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'forearms')!;
  }
  if (/shurg|shrug/i.test(text)) {
    return MUSCLE_GROUPS.find(m => m.id === 'neck')!;
  }

  for (const group of MUSCLE_GROUPS) {
    if (group.matchPattern.test(text)) {
      return group;
    }
  }

  // Fallback default
  return MUSCLE_GROUPS.find(m => m.id === 'chest')!;
}

export interface DailyMuscleVolumePoint {
  dateStr: string;
  rawDate: string;
  totalVolume: number;
  primaryVolume: number;
  synergistVolume: number;
  exercises: {
    name: string;
    code?: string;
    volume: number;
    maxWeight: number;
    sets: number;
    isPrimary: boolean;
  }[];
  sessionRef: WorkoutSession;
}

export interface ExerciseContribution {
  name: string;
  code?: string;
  totalVolume: number;
  maxWeight: number;
  setsCount: number;
  isPrimary: boolean;
}

export interface MuscleVolumeStats {
  selectedMuscle: MuscleGroup | typeof ALL_MUSCLE_META;
  synergists: MuscleGroup[];
  totalVolume: number;
  synergistVolume: number;
  maxLift: number;
  totalSets: number;
  totalReps: number;
  dailySeries: DailyMuscleVolumePoint[];
  topExercises: ExerciseContribution[];
  muscleHeatmap: Record<string, number>;
}

/**
 * Computes deep biometric volume analytics for a selected muscle group or overall
 */
export function calculateMuscleVolumeStats(
  sessions: WorkoutSession[],
  selectedMuscleId: string = 'all'
): MuscleVolumeStats {
  const isAll = selectedMuscleId === 'all';
  const selectedMuscle = isAll
    ? ALL_MUSCLE_META
    : MUSCLE_GROUPS.find(m => m.id === selectedMuscleId) || ALL_MUSCLE_META;

  const synergistIds = isAll ? [] : selectedMuscle.synergists;
  const synergistGroups = MUSCLE_GROUPS.filter(m => synergistIds.includes(m.id));

  const muscleHeatmap: Record<string, number> = {};
  MUSCLE_GROUPS.forEach(m => {
    muscleHeatmap[m.id] = 0;
  });

  // Populate overall muscle heatmap across all sessions
  sessions.forEach(session => {
    session.exercises.forEach(ex => {
      const group = classifyExerciseMuscle(ex.name, ex.code);
      const exVol = ex.sets.reduce((sum, s) => sum + s.totalReps * s.weight, 0);
      muscleHeatmap[group.id] = (muscleHeatmap[group.id] || 0) + exVol;
    });
  });

  let grandTotalVolume = 0;
  let grandSynergistVolume = 0;
  let maxLift = 0;
  let totalSets = 0;
  let totalReps = 0;

  const exerciseMap: Record<string, ExerciseContribution> = {};

  // Build chronological daily series (oldest to newest for proper left-to-right graphs)
  const parseDateValue = (dStr: string): number => {
    const clean = dStr.replace(/\.$/, '').trim();
    const parts = clean.split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime();
      } else {
        // DD/MM/YYYY
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        return new Date(y, m - 1, d).getTime();
      }
    }
    const t = new Date(clean).getTime();
    return isNaN(t) ? 0 : t;
  };

  const sortedSessions = [...sessions].sort((a, b) => parseDateValue(a.dateStr || a.rawDate) - parseDateValue(b.dateStr || b.rawDate));

  const dailySeries: DailyMuscleVolumePoint[] = sortedSessions.map(session => {
    let dayPrimaryVolume = 0;
    let daySynergistVolume = 0;
    const dayExercises: DailyMuscleVolumePoint['exercises'] = [];

    session.exercises.forEach(ex => {
      const group = classifyExerciseMuscle(ex.name, ex.code);
      const exVol = ex.sets.reduce((sum, s) => sum + s.totalReps * s.weight, 0);
      const exMax = ex.sets.reduce((max, s) => Math.max(max, s.weight), 0);
      const exSets = ex.sets.length;
      const exReps = ex.sets.reduce((sum, s) => sum + s.totalReps, 0);

      const isPrimary = isAll || group.id === selectedMuscle.id;
      const isSynergist = !isAll && synergistIds.includes(group.id);

      if (isPrimary) {
        dayPrimaryVolume += exVol;
        grandTotalVolume += exVol;
        maxLift = Math.max(maxLift, exMax);
        totalSets += exSets;
        totalReps += exReps;

        dayExercises.push({
          name: ex.name,
          code: ex.code,
          volume: exVol,
          maxWeight: exMax,
          sets: exSets,
          isPrimary: true
        });

        // Add to aggregate exercise ranking
        const key = ex.name.toLowerCase().trim();
        if (!exerciseMap[key]) {
          exerciseMap[key] = {
            name: ex.name,
            code: ex.code,
            totalVolume: 0,
            maxWeight: 0,
            setsCount: 0,
            isPrimary: true
          };
        }
        exerciseMap[key].totalVolume += exVol;
        exerciseMap[key].maxWeight = Math.max(exerciseMap[key].maxWeight, exMax);
        exerciseMap[key].setsCount += exSets;
      } else if (isSynergist) {
        // Synergist secondary activation (~35% kinetic load)
        const synVol = Math.round(exVol * 0.35);
        daySynergistVolume += synVol;
        grandSynergistVolume += synVol;

        dayExercises.push({
          name: ex.name,
          code: ex.code,
          volume: exVol,
          maxWeight: exMax,
          sets: exSets,
          isPrimary: false
        });
      }
    });

    return {
      dateStr: session.dateStr,
      rawDate: session.rawDate,
      totalVolume: dayPrimaryVolume + daySynergistVolume,
      primaryVolume: dayPrimaryVolume,
      synergistVolume: daySynergistVolume,
      exercises: dayExercises,
      sessionRef: session
    };
  });

  const topExercises = Object.values(exerciseMap).sort((a, b) => b.totalVolume - a.totalVolume);

  return {
    selectedMuscle,
    synergists: synergistGroups,
    totalVolume: grandTotalVolume,
    synergistVolume: grandSynergistVolume,
    maxLift,
    totalSets,
    totalReps,
    dailySeries,
    topExercises,
    muscleHeatmap
  };
}
