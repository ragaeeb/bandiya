import type { Api, TelegramClient } from 'telegram';

import { input } from '@inquirer/prompts';
import path from 'node:path';

import { ChannelSubscriber } from '../types.js';
import { SEARCH_PATTERNS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { ProgressSaver } from '../utils/progressSaver.js';

const mapParticipantToSubscriber = (user: Api.User): ChannelSubscriber => {
    return {
        ...(user.firstName && { firstName: user.firstName }),
        ...(user.lastName && { lastName: user.lastName }),
        ...(user.username && { username: user.username }),
        id: Number(user.id),
    };
};

export const downloadSubscribers = async (client: TelegramClient) => {
    const channel = await input({ message: 'Enter Channel handle (ie: ilmtest)', required: true });

    logger.info(`Downloading subscribers please wait...`);

    // Create a Map to track unique subscribers by ID
    const subscribersMap = new Map<number, ChannelSubscriber>();

    // Output file configuration
    const outputFile = path.format({ ext: '.json', name: `${channel}_subscribers` });

    // Progress saver for incremental updates
    const progressSaver = new ProgressSaver({
        getData: () => ({
            channel,
            subscribers: Array.from(subscribersMap.values()).sort((a, b) => a.id - b.id),
            timestamp: new Date(),
        }),
        logger,
        onRestore: (data) => {
            if (data.subscribers && Array.isArray(data.subscribers)) {
                data.subscribers.forEach((subscriber) => {
                    subscribersMap.set(subscriber.id, subscriber);
                });
                logger.info(`Restored ${subscribersMap.size} subscribers from previous session`);
            }
        },
        outputFile,
    });

    await progressSaver.tryRestore();

    // Get initial set (typically the most recent subscribers)
    logger.info(`Fetching initial set of subscribers...`);
    const initialSet = await client.getParticipants(channel);

    let startCount = 0;
    for (const user of initialSet) {
        subscribersMap.set(Number(user.id), mapParticipantToSubscriber(user as Api.User));
    }

    logger.info(`Initial fetch: ${initialSet.length} subscribers`);
    startCount = subscribersMap.size;

    // Define search patterns to try
    // Single letters and common prefixes

    // Loop through each search pattern
    for (let i = 0; i < SEARCH_PATTERNS.length; i++) {
        const pattern = SEARCH_PATTERNS[i];
        const prevSize = subscribersMap.size;

        logger.info(`Searching for subscribers with pattern "${pattern}" (${i + 1}/${SEARCH_PATTERNS.length})...`);

        try {
            // Get participants matching the search pattern
            const matchingUsers = await client.getParticipants(channel, {
                limit: 200, // Maximum allowed
                search: pattern,
            });

            // Add unique users to the map
            for (const user of matchingUsers) {
                subscribersMap.set(Number(user.id), mapParticipantToSubscriber(user as Api.User));
            }

            const newUsers = subscribersMap.size - prevSize;
            logger.info(
                `Found ${matchingUsers.length} matches for "${pattern}" (${newUsers} new). Total unique subscribers: ${subscribersMap.size}`,
            );

            // Add a delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error: any) {
            logger.error(`Error searching for pattern "${pattern}": ${error.message}`);
        }
    }

    const finalCount = subscribersMap.size;
    const newlyDiscovered = finalCount - startCount;

    logger.info(`Search complete! Found ${finalCount} total subscribers (${newlyDiscovered} through search patterns)`);

    // Try additional search for users with no name/username matched by previous patterns
    try {
        logger.info(`Searching for subscribers without searchable names...`);
        // Some users might not have names matching our patterns, try to get them with empty search
        const remainingUsers = await client.getParticipants(channel, {
            limit: 200,
            search: '',
        });

        const prevSize = subscribersMap.size;
        for (const user of remainingUsers) {
            subscribersMap.set(Number(user.id), mapParticipantToSubscriber(user as Api.User));
        }

        const newUsers = subscribersMap.size - prevSize;
        logger.info(
            `Found ${newUsers} additional subscribers without searchable names. Final total: ${subscribersMap.size}`,
        );
    } catch (error: any) {
        logger.error(`Error in final search: ${error.message}`);
    }

    // Final save
    logger.info(`Saving ${subscribersMap.size} total subscribers to ${outputFile}...`);
    await progressSaver.saveProgress();

    return outputFile;
};
