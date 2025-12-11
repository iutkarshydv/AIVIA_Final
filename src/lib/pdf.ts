import pdfParse from 'pdf-parse';
import { createApiError } from './errors';
import { logger } from './logger';

/**
 * Extract text content from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  logger.info({ size: buffer.length }, 'Extracting text from PDF');

  try {
    const data = await pdfParse(buffer);

    const text = data.text.trim();

    if (!text || text.length < 100) {
      throw createApiError(
        'EMPTY_RESUME',
        'Resume appears to be empty or unreadable',
        400
      );
    }

    logger.info(
      {
        pages: data.numpages,
        textLength: text.length,
      },
      'PDF text extracted successfully'
    );

    return text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract PDF text');

    if (error instanceof Error && error.message.includes('Invalid PDF')) {
      throw createApiError(
        'INVALID_PDF',
        'The uploaded file is not a valid PDF',
        400
      );
    }

    throw createApiError(
      'PDF_PARSE_ERROR',
      'Failed to parse PDF file',
      500,
      { originalError: error }
    );
  }
}

/**
 * Validate and sanitize resume text
 */
export function sanitizeResumeText(text: string): string {
  // Remove excessive whitespace
  let sanitized = text.replace(/\s+/g, ' ');

  // Remove control characters except newlines
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Limit length to prevent token overflow
  const maxLength = 50000; // ~12.5k tokens
  if (sanitized.length > maxLength) {
    logger.warn(
      { originalLength: sanitized.length, maxLength },
      'Resume text truncated'
    );
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}
