import { describe, expect, it } from 'bun:test';

import { mapKeyToPrompt } from './prompts.js';

describe('mapKeyToPrompt', () => {
    it('creates a prompt configuration with required validation', () => {
        const prompt = mapKeyToPrompt('apiId');

        expect(prompt).toMatchObject({
            key: 'apiId',
            message: 'Enter apiId:',
            required: true,
        });
        expect(prompt.transformer?.(' 123 ')).toBe('123');
        expect(prompt.validate?.('')).toBe('apiId is required.');
        expect(prompt.validate?.('value')).toBe(true);
    });

    it('merges additional properties', () => {
        const prompt = mapKeyToPrompt('apiHash', { default: 'hash' });

        expect(prompt.default).toBe('hash');
    });
});
