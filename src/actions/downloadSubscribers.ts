import type { TelegramClient } from 'telegram';

import { input } from '@inquirer/prompts';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Api } from 'telegram/tl';

import { ChannelSubscriber } from '../types.js';
import logger from '../utils/logger.js';

export const downloadSubscribers = async (client: TelegramClient) => {
    const channel = await input({ message: 'Enter Channel handle (ie: ilmtest)', required: true });

    logger.info(`Downloading subscribers please wait...`);

    const subscribers: ChannelSubscriber[] = (await client.getParticipants(channel)).map((user) => {
        return {
            ...(user.firstName && { firstName: user.firstName }),
            ...(user.lastName && { lastName: user.lastName }),
            ...(user.username && { username: user.username }),
            id: Number(user.id),
        };
    });

    const outputFile = path.format({ ext: '.json', name: `${channel}_subscribers` });

    logger.info(`Saving ${subscribers.length} subscribers to ${outputFile}...`);

    await fs.writeFile(
        outputFile,
        JSON.stringify(
            { channel, subscribers: subscribers.toSorted((a, b) => a.id - b.id), timestamp: new Date() },
            null,
            2,
        ),
    );

    return outputFile;
};
