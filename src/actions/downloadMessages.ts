import path from 'node:path';
import { confirm, input } from '@inquirer/prompts';
import type { Api, TelegramClient } from 'telegram';
import type { EntityLike } from 'telegram/define.js';

import type { DownloadMessagesOptions, TelegramCanonicalMessage, TelegramMessage } from '@/types.js';
import logger from '@/utils/logger.js';

/**
 * JSON replacer function to serialize BigInt values as strings.
 * @param _key The object key being serialized.
 * @param value The value being serialized.
 * @returns The transformed value.
 */
export const jsonReplacer = (_key: string, value: unknown): unknown => {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
};

/**
 * Recursively drops all falsy values (false, 0, "", null, undefined) from an object or array.
 * @param value The value to clean.
 * @returns The cleaned value with falsy fields removed, or undefined if the input itself is falsy.
 */
export const dropFalsyValues = (value: unknown): unknown => {
    if (!value) {
        return undefined;
    }

    if (Array.isArray(value)) {
        return value.map(dropFalsyValues).filter((item) => Boolean(item));
    }

    if (typeof value === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            const res = dropFalsyValues(v);
            if (res !== undefined) {
                cleaned[k] = res;
            }
        }
        return Object.keys(cleaned).length === 0 ? undefined : cleaned;
    }

    return value;
};

/**
 * Default set of noisy internal Telegram TL fields to drop when cleaning canonical JSON.
 */
export const DEFAULT_NOISY_FIELDS = new Set(['fileReference', 'CONSTRUCTOR_ID', 'SUBCLASS_OF_ID', 'classType']);

/**
 * Recursively removes noisy internal Telegram fields from an object or array.
 * @param value The value to clean.
 * @param noisyFields The set of field keys to omit.
 * @returns The cleaned value with noisy fields omitted.
 */
export const dropNoisyFields = (value: unknown, noisyFields: Set<string> = DEFAULT_NOISY_FIELDS): unknown => {
    if (value === null || value === undefined) {
        return value;
    }

    if (Array.isArray(value)) {
        return value.map((item) => dropNoisyFields(item, noisyFields));
    }

    if (typeof value === 'object') {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            if (!noisyFields.has(k)) {
                cleaned[k] = dropNoisyFields(v, noisyFields);
            }
        }
        return cleaned;
    }

    return value;
};

/**
 * Normalizes user input representing a channel handle, group chat Peer ID, or Telegram link.
 * Strips superfluous prefixes like '@', handles t.me links, and trims whitespace.
 * @param rawInput The raw user input string.
 * @returns The normalized identifier or peer ID string.
 */
export const normalizeTargetInput = (rawInput: string): string => {
    let value = rawInput.trim();

    // Check for private channel/group link format: https://t.me/c/1234567890/123
    const cLinkMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/c\/(\d+)(?:\/\d+)?\/?$/i);
    if (cLinkMatch) {
        return `-100${cLinkMatch[1]}`;
    }

    // Check for public username link format: https://t.me/username
    const userLinkMatch = value.match(/^(?:https?:\/\/)?(?:www\.)?t\.me\/([a-zA-Z0-9_]+)\/?$/i);
    if (userLinkMatch) {
        return userLinkMatch[1];
    }

    // If it starts with @ and isn't purely a negative number, remove the @
    if (value.startsWith('@')) {
        value = value.slice(1).trim();
    }

    return value;
};

/**
 * Maps a Telegram message object to a structured `TelegramMessage` object.
 * @param message The raw message object from Telegram.
 * @returns A formatted `TelegramMessage` object.
 */
