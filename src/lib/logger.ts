// Simple console-based logger for Next.js compatibility
const isDevelopment = process.env.NODE_ENV === 'development';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  private formatMessage(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const contextStr = Object.keys(this.context).length 
      ? JSON.stringify(this.context) 
      : '';
    
    let dataStr = '';
    if (data) {
      // Handle Error objects specially
      if (data.error instanceof Error) {
        dataStr = JSON.stringify({
          ...data,
          error: {
            message: data.error.message,
            stack: data.error.stack,
            name: data.error.name,
          }
        });
      } else {
        try {
          dataStr = JSON.stringify(data);
        } catch (e) {
          dataStr = String(data);
        }
      }
    }
    
    return `[${timestamp}] ${level.toUpperCase()} ${contextStr} ${message} ${dataStr}`;
  }

  debug(message: string, data?: any) {
    if (isDevelopment) {
      console.debug(this.formatMessage('debug', message, data));
    }
  }

  info(messageOrData: string | Record<string, any>, data?: any) {
    if (typeof messageOrData === 'string') {
      console.info(this.formatMessage('info', messageOrData, data));
    } else {
      console.info(this.formatMessage('info', '', messageOrData));
    }
  }

  warn(message: string, data?: any) {
    console.warn(this.formatMessage('warn', message, data));
  }

  error(messageOrError: string | Error | Record<string, any>, data?: any) {
    if (messageOrError instanceof Error) {
      console.error(this.formatMessage('error', messageOrError.message, {
        ...data,
        stack: messageOrError.stack,
        name: messageOrError.name,
      }));
    } else if (typeof messageOrError === 'object') {
      // Handle { error, message } pattern
      console.error(this.formatMessage('error', data || 'Error occurred', messageOrError));
    } else {
      console.error(this.formatMessage('error', messageOrError, data));
    }
  }

  child(context: Record<string, any>) {
    return new Logger({ ...this.context, ...context });
  }
}

export const logger = new Logger();

// Helper to create child logger with context
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

// Generate unique trace ID for request tracking
export function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
