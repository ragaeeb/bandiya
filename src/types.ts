export type ChannelSubscriber = {
    firstName?: string;
    id: number;
    lastName?: string;
    username?: string;
};

export type Config = {
    apiHash: string;
    apiId: string;
    sessionId: string;
};

export type TelegramChannel = {
    id: string;
    participantsCount?: number;
    title: string;
    username?: string;
};

export type TelegramMessage = {
    date: number;
    editedDate?: number;
    forwards?: number;
    id: number;
    text: string;
    views?: number;
};
