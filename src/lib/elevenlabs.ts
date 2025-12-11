import {
  ElevenLabsAgentConfig,
  ElevenLabsRealtimeSession,
  ResumeSummary,
} from '@/types';
import { createApiError } from './errors';
import { logger } from './logger';
import { retry } from './utils';
import { DEFAULT_RUBRIC, AGENT_SYSTEM_PROMPT } from './rubric';
import { prisma } from './db';

const ELEVEN_API_KEY = process.env.ELEVEN_API_KEY!;
const ELEVEN_BASE_URL =
  process.env.ELEVEN_REALTIME_BASE_URL || 'https://api.elevenlabs.io/v1';
const ELEVEN_LABS_AGENT_ID = process.env.ELEVEN_LABS_AGENT_ID;

/**
 * Create or configure ElevenLabs agent with custom knowledge base
 * Stores KB in database to be passed during conversation initialization
 */
export async function createElevenLabsAgent(
  sessionId: string,
  resumeSummary: ResumeSummary,
  jobDescription: string
): Promise<string> {
  logger.info({ sessionId }, 'Creating ElevenLabs agent configuration');

  try {
    // Assemble knowledge base content with resume, JD, and rubric
    const knowledgeBase = assembleKnowledgeBase(
      resumeSummary,
      jobDescription
    );

    // Assemble custom system prompt with instructions
    const systemPrompt = assembleSystemPrompt(resumeSummary, jobDescription);

    // Assemble first message
    const firstMessage = assembleFirstMessage(resumeSummary);

    let agentId: string;

    // Priority 1: Use agent ID from environment variable
    if (ELEVEN_LABS_AGENT_ID) {
      agentId = ELEVEN_LABS_AGENT_ID;
      logger.info({ agentId, sessionId }, 'Using configured ElevenLabs agent');
      
      // Try to update agent configuration via API (if supported)
      await updateAgentConfiguration(agentId, {
        knowledgeBase,
        systemPrompt,
        firstMessage,
      }).catch((err) => {
        logger.warn({ error: err }, 'Could not update agent configuration via API, will use database storage');
      });
    } else {
      // Priority 2: Try to fetch existing agents
      const agentsResponse = await retry(
        async () => {
          const res = await fetch(`${ELEVEN_BASE_URL}/convai/agents`, {
            method: 'GET',
            headers: {
              'xi-api-key': ELEVEN_API_KEY,
            },
          });

          if (!res.ok) {
            logger.warn('Unable to fetch ElevenLabs agents');
            return null;
          }

          return res.json();
        },
        {
          maxRetries: 2,
          delayMs: 500,
        }
      ).catch(() => null);

      if (agentsResponse && agentsResponse.agents && agentsResponse.agents.length > 0) {
        agentId = agentsResponse.agents[0].agent_id;
        logger.info({ agentId }, 'Using first available ElevenLabs agent');
      } else {
        // Use placeholder for development
        agentId = 'agent_' + sessionId.substring(0, 16);
        logger.warn({ agentId }, 'Using placeholder agent ID');
      }
    }

    // Store knowledge base, system prompt, and first message in database
    // This will be retrieved when creating the conversation
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        agentId,
        // Store the custom configuration in resumeSummary JSON field temporarily
        // In production, add dedicated columns: knowledgeBase, systemPrompt, firstMessage
        resumeSummary: {
          ...(typeof resumeSummary === 'object' ? resumeSummary : {}),
          _agentConfig: {
            knowledgeBase,
            systemPrompt,
            firstMessage,
            rubric: DEFAULT_RUBRIC,
          }
        } as any
      },
    });

    logger.info(
      { 
        sessionId, 
        agentId,
        knowledgeBaseLength: knowledgeBase.length,
        systemPromptLength: systemPrompt.length 
      }, 
      'Agent configuration stored in database'
    );

    return agentId;
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to create ElevenLabs agent');
    throw createApiError(
      'AGENT_CREATION_FAILED',
      'Failed to create interview agent',
      500,
      { originalError: error }
    );
  }
}

