import type { ChannelSubscriber } from '../../types.js';

type CachedThread = {
    chatId: number;
    firstName?: string;
    threadId: number;
    username?: string;
};

type RedisCache = Record<string, string>;

const getValidLegacyKeys = (cache: RedisCache) => {
    return Object.keys(cache)
        .filter((key) => key.match(/^\d+$/))
        .filter((key) => cache[key].split('/').length > 2);
};

export const indexIdsByUsername = (cache: RedisCache) => {
    const usernameToUserId: Record<string, string> = {};

    for (const key of getValidLegacyKeys(cache)) {
        const [, , userId, username] = cache[key].split('/');

        if (username) {
            usernameToUserId[username] = userId;
        }
    }

    return usernameToUserId;
};

export const indexLegacyMessagesToUserId = (cache: RedisCache) => {
    const messageIdToUserId: Record<string, string> = {};

    getValidLegacyKeys(cache)
        .map(Number)
        .filter((messageId) => messageId <= 560)
        .forEach((messageId) => {
            const [userId] = cache[messageId].split('/');

            messageIdToUserId[messageId] = userId;
        });

    return messageIdToUserId;
};

export const indexCacheUsersByThread = (cache: RedisCache) => {
    const threadIdToUser: Record<string, ChannelSubscriber> = {};

    Object.keys(cache)
        .filter((key) => key.startsWith('u'))
        .map((key) => JSON.parse(cache[key]) as CachedThread)
        .forEach((thread) => {
            threadIdToUser[thread.threadId] = {
                id: thread.chatId,
                ...(thread.username && { username: thread.username }),
                ...(thread.firstName && { firstName: thread.firstName }),
            };
        });

    return threadIdToUser;
};

export const getIndexedDataFromCache = (cache: RedisCache) => {
    return {
        messageIdToUserId: indexLegacyMessagesToUserId(cache),
        threadIdToUser: indexCacheUsersByThread(cache),
        usernameToUserId: indexIdsByUsername(cache),
    };
};
