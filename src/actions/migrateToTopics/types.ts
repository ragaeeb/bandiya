export type MessageType = 'admin' | 'user';

export type SavedMessage = {
    chatId: string;
    from: {
        firstName?: string;
        lastName?: string;
        userId: string;
        username?: string;
    };
    id: string;
    mediaId?: string;
    mediaType?: string;
    quote?: string;
    replyToMessageId?: string;
    text?: string;
    timestamp: string;
    type: MessageType;
};

export type TelegramForumTopic = {
    date: number;
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
    createdAt: string;
    lastMessageId?: string;
    messages: SavedMessage[];
    name: string;
    threadId: string;
    updatedAt: string;
    userId: string;
}