/**
 * Try to update agent configuration via ElevenLabs API
 * Note: This may not be supported by all API versions
 */
async function updateAgentConfiguration(
  agentId: string,
  config: { knowledgeBase: string; systemPrompt: string; firstMessage: string }
): Promise<void> {
  try {
    const response = await fetch(`${ELEVEN_BASE_URL}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: {
          prompt: config.systemPrompt,
        },
        first_message: config.firstMessage,
        knowledge_base: {
          type: 'text',
          content: config.knowledgeBase,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update agent: ${response.status}`);
    }

    logger.info({ agentId }, 'Agent configuration updated successfully');
  } catch (error) {
    logger.warn({ error, agentId }, 'Failed to update agent configuration');
    throw error;
  }
}

/**
 * Assemble knowledge base from resume summary, job description, and rubric
 */
function assembleKnowledgeBase(
  resumeSummary: ResumeSummary,
  jobDescription: string
): string {
  const kb = `
# CANDIDATE RESUME SUMMARY

## Skills
${resumeSummary.skills.join(', ')}

## Experience
${resumeSummary.experience
  .map(
    (exp) => `
### ${exp.role} at ${exp.company} (${exp.years} years)
${exp.highlights.map((h) => `- ${h}`).join('\n')}
`
  )
  .join('\n')}

## Education
${resumeSummary.education?.map((edu) => `- ${edu.degree} from ${edu.institution} (${edu.year})`).join('\n') || 'Not provided'}

## Professional Summary
${resumeSummary.summary}

## Key Strengths
${resumeSummary.keyStrengths?.join(', ') || 'Not specified'}

---

# JOB DESCRIPTION

${jobDescription}

---

# EVALUATION RUBRIC

${JSON.stringify(DEFAULT_RUBRIC, null, 2)}

## Scoring Guidelines
- **5 (Excellent)**: Exceptional demonstration with specific examples, quantifiable results, and deep understanding
- **4 (Very Good)**: Strong demonstration with clear examples and good understanding  
- **3 (Good)**: Adequate demonstration with some examples
- **2 (Fair)**: Basic understanding with limited examples
- **1 (Poor)**: Minimal understanding or no relevant experience
- **0 (No Evidence)**: No demonstration of the criterion

## Required Output Format
After each candidate answer, you MUST provide a JSON evaluation:
\`\`\`json
{
  "question_id": "q1",
  "technical": 4,
  "problemSolving": 5,
  "communication": 4,
  "examples": 3,
  "cultureFit": 4,
  "overall": 4,
  "rationale": "Brief explanation of scores"
}
\`\`\`
`;

  return kb.trim();
}

/**
 * Assemble custom system prompt with interview instructions
 */
function assembleSystemPrompt(
  resumeSummary: ResumeSummary,
  jobDescription: string
): string {
  return `${AGENT_SYSTEM_PROMPT}

## Context
You are interviewing a candidate with the following background:
- Key Skills: ${resumeSummary.skills.slice(0, 5).join(', ')}
- Experience Level: ${resumeSummary.experience.length} position(s)
- Professional Summary: ${resumeSummary.summary}

The position requires:
${jobDescription.substring(0, 500)}...

## Interview Guidelines
1. Ask 5-7 targeted questions based on the job requirements and candidate's background
2. After EACH candidate answer, provide a JSON evaluation using the rubric
3. Probe for specific examples with STAR method (Situation, Task, Action, Result)
4. Ask follow-up questions to clarify vague answers
5. Keep a conversational, encouraging tone
6. Total interview: 20-30 minutes
7. At the end, provide a final summary with overall recommendation

## Evaluation Process
- Listen carefully to each answer
- Assess against rubric criteria
- Provide JSON scores immediately after each answer
- Give constructive feedback
- Adapt question difficulty based on responses`;
}

/**
 * Assemble first message to greet candidate
 */
function assembleFirstMessage(resumeSummary: ResumeSummary): string {
  const candidateName = extractNameFromResume(resumeSummary);
  
  return `Hello${candidateName ? ` ${candidateName}` : ''}! Thank you for joining this interview today. I've reviewed your resume and I'm impressed by your background, particularly your experience with ${resumeSummary.skills.slice(0, 3).join(', ')}.

I'll be asking you some questions to understand your experience and how it aligns with the role. Feel free to provide specific examples and take your time with your answers. 

Are you ready to begin?`;
}

