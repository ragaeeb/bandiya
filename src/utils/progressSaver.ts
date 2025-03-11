import { promises as fs } from 'node:fs';
import process from 'node:process';
import { type Logger as PinoLogger } from 'pino';

export type SubLogger = Pick<PinoLogger, 'error' | 'info' | 'warn'>;

interface ProgressSaverOptions<T> {
    getData: () => T;
    logger: SubLogger;
    onRestore?: (data: T) => void;
    outputFile: string;
}

export class ProgressSaver<T> {
    private getData: () => T;
    private logger: SubLogger;
    private onRestore?: (data: T) => void;
    private outputFile: string;

    constructor(options: ProgressSaverOptions<T>) {
        this.outputFile = options.outputFile;
        this.getData = options.getData;
        this.logger = options.logger;
        this.onRestore = options.onRestore;

        // Handle shutdown signals
        process.on('SIGINT', async () => {
            this.logger.info('Gracefully shutting down...');
            await this.saveProgress();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            this.logger.info('Process terminated.');
            await this.saveProgress();
            process.exit(0);
        });
    }

    async saveProgress() {
        try {
            this.logger.info(`Saving progress to ${this.outputFile}...`);
            await fs.writeFile(this.outputFile, JSON.stringify(this.getData(), null, 2));
        } catch (error) {
            this.logger.error('Error saving progress:', error);
        }
    }

    /**
     * Checks for an existing file and restores data if present
     * @returns True if data was restored, false otherwise
     */
    async tryRestore(): Promise<boolean> {
        try {
            // Check if file exists
            try {
                await fs.access(this.outputFile);
            } catch {
                // File doesn't exist, nothing to restore
                return false;
            }

            // Read and parse the existing file
            this.logger.info(`Found existing progress file ${this.outputFile}. Attempting to restore...`);
            const fileContent = await fs.readFile(this.outputFile, 'utf-8');
            const data = JSON.parse(fileContent) as T;

            // If there's a restore callback, use it
            if (this.onRestore) {
                this.onRestore(data);
                this.logger.info('Progress data successfully restored');
                return true;
            } else {
                this.logger.warn('No restore handler provided. Skipping data restoration.');
                return false;
            }
        } catch (error) {
            this.logger.error('Error restoring progress:', error);
            return false;
        }
    }
}
