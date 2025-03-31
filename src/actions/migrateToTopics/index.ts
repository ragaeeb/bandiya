import type { TelegramClient } from 'telegram';

import { input } from '@inquirer/prompts';

export const downloadTopics = async (client: TelegramClient, defaultChannel?: string): Promise<string> => {
    const channelId =
        defaultChannel || (await input({ message: 'Enter Channel handle (ie: ilmtest) or group id', required: true }));

    console.log(`Starting to download topics for channel: ${channelId}`);

    try {
        const threads = await getForumThreads(client, channelId, useCache);

        // Save the formatted threads to a file
        saveToFile(THREADS_FILE, threads);
        console.log(`Successfully saved ${threads.length} threads to ${THREADS_FILE}`);

        return THREADS_FILE;
    } catch (error) {
        console.error('Error downloading topics:', error);
        throw error;
    }
};
