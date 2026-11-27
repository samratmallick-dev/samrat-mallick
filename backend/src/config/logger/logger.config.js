import fs from "node:fs";
import path from "node:path";
import { createLogger, format, transports } from "winston";

// `logs/` is gitignored, so it does not exist on a fresh Render deploy.
// Create it before Winston opens the file transport, otherwise startup can fail.
const logDirectory = path.resolve(process.cwd(), "logs");
fs.mkdirSync(logDirectory, { recursive: true });

const { combine, timestamp, label, printf } = format;

const logFormat = printf(({ level, message, label, timestamp }) => {
      return `${timestamp} [${label}] ${level.toUpperCase()}: ${message}`;
});

const commonFormat = combine(
      label({ label: "Portfolio Backend API Services" }),
      timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
      logFormat
);

const Logger = createLogger({
      level: "info",
      format: commonFormat,
      transports: [
            new transports.Console(),
            new transports.File({
                  filename: path.join(logDirectory, "info.log"),
                  level: "info",
            })
      ],
});

export default Logger;