export const formatTelegramMessage = (message: {
    date: number;
    editDate?: number;
    forwards?: number;
    id: number;
    replyTo?: {
        forumTopic?: boolean;
        replyToMsgId?: number;
        replyToTopId?: number;
    };
    text?: string;
    views?: number;
}): TelegramMessage => {
    const threadId =
        message.replyTo?.replyToTopId ?? (message.replyTo?.forumTopic ? message.replyTo.replyToMsgId : undefined);

    return {
        date: message.date,
        id: message.id,
        text: message.text || '',
        ...(message.editDate && { editedDate: message.editDate }),
        ...(message.forwards && { forwards: message.forwards }),
        ...(threadId !== undefined && { threadId }),
        ...(message.views && { views: message.views }),
    };
};

/**
 * Maps a Telegram message object to its full canonical JSON representation,
 * preserving all raw fields returned by Telegram, while ensuring `text`,
 * `threadId`, and `senderId` are surfaced.
 * @param message The raw message object from Telegram.
 * @returns A canonical Telegram message object.
 */
export const formatCanonicalTelegramMessage = (message: any): TelegramCanonicalMessage => {
    const raw = typeof message?.toJSON === 'function' ? message.toJSON() : { ...message };

    const threadId =
        message?.replyTo?.replyToTopId ?? (message?.replyTo?.forumTopic ? message.replyTo.replyToMsgId : undefined);

    const senderId =
        message?.senderId?.toString?.() ??
        (message?.fromId && 'userId' in message.fromId ? message.fromId.userId?.toString?.() : undefined);

    const text = message?.text ?? message?.message ?? raw.text ?? raw.message ?? '';

    return {
        ...raw,
        date: message?.date ?? raw.date,
        id: message?.id ?? raw.id,
        text,
        ...(threadId !== undefined && { threadId }),
        ...(senderId !== undefined && { senderId }),
    };
};

/**
 * Checks whether a dialog matches a numeric target (peer ID or chat ID).
 * @param dialog A Dialog object from the Telegram client.
 * @param clean The trimmed numeric target string.
 * @returns True if the dialog matches the numeric target.
 */
export const matchesNumericTarget = (dialog: any, clean: string): boolean => {
    const dialogIdStr = dialog.id?.toString();
    const entityIdStr = dialog.entity?.id?.toString();

    // Direct match on dialog ID or raw entity ID
    if (dialogIdStr === clean || entityIdStr === clean) {
        return true;
    }

    // Supergroup marked ID matching (-100...)
    if (clean.startsWith('-100') && entityIdStr === clean.slice(4)) {
        return true;
    }
    if (!clean.startsWith('-') && dialogIdStr === `-100${clean}`) {
        return true;
    }

    // Basic chat marked ID matching (-...)
    if (clean.startsWith('-') && !clean.startsWith('-100') && entityIdStr === clean.slice(1)) {
        return true;
    }
    if (!clean.startsWith('-') && dialogIdStr === `-${clean}`) {
        return true;
    }

    return false;
};

/**
 * Checks whether a dialog matches a username or title target.
 * @param dialog A Dialog object from the Telegram client.
 * @param clean The trimmed name target string.
 * @returns True if the dialog matches the username or title.
 */
export const matchesNamedTarget = (dialog: any, clean: string): boolean => {
    const targetLower = clean.toLowerCase();
    const username = dialog.entity?.username;
    if (typeof username === 'string' && username.toLowerCase() === targetLower) {
        return true;
    }

    return typeof dialog.title === 'string' && dialog.title.toLowerCase() === targetLower;
};

/**
 * Finds a dialog matching the target handle or Peer ID from a list of user dialogs.
 * @param dialogs An array of Dialog objects retrieved from the Telegram client.
 * @param target The normalized target string (handle or Peer ID).
 * @returns The matching Dialog object, or undefined if not found.
 */
export const findDialogByTarget = (dialogs: any[], target: string): any | undefined => {
    const clean = target.trim();
    const isNumeric = /^-?\d+$/.test(clean);
    const matcher = isNumeric ? matchesNumericTarget : matchesNamedTarget;

    return dialogs.find((dialog) => matcher(dialog, clean));
};

