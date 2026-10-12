/**
 * Represents a Telegram channel subscriber.
 */
export type ChannelSubscriber = {
    /**
     * The subscriber's first name.
     */
    firstName?: string;
    /**
     * The unique identifier for the subscriber.
     */
    id: number;
    /**
     * The subscriber's last name.
     */
    lastName?: string;
    /**
     * The subscriber's username.
     */
    username?: string;
};

/**
 * Represents the configuration for the Telegram client.
 */
export type Config = {
    /**
     * The API hash from Telegram.
     */
    apiHash: string;
    /**
     * The API ID from Telegram.
     */
    apiId: string;
    /**
     * The session ID for the Telegram client.
     */
    sessionId: string;
};

/**
 * Represents a Telegram channel.
 */
export type TelegramChannel = {
    /**
     * The unique identifier for the channel.
     */
    id: string;
    /**
     * The number of participants in the channel.
     */
    participantsCount?: number;
    /**
     * The title of the channel.
     */
    title: string;
    /**
     * The username of the channel.
     */
    username?: string;
};

/**
 * Represents a message from a Telegram channel or group chat.
 */
export type TelegramMessage = {
    /**
     * The date the message was sent.
     */
    date: number;
    /**
     * The date the message was last edited.
     */
    editedDate?: number;
    /**
     * The number of times the message has been forwarded.
     */
    forwards?: number;
    /**
     * The unique identifier for the message.
     */
    id: number;
    /**
     * The text content of the message.
     */
    text: string;
    /**
     * The thread or topic identifier if the message belongs to a thread or forum topic.
     */
    threadId?: number;
    /**
     * The number of views the message has.
     */
    views?: number;
};

/**
 * Represents a Telegram message containing all canonical fields returned by the Telegram API.
 */
export type TelegramCanonicalMessage = Record<string, unknown> & {
    /**
     * The date the message was sent.
     */
    date: number;
    /**
     * The unique identifier for the message.
     */
    id: number;
    /**
     * The text content of the message.
     */
    text: string;
    /**
     * The thread or topic identifier if the message belongs to a thread or forum topic.
     */
    threadId?: number;
};

/**
 * Options for downloading messages from a channel or group chat.
 */
export type DownloadMessagesOptions = {
    /**
     * Whether to export all canonical Telegram JSON fields rather than the minimal subset.
     */
    canonical?: boolean;
    /**
     * Whether to drop all falsy values from the export in canonical mode.
     */
    dropFalsy?: boolean;
    /**
     * Whether to drop noisy internal Telegram fields (fileReference, CONSTRUCTOR_ID, SUBCLASS_OF_ID) from the export.
     */
    dropNoisy?: boolean;
    /**
     * Channel handle or group chat Peer ID.
     */
    target?: string;
};
