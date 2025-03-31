import { SavedMessage, TelegramForumTopic, Thread } from './types.js';

export const loadTopics = async (
    topicsFile: string,
    threadIdToMessages: Record<string, SavedMessage[]>,
): Promise<Thread[]> => {
    const topics = (await Bun.file(topicsFile).json()) as TelegramForumTopic[];
    const threads: Thread[] = topics.map(({ date, id, title }) => {
        return {
            createdAt: new Date(date * 1000).toISOString(),
            lastMessageId: '',
            messages: threadIdToMessages[id] || [],
            name: title,
            threadId: id.toString(),
            updatedAt: new Date(date * 1000).toISOString(),
            userId: title.split(':')[0],
        };
    });

    return threads;
};

export const indexThreadsByUser = (threads: Thread[]) => {
    const userIdToThread: Record<string, Thread> = {};

    for (const topic of threads) {
        if (topic.threadId !== '1') {
            userIdToThread[topic.userId] = topic;
        }
    }

    return userIdToThread;
};