/**
 * Resolves a numeric Peer ID by searching user dialogs and falling back to direct lookup.
 * @param client The TelegramClient instance.
 * @param normalized The normalized numeric Peer ID string.
 * @returns An object containing the resolved entity, identifier, and optional title.
 */
const resolveNumericPeer = async (
    client: TelegramClient,
    normalized: string,
): Promise<{ entity: EntityLike; identifier: string; title?: string }> => {
    try {
        const dialogs = await client.getDialogs();
        const matched = findDialogByTarget(dialogs, normalized);
        if (matched) {
            const identifier =
                matched.entity?.username || matched.id?.toString() || matched.entity?.id?.toString() || normalized;
            return {
                entity: matched.inputEntity || matched.entity,
                identifier,
                title: matched.title,
            };
        }
    } catch (dialogErr: any) {
        logger.warn(`Could not load dialogs: ${dialogErr.message}`);
    }

    try {
        const entity = await client.getEntity(normalized);
        return {
            entity,
            identifier: normalized,
            title: (entity as any).title || (entity as any).username,
        };
    } catch {
        throw new Error(
            `Could not find channel or group chat with Peer ID "${normalized}". Make sure you are a member of the group/channel.`,
        );
    }
};

/**
 * Resolves a username or title by querying Telegram and falling back to searching user dialogs.
 * @param client The TelegramClient instance.
 * @param normalized The normalized username or title string.
 * @returns An object containing the resolved entity, identifier, and optional title.
 */
const resolveNamedEntity = async (
    client: TelegramClient,
    normalized: string,
): Promise<{ entity: EntityLike; identifier: string; title?: string }> => {
    try {
        const entity = await client.getEntity(normalized);
        return {
            entity,
            identifier: (entity as any).username || normalized,
            title: (entity as any).title,
        };
    } catch {
        try {
            const dialogs = await client.getDialogs();
            const matched = findDialogByTarget(dialogs, normalized);
            if (matched) {
                const identifier =
                    matched.entity?.username || matched.id?.toString() || matched.entity?.id?.toString() || normalized;
                return {
                    entity: matched.inputEntity || matched.entity,
                    identifier,
                    title: matched.title,
                };
            }
        } catch {
            // Ignore dialog lookup error
        }

        throw new Error(
            `Could not find channel or group chat corresponding to "${normalized}". Please verify the handle or Peer ID.`,
        );
    }
};

/**
 * Resolves a target string (channel handle or Peer ID) to an actionable Telegram entity.
 * Checks dialogs for group chats and Peer IDs to obtain valid access hashes, or queries the entity directly.
 * @param client The TelegramClient instance.
 * @param target The target handle or Peer ID.
 * @returns An object containing the resolved entity, an identifier string, and optional title.
 */
export const resolveTargetEntity = async (
    client: TelegramClient,
    target: string,
): Promise<{ entity: EntityLike; identifier: string; title?: string }> => {
    const normalized = normalizeTargetInput(target);
    const isNumeric = /^-?\d+$/.test(normalized);

    return isNumeric ? resolveNumericPeer(client, normalized) : resolveNamedEntity(client, normalized);
};

/**
 * Downloads messages from a specified Telegram channel or group chat, formats them,
 * and saves them to a JSON file.
 * @param client The TelegramClient instance to use for interacting with the Telegram API.
 * @param optionsOrTarget Optional channel handle, Peer ID, or DownloadMessagesOptions.
 * @param canonicalArg Optional flag to export canonical fields when target is passed as a string.
 * @param dropFalsyArg Optional flag to drop falsy values when target is passed as a string.
 * @param dropNoisyArg Optional flag to drop noisy fields when target is passed as a string.
 * @returns A promise that resolves with the name of the output file.
 */
/**
 * Resolves configuration and prompts the user for download options when not provided.
 * @param options DownloadMessagesOptions passed by the caller.
 * @returns An object containing the resolved target, canonical, dropFalsy, and dropNoisy flags.
 */
