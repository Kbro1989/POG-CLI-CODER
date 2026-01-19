import { AILimb } from '../src/api/ai/AILimb.js';
import { VibeConfig } from '../src/core/models.js';
import chalk from 'chalk';

const mockConfig: VibeConfig = {
    projectId: 'pog-vibe-test',
    enabledServices: []
};

async function runTest() {
    console.log(chalk.blue.bold('\n--- POG-VIBE: Semantic Pathing Verification ---'));
    const limb = new AILimb(mockConfig);

    const testCases = [
        {
            prompt: 'Generate a marketing image for our new app',
            expectedModel: 'DALL-E 3',
            reason: 'Marketing Intent'
        },
        {
            prompt: 'I need a cinematic concept art for a sci-fi game',
            expectedModel: 'Midjourney',
            reason: 'Artistic/Art Intent'
        },
        {
            prompt: 'Can you analyze this X-ray medical image?',
            expectedModel: 'Radiology Foundations',
            reason: 'Clinical Intent'
        },
        {
            prompt: 'Translate this legal contract to French professionally',
            expectedModel: 'DeepL Translator',
            reason: 'Professional Translation Intent'
        },
        {
            prompt: 'Generate a marketing image for our app and then translate the description to Spanish',
            expectedModel: 'DALL-E 3', // First step
            reason: 'Composite Intent Chain'
        }
    ];

    for (const test of testCases) {
        console.log(chalk.yellow(`\nTesting Prompt: "${test.prompt}"`));

        // Execute the limb directly to test the full logic including multi-path
        const result = await limb.execute({ prompt: test.prompt } as any);

        if (result.ok) {
            console.log(chalk.green(`✅ SUCCESS: ${result.value.output.substring(0, 100)}...`));
            if (test.prompt.includes('and then')) {
                console.log(chalk.cyan(`   Chain Data: ${JSON.stringify(result.value.data).substring(0, 100)}...`));
            }
        } else {
            console.log(chalk.red(`❌ FAILURE: ${result.error?.message}`));
        }
    }
}

runTest().catch(console.error);
