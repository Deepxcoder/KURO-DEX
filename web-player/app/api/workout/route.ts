import { NextResponse } from 'next/server';
import { fetchWorkoutFile } from '@/lib/github';
import { parseWorkoutMarkdown } from '@/lib/parser';
import { WorkoutApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { content, sha, source } = await fetchWorkoutFile();
    const sessions = parseWorkoutMarkdown(content);

    const response: WorkoutApiResponse = {
      rawMarkdown: content,
      sessions,
      currentSessionId: sessions[0]?.id || '',
      sha,
      source
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[API Workout Fetch Error]', error);
    return NextResponse.json(
      {
        rawMarkdown: '',
        sessions: [],
        currentSessionId: '',
        source: 'local',
        error: error instanceof Error ? error.message : 'Failed to fetch workout data'
      },
      { status: 500 }
    );
  }
}
