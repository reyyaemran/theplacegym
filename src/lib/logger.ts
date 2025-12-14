/**
 * Centralized logging utility
 * Replaces console.log/error/warn with a structured logging system
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isProduction = process.env.NODE_ENV === "production";

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const formattedMessage = this.formatMessage(level, message, context);

    // In development, use console methods
    if (this.isDevelopment) {
      switch (level) {
        case "debug":
        case "info":
          console.log(formattedMessage, context || "");
          break;
        case "warn":
          console.warn(formattedMessage, context || "");
          break;
        case "error":
          console.error(formattedMessage, error || context || "");
          break;
      }
    }

    // In production, send to error tracking service (e.g., Sentry)
    if (this.isProduction && level === "error") {
      // TODO: Integrate with error tracking service
      // Example: Sentry.captureException(error || new Error(message), { extra: context });
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.log("debug", message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log("error", message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogContext, LogLevel };

