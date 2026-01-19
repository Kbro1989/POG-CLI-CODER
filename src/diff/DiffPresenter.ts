/**
 * DiffPresenter - Visual diff generation and CLI presentation
 * Based on gemini-cli's write-file.ts diff patterns
 */

import * as Diff from 'diff';
import chalk from 'chalk';
import prompts from 'prompts';
import pino from 'pino';

const logger = pino({
    name: 'DiffPresenter',
    base: { hostname: 'POG-VIBE' }
});

export interface DiffResult {
    oldContent: string;
    newContent: string;
    patch: string;
    stats: { additions: number; deletions: number; changes: number };
}

export type UserAction = 'accept' | 'reject' | 'edit';

export class DiffPresenter {
    /**
     * Create unified diff between old and new content
     */
    static createDiff(oldContent: string, newContent: string, filename: string): DiffResult {
        const patch = Diff.createPatch(
            filename,
            oldContent,
            newContent,
            'Current',
            'Proposed',
            { context: 3 }
        );

        const changes = Diff.diffLines(oldContent, newContent);
        let additions = 0;
        let deletions = 0;
        let totalChanges = 0;

        changes.forEach(change => {
            if (change.added) {
                additions += change.count || 0;
                totalChanges++;
            }
            if (change.removed) {
                deletions += change.count || 0;
                totalChanges++;
            }
        });

        return {
            oldContent,
            newContent,
            patch,
            stats: { additions, deletions, changes: totalChanges }
        };
    }

    /**
     * Render diff with color coding for terminal
     */
    static renderDiff(diffResult: DiffResult): string {
        const lines = diffResult.patch.split('\n');

        return lines.map(line => {
            if (line.startsWith('+++ ') || line.startsWith('--- ')) {
                return chalk.bold(line);
            }
            if (line.startsWith('@@')) {
                return chalk.cyan(line);
            }
            if (line.startsWith('+')) {
                return chalk.green(line);
            }
            if (line.startsWith('-')) {
                return chalk.red(line);
            }
            return chalk.gray(line);
        }).join('\n');
    }

    /**
     * Display diff stats summary
     */
    static renderStats(stats: { additions: number; deletions: number; changes: number }): string {
        const parts = [];

        if (stats.additions > 0) {
            parts.push(chalk.green(`+${stats.additions}`));
        }
        if (stats.deletions > 0) {
            parts.push(chalk.red(`-${stats.deletions}`));
        }

        return `[${parts.join(' ')}] ${stats.changes} change(s)`;
    }

    /**
     * Show diff and prompt user for action
     */
    static async presentDiffAndPrompt(
        diffResult: DiffResult,
        filename: string
    ): Promise<UserAction> {
        console.log('\n' + chalk.bold.underline(`Changes to ${filename}:`));
        console.log(this.renderStats(diffResult.stats));
        console.log(this.renderDiff(diffResult));
        console.log('');

        try {
            const response = await prompts({
                type: 'select',
                name: 'action',
                message: 'Apply this change?',
                choices: [
                    { title: '✓ Accept', value: 'accept' },
                    { title: '✗ Reject', value: 'reject' },
                    { title: '✎ Edit', value: 'edit' }
                ],
                initial: 0
            });

            if (!response.action) {
                // User cancelled (Ctrl+C)
                logger.info('User cancelled diff review');
                return 'reject';
            }

            return response.action as UserAction;
        } catch (error) {
            logger.error({ error }, 'Prompt error, defaulting to reject');
            return 'reject';
        }
    }

    /**
     * Create inline diff (for compact display)
     */
    static createInlineDiff(oldContent: string, newContent: string): string {
        const changes = Diff.diffWords(oldContent, newContent);

        return changes.map(change => {
            if (change.added) {
                return chalk.green.bold(change.value);
            }
            if (change.removed) {
                return chalk.red.strikethrough(change.value);
            }
            return change.value;
        }).join('');
    }
}
