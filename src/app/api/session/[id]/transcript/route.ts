import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifySessionOwnership, getAuthContext } from '@/lib/auth';
import { handleApiError } from '@/lib/errors';
import { createLogger, generateTraceId } from '@/lib/logger';
import { SessionTranscriptResponse } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const traceId = generateTraceId();
  const logger = createLogger({ traceId, endpoint: `/api/session/${params.id}/transcript` });

  try {
    const sessionId = params.id;

    logger.info({ sessionId }, 'Fetching session transcript');

    // Authenticate user
    const authContext = await getAuthContext();

    // Verify session ownership
    await verifySessionOwnership(sessionId, authContext.userId);

    // Fetch session with transcripts and evaluations
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        transcripts: {
          orderBy: { seq: 'asc' },
        },
        evaluations: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } },
        { status: 404 }
      );
    }

    // Format response
    const response: SessionTranscriptResponse = {
      session: {
        id: session.id,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        jobDescription: session.jobDescription,
        resumeSummary: session.resumeSummary as any,
      },
      transcripts: session.transcripts.map((t) => ({
        speaker: t.speaker,
        seq: t.seq,
        text: t.text,
        timestamp: (t.metadata as any)?.timestamp || t.createdAt.getTime(),
      })),
      evaluations: session.evaluations.map((e) => ({
        questionId: e.questionId || undefined,
        scores: e.scoreJson as any,
        rationale: e.rationale,
        createdAt: e.createdAt.toISOString(),
      })),
    };

    logger.info(
      {
        sessionId,
        transcriptsCount: response.transcripts.length,
        evaluationsCount: response.evaluations.length,
      },
      'Transcript fetched successfully'
    );

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch transcript');

    const { error: apiError, statusCode } = handleApiError(error);
    return NextResponse.json({ error: apiError }, { status: statusCode });
  }
}
