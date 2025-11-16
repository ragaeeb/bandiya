#!/usr/bin/env bun
import { input, select } from '@inquirer/prompts';
import welcome from 'cli-welcome';
import Conf from 'conf';
import { Api, sessions, TelegramClient } from 'telegram';

import packageJson from '../package.json' with { type: 'json' };
import { downloadMessages } from './actions/downloadMessages.js';
import { downloadSubscribers } from './actions/downloadSubscribers.js';
import { getAdminChannels } from './actions/getAdminChannels.js';
import { mapKeyToPrompt } from './utils/prompts.js';
import logger from './utils/logger.js';

const { StringSession } = sessions;

/**
 * The main function of the application.
 * It handles user authentication, displays a menu of actions, and executes the selected action.
 */
const main = async () => {
    welcome({
        bgColor: `#FADC00`,
        bold: true,
        color: `#000000`,
        title: packageJson.name,
        version: packageJson.version,
    });

    const config = new Conf({ projectName: packageJson.name });

    const prompts = ['apiId', 'apiHash'].filter((key) => !config.has(key)).map((key) => mapKeyToPrompt(key));

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
        parseInt(config.get('apiId') as string, 10),
        config.get('apiHash') as string,
        {
            connectionRetries: 5,
        },
    );

    await client.start({
        onError: (err: any) => logger.error('Error:', err),
        password: async () => await input({ message: 'Enter your password (if required): ', required: true }),
        phoneCode: async () => await input({ message: 'Enter your phone code: ', required: true }),
        phoneNumber: async () => await input({ message: 'Enter your phone number: ', required: true }),
    });

    const sessionId = client.session.save() as unknown as string;

    if (sessionId) {
        config.set('sessionId', sessionId);
    }

    try {
        const action = await select({
            choices: [
                { name: 'Download Messages/Posts', value: 'downloadMessages' },
                { name: 'Get Admin Channels', value: 'getAdminChannels' },
                { name: 'Download Channel Subscribers', value: 'getSubscribers' },
                { name: 'Log Out', value: 'logout' },
            ],
            default: 'downloadMessages',
            message: 'What do you want to do?',
        });

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
        } else if (action === 'logout') {
            logger.info('Logging out...');
            await client.invoke(new Api.auth.LogOut());
            config.delete('sessionId');
            logger.info(`Logged out!`);
        }
    } catch (err) {
        logger.error(err);
    } finally {
        await client.disconnect();
    }
};

main();
