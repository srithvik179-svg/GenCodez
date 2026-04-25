/**
 * Simple structured logger.
 * Wraps console methods with timestamps and log levels.
 * Replace with Winston/Pino for production if needed.
 */

const LOG_LEVELS = { ERROR: 'ERROR', WARN: 'WARN', INFO: 'INFO', DEBUG: 'DEBUG' };

const timestamp = () => new Date().toISOString();

const formatMessage = (level, message) => {
  return `[${timestamp()}] [${level}] ${message}`;
};

const logger = {
  info: (msg) => console.log(formatMessage(LOG_LEVELS.INFO, msg)),
  warn: (msg) => console.warn(formatMessage(LOG_LEVELS.WARN, msg)),
  error: (msg) => console.error(formatMessage(LOG_LEVELS.ERROR, msg)),
  debug: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage(LOG_LEVELS.DEBUG, msg));
    }
  },
};

module.exports = logger;
