import process from 'node:process';

import { mapTelegramMessagesToThread } from './mapping.js';
import { indexTelegramMessagesById } from './messageIndexer.js';
import { isRelevantMessage } from './messageUtils.js';
import { indexThreadsById, indexThreadsByUser } from './threadIndexer.js';
import { TelegramMessage } from './types.js';

type MigrateProps = {
    adminId: string;
    botId: string;
    messagesFile: string;
    redisCacheFile: string;
    topicsFile: string;
};

const migrate = async (props: MigrateProps) => {
    const idToThread = indexThreadsById(await Bun.file(props.topicsFile).json());
    const userIdToThread = indexThreadsByUser(Object.values(idToThread));
    const idToTelegramMessage: Record<string, TelegramMessage> = indexTelegramMessagesById(
        await Bun.file(props.messagesFile).json(),
    );
    const messages = Object.values(idToTelegramMessage).filter(isRelevantMessage);
    const messagesFromUser = messages.filter();
};

mapTelegramMessagesToThread({
    adminIds: new Set([process.env.ADMIN_ID!]),
    botIds: new Set([process.env.BOT_ID!]),
    idToTelegramMessage,
    idToThread,
    userIdToThread,
});

console.log('idToTelegramMessage', Object.values(userIdToThread));
