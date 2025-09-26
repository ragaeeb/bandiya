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
 * Represents a message from a Telegram channel.
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
	 * The number of views the message has.
	 */
	views?: number;
};
