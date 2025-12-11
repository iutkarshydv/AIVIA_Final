import { ApplicationError, ApiError } from '@/types';
import { logger } from './logger';

export function createApiError(
  code: string,
  message: string,
  statusCode: number = 500,
  details?: any
): ApplicationError {
  return new ApplicationError(code, message, statusCode, details);
}

export function handleApiError(error: unknown): {
  error: ApiError;
  statusCode: number;
} {
  logger.error({ error }, 'API error occurred');

  if (error instanceof ApplicationError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
      statusCode: 500,
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
    },
    statusCode: 500,
  };
}

// Validation helpers
export function validateRequired(
  fields: Record<string, any>,
  requiredFields: string[]
): void {
  const missing = requiredFields.filter((field) => !fields[field]);
  
  if (missing.length > 0) {
    throw createApiError(
      'VALIDATION_ERROR',
      `Missing required fields: ${missing.join(', ')}`,
      400
    );
  }
}

export function validateFileType(
  filename: string,
  allowedTypes: string[]
): void {
  const ext = filename.toLowerCase().split('.').pop();
  
  if (!ext || !allowedTypes.includes(ext)) {
    throw createApiError(
      'INVALID_FILE_TYPE',
      `File type .${ext} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      400
    );
  }
}

export function validateFileSize(
  size: number,
  maxSizeMB: number
): void {
  const maxBytes = maxSizeMB * 1024 * 1024;
  
  if (size > maxBytes) {
    throw createApiError(
      'FILE_TOO_LARGE',
      `File size ${(size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${maxSizeMB}MB`,
      400
    );
  }
}
