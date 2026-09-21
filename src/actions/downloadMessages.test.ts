import { afterEach, describe, expect, it, mock } from 'bun:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { TelegramClient } from 'telegram';

import {
    downloadMessages,
    dropFalsyValues,
    dropNoisyFields,
    findDialogByTarget,
    formatCanonicalTelegramMessage,
    formatTelegramMessage,
    jsonReplacer,
    normalizeTargetInput,
    resolveTargetEntity,
} from './downloadMessages.js';

describe('jsonReplacer', () => {
    it('converts bigint values to strings', () => {
        expect(jsonReplacer('id', 1234567890123456789n)).toBe('1234567890123456789');
    });

    it('preserves non-bigint values', () => {
        expect(jsonReplacer('name', 'test')).toBe('test');
        expect(jsonReplacer('count', 42)).toBe(42);
        expect(jsonReplacer('valid', true)).toBe(true);
    });
});

describe('dropFalsyValues', () => {
    it('removes falsy primitives (false, 0, empty string, null, undefined) from objects', () => {
        const input = {
            active: true,
            count: 0,
            empty: '',
            id: 123,
            missing: null,
            name: 'test',
            silent: false,
            undef: undefined,
        };

        expect(dropFalsyValues(input)).toEqual({
            active: true,
            id: 123,
            name: 'test',
        });
    });

    it('recursively cleans nested objects and arrays', () => {
        const input = {
            items: [1, 0, 'item', false, ''],
            meta: {
                flag: false,
                title: 'Clean',
            },
            replyTo: {
                forumTopic: false,
                quote: false,
                replyToMsgId: 42,
            },
        };

        expect(dropFalsyValues(input)).toEqual({
            items: [1, 'item'],
            meta: {
                title: 'Clean',
            },
            replyTo: {
                replyToMsgId: 42,
            },
        });
    });

    it('drops empty objects when all fields are falsy', () => {
        const input = {
            emptySub: {
                flagA: false,
                flagB: 0,
            },
            id: 1,
        };

        expect(dropFalsyValues(input)).toEqual({
            id: 1,
        });
    });

    it('returns undefined for falsy inputs', () => {
        expect(dropFalsyValues(false)).toBeUndefined();
        expect(dropFalsyValues(0)).toBeUndefined();
        expect(dropFalsyValues('')).toBeUndefined();
        expect(dropFalsyValues(null)).toBeUndefined();
        expect(dropFalsyValues(undefined)).toBeUndefined();
    });
});

describe('dropNoisyFields', () => {
    it('removes fileReference, CONSTRUCTOR_ID, SUBCLASS_OF_ID, and classType from objects', () => {
        const input = {
            CONSTRUCTOR_ID: 123456,
            className: 'Message',
            classType: 'constructor',
            id: 1,
            SUBCLASS_OF_ID: 789012,
            text: 'Test message',
        };

        expect(dropNoisyFields(input)).toEqual({
            className: 'Message',
            id: 1,
            text: 'Test message',
        });
    });

    it('recursively removes noisy fields in nested objects and arrays', () => {
        const input = {
            CONSTRUCTOR_ID: 1,
            id: 10,
            media: {
                CONSTRUCTOR_ID: 2,
                className: 'MessageMediaDocument',
                document: {
                    CONSTRUCTOR_ID: 4,
                    fileReference: { data: [1, 2, 3], type: 'Buffer' },
                    id: 999,
                },
                SUBCLASS_OF_ID: 3,
            },
            photos: [
                { CONSTRUCTOR_ID: 5, fileReference: 'buffer', id: 'photo1' },
                { CONSTRUCTOR_ID: 6, id: 'photo2' },
            ],
        };

        expect(dropNoisyFields(input)).toEqual({
            id: 10,
            media: {
                className: 'MessageMediaDocument',
                document: {
                    id: 999,
                },
            },
            photos: [{ id: 'photo1' }, { id: 'photo2' }],
        });
    });

    it('preserves null and primitive values', () => {
        expect(dropNoisyFields(null)).toBeNull();
        expect(dropNoisyFields(undefined)).toBeUndefined();
        expect(dropNoisyFields(42)).toBe(42);
        expect(dropNoisyFields('hello')).toBe('hello');
    });
});

