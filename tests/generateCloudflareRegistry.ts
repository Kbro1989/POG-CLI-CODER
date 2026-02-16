import { readFileSync, writeFileSync, existsSync } from 'fs';

const listPath = 'cf_models_fixed.txt';
const outputPath = 'src/api/ai/CloudflareModelRegistry.ts';

if (!existsSync(listPath)) {
    console.error('cf_models_fixed.txt not found');
    process.exit(1);
}

const content = readFileSync(listPath, 'utf-8');
const lines = content.split('\n');

const models: any[] = [];
const idCounts: Map<string, number> = new Map();

for (const line of lines) {
    if (!line.includes('@cf/') && !line.includes('@hf/')) continue;

    // Split by the box drawing character Γöé or other common separators
    const parts = line.split(/[│|Γöé|\|]/).map(p => p.trim()).filter(p => p.length > 0);

    if (parts.length >= 4) {
        const name = parts[1]!;
        const description = parts[2]!;
        const task = parts[3]!;

        if (name === 'name' || !name.startsWith('@')) continue;

        // Generate a safe ID
        const safeName = name.replace(/^@cf\//, '').replace(/^@hf\//, 'hf_').replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_').toLowerCase();
        let baseId = `cf_${safeName}`;

        // Ensure Unique ID
        const count = idCounts.get(baseId) || 0;
        idCounts.set(baseId, count + 1);
        const finalId = count > 0 ? `${baseId}_${count}` : baseId;

        let taskType = 'TEXT';
        const lowerTask = task.toLowerCase();
        const lowerName = name.toLowerCase();

        if (lowerTask.includes('image') || lowerName.includes('stable-diffusion') || lowerName.includes('flux')) taskType = 'IMAGE';
        else if (lowerTask.includes('speech') || lowerTask.includes('audio') || lowerTask.includes('recognition')) taskType = 'AUDIO';
        else if (lowerTask.includes('embedding')) taskType = 'EMBEDDING';
        else if (lowerTask.includes('translation')) taskType = 'TEXT';
        else if (lowerTask.includes('summarization')) taskType = 'TEXT';
        else if (lowerTask.includes('classification')) taskType = 'TEXT';

        models.push({
            id: finalId,
            name: name!,
            serviceType: 'CLOUDFLARE',
            taskType,
            modelId: name!,
            description: (description || '').replace(/'/g, "\\'"),
            passthroughEnabled: true
        });
    }
}

const tsContent = `import { AICapability } from './CapabilityRegistry.js';

export const CloudflareModelRegistry: Record<string, AICapability> = {
${models.map(m => `    '${m.id}': {
        id: '${m.id}',
        name: '${m.name}',
        serviceType: 'CLOUDFLARE',
        taskType: '${m.taskType}' as any,
        modelId: '${m.modelId}',
        description: '${m.description}',
        passthroughEnabled: true
    }`).join(',\n')}
};
`;

writeFileSync(outputPath, tsContent);
console.log(`Successfully generated ${models.length} Cloudflare model definitions in ${outputPath}`);

