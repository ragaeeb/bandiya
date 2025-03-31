import { indexMessagesByTopicId, loadMessages, processMessagesFromLegacyGroup } from './mapping.js';
import { isMessageFromTopics } from './messageUtils.js';
import { getIndexedDataFromCache } from './redisIndexer.js';
import { indexThreadsByUser, loadTopics } from './threadIndexer.js';

const { messageIdToUserId, userIdToProfile } = await getIndexedDataFromCache(await Bun.file('test/redis.json').json());
const relevantMessages = await loadMessages('test/allMessages.json', messageIdToUserId);
const threadIdToMessages = indexMessagesByTopicId(relevantMessages.filter(isMessageFromTopics));

const threads = await loadTopics('test/allTopics.json', threadIdToMessages);
const userIdToThread = processMessagesFromLegacyGroup(
    relevantMessages.filter((m) => !isMessageFromTopics(m)),
    indexThreadsByUser(threads),
);

Object.keys(userIdToProfile)
    .filter((userId) => !userIdToThread[userId])
    .forEach((userId) => {
        userIdToThread[userId] = {
            createdAt: new Date().toISOString(),
            lastMessageId: '',
            messages: [],
            name: `${userId}: ${[userIdToProfile[userId].usernames.toString()]}`,
            threadId: '',
            updatedAt: new Date().toISOString(),
            userId,
        };
    });

Object.values(userIdToThread).forEach((thread) => {
    thread.messages.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
});

Object.values(userIdToThread)
    .filter((thread) => thread.messages.length === 0)
    .forEach((thread) => {
        delete thread.lastMessageId;
    });

Object.entries(userIdToProfile)
    .filter(([userId]) => userIdToThread[userId].messages.length > 0)
    .forEach(([userId, profile]) => {
        const thread = userIdToThread[userId];

        const diff = Math.max(profile.firstNames.length, profile.usernames.length) - thread.messages.length;

        if (diff > 0) {
            profile.firstNames = [profile.firstNames.join(', ')];
            profile.usernames = [profile.usernames.join(', ')];
        }

        profile.firstNames.forEach((firstName, i) => {
            thread.messages[i].from.firstName = firstName;
        });

        profile.usernames.forEach((username, i) => {
            thread.messages[i].from.username = username;
        });
    });

Object.entries(userIdToThread).forEach(([userId, thread]) => {
    thread.messages.forEach((m) => {
        m.chatId = userId;
    });

    if (thread.messages.length > 0) {
        thread.lastMessageId = thread.messages.at(-1)!.id.toString();
    }
});

const ids = new Set<string>();

Object.values(userIdToThread).forEach((thread) => {
    thread.messages.forEach((m) => {
        if (ids.has(m.id)) {
            console.log('DUPLICATE MESSAGE', m.id);
        }

        ids.add(m.id);
    });
});

await Bun.write(
    'threadsAndMessages.json',
    JSON.stringify(
        Object.values(userIdToThread).toSorted((a, b) => parseInt(a.threadId) - parseInt(b.threadId)),
        null,
        2,
    ),
);
