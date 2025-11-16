import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({ colorize: true, sync: true });

/**
 * Shared logger instance configured with pretty printing for CLI usage.
 * Defaults to the `info` log level but respects the `LOG_LEVEL` environment variable.
 */
const logger = pino({ base: { hostname: undefined, pid: undefined }, level: process.env.LOG_LEVEL ?? 'info' }, stream);

export default logger;
