import winston from 'winston';

const enableFileLogging = process.env.LOG_TO_FILE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

const transports: winston.transport[] = [
  new winston.transports.Console({ format: winston.format.simple() }),
];

if (!isProduction || enableFileLogging) {
  transports.unshift(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  transports.unshift(new winston.transports.File({ filename: 'logs/combined.log' }));
}

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.json(),
  transports,
});