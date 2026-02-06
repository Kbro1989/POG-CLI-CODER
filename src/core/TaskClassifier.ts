import { TaskType as TT } from './models.js';

export class TaskClassifier {
    private static readonly PATTERNS = {
        [TT.APIOrchestration]: /\b(wrangler|gcloud|gemini|github|api|deploy|cloud|cli|workflow|pipeline|docker|kubernetes|k8s|terraform|ansible)\b/i,
        [TT.Architecture]: /\b(design|architect|system|microservice|pattern|uml|diagram|schema|structure|modular|decouple)\b/i,
        [TT.Syntax]: /\b(fix|syntax|error|lint|type|interface|enum|strict|unresolved|symbol)\b/i,
        [TT.Refactor]: /\b(refactor|optimize|clean|simplify|extract|inline|move|rename|dry)\b/i,
        [TT.Debug]: /\b(debug|bug|crash|stack|trace|logs?|exception|panic|breakpoint|dump)\b/i,
        [TT.Generate]: /\b(create|generate|build|scaffold|boilerplate|init|make|produce)\s+(app|project|website|component|module|file)\b/i,
        [TT.Test]: /\b(test|spec|assert|verify|unit|integration|e2e|mock|stub|coverage|jest|vitest|mocha|chai)\b/i,
        [TT.Docs]: /\b(document|comment|explain|readme|tutorial|guide|wiki|docstring|jsdoc|markdown|md)\b/i,
        [TT.Diagnostic]: /\b(diagnostic|critic|error-track|path-correction|analyze-error|health|status|audit|validate|check)\b/i,
        [TT.Esoteric]: /\b(medical|bio|hear|video|music|image|forge|acoustics|pathology|derm|imagen|veo|lyria|medgemma|gutenberg|hexagram)\b/i,
        [TT.Conversational]: /^(hi|hello|hey|greetings|who are you|what can you do|help|thanks?|how are you|good (morning|afternoon|evening))\b|^\s*\w+\s*$/i
    };

    static classify(prompt: string): TT {
        for (const [type, regex] of Object.entries(this.PATTERNS)) {
            if (type === TT.Conversational) continue; // Handle last
            if (regex.test(prompt)) return type as TT;
        }
        if (this.PATTERNS[TT.Conversational].test(prompt)) return TT.Conversational;
        return TT.Generate;
    }

    static analyzeProbabilities(prompt: string): Record<TT, number> {
        const weights = {} as Record<TT, number>;

        for (const [type, regex] of Object.entries(this.PATTERNS)) {
            const matches = (prompt.match(new RegExp(regex, 'gi')) || []).length;
            weights[type as TT] = matches > 0 ? Math.min(1.0, (matches * 2) / 10 + 0.5) : 0;
        }

        return weights;
    }

    static assessComplexity(prompt: string, weightedTasks: Record<TT, number>): -1 | 0 | 1 {
        if (/\b(function|class|const|let|var|if|return|while|for|switch|try|catch|async|await|interface|type)\b/.test(prompt)) {
            return -1; // Code-heavy = Low abstract complexity (Direct task)
        }

        const wordCount = prompt.split(/\s+/).length;
        let score = 0;

        if (wordCount > 60) score += 1;
        if (weightedTasks[TT.Architecture] > 0.5) score += 2;
        if (weightedTasks[TT.APIOrchestration] > 0.5) score += 2;
        if (weightedTasks[TT.Generate] > 0.5) score += 2;
        if (weightedTasks[TT.Esoteric] > 0.5) score += 1;

        return score >= 3 ? 1 : score >= 1 ? 0 : -1;
    }
}
