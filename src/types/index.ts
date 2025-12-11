// Core type definitions for the application

export interface ResumeSummary {
  skills: string[];
  experience: Array<{
    role: string;
    company: string;
    years: number;
    highlights: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: number;
  }>;
  summary: string;
  keyStrengths: string[];
}

export interface EvaluationScores {
  technical: number; // 0-5
  communication: number; // 0-5
  problemSolving: number; // 0-5
  examples: number; // 0-5
  cultureFit: number; // 0-5
  overall: number; // 0-5
}

export interface EvaluationResult extends EvaluationScores {
  questionId: string;
  rationale: string;
}

export interface TranscriptMetadata {
  timestamp: number;
  partial?: boolean;
  duration?: number;
  confidence?: number;
}

export interface Rubric {
  criteria: Array<{
    id: keyof EvaluationScores;
    name: string;
    description: string;
    scale: number; // 0-5
    anchors: Record<string, string>; // {"0": "description", "3": "description", "5": "description"}
  }>;
  outputFormat: string;
  instructions: string;
}

// ElevenLabs API types
export interface ElevenLabsAgentConfig {
  name: string;
  voice_id?: string;
  prompt?: {
    prompt: string;
    llm: string;
  };
  knowledge_base?: {
    type: 'text';
    content: string;
  };
}

export interface ElevenLabsRealtimeSession {
  session_id: string;
  agent_id: string;
  ws_url: string;
  token: string;
  expires_at: number;
}

export interface ElevenLabsWebSocketMessage {
  type: 
    | 'server.transcript.partial'
    | 'server.transcript.final'
    | 'server.audio.chunk'
    | 'server.agent.evaluation'
    | 'server.agent.response'
    | 'server.error'
    | 'client.audio'
    | 'client.interruption';
  data?: any;
}

// Gemini API types
export interface GeminiPromptConfig {
  model: string;
  systemInstruction: string;
  generationConfig: {
    temperature: number;
    maxOutputTokens: number;
    responseMimeType: string;
  };
}

// API request/response types
export interface CreateSessionRequest {
  userId: string;
  jobDescription: string;
  resumeFile: File;
  rubricId?: string;
}

export interface CreateSessionResponse {
  sessionId: string;
  agentId: string;
  resumeSummary: ResumeSummary;
}

export interface GetTokenRequest {
  sessionId: string;
}

export interface GetTokenResponse {
  realtimeToken: string;
  elevenWsUrl: string;
  expiresAt: number;
  agentId: string;
}

export interface WebhookEvent {
  event_type: string;
  session_id: string;
  timestamp: number;
  data: any;
}

export interface SessionTranscriptResponse {
  session: {
    id: string;
    status: string;
    createdAt: string;
    jobDescription: string;
    resumeSummary?: ResumeSummary;
  };
  transcripts: Array<{
    speaker: string;
    seq: number;
    text: string;
    timestamp: number;
  }>;
  evaluations: Array<{
    questionId?: string;
    scores: EvaluationScores;
    rationale: string;
    createdAt: string;
  }>;
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export class ApplicationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}
