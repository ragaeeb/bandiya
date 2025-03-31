import { describe, expect, it } from 'bun:test';

import { indexCacheUsersByThread, indexLegacyMessagesToUserId } from './redisIndexer';

describe('redisIndexer', () => {
    describe('indexLegacyMessagesToUser', () => {
        it('should only index messageId <= 560', () => {
            const actual = indexLegacyMessagesToUserId({
                '559': '5/35313/916016388',
                '1806': '6/35313/916016388',
            });

            expect(actual).toEqual({
                559: '5',
            });
        });

        it('should skip user ids', () => {
            const actual = indexLegacyMessagesToUserId({
                u559: '5/35313/916016388',
            });

            expect(actual).toBeEmptyObject();
        });

        it('should skip thread ids', () => {
            const actual = indexLegacyMessagesToUserId({
                t133: '5/35313/916016388',
            });

            expect(actual).toBeEmptyObject();
        });

        it('should skip malformed data', () => {
            const actual = indexLegacyMessagesToUserId({
                1: '12345',
                2: '12345/111',
                3: JSON.stringify({ chatId: 2, threadId: 1 }),
                4: '12345/111/5666',
            });

            expect(actual).toEqual({ 4: '12345' });
        });
    });

    describe('indexCacheUsersByThread', () => {
        it('should skip thread ids', () => {
            const actual = indexCacheUsersByThread({ t1234: JSON.stringify({ threadId: 1 }) });
            expect(actual).toBeEmptyObject();
        });

        it('should skip legacy ids', () => {
            const actual = indexCacheUsersByThread({ 123: '12345/111/12345' });
            expect(actual).toBeEmptyObject();
        });

        it('should map the thread id to the user id', () => {
            const actual = indexCacheUsersByThread({ u11: JSON.stringify({ chatId: 11, threadId: 1 }) });
            expect(actual).toEqual({
                1: { id: 11 },
            });
        });

        it('should only add the firstName', () => {
            const actual = indexCacheUsersByThread({
                u11: JSON.stringify({ chatId: 11, firstName: 'F', threadId: 1 }),
            });
            expect(actual).toEqual({
                1: { firstName: 'F', id: 11 },
            });
        });

        it('should only add the username', () => {
            const actual = indexCacheUsersByThread({
                u11: JSON.stringify({ chatId: 11, threadId: 1, username: 'u' }),
            });
            expect(actual).toEqual({
                1: { id: 11, username: 'u' },
            });
        });

        it('should keep both the username and first name', () => {
            const actual = indexCacheUsersByThread({
                u11: JSON.stringify({ chatId: 11, firstName: 'F', threadId: 1, username: 'u' }),
            });
            expect(actual).toEqual({
                1: { firstName: 'F', id: 11, username: 'u' },
            });
        });

        it.only('should process real data', async () => {
            const result = indexCacheUsersByThread(await Bun.file('test/redis.json').json());
            console.log('result', result);
        });
    });
});
