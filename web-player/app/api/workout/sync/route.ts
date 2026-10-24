import { NextRequest, NextResponse } from 'next/server';
import { fetchWorkoutFile, commitWorkoutFile } from '@/lib/github';
import { parseWorkoutMarkdown, toggleMarkdownCheckbox } from '@/lib/parser';
import { SyncPayload } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as SyncPayload;
    const { action, rawMarkdown, exerciseId, completed, sha } = payload;

    let updatedMarkdown = '';
    let commitMsg = 'chore(gym): sync workout via KuroDex Web Player';

    if (action === 'raw') {
      if (typeof rawMarkdown !== 'string') {
        return NextResponse.json({ error: 'rawMarkdown string required for raw action' }, { status: 400 });
      }
      updatedMarkdown = rawMarkdown;
      commitMsg = 'chore(gym): manual edit in KuroDex Live Markdown Editor';
    } else if (action === 'toggle') {
      const current = await fetchWorkoutFile();
      const exerciseName = exerciseId ? exerciseId.replace(/^ex-\d+-/, '').replace(/-/g, ' ') : '';

      updatedMarkdown = toggleMarkdownCheckbox(
        current.content,
        exerciseName,
        completed ?? true
      );
      commitMsg = `chore(gym): mark exercise ${exerciseName} ${completed ? 'complete' : 'pending'}`;
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const commitRes = await commitWorkoutFile(updatedMarkdown, commitMsg, sha);

    if (!commitRes.success) {
      return NextResponse.json({ error: commitRes.error || 'Failed to commit to GitHub' }, { status: 500 });
    }

    const parsedSessions = parseWorkoutMarkdown(updatedMarkdown);

    return NextResponse.json({
      success: true,
      sha: commitRes.sha,
      source: commitRes.source,
      rawMarkdown: updatedMarkdown,
      sessions: parsedSessions
    });
  } catch (err: unknown) {
    console.error('[API Workout Sync Error]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
