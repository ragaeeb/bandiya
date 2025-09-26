import path from 'node:path';
import { input } from '@inquirer/prompts';
import type { TelegramClient } from 'telegram';

import type { TelegramMessage } from '@/types.js';
import logger from '@/utils/logger.js';

/**
 * Downloads messages from a specified Telegram channel, filters for messages with text, formats them, and saves them to a JSON file.
 * @param client The TelegramClient instance to use for interacting with the Telegram API.
 * @returns A promise that resolves with the name of the output file.
 */
export const downloadMessages = async (client: TelegramClient) => {
    const channel = await input({ message: 'Enter Channel handle (ie: ilmtest)', required: true });

    logger.info(`Downloading messages please wait...`);

    const messages: TelegramMessage[] = (await client.getMessages(channel, { limit: undefined, reverse: true }))
        .filter((message) => message.text)
        .map((message) => {
            return {
                date: message.date,
                id: message.id,
                text: message.text,
                ...(message.editDate && { editedDate: message.editDate }),
                ...(message.forwards && { forwards: message.forwards }),
                ...(message.views && { views: message.views }),
            };
        });

    const outputFile = path.format({ ext: '.json', name: channel });

    logger.info(`Saving ${messages.length} messages to ${outputFile}...`);

    await Bun.write(
        outputFile,
        JSON.stringify({ channel, messages: messages.toSorted((a, b) => a.id - b.id) }, null, 2),
    );

    return outputFile;
};