describe('normalizeTargetInput', () => {
    it('trims leading and trailing whitespace', () => {
        expect(normalizeTargetInput('  ilmtest  ')).toBe('ilmtest');
    });

    it('removes leading @ prefix for handles', () => {
        expect(normalizeTargetInput('@mychannel')).toBe('mychannel');
    });

    it('extracts username from t.me links', () => {
        expect(normalizeTargetInput('https://t.me/mychannel')).toBe('mychannel');
        expect(normalizeTargetInput('t.me/mychannel/')).toBe('mychannel');
    });

    it('extracts and formats channel ID from t.me/c/ private links', () => {
        expect(normalizeTargetInput('https://t.me/c/1234567890/456')).toBe('-1001234567890');
        expect(normalizeTargetInput('t.me/c/987654321')).toBe('-100987654321');
    });

    it('preserves numeric peer IDs', () => {
        expect(normalizeTargetInput('-1001234567890')).toBe('-1001234567890');
        expect(normalizeTargetInput('-123456789')).toBe('-123456789');
        expect(normalizeTargetInput('1234567890')).toBe('1234567890');
    });
});

describe('formatTelegramMessage', () => {
    it('maps all available fields from the message', () => {
        const formatted = formatTelegramMessage({
            date: 1700000000,
            editDate: 1700000100,
            forwards: 5,
            id: 101,
            text: 'Hello world!',
            views: 42,
        });

        expect(formatted).toEqual({
            date: 1700000000,
            editedDate: 1700000100,
            forwards: 5,
            id: 101,
            text: 'Hello world!',
            views: 42,
        });
    });

    it('includes threadId from replyToTopId', () => {
        const formatted = formatTelegramMessage({
            date: 1700000000,
            id: 105,
            replyTo: {
                forumTopic: true,
                replyToMsgId: 10,
                replyToTopId: 5,
            },
            text: 'In topic thread',
        });

        expect(formatted).toEqual({
            date: 1700000000,
            id: 105,
            text: 'In topic thread',
            threadId: 5,
        });
    });

    it('includes threadId from replyToMsgId when forumTopic is true and replyToTopId is absent', () => {
        const formatted = formatTelegramMessage({
            date: 1700000000,
            id: 106,
            replyTo: {
                forumTopic: true,
                replyToMsgId: 20,
            },
            text: 'First reply in topic',
        });

        expect(formatted.threadId).toBe(20);
    });

    it('omits optional fields when undefined', () => {
        const formatted = formatTelegramMessage({
            date: 1700000000,
            id: 102,
            text: 'Just text',
        });

        expect(formatted).toEqual({
            date: 1700000000,
            id: 102,
            text: 'Just text',
        });
    });
});

