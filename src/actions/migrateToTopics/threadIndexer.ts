import { Message, TelegramForumTopic, Thread } from './types.js';

export const loadTopics = async (
    topicsFile: string,
    threadIdToMessages: Record<string, Message[]>,
): Promise<Thread[]> => {
    const topics = (await Bun.file(topicsFile).json()) as TelegramForumTopic[];
    const threads = topics.map(({ id, title }) => {
        return {
            id,
            messages: threadIdToMessages[id] || [],
            title,
        };
    });

    return threads;
};

export const indexThreadsByUser = (threads: Thread[]) => {
    const userIdToThread: Record<string, Thread> = {};

    for (const topic of threads) {
        if (topic.id !== 1) {
            const [userId] = topic.title.split(':');
            userIdToThread[userId.trim()] = topic;
        }
    }

    return userIdToThread;
};
