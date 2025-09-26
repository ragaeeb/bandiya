/**
 * Generates search patterns for finding subscribers.
 * This includes two-letter combinations of English and Arabic letters.
 * @returns An array of search patterns.
 */
export const generateSearchPatterns = (): string[] => {
	const patterns: string[] = [];
	const englishAlphabet = 'abcdefghijklmnopqrstuvwxyz';
	const arabicAlphabet = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';

	// Generate English combinations
	for (const char1 of englishAlphabet) {
		for (const char2 of englishAlphabet) {
			patterns.push(char1 + char2);
		}
	}

	// Generate Arabic combinations
	for (const char1 of arabicAlphabet) {
		for (const char2 of arabicAlphabet) {
			patterns.push(char1 + char2);
		}
	}

	return patterns;
};