describe('formatCanonicalTelegramMessage', () => {
    it('preserves canonical fields from toJSON while surfacing text, threadId, and senderId', () => {
        const mockRaw = {
            className: 'Message',
            date: 1700000000,
            entities: [{ className: 'MessageEntityBold', length: 4, offset: 0 }],
            fromId: { className: 'PeerUser', userId: 999 },
            id: 200,
            media: { className: 'MessageMediaPhoto' },
            message: 'Original message text',
            peerId: { channelId: 12345, className: 'PeerChannel' },
            replyTo: {
                className: 'MessageReplyHeader',
                forumTopic: true,
                replyToMsgId: 15,
                replyToTopId: 10,
            },
        };

        const mockMessage = {
            ...mockRaw,
            senderId: 999n,
            text: 'Original message text',
            toJSON: () => mockRaw,
        };

        const canonical = formatCanonicalTelegramMessage(mockMessage);

        expect(canonical.id).toBe(200);
        expect(canonical.date).toBe(1700000000);
        expect(canonical.text).toBe('Original message text');
        expect(canonical.threadId).toBe(10);
        expect(canonical.senderId).toBe('999');
        expect(canonical.replyTo).toEqual(mockRaw.replyTo);
        expect(canonical.media).toEqual(mockRaw.media);
        expect(canonical.entities).toEqual(mockRaw.entities);
        expect(canonical.className).toBe('Message');
    });

    it('handles objects without toJSON and extracts threadId when replyToTopId is absent', () => {
        const mockMessage = {
            date: 1700000500,
            id: 201,
            message: 'Plain object text',
            replyTo: {
                forumTopic: true,
                replyToMsgId: 44,
            },
        };

        const canonical = formatCanonicalTelegramMessage(mockMessage);

        expect(canonical.id).toBe(201);
        expect(canonical.text).toBe('Plain object text');
        expect(canonical.threadId).toBe(44);
    });
});

describe('findDialogByTarget', () => {
    const mockDialogs = [
        {
            entity: { id: 1234567890, username: 'supergroup_chat' },
            id: -1001234567890,
            inputEntity: { channelId: 1234567890, className: 'InputPeerChannel' },
            title: 'Supergroup Title',
        },
        {
            entity: { id: 987654321 },
            id: -987654321,
            inputEntity: { chatId: 987654321, className: 'InputPeerChat' },
            title: 'Basic Group Title',
        },
        {
            entity: { id: 55555, username: 'public_channel' },
            id: -1000000055555,
            inputEntity: { channelId: 55555, className: 'InputPeerChannel' },
            title: 'Public Channel Title',
        },
    ];

    it('matches by exact marked peer ID for supergroup', () => {
        const result = findDialogByTarget(mockDialogs, '-1001234567890');
        expect(result).toBe(mockDialogs[0]);
    });

    it('matches by raw channel ID for supergroup', () => {
        const result = findDialogByTarget(mockDialogs, '1234567890');
        expect(result).toBe(mockDialogs[0]);
    });

    it('matches by marked peer ID for basic group', () => {
        const result = findDialogByTarget(mockDialogs, '-987654321');
        expect(result).toBe(mockDialogs[1]);
    });

    it('matches by raw chat ID for basic group', () => {
        const result = findDialogByTarget(mockDialogs, '987654321');
        expect(result).toBe(mockDialogs[1]);
    });

    it('matches by username case-insensitively', () => {
        const result = findDialogByTarget(mockDialogs, 'SUPERGROUP_CHAT');
        expect(result).toBe(mockDialogs[0]);
    });

    it('matches by title case-insensitively', () => {
        const result = findDialogByTarget(mockDialogs, 'basic group title');
        expect(result).toBe(mockDialogs[1]);
    });

    it('returns undefined when no dialog matches', () => {
        const result = findDialogByTarget(mockDialogs, 'non_existent');
        expect(result).toBeUndefined();
    });
});

