import morgan from 'morgan';
import { logger } from '../utils/logger.js';

export const requestLogger = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  {
    stream: {
      write: (message) => logger.http(message.trim()),
    },
  }
);
