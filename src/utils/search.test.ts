import { describe, expect, it } from 'bun:test';
import { generateSearchPatterns } from './search';

describe('generateSearchPatterns', () => {
    it('should return an array of strings', () => {
        const patterns = generateSearchPatterns();
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.every((p) => typeof p === 'string')).toBe(true);
    });

    it('should generate the correct number of English patterns', () => {
        const patterns = generateSearchPatterns();
        const englishAlphabet = 'abcdefghijklmnopqrstuvwxyz';
        const englishPatterns = patterns.filter((p) => englishAlphabet.includes(p[0]));
        expect(englishPatterns.length).toBe(26 * 26);
    });

    it('should generate the correct number of Arabic patterns', () => {
        const patterns = generateSearchPatterns();
        const arabicAlphabet = 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي';
        const arabicPatterns = patterns.filter((p) => arabicAlphabet.includes(p[0]));
        expect(arabicPatterns.length).toBe(28 * 28);
    });

    it('should generate the correct total number of patterns', () => {
        const patterns = generateSearchPatterns();
        expect(patterns.length).toBe(26 * 26 + 28 * 28);
    });

    it('should include specific English patterns', () => {
        const patterns = generateSearchPatterns();
        expect(patterns).toContain('aa');
        expect(patterns).toContain('az');
        expect(patterns).toContain('za');
        expect(patterns).toContain('zz');
    });

    it('should include specific Arabic patterns', () => {
        const patterns = generateSearchPatterns();
        expect(patterns).toContain('اب');
        expect(patterns).toContain('وي');
    });
});