describe('resolveTargetEntity', () => {
    it('resolves peer ID through user dialogs', async () => {
        const mockDialog = {
            entity: { id: 111222, username: 'testgroup' },
            id: -100111222,
            inputEntity: { className: 'InputPeerChannel' },
            title: 'Test Group',
        };

        const mockClient = {
            getDialogs: mock().mockResolvedValue([mockDialog]),
            getEntity: mock(),
        } as unknown as TelegramClient;

        const result = await resolveTargetEntity(mockClient, '-100111222');

        expect(result.identifier).toBe('testgroup');
        expect(result.entity).toBe(mockDialog.inputEntity);
        expect(result.title).toBe('Test Group');
        expect(mockClient.getDialogs).toHaveBeenCalled();
    });

    it('resolves username directly via getEntity', async () => {
        const mockEntity = {
            className: 'Channel',
            title: 'Public Channel',
            username: 'public_chan',
        };

        const mockClient = {
            getDialogs: mock(),
            getEntity: mock().mockResolvedValue(mockEntity),
        } as unknown as TelegramClient;

        const result = await resolveTargetEntity(mockClient, 'public_chan');

        expect(result.identifier).toBe('public_chan');
        expect(result.entity).toBe(mockEntity);
        expect(result.title).toBe('Public Channel');
        expect(mockClient.getEntity).toHaveBeenCalledWith('public_chan');
    });

    it('throws when peer ID is not found in dialogs or directly', async () => {
        const mockClient = {
            getDialogs: mock().mockResolvedValue([]),
            getEntity: mock().mockRejectedValue(new Error('Cannot find entity')),
        } as unknown as TelegramClient;

        expect(resolveTargetEntity(mockClient, '-100999999')).rejects.toThrow(
            'Could not find channel or group chat with Peer ID "-100999999"',
        );
    });
});

