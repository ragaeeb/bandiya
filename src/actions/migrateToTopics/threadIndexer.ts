import { TelegramForumTopic, Thread } from './types.js';

export const indexThreadsById = (topics: TelegramForumTopic[]) => {
    const idToThread: Record<string, Thread> = {};

    for (const topic of topics) {
        const thread: Thread = {
            id: topic.id,
            messages: [],
            title: topic.title,
        };
        idToThread[thread.id] = thread;
    }

    return idToThread;
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
