import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthContext } from '@/lib/auth';
import { handleApiError, validateRequired, validateFileSize, validateFileType } from '@/lib/errors';
import { extractTextFromPDF, sanitizeResumeText } from '@/lib/pdf';
import { summarizeResume } from '@/lib/gemini';
import { createElevenLabsAgent } from '@/lib/elevenlabs';
import { createLogger, generateTraceId } from '@/lib/logger';
import { CreateSessionResponse } from '@/types';

// Route segment config - replaces old config export
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

export async function POST(req: NextRequest) {
  const traceId = generateTraceId();
  const logger = createLogger({ traceId, endpoint: '/api/session' });

  try {
    logger.info('Processing session creation request');

    // Authenticate user
    const authContext = await getAuthContext();
    logger.info({ userId: authContext.userId }, 'User authenticated');

    // Parse multipart form data
    const formData = await req.formData();
    const resumeFile = formData.get('resume') as File;
    const jobDescription = formData.get('jobDescription') as string;

    // Validate required fields
    validateRequired({ resume: resumeFile, jobDescription }, ['resume', 'jobDescription']);

    // Validate file
    validateFileType(resumeFile.name, ['pdf']);
    validateFileSize(resumeFile.size, 10); // 10MB max

    logger.info(
      { filename: resumeFile.name, size: resumeFile.size },
      'Resume file validated'
    );

    // Extract text from PDF
    const buffer = Buffer.from(await resumeFile.arrayBuffer());
    const resumeText = await extractTextFromPDF(buffer);
    const sanitizedText = sanitizeResumeText(resumeText);

    logger.info({ textLength: sanitizedText.length }, 'Resume text extracted');

    // Call Gemini to summarize resume
    const resumeSummary = await summarizeResume(sanitizedText);

    logger.info('Resume summarized by Gemini');

    // Create session in database (without agent_id initially)
    const session = await prisma.session.create({
      data: {
        userId: authContext.userId,
        jobDescription,
        resumeSummary: resumeSummary as any,
        status: 'PENDING',
      },
    });

    logger.info({ sessionId: session.id }, 'Session created in database');

    // Create ElevenLabs agent with knowledge base
    const agentId = await createElevenLabsAgent(
      session.id,
      resumeSummary,
      jobDescription
    );

    // Update session with agent_id
    await prisma.session.update({
      where: { id: session.id },
      data: { agentId },
    });

    logger.info(
      { sessionId: session.id, agentId },
      'Session creation completed successfully'
    );

    const response: CreateSessionResponse = {
      sessionId: session.id,
      agentId,
      resumeSummary,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Log the actual error with all details
    if (error instanceof Error) {
      logger.error(error.message, { 
        stack: error.stack,
        name: error.name 
      });
    } else {
      logger.error('Session creation failed', { error: String(error) });
    }

    const { error: apiError, statusCode } = handleApiError(error);
    return NextResponse.json({ error: apiError }, { status: statusCode });
  }
}
