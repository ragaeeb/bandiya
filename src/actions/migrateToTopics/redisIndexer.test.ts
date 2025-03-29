import { describe, expect, it } from 'bun:test';

import { indexCacheUsersByThread, indexIdsByUsername, indexLegacyMessagesToUserId } from './redisIndexer';

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

    describe('indexUsernamesById', () => {
        it('should skip thread ids', () => {
            const actual = indexIdsByUsername({ t1234: '12345/111/5666' });
            expect(actual).toBeEmptyObject();
        });

        it('should skip user ids', () => {
            const actual = indexIdsByUsername({ u123: '12345/111/5666' });
            expect(actual).toBeEmptyObject();
        });

        it('should skip invalid values', () => {
            const actual = indexIdsByUsername({ 111: '12345/111' });
            expect(actual).toBeEmptyObject();
        });

        it('should not add if it does not have username', () => {
            const actual = indexIdsByUsername({ 111: '12345/111/12345' });
            expect(actual).toBeEmptyObject();
        });

        it('should keep unique values', () => {
            const actual = indexIdsByUsername({ 111: '1/111/1/a', 112: '1/112/1/b' });
            expect(actual).toEqual({
                a: '1',
                b: '1',
            });
        });

        it('should remove duplicates', () => {
            const actual = indexIdsByUsername({ 111: '1/111/1/a', 112: '1/112/1/a' });
            expect(actual).toEqual({
                a: '1',
            });
        });

        it.skip('should process real data', async () => {
            const result = indexIdsByUsername(await Bun.file('redis.json').json());
            console.log('result', result);
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

        it.skip('should process real data', async () => {
            const result = indexCacheUsersByThread(await Bun.file('redis.json').json());
            console.log('result', result);
        });
    });
});
