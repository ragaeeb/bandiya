import { beforeAll, describe, expect, it } from 'bun:test';

import {
    isForwardedFromChannel,
    isMessageFromAdmin,
    isMessageFromBot,
    isMessageFromTopics,
    isMessageFromUnknownUser,
    isMessageFromUser,
    isRelevantMessage,
    isSoliloquy,
} from './messageUtils';
import { TelegramMessage } from './types';

describe('messageUtils', () => {
    let messages: TelegramMessage[];

    beforeAll(async () => {
        messages = await Bun.file('test/allMessages.json').json();
    });

    describe('isRelevantMessage', () => {
        it('should skip message service types', () => {
            expect(isRelevantMessage({ className: 'MessageService' } as unknown as TelegramMessage)).toBeFalse();
        });

        it('should accept real messages', () => {
            expect(isRelevantMessage({ className: 'Message' } as unknown as TelegramMessage)).toBeTrue();
        });

        it.skip('should show only irrelevant messages', () => {
            const actual = messages.filter((m) => !isRelevantMessage(m));
            console.log('actual', actual);
        });
    });

    describe('isMessageFromUser', () => {
        it('should skip messages from admin', () => {
            expect(isMessageFromUser({ fromId: { userId: '1' } } as unknown as TelegramMessage)).toBeFalse();
        });

        it('should accept messages forwarded from users', () => {
            expect(isMessageFromUser({ fwdFrom: { fromId: '11' } } as unknown as TelegramMessage)).toBeTrue();
        });

        it.skip('should show only messages from users', () => {
            const actual = messages.filter(isMessageFromUser);
            console.log('actual', actual);
        });
    });

    describe('isMessageFromUnknownUser', () => {
        it('should accept messages forwarded from unknown users', () => {
            expect(isMessageFromUnknownUser({ fwdFrom: { fromName: 'R' } } as unknown as TelegramMessage)).toBeTrue();
        });

        it('should reject messages from known users', () => {
            expect(
                isMessageFromUnknownUser({ fwdFrom: { fromId: '11', fromName: 'R' } } as unknown as TelegramMessage),
            ).toBeFalse();
        });
    });

    describe('isMessageFromTopics', () => {
        it('should skip flat group messages', () => {
            expect(isMessageFromTopics({ replyTo: { forumTopic: false } } as unknown as TelegramMessage)).toBeFalse();
        });

        it('should skip messages that have no replyTo', () => {
            expect(isMessageFromTopics({} as unknown as TelegramMessage)).toBeFalse();
        });

        it('should accept message from a topic', () => {
            expect(isMessageFromTopics({ replyTo: { forumTopic: true } } as unknown as TelegramMessage)).toBeTrue();
        });

        it.skip('should show only messages from topics', () => {
            const actual = messages.filter(isMessageFromTopics);
            console.log('actual', actual);
        });

        it.skip('should show only messages from flat group', () => {
            const actual = messages.filter((m) => !isMessageFromTopics(m));
            console.log('actual', actual);
        });
    });

    describe('isMessageFromAdmin', () => {
        it('should skip messages not in the admin list', () => {
            expect(
                isMessageFromAdmin({ fromId: { userId: '2' } } as unknown as TelegramMessage, new Set(['1'])),
            ).toBeFalse();
        });

        it('should skip messages that have no fromId', () => {
            expect(isMessageFromAdmin({} as unknown as TelegramMessage, new Set(['1']))).toBeFalse();
        });

        it('should accept message from an admin', () => {
            expect(
                isMessageFromAdmin({ fromId: { userId: '1' } } as unknown as TelegramMessage, new Set(['1'])),
            ).toBeTrue();
        });

        it.skip('should show only messages from admins', () => {
            const admins = new Set([process.env.ADMIN_ID as string]);
            const actual = messages.filter((m) => isMessageFromAdmin(m, admins));
            console.log('actual', actual);
        });

        it.skip('should show only messages from non-admins', () => {
            const admins = new Set([process.env.ADMIN_ID as string]);
            const actual = messages.filter((m) => !isMessageFromAdmin(m, admins));
            console.log('actual', actual);
        });
    });

    describe('isSoliloquy', () => {
        it('should show be true if message has no reply id', () => {
            expect(isSoliloquy({ replyTo: {} } as unknown as TelegramMessage)).toBeTrue();
        });

        it('should show be false if message is a reply to another', () => {
            expect(isSoliloquy({ replyTo: { replyToMsgId: 555 } } as unknown as TelegramMessage)).toBeFalse();
        });

        it.skip('should show only soliloquies', () => {
            const actual = messages.filter((m) => isSoliloquy(m) && !isMessageFromUser(m) && isRelevantMessage(m));
            console.log('actual', actual);
        });
    });

    describe('isForwardedFromChannel', () => {
        it('should show be true if message was forwarded from channel', () => {
            expect(
                isForwardedFromChannel({
                    fwdFrom: { fromId: { className: 'PeerChannel' } },
                } as unknown as TelegramMessage),
            ).toBeTrue();
        });

        it('should show be false if message it not forwarded', () => {
            expect(
                isForwardedFromChannel({ replyTo: { replyToMsgId: 555 } } as unknown as TelegramMessage),
            ).toBeFalse();
        });

        it.skip('should show only channel forwards', () => {
            const actual = messages.filter(isForwardedFromChannel);
            console.log('actual', actual);
        });
    });

    describe('isMessageFromBot', () => {
        it('should skip messages not in the bot list', () => {
            expect(
                isMessageFromBot({ fromId: { userId: '2' } } as unknown as TelegramMessage, new Set(['1'])),
            ).toBeFalse();
        });

        it('should skip messages that have no fromId', () => {
            expect(isMessageFromBot({} as unknown as TelegramMessage, new Set(['1']))).toBeFalse();
        });

        it('should accept message from a bot', () => {
            expect(
                isMessageFromBot({ fromId: { userId: '1' } } as unknown as TelegramMessage, new Set(['1'])),
            ).toBeTrue();
        });

        it.skip('should show only messages from bots', () => {
            const admins = new Set([process.env.BOT_ID as string]);
            const actual = messages.filter((m) => isMessageFromBot(m, admins));
            console.log('actual', actual);
        });

        it.skip('should show only messages from non-bots', () => {
            const admins = new Set([process.env.BOT_ID as string]);
            const actual = messages.filter((m) => !isMessageFromBot(m, admins));
            console.log('actual', actual);
        });
    });
});
