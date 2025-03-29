#!/usr/bin/env bun
import { input, select } from '@inquirer/prompts';
import welcome from 'cli-welcome';
import Conf from 'conf';
import process from 'node:process';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { Api } from 'telegram/tl';

import packageJson from '../package.json' assert { type: 'json' };
import { downloadMessages } from './actions/downloadMessages.js';
import { downloadSubscribers } from './actions/downloadSubscribers.js';
import { getAdminChannels } from './actions/getAdminChannels.js';
import { downloadTopics } from './actions/migrateToTopics/index.js';
import logger from './utils/logger.js';

const mapKeyToPrompt = (key: string, props = {}) => {
    return {
        key,
        message: `Enter ${key}:`,
        required: true,
        transformer: (input: string) => input.trim(),
        validate: (input: string) => (input ? true : `${key} is required.`),
        ...props,
    };
};

const main = async () => {
    welcome({
        bgColor: `#FADC00`,
        bold: true,
        color: `#000000`,
        title: packageJson.name,
        version: packageJson.version,
    });

    const config = new Conf({ projectName: packageJson.name });

    const prompts = ['apiId', 'apiHash'].filter((key) => !config.has(key)).map(mapKeyToPrompt);

    for (const { key, ...prompt } of prompts) {
        const answer = await input(prompt);
        config.set(key, answer);
    }

    if (!config.has('sessionId')) {
        const answer = await input({ message: 'Enter session ID:', required: false });

        if (answer) {
            config.set('sessionId', answer);
        }
    }

    const client = new TelegramClient(
        new StringSession(config.get('sessionId') as string),
        parseInt(config.get('apiId') as string),
        config.get('apiHash') as string,
        {
            connectionRetries: 5,
        },
    );

    const cleanUp = async () => {
        logger.info(`Shutting down gracefully...`);

        await client?.disconnect();

        process.exit(0);
    };

    process.on('SIGINT', cleanUp);
    process.on('SIGTERM', cleanUp);

    await client.start({
        onError: (err) => logger.error('Error:', err),
        password: async () => await input({ message: 'Enter your password (if required): ', required: false }),
        phoneCode: async () => await input({ message: 'Enter your phone code: ', required: true }),
        phoneNumber: async () => await input({ message: 'Enter your phone number: ', required: true }),
    });

    const sessionId = client.session.save() as unknown as string;

    if (sessionId) {
        config.set('sessionId', sessionId);
    }

    const [, , autoAction, channelId] = process.argv;

    try {
        const action =
            autoAction ||
            (await select({
                choices: [
                    { name: 'Download Messages/Posts', value: 'downloadMessages' },
                    { name: 'Get Admin Channels', value: 'getAdminChannels' },
                    { name: 'Download Channel Subscribers', value: 'getSubscribers' },
                    { name: 'Download Topics and Messages from a Supergroup', value: 'downloadTopics' },
                    { name: 'Log Out', value: 'logout' },
                ],
                default: 'downloadMessages',
                message: 'What do you want to do?',
            }));

        if (action === 'downloadMessages') {
            const outputFile = await downloadMessages(client);
            logger.info(`Saved to ${outputFile}.`);
        } else if (action === 'getAdminChannels') {
            logger.info('Fetching channels where you are an admin...');
            const channels = await getAdminChannels(client);
            console.table(channels);
        } else if (action === 'getSubscribers') {
            logger.info('Fetching subscribers for channel...');
            const outputFile = await downloadSubscribers(client);
            logger.info(`Saved to ${outputFile}.`);
        } else if (action === 'downloadTopics') {
            logger.info('Fetching topics from supergroup...');
            const outputFile = await downloadTopics(client, channelId);
            logger.info(`Saved to ${outputFile}.`);
        } else if (action === 'logout') {
            logger.info('Logging out...');
            await client.invoke(new Api.auth.LogOut());
            config.delete('sessionId');
            logger.info(`Logged out!`);
        }
    } catch (err) {
        logger.error(err);
    } finally {
        logger.info('Disconnecting gracefully');
        await client.disconnect();
    }
};

main();
