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
        .filter((key) => !cache[key].includes('1083498292')) // remove test account
        .filter((key) => cache[key].split('/').length > 2);
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

type Profile = {
    firstNames: string[];
    usernames: string[];
};

export const indexUserToProfile = (cache: RedisCache) => {
    const userIdToProfile: Record<string, Profile> = {};

    Object.keys(cache)
        .filter((key) => key.startsWith('u'))
        .map((key) => JSON.parse(cache[key]) as CachedThread)
        .forEach((thread) => {
            userIdToProfile[thread.chatId] = {
                firstNames: thread.firstName ? [thread.firstName] : [],
                usernames: thread.username ? [thread.username] : [],
            };
        });

    getValidLegacyKeys(cache)
        .map((key) => {
            const [, , userId, username] = cache[key].split('/');
            return [userId, username];
        })
        .filter(([, username]) => username)
        .forEach(([userId, username]) => {
            if (!userIdToProfile[userId]) {
                userIdToProfile[userId] = { firstNames: [], usernames: [] };
            }

            userIdToProfile[userId].usernames.push(username);
        });

    Object.values(userIdToProfile).forEach((profile) => {
        profile.firstNames = Array.from(new Set(profile.firstNames));
        profile.usernames = Array.from(new Set(profile.usernames));
    });

    return userIdToProfile;
};

export const getIndexedDataFromCache = (cache: RedisCache) => {
    return {
        messageIdToUserId: indexLegacyMessagesToUserId(cache),
        userIdToProfile: indexUserToProfile(cache),
    };
};
