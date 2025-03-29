import { describe, expect, it } from 'bun:test';

import { indexThreadsByUser } from './threadIndexer';

describe('threadIndexer', () => {
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
