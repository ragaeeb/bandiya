import type { TelegramMessage } from './types.js';

export const isRelevantMessage = (message: TelegramMessage) => {
    return message.className !== 'MessageService';
};

export const isMessageFromUser = (message: TelegramMessage) => {
    return Boolean(message.fwdFrom?.fromId) && !isForwardedFromChannel(message);
};

export const isMessageFromUnknownUser = (message: TelegramMessage) => {
    return !isMessageFromUser(message) && Boolean(message.fwdFrom?.fromName);
};

export const isMessageFromTopics = (message: TelegramMessage) => {
    return Boolean(message.replyTo?.forumTopic);
};

export const isMessageFromAdmin = (message: TelegramMessage, adminIds: Set<string>) => {
    return Boolean(message.fromId?.userId && adminIds.has(message.fromId.userId));
};

export const getMessageType = (message: TelegramMessage, adminIds: Set<string>) => {
    if (isMessageFromAdmin(message, adminIds)) {
        return 'admin';
    }

    return 'user';
};

export const isSoliloquy = (message: TelegramMessage) => {
    return Boolean(!message.replyTo?.replyToMsgId);
};

export const isForwardedFromChannel = (message: TelegramMessage) => {
    return message.fwdFrom?.fromId?.className === 'PeerChannel';
};

export const isMessageFromBot = (message: TelegramMessage, botIds: Set<string>) => {
    return Boolean(!message.fwdFrom && message.fromId?.userId && botIds.has(message.fromId.userId));
};

export const getUsernameFromBotReply = (message: TelegramMessage) => {
    const username = message.message!.split(' ').at(-1)!.slice(1);
    return username;
};
