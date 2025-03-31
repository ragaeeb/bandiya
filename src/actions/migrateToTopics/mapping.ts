import process from 'node:process';

import type { SavedMessage, TelegramMessage, Thread } from './types.js';

import { indexTelegramMessagesById } from './messageIndexer.js';
import {
    getMessageType,
    isForwardedFromChannel,
    isMessageFromAdmin,
    isMessageFromBot,
    isMessageFromUser,
    isRelevantMessage,
    isSoliloquy,
} from './messageUtils.js';

const adminIds = new Set([process.env.ADMIN_ID!]);
const botIds = new Set([process.env.BOT_ID!]);

const mapTelegramMessage = (m: TelegramMessage): SavedMessage => {
    return {
        chatId: '', // this will be filled in later
        from: { userId: (m.fwdFrom?.fromId?.userId || m.fromId?.userId)! },
        id: m.id.toString(),
        timestamp: new Date(m.date * 1000).toISOString(),
        type: getMessageType(m, adminIds),
        ...(m.message && { text: m.message }),
        ...(m.replyTo?.replyToMsgId && { replyToMessageId: m.replyTo?.replyToMsgId.toString() }),
        ...(m.replyTo?.quoteText && { quote: m.replyTo?.quoteText }),
        ...(m.media?.photo && { mediaId: m.media.photo.id, mediaType: 'photo' }),
        ...(m.media?.document && { mediaId: m.media.document.id, mediaType: 'document' }),
    };
};

export const processMessagesFromLegacyGroup = (messages: TelegramMessage[], userIdToThread: Record<string, Thread>) => {
    const idToMessage = indexTelegramMessagesById(messages);
    const userMessages = messages.filter(isMessageFromUser);
    const adminMessages = messages.filter((message) => isMessageFromAdmin(message, adminIds));

    userMessages
        .filter((message) => !userIdToThread[message.fwdFrom!.fromId!.userId!])
        .forEach((message) => {
            const userId = message.fwdFrom!.fromId!.userId!;

            console.log('Creating new thread for user that did not have a thread', message.id, userId);

            userIdToThread[userId!] = {
                createdAt: new Date(message.date * 1000).toISOString(),
                lastMessageId: message.id.toString(),
                messages: [],
                name: `${userId}`,
                threadId: userId,
                updatedAt: new Date(message.date * 1000).toISOString(),
                userId,
            };
        });

    userMessages.forEach((message) => {
        const userId = message.fwdFrom!.fromId!.userId!;
        const thread = userIdToThread[userId];
        console.log('userId', userId, 'message.id', message.id);

        if (message.id === 414) {
            console.log('message', message);
        }

        thread.messages.push(mapTelegramMessage(message));
    });

    adminMessages
        .filter((message) => !isSoliloquy(message))
        .forEach((message) => {
            console.log('processing', message.id);
            const userMessage = idToMessage[message.replyTo!.replyToMsgId!];
            const userId = userMessage.fwdFrom!.fromId!.userId!;
            const thread = userIdToThread[userId];
            thread.messages.push(mapTelegramMessage(message));
        });

    messages.filter(isForwardedFromChannel).forEach((message) => {
        const nextMessage = idToMessage[message.id + 1]; // the next message will probably be the user commenting on it
        const userId = nextMessage.fwdFrom!.fromId!.userId!;
        const thread = userIdToThread[userId];
        thread.messages.push(mapTelegramMessage(message));
    });

    return userIdToThread;
};

export const indexMessagesByTopicId = (messages: TelegramMessage[]) => {
    const threadIdToMessages: Record<string, SavedMessage[]> = {};

    messages.forEach((message) => {
        const threadId = (message.replyTo?.replyToTopId || message.replyTo?.replyToMsgId) as number;
        const messages = threadIdToMessages[threadId] || [];
        messages.push(mapTelegramMessage(message));

        threadIdToMessages[threadId] = messages;
    });

    return threadIdToMessages;
};

export const loadMessages = async (file: string, messageIdToUserId: Record<string, string>) => {
    const relevantMessages = ((await Bun.file(file).json()) as TelegramMessage[])
        .filter(isRelevantMessage)
        .filter((message) => !isMessageFromBot(message, botIds))
        .map((message) => {
            const userId = messageIdToUserId[message.id];

            if (userId && !message.fwdFrom?.fromId?.userId) {
                const value: TelegramMessage = {
                    ...message,
                    fwdFrom: {
                        ...message.fwdFrom,
                        fromId: { className: 'PeerUser', ...message.fwdFrom?.fromId, userId },
                    },
                };
                return value;
            }

            return message;
        });

    return relevantMessages;
};
