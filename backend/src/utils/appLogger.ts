import * as fs from 'fs';
import * as path from 'path';

const logDirectory = path.join(__dirname, '../../logs');
const logFile = path.join(logDirectory, 'application.log');

const ensureLogDirectory = () => {
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }
};

export const writeLog = (level: 'INFO' | 'WARN' | 'ERROR', message: string, metadata?: unknown) => {
  ensureLogDirectory();
  const suffix = metadata === undefined ? '' : ` ${JSON.stringify(metadata)}`;
  const line = `${new Date().toISOString()} [${level}] ${message}${suffix}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
};

export const getLogFilePath = () => {
  ensureLogDirectory();
  return logFile;
};

export const readRecentLogs = (lineCount = 100) => {
  const filePath = getLogFilePath();
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.slice(-lineCount);
};
