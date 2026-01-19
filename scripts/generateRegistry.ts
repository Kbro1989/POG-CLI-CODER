import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const listPath = 'API_LIST.md';
const outputPath = 'src/api/ai/StaticModelRegistry.ts';

if (!existsSync(listPath)) {
    console.error('API_LIST.md not found');
    process.exit(1);
}

const content = readFileSync(listPath, 'utf-8');
const lines = content.split('\n').map(l => l.trim());

const models: any[] = [];
const tasksMetadata: Record<string, number> = {};
const provMetadata: Record<string, number> = {};
const idCounts: Map<string, number> = new Map();

let currentSection: 'FACETS' | 'WHATS_NEW' | 'MODELS' | null = null;
let facetType: 'PROVIDERS' | 'TASKS' | null = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // 1. Detect Sections
    if (line === 'Tasks') { currentSection = 'FACETS'; facetType = 'TASKS'; continue; }
    if (line === 'Providers') { currentSection = 'FACETS'; facetType = 'PROVIDERS'; continue; }
    if (line === 'Foundation models' || line === 'All partners' || line === 'Fine-tunable models' || line === 'Task-specific solutions') {
        currentSection = 'MODELS';
        continue;
    }

    // 2. Parse Facets
    if (currentSection === 'FACETS' && facetType) {
        const nextLine = lines[i + 1];
        if (nextLine && /^\d+$/.test(nextLine)) {
            const count = parseInt(nextLine, 10);
            if (facetType === 'TASKS') tasksMetadata[line] = count;
            if (facetType === 'PROVIDERS') provMetadata[line] = count;
            i++; continue;
        }
    }

    // 3. Parse Models
    if (currentSection === 'MODELS') {
        if (line.length > 80 || /^\d+$/.test(line) || line.endsWith(':')) continue;
        if (['Model Collections', 'Google models', 'Partner models', 'Open models on Hugging Face'].includes(line)) continue;

        const description = lines[i + 1];
        if (description && description.length >= 5) {
            const safeName = line.replace(/[^\w\s/-]/g, '').replace(/\//g, '_');
            let baseId = `dynamic_${safeName.replace(/\s+/g, '_').toLowerCase()}`;

            // Ensure Unique ID
            const count = idCounts.get(baseId) || 0;
            idCounts.set(baseId, count + 1);
            const finalId = count > 0 ? `${baseId}_${count}` : baseId;

            let serviceType = 'VERTEX_AI';
            let taskType = 'TEXT';
            const lowerLine = line.toLowerCase();
            const lowerDesc = description.toLowerCase();

            if (lowerLine.startsWith('gemini')) serviceType = 'GEMINI';
            else if (lowerLine.includes('vision') || lowerLine.includes('image classification') || lowerLine.includes('object detection')) serviceType = 'CLOUD_VISION';
            else if (lowerLine.includes('document') || lowerLine.includes('ocr')) serviceType = 'DOCUMENT_AI';
            else if (lowerLine.includes('speech') || lowerLine.includes('audio')) serviceType = 'SPEECH';
            else if (lowerLine.includes('translation')) serviceType = 'TRANSLATION';
            else if (lowerLine.includes('health') || lowerLine.includes('radiology') || lowerLine.includes('pathology') || lowerLine.includes('derm')) serviceType = 'HEALTH_AI';
            else if (lowerLine.includes('imagen') || lowerLine.includes('veo') || lowerLine.includes('generation') || lowerLine.includes('flux')) serviceType = 'MEDIA_FORGE';

            if (lowerLine.includes('vision') || lowerLine.includes('image') || lowerDesc.includes('image') || lowerLine.includes('flux')) taskType = 'IMAGE';
            if (lowerLine.includes('video') || lowerDesc.includes('video')) taskType = 'VIDEO';
            if (lowerLine.includes('speech') || lowerLine.includes('audio') || lowerDesc.includes('audio') || lowerDesc.includes('speech')) taskType = 'AUDIO';
            if (lowerLine.includes('health') || lowerLine.includes('radiology') || lowerLine.includes('medical') || lowerDesc.includes('medical')) taskType = 'HEALTH';
            if (lowerLine.includes('geospatial') || lowerDesc.includes('satellite')) taskType = 'GEO';
            if (lowerLine.includes('embedding') || lowerDesc.includes('numerical vector')) taskType = 'EMBEDDING';

            models.push({
                id: finalId,
                name: line,
                serviceType,
                taskType,
                modelId: line.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '--'),
                description: description.replace(/'/g, "\\'"),
                passthroughEnabled: true
            });
            i++;
        }
    }
}

const tsContent = `import { AICapability } from './CapabilityRegistry.js';

export const CatalogMetadata = {
    tasks: ${JSON.stringify(tasksMetadata, null, 4)} as Record<string, number>,
    providers: ${JSON.stringify(provMetadata, null, 4)} as Record<string, number>
};

export const StaticModelRegistry: Record<string, AICapability> = {
${models.map(m => `    '${m.id}': {
        id: '${m.id}',
        name: '${m.name.replace(/'/g, "\\'")}',
        serviceType: '${m.serviceType}' as any,
        taskType: '${m.taskType}' as any,
        modelId: '${m.modelId}',
        description: '${m.description}',
        passthroughEnabled: true
    }`).join(',\n')}
};
`;

writeFileSync(outputPath, tsContent);
console.log(`Successfully generated ${models.length} static model definitions and metadata in ${outputPath}`);
