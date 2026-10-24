import { Octokit } from '@octokit/rest';
import fs from 'fs';
import path from 'path';

interface GitHubConfig {
  token?: string;
  owner?: string;
  repo?: string;
  path: string;
  branch: string;
}

export function getGitHubConfig(): GitHubConfig {
  return {
    token: process.env.GITHUB_TOKEN?.trim(),
    owner: process.env.REPO_OWNER?.trim() || 'Deepxcoder',
    repo: process.env.REPO_NAME?.trim() || 'KURO-DEX',
    path: process.env.FILE_PATH?.trim() || 'web/data/Workout.sample.md',
    branch: process.env.FILE_BRANCH?.trim() || 'main'
  };
}

const OBSIDIAN_WORKOUT_PATH = 'C:\\Users\\deepx\\OneDrive\\Documents\\Obsidian Vault\\Personal\\Workout.md';

/**
 * Fetches raw Workout.md from Obsidian Vault or GitHub or fallback
 */
export async function fetchWorkoutFile(): Promise<{ content: string; sha?: string; source: 'github' | 'local' }> {
  // 1. Direct Obsidian Vault integration (preferred)
  try {
    if (fs.existsSync(OBSIDIAN_WORKOUT_PATH)) {
      const content = fs.readFileSync(OBSIDIAN_WORKOUT_PATH, 'utf-8');
      return {
        content,
        sha: `local-obsidian-${Date.now()}`,
        source: 'local'
      };
    }
  } catch (err) {
    console.warn('[Obsidian Vault Read Error]', err);
  }

  const config = getGitHubConfig();

  // If GITHUB_TOKEN is available, fetch from GitHub API
  if (config.token && config.owner && config.repo) {
    try {
      const octokit = new Octokit({ auth: config.token });
      const response = await octokit.repos.getContent({
        owner: config.owner,
        repo: config.repo,
        path: config.path,
        ref: config.branch
      });

      if (!Array.isArray(response.data) && 'content' in response.data && response.data.content) {
        const decodedContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return {
          content: decodedContent,
          sha: response.data.sha,
          source: 'github'
        };
      }
    } catch (err: unknown) {
      console.warn('[GitHub API Warning] Could not fetch remote Workout.md, falling back to local:', err instanceof Error ? err.message : err);
    }
  }

  // Local fallback (works in local dev and testing)
  const localCandidates = [
    path.resolve(process.cwd(), config.path),
    path.resolve(process.cwd(), 'data/Workout.sample.md'),
    path.resolve(process.cwd(), 'web-player/data/Workout.sample.md'),
    path.resolve(process.cwd(), '../web-player/data/Workout.sample.md'),
    path.resolve(process.cwd(), 'website/data/Workout.sample.md')
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, 'utf-8');
      return {
        content,
        sha: 'local-sha-mock',
        source: 'local'
      };
    }
  }

  // Default initial markdown if no file found
  const initialFallback = `# Workout Log\n\n### 14/09/2026 (Monday) — [Chest & Back A] 06:15 AM\nStretching till 6 25\n\n- [ ] **Incline Dumbbell Press** = DIP 16X12.5 13X15 10X15\n- [ ] **Chest Machine Press** = CMP 9X60 13X60 11X60\n- [ ] **Wild Lat Pull Down** = WLP 13X30 15X30 16X30\n- [ ] **Barbell Rows** = WBRows 10x35 10x35 13x35\n`;
  return {
    content: initialFallback,
    sha: 'initial-mock-sha',
    source: 'local'
  };
}

/**
 * Commits updated Workout.md to GitHub repo or writes to local disk
 */
export async function commitWorkoutFile(
  content: string,
  commitMessage: string = 'chore(gym): sync workout progress via KuroDex Web Player',
  existingSha?: string
): Promise<{ success: boolean; sha?: string; source: 'github' | 'local'; error?: string }> {
  const config = getGitHubConfig();

  // If GITHUB_TOKEN is configured, commit to GitHub
  if (config.token && config.owner && config.repo) {
    try {
      const octokit = new Octokit({ auth: config.token });

      // If SHA wasn't passed, fetch the latest SHA to prevent conflicts
      let shaToUse = existingSha;
      if (!shaToUse || shaToUse.startsWith('local-')) {
        const fileInfo = await octokit.repos.getContent({
          owner: config.owner,
          repo: config.repo,
          path: config.path,
          ref: config.branch
        });
        if (!Array.isArray(fileInfo.data) && 'sha' in fileInfo.data) {
          shaToUse = fileInfo.data.sha;
        }
      }

      const encoded = Buffer.from(content, 'utf-8').toString('base64');
      const updateResult = await octokit.repos.createOrUpdateFileContents({
        owner: config.owner,
        repo: config.repo,
        path: config.path,
        branch: config.branch,
        message: commitMessage,
        content: encoded,
        sha: shaToUse
      });

      return {
        success: true,
        sha: updateResult.data.content?.sha,
        source: 'github'
      };
    } catch (err: unknown) {
      console.error('[GitHub API Commit Error]', err);
      return {
        success: false,
        source: 'github',
        error: err instanceof Error ? err.message : 'Unknown GitHub API error'
      };
    }
  }

  // 1. Direct Obsidian Vault write (preferred)
  try {
    if (fs.existsSync(OBSIDIAN_WORKOUT_PATH)) {
      fs.writeFileSync(OBSIDIAN_WORKOUT_PATH, content, 'utf-8');
      // Also sync local backup sample file
      const backupPath = path.resolve(process.cwd(), 'data/Workout.sample.md');
      if (fs.existsSync(backupPath)) {
        try { fs.writeFileSync(backupPath, content, 'utf-8'); } catch {}
      }
      return {
        success: true,
        sha: `local-obsidian-${Date.now()}`,
        source: 'local'
      };
    }
  } catch (e) {
    console.warn('[Obsidian Vault Write Warning]', e);
  }

  // Local write fallback
  const localCandidates = [
    path.resolve(process.cwd(), config.path),
    path.resolve(process.cwd(), 'data/Workout.sample.md'),
    path.resolve(process.cwd(), 'web/data/Workout.sample.md')
  ];

  for (const candidate of localCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        fs.writeFileSync(candidate, content, 'utf-8');
        return {
          success: true,
          sha: `local-${Date.now()}`,
          source: 'local'
        };
      }
    } catch (e) {
      console.warn('[Local Write Warning]', e);
    }
  }

  return {
    success: true,
    sha: `local-${Date.now()}`,
    source: 'local'
  };
}
