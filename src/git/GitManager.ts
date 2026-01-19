/**
 * GitManager - Git integration for auto-commit and undo
 * Based on gemini-cli's GitService pattern
 */

import { simpleGit, SimpleGit, CheckRepoActions } from 'simple-git';
import pino from 'pino';

const logger = pino({
    name: 'GitManager',
    base: { hostname: 'POG-VIBE' }
});

export class GitManager {
    private git: SimpleGit;

    constructor(private projectRoot: string) {
        this.git = simpleGit(projectRoot);
    }

    /**
     * Check if directory is a Git repository
     */
    async isGitRepo(): Promise<boolean> {
        try {
            await this.git.checkIsRepo(CheckRepoActions.IS_REPO_ROOT);
            return true;
        } catch {
            try {
                // Fallback: try status command
                await this.git.status();
                return true;
            } catch {
                return false;
            }
        }
    }

    /**
     * Auto-commit changes to specific files
     */
    async commitChanges(message: string, files?: string[]): Promise<string | null> {
        try {
            // Add files
            if (files && files.length > 0) {
                await this.git.add(files);
            } else {
                await this.git.add('.');
            }

            // Check if there's anything to commit
            const status = await this.git.status();
            if (status.isClean()) {
                logger.debug('No changes to commit');
                return null;
            }

            // Commit
            const result = await this.git.commit(message, files);
            const commitHash = result.commit;

            logger.info({ commit: commitHash, message }, 'Auto-committed changes');

            return commitHash;
        } catch (error) {
            logger.error({ error, message }, 'Failed to commit changes');
            throw error;
        }
    }

    /**
     * Revert to a specific commit
     */
    async revertToCommit(commitHash: string): Promise<void> {
        try {
            await this.git.reset(['--hard', commitHash]);
            logger.info({ commit: commitHash }, 'Reverted to commit');
        } catch (error) {
            logger.error({ error, commitHash }, 'Failed to revert');
            throw error;
        }
    }

    /**
     * Get last N commits
     */
    async getLastNCommits(n: number = 10): Promise<Array<{ hash: string; message: string; date: string }>> {
        try {
            const log = await this.git.log({ maxCount: n });
            return log.all.map(commit => ({
                hash: commit.hash.substring(0, 7), // Short hash
                message: commit.message,
                date: commit.date
            }));
        } catch (error) {
            logger.error({ error }, 'Failed to get commit log');
            return [];
        }
    }

    /**
     * Get current branch name
     */
    async getCurrentBranch(): Promise<string | null> {
        try {
            const status = await this.git.status();
            return status.current || null;
        } catch (error) {
            logger.error({ error }, 'Failed to get current branch');
            return null;
        }
    }

    /**
     * Check if there are uncommitted changes
     */
    async hasUncommittedChanges(): Promise<boolean> {
        try {
            const status = await this.git.status();
            return !status.isClean();
        } catch (error) {
            logger.error({ error }, 'Failed to check status');
            return false;
        }
    }

    /**
     * Get diff of uncommitted changes
     */
    async getDiff(): Promise<string> {
        try {
            const diff = await this.git.diff();
            return diff;
        } catch (error) {
            logger.error({ error }, 'Failed to get diff');
            return '';
        }
    }

    /**
     * Initialize a new Git repository (if needed)
     */
    async initRepo(): Promise<void> {
        try {
            await this.git.init();
            logger.info({ root: this.projectRoot }, 'Initialized Git repository');
        } catch (error) {
            logger.error({ error }, 'Failed to initialize Git');
            throw error;
        }
    }
}
