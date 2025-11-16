import { describe, expect, it, mock } from 'bun:test';

mock.module('telegram', () => ({
    Api: {
        ChannelParticipantsAdmins: class {},
    },
}));

describe('getAdminChannels', () => {
    it('returns channels where the user is an admin', async () => {
        const dialogs = [
            {
                entity: {
                    id: 100,
                    participantsCount: 5,
                    title: 'Test Channel',
                    username: 'test_channel',
                },
                isChannel: true,
                title: 'Test Channel',
            },
        ];
        const participants = [{ id: 1 }];
        const client = {
            getDialogs: mock(() => Promise.resolve(dialogs)),
            getMe: mock(() => Promise.resolve({ id: 1 })),
            getParticipants: mock(() => Promise.resolve(participants)),
        } as any;

        const { getAdminChannels } = await import('./getAdminChannels.js');
        const channels = await getAdminChannels(client);

        expect(channels).toEqual([
            {
                id: '100',
                participantsCount: 5,
                title: 'Test Channel',
                username: 'test_channel',
            },
        ]);
    });

    it('skips channels where the user is not an admin', async () => {
        const dialogs = [
            {
                entity: {
                    id: 100,
                    participantsCount: 5,
                    title: 'Test Channel',
                    username: 'test_channel',
                },
                isChannel: true,
                title: 'Test Channel',
            },
        ];
        const participants = [{ id: 2 }];
        const client = {
            getDialogs: mock(() => Promise.resolve(dialogs)),
            getMe: mock(() => Promise.resolve({ id: 1 })),
            getParticipants: mock(() => Promise.resolve(participants)),
        } as any;

        const { getAdminChannels } = await import('./getAdminChannels.js');
        const channels = await getAdminChannels(client);

        expect(channels).toEqual([]);
    });
});
