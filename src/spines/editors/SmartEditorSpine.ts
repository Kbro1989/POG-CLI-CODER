import { z } from 'zod';
import * as fs from 'fs';
import { join } from 'path';
import type { VibeConfig, LimbTool } from '../../core/models.js';
import { Sandbox } from '../../sandbox/Sandbox.js';
import { SmartEdit } from '../../core/SmartEdit.js';

/**
 * SmartEditorSpine - High-fidelity code editing engine (Editor Bundle).
 */
export class SmartEditorSpine {
    constructor(
        private readonly config: VibeConfig,
        private readonly sandbox: Sandbox
    ) { }

    getTools(): LimbTool[] {
        return [
            {
                name: 'edit_patch',
                description: 'Replace a specific block of text in a file with resilient matching.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file.' },
                        search: { type: 'string', description: 'The exact string to search for.' },
                        replace: { type: 'string', description: 'The string to replace it with.' }
                    },
                    required: ['path', 'search', 'replace']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.'),
                    search: z.string().describe('The exact string to search for.'),
                    replace: z.string().describe('The string to replace it with.')
                }),
                handler: async (args: Record<string, unknown>) => {
                    const filePath = args['path'] as string;
                    const absPath = join(this.config.projectRoot, filePath);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);

                    const content = fs.readFileSync(absPath, 'utf8');
                    const editResult = await SmartEdit.calculateReplacement(content, {
                        file_path: absPath,
                        old_string: args['search'] as string,
                        new_string: args['replace'] as string
                    });

                    if (editResult.occurrences === 0) {
                        throw new Error(`Patch failed: Search string not found (Exact|Flexible|Regex failed).`);
                    }

                    await this.sandbox.createSnapshot(`edit_patch: ${filePath} (${editResult.strategy})`);
                    const finalContent = SmartEdit.restoreTrailingNewline(content, editResult.newContent);

                    try {
                        fs.writeFileSync(absPath, finalContent);
                    } catch (error) {
                        // Emergency Shell Write Fallback
                        const tmpFile = join(process.env['TEMP'] || '.', `pog_edit_${Date.now()}.tmp`);
                        fs.writeFileSync(tmpFile, finalContent);
                        (await import('child_process')).execSync(`move /Y "${tmpFile}" "${absPath}"`);
                    }

                    return { ok: true, value: { status: 'patched', strategy: editResult.strategy, occurrences: editResult.occurrences } };
                }
            },
            {
                name: 'edit_smart',
                description: 'Advanced multi-strategy file editing for complex refactors.',
                parameters: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Relative path to the file.' },
                        old_string: { type: 'string', description: 'The old code block.' },
                        new_string: { type: 'string', description: 'The new code block.' }
                    },
                    required: ['path', 'old_string', 'new_string']
                },
                schema: z.object({
                    path: z.string().describe('Relative path to the file.'),
                    old_string: z.string().describe('The old code block.'),
                    new_string: z.string().describe('The new code block.')
                }),
                handler: async (args: Record<string, unknown>) => {
                    const filePath = args['path'] as string;
                    const absPath = join(this.config.projectRoot, filePath);
                    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${filePath}`);

                    const content = fs.readFileSync(absPath, 'utf8');
                    const result = await SmartEdit.calculateReplacement(content, {
                        file_path: absPath,
                        old_string: args['old_string'] as string,
                        new_string: args['new_string'] as string
                    });

                    if (result.occurrences === 0) {
                        return { ok: false, error: new Error('SmartEdit: No matching content found for replacement.') };
                    }

                    await this.sandbox.createSnapshot(`edit_smart: ${filePath}`);
                    const finalContent = SmartEdit.restoreTrailingNewline(content, result.newContent);

                    try {
                        fs.writeFileSync(absPath, finalContent);
                    } catch (error) {
                        // Emergency Shell Write Fallback
                        const tmpFile = join(process.env['TEMP'] || '.', `pog_smart_edit_${Date.now()}.tmp`);
                        fs.writeFileSync(tmpFile, finalContent);
                        (await import('child_process')).execSync(`move /Y "${tmpFile}" "${absPath}"`);
                    }

                    return { ok: true, value: { status: 'edited', strategy: result.strategy, occurrences: result.occurrences } };
                }
            }
        ];
    }
}
