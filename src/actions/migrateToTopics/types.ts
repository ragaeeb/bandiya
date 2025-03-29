export type Message = {
    chatId: string;
    from: {
        firstName?: string;
        lastName?: string;
        userId: string;
        username?: string;
    };
    id: number;
    mediaId?: string;
    mediaType?: string;
    quote?: string;
    replyToMessageId?: string;
    text?: string;
    timestamp: number;
    type: MessageType;
};

export type MessageType = 'admin' | 'user';

export type TelegramForumTopic = {
    id: number;
    title: string;
};

export type TelegramMessage = {
    className: 'Message' | 'MessageService';
    date: number;
    fromId?: {
        userId: string;
    };
    fwdFrom?: {
        fromId?: {
            className: 'PeerChannel' | 'PeerUser';
            userId?: string;
        };
        fromName?: string;
    };
    id: number;
    media?: {
        document?: {
            id: string;
        };
        photo?: {
            id: string;
        };
    };
    message?: string;
    replyTo?: {
        forumTopic?: boolean;
        quoteText?: string;
        replyToMsgId?: number;
        replyToTopId?: number; // watch out, sometimes this is defined as a value, even though we're not in a topic. see msg.id=13, id=1477
    };
};

export interface Thread {
    chatId: string;
    createdAt: string;
    lastMessageId: string;
    messages: Message[];
    name: string;
    threadId: string;
    updatedAt: string;
    userId: string;
}

export type User = {
    firstNames: Record<string, Date | null>;
    id: string;
    usernames: Record<string, Date | null>;
};
