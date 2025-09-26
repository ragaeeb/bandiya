import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { input } from '@inquirer/prompts';
import { CatsaJanga } from 'catsa-janga';
import type { Api, TelegramClient } from 'telegram';
import type { ChannelSubscriber } from '@/types.js';
import logger from '@/utils/logger.js';
import { generateSearchPatterns } from '../utils/search.js';

/**
 * Maps a Telegram `Api.User` object to a `ChannelSubscriber` object.
 * @param user The `Api.User` object to map.
 * @returns A `ChannelSubscriber` object.
 */
const mapParticipantToSubscriber = (user: Api.User): ChannelSubscriber => {
    return {
        ...(user.firstName && { firstName: user.firstName }),
        ...(user.lastName && { lastName: user.lastName }),
        ...(user.username && { username: user.username }),
        id: Number(user.id),
    };
};

/**
 * Loads subscribers from a previous session if available, and sets up a progress saver.
 * @param channel The channel handle to load subscribers for.
 * @returns An object containing the output file path, the progress saver instance, and the map of subscribers.
 */
const loadSubscribers = async (channel: string) => {
    // Create a Map to track unique subscribers by ID
    const subscribersMap = new Map<number, ChannelSubscriber>();
    const outputFile = path.format({ ext: '.json', name: `${channel}_subscribers` });

    // Progress saver for incremental updates
    const progressSaver = new CatsaJanga({
        getData: () => ({
            channel,
            subscribers: Array.from(subscribersMap.values()).sort((a, b) => a.id - b.id),
            timestamp: new Date(),
        }),
        logger,
        outputFile,
    });

    const data = await progressSaver.restore();

    if (data?.subscribers) {
        data.subscribers.forEach((subscriber) => {
            subscribersMap.set(subscriber.id, subscriber);
        });

        logger.info(`Restored ${subscribersMap.size} subscribers from previous session`);
    }

    return { outputFile, progressSaver, subscribersMap };
};

/**
 * Searches for subscribers that may not have been found using pattern-based searches.
 * @param client The TelegramClient instance.
 * @param channel The channel handle to search in.
 * @param subscribersMap The map of subscribers to add new subscribers to.
 */
const searchSubscribersWithoutNames = async (
    client: TelegramClient,
    channel: string,
    subscribersMap: Map<number, ChannelSubscriber>,
) => {
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
};

/**
 * Searches for subscribers by iterating through a list of search patterns.
 * @param client The TelegramClient instance.
 * @param channel The channel handle to search in.
 * @param subscribersMap The map of subscribers to add new subscribers to.
 */
const searchByPatterns = async (
    client: TelegramClient,
    channel: string,
    subscribersMap: Map<number, ChannelSubscriber>,
) => {
    const startCount = subscribersMap.size;

    const searchPatterns = generateSearchPatterns();

    // Loop through each search pattern
    for (let i = 0; i < searchPatterns.length; i++) {
        const pattern = searchPatterns[i];
        const prevSize = subscribersMap.size;

        logger.info(`Searching for subscribers with pattern "${pattern}" (${i + 1}/${searchPatterns.length})...`);

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
            await setTimeout(2000);
        } catch (error: any) {
            logger.error(`Error searching for pattern "${pattern}": ${error.message}`);
        }
    }

    const finalCount = subscribersMap.size;
    const newlyDiscovered = finalCount - startCount;

    logger.info(`Search complete! Found ${finalCount} total subscribers (${newlyDiscovered} through search patterns)`);
};

/**
 * Downloads all subscribers from a specified Telegram channel and saves them to a JSON file.
 * This function uses various strategies to find as many subscribers as possible.
 * @param client The TelegramClient instance.
 * @returns The path to the output file.
 */
export const downloadSubscribers = async (client: TelegramClient) => {
    const channel = await input({ message: 'Enter Channel handle (ie: ilmtest)', required: true });
    const { subscribersMap, outputFile, progressSaver } = await loadSubscribers(channel);

    logger.info(`Downloading subscribers please wait...`);

    // Get initial set (typically the most recent subscribers)
    logger.info(`Fetching initial set of subscribers...`);
    const initialSet = await client.getParticipants(channel);

    logger.info(`Initial fetch: ${initialSet.length} subscribers`);

    for (const user of initialSet) {
        subscribersMap.set(Number(user.id), mapParticipantToSubscriber(user as Api.User));
    }

    await searchByPatterns(client, channel, subscribersMap);

    await searchSubscribersWithoutNames(client, channel, subscribersMap);

    // Final save
    logger.info(`Saving ${subscribersMap.size} total subscribers to ${outputFile}...`);
    await progressSaver.saveProgress();

    return outputFile;
};
