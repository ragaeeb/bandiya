import { describe, expect, it } from 'bun:test';

import { mapParticipantToSubscriber } from './downloadSubscribers.js';

describe('mapParticipantToSubscriber', () => {
    it('maps all available fields from the Telegram user', () => {
        const subscriber = mapParticipantToSubscriber({
            firstName: 'Jane',
            id: 42,
            lastName: 'Doe',
            username: 'jane_doe',
        } as any);

        expect(subscriber).toEqual({
            firstName: 'Jane',
            id: 42,
            lastName: 'Doe',
            username: 'jane_doe',
        });
    });

    it('omits missing optional fields', () => {
        const subscriber = mapParticipantToSubscriber({ id: 7 } as any);

        expect(subscriber).toEqual({ id: 7 });
    });
});
