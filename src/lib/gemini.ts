import { GoogleGenerativeAI } from '@google/generative-ai';
import { ResumeSummary } from '@/types';
import { createApiError } from './errors';
import { logger } from './logger';
import { retry } from './utils';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const RESUME_SUMMARY_PROMPT = `Analyze the following resume and provide a structured JSON summary. Keep descriptions concise.

Resume text:
{RESUME_TEXT}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "skills": ["skill1", "skill2", ...],
  "experience": [
    {
      "role": "Job Title",
      "company": "Company Name",
      "years": 2,
      "highlights": ["brief achievement 1", "brief achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "School Name",
      "year": 2020
    }
  ],
  "summary": "Brief 2-3 sentence professional summary",
  "keyStrengths": ["strength1", "strength2", "strength3"]
}

Important:
- Keep each highlight under 50 characters
- Extract top 15 most relevant skills only
- List maximum 3 most recent positions
- Keep summary under 100 words`;

export async function summarizeResume(
  resumeText: string
): Promise<ResumeSummary> {
  logger.info('Starting resume summarization with Gemini');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2, // Lower for more predictable output
        maxOutputTokens: 4096, // Increased token limit
        topP: 0.8,
        topK: 40,
      },
    });

    const prompt = RESUME_SUMMARY_PROMPT.replace('{RESUME_TEXT}', resumeText);

    const result = await retry(
      async () => {
        const response = await model.generateContent(prompt);
        return response;
      },
      {
        maxRetries: 3,
        delayMs: 1000,
        backoff: 'exponential',
      }
    );

    const text = result.response.text();
    logger.debug({ responseLength: text.length }, 'Received Gemini response');

    // Clean the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    // Attempt to fix truncated JSON by adding missing closing brackets
    if (!cleanedText.endsWith('}')) {
      logger.warn('Response appears truncated, attempting to fix');
      
      // Count opening and closing braces/brackets
      const openBraces = (cleanedText.match(/{/g) || []).length;
      const closeBraces = (cleanedText.match(/}/g) || []).length;
      const openBrackets = (cleanedText.match(/\[/g) || []).length;
      const closeBrackets = (cleanedText.match(/]/g) || []).length;
      
      // Add missing closing characters
      for (let i = 0; i < (openBrackets - closeBrackets); i++) {
        cleanedText += ']';
      }
      for (let i = 0; i < (openBraces - closeBraces); i++) {
        cleanedText += '}';
      }
      
      // Remove any trailing incomplete strings
      cleanedText = cleanedText.replace(/,\s*$/, '');
    }

    // Parse JSON response
    let summary: ResumeSummary;
    try {
      summary = JSON.parse(cleanedText);
    } catch (parseError) {
      logger.error({ text: cleanedText, parseError }, 'Failed to parse Gemini JSON response');
      
      // Try to extract what we can
      try {
        // Remove everything after last complete object
        const lastCloseBrace = cleanedText.lastIndexOf('}');
        if (lastCloseBrace > 0) {
          cleanedText = cleanedText.substring(0, lastCloseBrace + 1);
          summary = JSON.parse(cleanedText);
        } else {
          throw parseError;
        }
      } catch {
        throw createApiError(
          'GEMINI_PARSE_ERROR',
          'Failed to parse resume summary from Gemini. Response may be too long.',
          500
        );
      }
    }

    // Validate required fields (make education optional)
    if (!summary.skills || !summary.experience || !summary.summary) {
      logger.error({ summary }, 'Invalid resume summary structure');
      throw createApiError(
        'GEMINI_INVALID_RESPONSE',
        'Resume summary is missing required fields',
        500
      );
    }

    // Set defaults for optional fields
    summary.education = summary.education || [];
    summary.keyStrengths = summary.keyStrengths || [];

    logger.info(
      {
        skillsCount: summary.skills.length,
        experienceCount: summary.experience.length,
      },
      'Resume summarized successfully'
    );

    return summary;
  } catch (error) {
    logger.error({ error }, 'Gemini API error');
    
    if (error instanceof Error && error.message.includes('API key')) {
      throw createApiError('GEMINI_AUTH_ERROR', 'Invalid Gemini API key', 401);
    }
    
    throw error;
  }
}

/**
 * Validate job description and generate interview focus areas
 */
export async function analyzeJobDescription(jobDescription: string): Promise<{
  keyRequirements: string[];
  technicalSkills: string[];
  softSkills: string[];
  focusAreas: string[];
}> {
  logger.info('Analyzing job description with Gemini');

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const prompt = `Analyze this job description and extract key information:

${jobDescription}

Return ONLY valid JSON:
{
  "keyRequirements": ["requirement1", "requirement2"],
  "technicalSkills": ["skill1", "skill2"],
  "softSkills": ["skill1", "skill2"],
  "focusAreas": ["area1", "area2"]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Clean markdown if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const analysis = JSON.parse(cleanedText);
    logger.info('Job description analyzed successfully');
    
    return analysis;
  } catch (error) {
    logger.error({ error }, 'Failed to analyze job description');
    throw createApiError(
      'GEMINI_JD_ANALYSIS_ERROR',
      'Failed to analyze job description',
      500
    );
  }
}
