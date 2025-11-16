/**
 * Generates configuration objects for the `@inquirer/prompts` library.
 * @param key The key to use for the prompt message and validation.
 * @param props Optional extra properties to merge into the prompt configuration.
 * @returns A prompt configuration object that enforces non-empty answers and trims user input.
 */
export const mapKeyToPrompt = (key: string, props: Record<string, unknown> = {}) => {
    return {
        key,
        message: `Enter ${key}:`,
        required: true,
        transformer: (input: string) => input.trim(),
        validate: (input: string) => (input ? true : `${key} is required.`),
        ...props,
    };
};