/**
 * Extract candidate name from resume (if available)
 */
function extractNameFromResume(resumeSummary: ResumeSummary): string | null {
  // This would need to be added to the resume summary structure
  // For now, return null
  return null;
}

/**
 * Generate ephemeral realtime token for WebSocket connection
 * Includes conversation configuration with custom instructions
 */
export async function createRealtimeToken(
  sessionId: string,
  agentId: string
): Promise<ElevenLabsRealtimeSession> {
  logger.info({ sessionId, agentId }, 'Generating ElevenLabs realtime token');

  // Retrieve stored agent configuration from database
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { resumeSummary: true },
  });

  const agentConfig = (session?.resumeSummary as any)?._agentConfig;

  try {
    const response = await retry(
      async () => {
        // The correct ElevenLabs endpoint for getting WebSocket URL
        const url = new URL(`${ELEVEN_BASE_URL}/convai/conversation/get_signed_url`);
        url.searchParams.append('agent_id', agentId);
        
        logger.info({ url: url.toString() }, 'Requesting signed URL from ElevenLabs');
        
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVEN_API_KEY,
          },
        });

        if (!res.ok) {
          const errorText = await res.text();
          logger.error({ status: res.status, error: errorText }, 'ElevenLabs API error');
          throw new Error(`Token generation failed: ${res.status} - ${errorText}`);
        }

        const data = await res.json();
        logger.info({ response: data }, 'Received signed URL response');
        return data;
      },
      {
        maxRetries: 2,
        delayMs: 500,
      }
    );

    // The response should contain signed_url which is the WebSocket URL
    const wsUrl = response.signed_url;
    
    if (!wsUrl) {
      throw new Error('No signed_url in response from ElevenLabs');
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

    logger.info({ sessionId, wsUrl }, 'Realtime token generated successfully');

    return {
      token: wsUrl, // The signed URL IS the token
      wsUrl,
      expiresAt,
      conversationConfig: agentConfig,
    };
  } catch (error) {
    logger.error({ error, sessionId, agentId }, 'Failed to generate realtime token');
    
    // Only use mock mode if explicitly no agent ID is configured
    if (!ELEVEN_LABS_AGENT_ID) {
      logger.warn('Falling back to mock mode - no ELEVEN_LABS_AGENT_ID configured');
      
      return {
        token: `mock_token_${sessionId}`,
        wsUrl: `wss://mock-websocket-url`,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        conversationConfig: agentConfig,
      };
    }
    
    throw createApiError(
      'TOKEN_GENERATION_FAILED',
      'Failed to generate realtime connection token',
      500,
      { originalError: error }
    );
  }
}

/**
 * List available ElevenLabs voices for agent configuration
 */
export async function listVoices(): Promise<any[]> {
  try {
    const response = await fetch(`${ELEVEN_BASE_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVEN_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    logger.error({ error }, 'Failed to list voices');
    return [];
  }
}

/**
 * Get agent configuration (for debugging)
 */
export async function getAgentConfig(agentId: string): Promise<any> {
  try {
    const response = await fetch(
      `${ELEVEN_BASE_URL}/convai/agents/${agentId}`,
      {
        headers: {
          'xi-api-key': ELEVEN_API_KEY,
        },
      }
    );

    if (!response.ok) {
      logger.warn({ agentId }, 'Could not fetch agent config');
      return null;
    }

    return response.json();
  } catch (error) {
    logger.error({ error, agentId }, 'Error fetching agent config');
    return null;
  }
}

/**
 * Verify webhook signature from ElevenLabs
 */
export function verifyElevenLabsWebhook(
  payload: string,
  signature: string
): boolean {
  const { verifyWebhookSignature } = require('./utils');
  const secret = process.env.WEBHOOK_SECRET!;

  return verifyWebhookSignature(payload, signature, secret);
}
