import { TelegramMessage } from './types.js';

export const indexTelegramMessagesById = (messages: TelegramMessage[]) => {
    const idToMessage: Record<string, TelegramMessage> = {};

    for (const message of messages) {
        const newMessage: TelegramMessage = {
            className: message.className,
            date: message.date,
            id: message.id,
        };

        if (message.message) {
            newMessage.message = message.message;
        }

        if (message.fromId?.userId) {
            newMessage.fromId = { userId: message.fromId.userId };
        }

        if (message.fwdFrom) {
            newMessage.fwdFrom = {} as any;

            if (message.fwdFrom.fromId?.userId) {
                newMessage.fwdFrom!.fromId = { className: 'PeerUser', userId: message.fwdFrom.fromId.userId };
            }

            if (message.fwdFrom.fromName) {
                newMessage.fwdFrom!.fromName = message.fwdFrom.fromName;
            }
        }

        if (message.media?.photo?.id) {
            newMessage.media = { photo: { id: message.media.photo.id } };
        }

        if (message.media?.document?.id) {
            newMessage.media = { document: { id: message.media.document.id } };
        }

        if (message.replyTo) {
            const replyTo: any = {};

            if (message.replyTo.forumTopic) {
                replyTo.forumTopic = message.replyTo.forumTopic;
            }

            if (message.replyTo.replyToMsgId) {
                replyTo.replyToMsgId = message.replyTo.replyToMsgId;
            }

            if (message.replyTo.replyToTopId) {
                replyTo.replyToTopId = message.replyTo.replyToTopId;
            }

            if (message.replyTo.quoteText) {
                replyTo.quoteText = message.replyTo.quoteText;
            }

            if (Object.keys(replyTo).length > 0) {
                newMessage.replyTo = replyTo;
            }
        }

        idToMessage[message.id] = newMessage;
    }

    return idToMessage;
};