export const resolveDownloadPrompts = async (
    options: DownloadMessagesOptions,
): Promise<{ isCanonical: boolean; shouldDropFalsy: boolean; shouldDropNoisy: boolean; target: string }> => {
    const target =
        options.target ??
        (await input({
            message: 'Enter Channel handle or Group chat Peer ID (ie: ilmtest or -100123456789):',
            required: true,
        }));

    const isCanonical =
        options.canonical ??
        (options.target !== undefined
            ? false
            : await confirm({
                  default: false,
                  message: 'Include all canonical Telegram JSON fields (thread ID, raw headers, etc.)?',
              }));

    const shouldDropFalsy =
        isCanonical &&
        (options.dropFalsy ??
            (options.target !== undefined
                ? false
                : await confirm({
                      default: false,
                      message: 'Drop all falsy values (false, 0, empty strings, null) from the export?',
                  })));

    const shouldDropNoisy =
        isCanonical &&
        (options.dropNoisy ??
            (options.target !== undefined
                ? false
                : await confirm({
                      default: false,
                      message:
                          'Drop noisy internal fields (fileReference, CONSTRUCTOR_ID, SUBCLASS_OF_ID) from the export?',
                  })));

    return { isCanonical, shouldDropFalsy, shouldDropNoisy, target };
};

/**
 * Downloads messages from a specified Telegram channel or group chat, formats them,
 * and saves them to a JSON file.
 * @param client The TelegramClient instance to use for interacting with the Telegram API.
 * @param optionsOrTarget Optional channel handle, Peer ID, or DownloadMessagesOptions.
 * @param canonicalArg Optional flag to export canonical fields when target is passed as a string.
 * @param dropFalsyArg Optional flag to drop falsy values when target is passed as a string.
 * @param dropNoisyArg Optional flag to drop noisy fields when target is passed as a string.
 * @returns A promise that resolves with the name of the output file.
 */
export const downloadMessages = async (
    client: TelegramClient,
    optionsOrTarget?: string | DownloadMessagesOptions,
    canonicalArg?: boolean,
    dropFalsyArg?: boolean,
    dropNoisyArg?: boolean,
) => {
    const options: DownloadMessagesOptions =
        typeof optionsOrTarget === 'string'
            ? {
                  canonical: canonicalArg,
                  dropFalsy: dropFalsyArg,
                  dropNoisy: dropNoisyArg,
                  target: optionsOrTarget,
              }
            : (optionsOrTarget ?? {});

    const { target, isCanonical, shouldDropFalsy, shouldDropNoisy } = await resolveDownloadPrompts(options);

    const { entity, identifier, title } = await resolveTargetEntity(client, target);

    logger.info(`Downloading messages${title ? ` from "${title}"` : ''} please wait...`);

    const rawMessages = await client.getMessages(entity, { limit: undefined, reverse: true });

    let messages = isCanonical
        ? rawMessages.map(formatCanonicalTelegramMessage)
        : rawMessages.filter((message: Partial<Api.Message>) => Boolean(message.text)).map(formatTelegramMessage);

    if (shouldDropNoisy) {
        messages = messages.map((msg) => dropNoisyFields(msg) as any);
    }

    if (shouldDropFalsy) {
        messages = messages.map(dropFalsyValues).filter(Boolean);
    }

    const safeFilename = identifier.replace(/[/\\?%*:|"<>]/g, '_');
    const outputFile = path.format({ ext: '.json', name: safeFilename });

    logger.info(`Saving ${messages.length} messages to ${outputFile}...`);

    await Bun.write(
        outputFile,
        JSON.stringify(
            {
                canonical: isCanonical,
                channel: identifier,
                ...(shouldDropFalsy && { dropFalsy: true }),
                ...(shouldDropNoisy && { dropNoisy: true }),
                messages: messages.toSorted((a: any, b: any) => a.id - b.id),
            },
            jsonReplacer,
            2,
        ),
    );

    return outputFile;
};
