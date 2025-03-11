import type { TelegramClient } from 'telegram';

import { Api } from 'telegram/tl';

import { TelegramChannel } from '../types.js';

export const getAdminChannels = async (client: TelegramClient) => {
    const adminChannels: TelegramChannel[] = [];

    // Get all dialogs (chats, channels, etc.)
    const dialogs = await client.getDialogs();

    for (const dialog of dialogs) {
        if (dialog.isChannel && dialog.entity) {
            try {
                // Get the channel entity
                const channel = dialog.entity as Api.Channel;

                // Get participants to check admin status
                const participants = await client.getParticipants(channel, {
                    filter: new Api.ChannelParticipantsAdmins(),
                });

                // Find if the current user is among the admins
                const me = await client.getMe();
                const isAdmin = participants.some((participant) => participant.id.toString() === me?.id?.toString());

                if (isAdmin) {
                    adminChannels.push({
                        id: channel.id.toString(),
                        participantsCount: channel.participantsCount,
                        title: channel.title,
                        username: channel.username,
                    });
                }
            } catch (error: any) {
                console.log(`Could not check admin status for channel ${dialog.title || 'Unknown'}: ${error.message}`);
            }
        }
    }

    return adminChannels;
};
