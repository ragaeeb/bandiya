import { describe, expect, it } from 'bun:test';

import { indexThreadsById, indexThreadsByUser } from './threadIndexer';
import { TelegramForumTopic } from './types';

describe('indexer', () => {
    describe('indexThreadsById', () => {
        it('should index the forum topic', () => {
            const idToThread = indexThreadsById([
                {
                    className: 'ForumTopic',
                    closed: false,
                    date: 1713010906,
                    draft: null,
                    flags: 0,
                    fromId: {
                        className: 'PeerUser',
                        userId: '666',
                    },
                    hidden: false,
                    iconColor: 7322096,
                    iconEmojiId: null,
                    id: 2961,
                    my: false,
                    notifySettings: {
                        androidSound: null,
                        className: 'PeerNotifySettings',
                        flags: 0,
                        iosSound: null,
                        muteUntil: null,
                        otherSound: null,
                        showPreviews: null,
                        silent: null,
                        storiesAndroidSound: null,
                        storiesHideSender: null,
                        storiesIosSound: null,
                        storiesMuted: null,
                        storiesOtherSound: null,
                    },
                    pinned: false,
                    readInboxMaxId: 3913,
                    readOutboxMaxId: 3913,
                    short: false,
                    title: '333: abcd',
                    topMessage: 3913,
                    unreadCount: 0,
                    unreadMentionsCount: 0,
                    unreadReactionsCount: 0,
                } as unknown as TelegramForumTopic,
            ]);

            expect(idToThread).toEqual({
                2961: {
                    id: 2961,
                    messages: [],
                    title: '333: abcd',
                },
            });
        });

        it('should index the general topic', () => {
            const idToThread = indexThreadsById([
                {
                    className: 'ForumTopic',
                    closed: false,
                    date: 1682848393,
                    draft: {
                        className: 'DraftMessageEmpty',
                        date: 1686358211,
                        flags: 1,
                    },
                    flags: 18,
                    fromId: {
                        channelId: '123',
                        className: 'PeerChannel',
                    },
                    hidden: false,
                    iconColor: 7322096,
                    iconEmojiId: null,
                    id: 1,
                    my: true,
                    notifySettings: {
                        androidSound: null,
                        className: 'PeerNotifySettings',
                        flags: 0,
                        iosSound: null,
                        muteUntil: null,
                        otherSound: null,
                        showPreviews: null,
                        silent: null,
                        storiesAndroidSound: null,
                        storiesHideSender: null,
                        storiesIosSound: null,
                        storiesMuted: null,
                        storiesOtherSound: null,
                    },
                    pinned: false,
                    readInboxMaxId: 3926,
                    readOutboxMaxId: 3926,
                    short: false,
                    title: 'General',
                    topMessage: 3915,
                    unreadCount: 0,
                    unreadMentionsCount: 0,
                    unreadReactionsCount: 0,
                } as unknown as TelegramForumTopic,
            ]);

            expect(idToThread).toEqual({
                1: {
                    id: 1,
                    messages: [],
                    title: 'General',
                },
            });
        });
    });

    describe('indexThreadsByUser', () => {
        it('should index the forum topic', () => {
            const userIdToThread = indexThreadsByUser([
                {
                    id: 2,
                    messages: [],
                    title: '333: abcd',
                },
            ]);

            expect(userIdToThread).toEqual({
                333: {
                    id: 2,
                    messages: [],
                    title: '333: abcd',
                },
            });
        });

        it('should keep the same reference to the original values', () => {
            const thread = {
                id: 2,
                messages: [],
                title: '333: A',
                user: { aliases: [] },
            };

            const userIdToThread = indexThreadsByUser([thread]);
            expect(Object.values(userIdToThread)[0]).toBe(thread);
        });

        it('should skip the general topic', () => {
            const userIdToThread = indexThreadsByUser([
                {
                    id: 1,
                    messages: [],
                    title: 'General',
                },
            ]);

            expect(userIdToThread).toBeEmptyObject();
        });
    });
});
