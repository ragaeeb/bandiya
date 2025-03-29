import { indexMessagesByTopicId, loadMessages, processMessagesFromLegacyGroup } from './mapping.js';
import { isMessageFromTopics } from './messageUtils.js';
import { getIndexedDataFromCache } from './redisIndexer.js';
import { indexThreadsByUser, loadTopics } from './threadIndexer.js';

const { messageIdToUserId } = await getIndexedDataFromCache(await Bun.file('test/redis.json').json());
const relevantMessages = await loadMessages('test/allMessages.json', messageIdToUserId);
const threadIdToMessages = indexMessagesByTopicId(relevantMessages.filter(isMessageFromTopics));

const threads = await loadTopics('test/allTopics.json', threadIdToMessages);
const userIdToThread = processMessagesFromLegacyGroup(
    relevantMessages.filter((m) => !isMessageFromTopics(m)),
    indexThreadsByUser(threads),
);

Object.values(userIdToThread).forEach((thread) => {
    thread.messages.sort((a, b) => a.timestamp - b.timestamp);
});

await Bun.write('output.json', JSON.stringify(userIdToThread, null, 2));
