import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext, verifySessionOwnership } from '@/lib/auth';
import { handleApiError, validateRequired } from '@/lib/errors';
import { createRealtimeToken } from '@/lib/elevenlabs';
import { createLogger, generateTraceId } from '@/lib/logger';
import { GetTokenResponse } from '@/types';

export async function POST(req: NextRequest) {
  const traceId = generateTraceId();
  const logger = createLogger({ traceId, endpoint: '/api/token' });

  try {
    logger.info('Processing token request');

    // Authenticate user
    const authContext = await getAuthContext();

    // Parse request body
    const body = await req.json();
    const { sessionId } = body;

    // Validate required fields
    validateRequired({ sessionId }, ['sessionId']);

    // Verify session ownership
    await verifySessionOwnership(sessionId, authContext.userId);

    // Get session with agent_id
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { agentId: true, status: true },
    });

    if (!session?.agentId) {
      return NextResponse.json(
        { error: { code: 'NO_AGENT', message: 'Agent not created for this session' } },
        { status: 400 }
      );
    }

    if (session.status === 'COMPLETED') {
      return NextResponse.json(
        { error: { code: 'SESSION_COMPLETED', message: 'Session already completed' } },
        { status: 400 }
      );
    }

    logger.info({ sessionId, agentId: session.agentId }, 'Creating realtime token');

    // Create ephemeral token from ElevenLabs (FIX: correct parameter order)
    const realtimeSession = await createRealtimeToken(sessionId, session.agentId);

    // Update session status to ACTIVE
    await prisma.session.update({
      where: { id: sessionId },
      data: { status: 'ACTIVE' },
    });

    logger.info(
      { sessionId },
      'Token created successfully'
    );

    const response: GetTokenResponse = {
      realtimeToken: realtimeSession.token,
      elevenWsUrl: realtimeSession.ws_url,
      expiresAt: realtimeSession.expires_at,
      agentId: session.agentId,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ error }, 'Token creation failed');

    const { error: apiError, statusCode } = handleApiError(error);
    return NextResponse.json({ error: apiError }, { status: statusCode });
  }
}