describe('downloadMessages', () => {
    const testOutputFile = path.resolve('-1001234567890.json');

    afterEach(async () => {
        try {
            await fs.unlink(testOutputFile);
        } catch {}
    });

    it('downloads and saves messages for a group chat peer ID in standard mode', async () => {
        const mockDialog = {
            entity: { id: 1234567890 },
            id: -1001234567890,
            inputEntity: { channelId: 1234567890, className: 'InputPeerChannel' },
            title: 'My Group Chat',
        };

        const mockClient = {
            getDialogs: mock().mockResolvedValue([mockDialog]),
            getMessages: mock().mockResolvedValue([
                { date: 1700000000, id: 2, text: 'Second message' },
                { date: 1699999900, id: 1, text: 'First message' },
                { date: 1700000050, id: 3, text: '' }, // Should be filtered out in standard mode
            ]),
        } as unknown as TelegramClient;

        const outputFile = await downloadMessages(mockClient, '-1001234567890');

        expect(outputFile).toBe('-1001234567890.json');

        const fileContent = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
        expect(fileContent.canonical).toBe(false);
        expect(fileContent.channel).toBe('-1001234567890');
        expect(fileContent.messages).toHaveLength(2);
        expect(fileContent.messages[0].id).toBe(1);
        expect(fileContent.messages[0].text).toBe('First message');
        expect(fileContent.messages[1].id).toBe(2);
        expect(fileContent.messages[1].text).toBe('Second message');
    });

    it('downloads all canonical fields when canonical is true', async () => {
        const mockDialog = {
            entity: { id: 1234567890 },
            id: -1001234567890,
            inputEntity: { channelId: 1234567890, className: 'InputPeerChannel' },
            title: 'My Group Chat',
        };

        const mockClient = {
            getDialogs: mock().mockResolvedValue([mockDialog]),
            getMessages: mock().mockResolvedValue([
                {
                    className: 'Message',
                    date: 1700000000,
                    id: 1,
                    media: { className: 'MessageMediaPhoto' },
                    message: 'Photo with caption',
                    replyTo: {
                        className: 'MessageReplyHeader',
                        forumTopic: true,
                        replyToMsgId: 10,
                        replyToTopId: 5,
                    },
                    text: 'Photo with caption',
                },
                {
                    className: 'MessageService',
                    date: 1700000100,
                    id: 2,
                    text: '', // Preserved in canonical mode
                },
            ]),
        } as unknown as TelegramClient;

        const outputFile = await downloadMessages(mockClient, {
            canonical: true,
            target: '-1001234567890',
        });

        expect(outputFile).toBe('-1001234567890.json');

        const fileContent = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
        expect(fileContent.canonical).toBe(true);
        expect(fileContent.channel).toBe('-1001234567890');
        expect(fileContent.messages).toHaveLength(2);
        expect(fileContent.messages[0].id).toBe(1);
        expect(fileContent.messages[0].threadId).toBe(5);
        expect(fileContent.messages[0].replyTo.replyToTopId).toBe(5);
        expect(fileContent.messages[0].media.className).toBe('MessageMediaPhoto');
        expect(fileContent.messages[1].id).toBe(2);
        expect(fileContent.messages[1].className).toBe('MessageService');
    });

    it('drops falsy values when dropFalsy is true in canonical mode', async () => {
        const mockDialog = {
            entity: { id: 1234567890 },
            id: -1001234567890,
            inputEntity: { channelId: 1234567890, className: 'InputPeerChannel' },
            title: 'My Group Chat',
        };

        const mockClient = {
            getDialogs: mock().mockResolvedValue([mockDialog]),
            getMessages: mock().mockResolvedValue([
                {
                    className: 'Message',
                    date: 1700000000,
                    id: 1,
                    message: 'Hello',
                    out: false,
                    silent: false,
                    text: 'Hello',
                    views: 0,
                },
            ]),
        } as unknown as TelegramClient;

        const outputFile = await downloadMessages(mockClient, {
            canonical: true,
            dropFalsy: true,
            target: '-1001234567890',
        });

        expect(outputFile).toBe('-1001234567890.json');

        const fileContent = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
        expect(fileContent.canonical).toBe(true);
        expect(fileContent.dropFalsy).toBe(true);
        expect(fileContent.messages).toHaveLength(1);
        expect(fileContent.messages[0].id).toBe(1);
        expect(fileContent.messages[0].text).toBe('Hello');
        expect(fileContent.messages[0].out).toBeUndefined();
        expect(fileContent.messages[0].silent).toBeUndefined();
        expect(fileContent.messages[0].views).toBeUndefined();
    });

    it('drops noisy fields when dropNoisy is true in canonical mode', async () => {
        const mockDialog = {
            entity: { id: 1234567890 },
            id: -1001234567890,
            inputEntity: { channelId: 1234567890, className: 'InputPeerChannel' },
            title: 'My Group Chat',
        };

        const mockClient = {
            getDialogs: mock().mockResolvedValue([mockDialog]),
            getMessages: mock().mockResolvedValue([
                {
                    CONSTRUCTOR_ID: 9999,
                    className: 'Message',
                    date: 1700000000,
                    id: 1,
                    media: {
                        CONSTRUCTOR_ID: 1111,
                        className: 'MessageMediaDocument',
                        document: {
                            CONSTRUCTOR_ID: 2222,
                            fileReference: { data: [1, 2], type: 'Buffer' },
                            id: 555,
                        },
                    },
                    message: 'Hello with document',
                    SUBCLASS_OF_ID: 8888,
                    text: 'Hello with document',
                },
            ]),
        } as unknown as TelegramClient;

        const outputFile = await downloadMessages(mockClient, {
            canonical: true,
            dropNoisy: true,
            target: '-1001234567890',
        });

        expect(outputFile).toBe('-1001234567890.json');

        const fileContent = JSON.parse(await fs.readFile(outputFile, 'utf-8'));
        expect(fileContent.canonical).toBe(true);
        expect(fileContent.dropNoisy).toBe(true);
        expect(fileContent.messages).toHaveLength(1);
        expect(fileContent.messages[0].id).toBe(1);
        expect(fileContent.messages[0].CONSTRUCTOR_ID).toBeUndefined();
        expect(fileContent.messages[0].SUBCLASS_OF_ID).toBeUndefined();
        expect(fileContent.messages[0].media.CONSTRUCTOR_ID).toBeUndefined();
        expect(fileContent.messages[0].media.document.CONSTRUCTOR_ID).toBeUndefined();
        expect(fileContent.messages[0].media.document.fileReference).toBeUndefined();
        expect(fileContent.messages[0].media.document.id).toBe(555);
    });
});
