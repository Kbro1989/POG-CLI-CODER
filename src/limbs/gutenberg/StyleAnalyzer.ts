
export interface StyleProfile {
    readabilityScore: number;
    avgSentenceLength: number;
    uniqueWordRatio: number;
    tone: 'simple' | 'complex' | 'academic' | 'unknown';
}

export class StyleAnalyzer {
    /**
     * Analyzes text to extract stylistic markers.
     */
    static analyze(text: string): StyleProfile {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        const words = text.match(/\b\w+\b/g) || [];

        const totalSentences = sentences.length || 1;
        const totalWords = words.length || 1;

        // Average Sentence Length
        const avgSentenceLength = totalWords / totalSentences;

        // Unique Word Ratio (Vocabulary Richness)
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const uniqueWordRatio = uniqueWords.size / totalWords;

        // Automated Readability Index (Approximation)
        // ARI = 4.71 * (characters/words) + 0.5 * (words/sentences) - 21.43
        const totalChars = text.replace(/\s/g, '').length;
        const avgCharsPerWord = totalChars / totalWords;
        const readabilityScore = Math.max(0, (4.71 * avgCharsPerWord) + (0.5 * avgSentenceLength) - 21.43);

        // Determine Tone
        let tone: StyleProfile['tone'] = 'unknown';
        if (readabilityScore < 8) tone = 'simple';
        else if (readabilityScore < 14) tone = 'complex';
        else tone = 'academic';

        return {
            readabilityScore: Number(readabilityScore.toFixed(2)),
            avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
            uniqueWordRatio: Number(uniqueWordRatio.toFixed(2)),
            tone
        };
    }
}
