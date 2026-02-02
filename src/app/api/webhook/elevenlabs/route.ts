import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyElevenLabsWebhook } from '@/lib/elevenlabs';
import { handleApiError } from '@/lib/errors';
import { createLogger, generateTraceId } from '@/lib/logger';
import { WebhookEvent, EvaluationResult } from '@/types';

export async function POST(req: NextRequest) {
  const traceId = generateTraceId();
  const logger = createLogger({ traceId, endpoint: '/api/webhook/elevenlabs' });

  try {
    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('x-elevenlabs-signature') || '';

    // Verify webhook signature
    if (!verifyElevenLabsWebhook(body, signature)) {
      logger.warn('Invalid webhook signature');
      return NextResponse.json(
        { error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } },
        { status: 401 }
      );
    }

    const event: WebhookEvent = JSON.parse(body);

    logger.info(
      { eventType: event.event_type, sessionId: event.session_id },
      'Processing webhook event'
    );

    // Handle different event types
    switch (event.event_type) {
      case 'conversation.transcript.final':
        await handleTranscriptEvent(event, logger);
        break;

      case 'conversation.agent.evaluation':
        await handleEvaluationEvent(event, logger);
        break;

      case 'conversation.status.ended':
        await handleConversationEndedEvent(event, logger);
        break;

      default:
        logger.debug('Unhandled event type', { eventType: event.event_type });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Webhook processing failed');

    // Always return 200 to prevent retries for non-critical errors
    return NextResponse.json({ success: false, error: 'Processing failed' });
  }
}

async function handleTranscriptEvent(event: WebhookEvent, logger: any) {
  const { session_id, data } = event;

  // Find session by conversation ID (stored in metadata)
  const session = await prisma.session.findFirst({
    where: {
      id: session_id, // Or search in metadata if different
    },
  });

  if (!session) {
    logger.warn({ sessionId: session_id }, 'Session not found for transcript');
    return;
  }

  // Get next sequence number
  const lastTranscript = await prisma.transcript.findFirst({
    where: { sessionId: session.id },
    orderBy: { seq: 'desc' },
  });

  const seq = (lastTranscript?.seq || 0) + 1;

  // Insert transcript
  await prisma.transcript.create({
    data: {
      sessionId: session.id,
      speaker: data.speaker === 'agent' ? 'AGENT' : 'CANDIDATE',
      seq,
      text: data.text,
      metadata: {
        timestamp: data.timestamp || Date.now(),
        confidence: data.confidence,
      },
    },
  });

  logger.info({ sessionId: session.id, seq }, 'Transcript saved');
}

async function handleEvaluationEvent(event: WebhookEvent, logger: any) {
  const { session_id, data } = event;

  // Find session
  const session = await prisma.session.findFirst({
    where: { id: session_id },
  });

  if (!session) {
    logger.warn({ sessionId: session_id }, 'Session not found for evaluation');
    return;
  }

  // Parse evaluation JSON
  let evaluation: EvaluationResult;
  try {
    evaluation = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    logger.error({ data, error }, 'Failed to parse evaluation JSON');
    return;
  }

  // Insert evaluation
  await prisma.evaluation.create({
    data: {
      sessionId: session.id,
      questionId: evaluation.questionId,
      scoreJson: {
        technical: evaluation.technical,
        communication: evaluation.communication,
        problemSolving: evaluation.problemSolving,
        examples: evaluation.examples,
        cultureFit: evaluation.cultureFit,
        overall: evaluation.overall,
      },
      rationale: evaluation.rationale,
    },
  });

  logger.info(
    { sessionId: session.id, questionId: evaluation.questionId },
    'Evaluation saved'
  );
}

async function handleConversationEndedEvent(event: WebhookEvent, logger: any) {
  const { session_id } = event;

  // Update session status
  await prisma.session.updateMany({
    where: { id: session_id },
    data: { status: 'COMPLETED' },
  });

  logger.info({ sessionId: session_id }, 'Session marked as completed');
}
