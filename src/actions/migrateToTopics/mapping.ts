import process from 'node:process';

import type { Message, TelegramMessage, Thread } from './types.js';

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

export const mapTelegramMessage = (m: TelegramMessage): Message => {
    return {
        id: m.id,
        ...(m.message && { text: m.message }),
        timestamp: m.date,
        ...(m.replyTo?.quoteText && { quote: m.replyTo?.quoteText }),
        ...(m.media?.photo && { mediaId: m.media.photo.id, mediaType: 'photo' }),
        ...(m.media?.document && { mediaId: m.media.document.id, mediaType: 'document' }),
        type: getMessageType(m, adminIds),
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
                id: parseInt(userId),
                messages: [],
                title: `${userId}`,
            };
        });

    userMessages.forEach((message) => {
        const thread = userIdToThread[message.fwdFrom!.fromId!.userId!];
        thread.messages.push(mapTelegramMessage(message));
    });

    adminMessages
        .filter((message) => !isSoliloquy(message))
        .forEach((message) => {
            const userMessage = idToMessage[message.replyTo!.replyToMsgId!];
            const thread = userIdToThread[userMessage.fwdFrom!.fromId!.userId!];
            thread.messages.push(mapTelegramMessage(message));
        });

    messages.filter(isForwardedFromChannel).forEach((message) => {
        const nextMessage = idToMessage[message.id + 1]; // the next message will probably be the user commenting on it
        const thread = userIdToThread[nextMessage.fwdFrom!.fromId!.userId!];
        thread.messages.push(mapTelegramMessage(message));
    });

    return userIdToThread;
};

export const indexMessagesByTopicId = (messages: TelegramMessage[]) => {
    const threadIdToMessages: Record<string, Message[]> = {};

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
