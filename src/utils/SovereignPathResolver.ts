/**
 * SovereignPathResolver - Centralized TERNARY path resolution
 * 
 * Philosophy: True Ternary Architecture
 * Tier 1 (+1): D:\ Sovereign Drive - Persistent, stable, high capacity
 * Tier 2 (0):  ~/.pog-coder-vibe - User home, portable across projects
 * Tier 3 (-1): .pog in project root - Project-local, fully portable
 * 
 * The system auto-escalates to the highest available tier, or you can
 * force a specific tier via environment variables.
 */

import { existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Ternary Path Tiers
export const enum PathTier {
    Sovereign = 1,   // D:\ drive (most stable)
    Home = 0,        // ~/.pog-coder-vibe (balanced)
    ProjectLocal = -1 // .pog in project root (most portable)
}

// Core Sovereign Locations
const SOVEREIGN_D_ROOT = 'D:\\sovereign\\pog-coder-vibe';
const SOVEREIGN_HOME_ROOT = join(homedir(), '.pog-coder-vibe');

// Model Storage (separate from config for size reasons)
const OLLAMA_D_PATH = 'D:\\sovereign\\ollama-models';
const GUTENBERG_D_PATH = 'D:\\sovereign\\pog-gutenberg';

// Cached project root for tier -1 resolution
let _projectRoot: string | null = null;

/**
 * Sets the project root for Tier -1 (ProjectLocal) resolution
 */
export function setProjectRoot(root: string): void {
    _projectRoot = root;
}

/**
 * Detects if D:\ drive is available and writable
 */
export function hasSovereignDrive(): boolean {
    try {
        if (!existsSync('D:\\')) return false;
        const stat = statSync('D:\\');
        return stat.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Detects the current path tier based on environment and availability
 * @returns PathTier value: 1 (Sovereign), 0 (Home), or -1 (ProjectLocal)
 */
export function detectPathTier(): PathTier {
    // Environment override: force a specific tier
    const forcedTier = process.env['POG_PATH_TIER'];
    if (forcedTier === '1' || forcedTier === 'sovereign') return PathTier.Sovereign;
    if (forcedTier === '0' || forcedTier === 'home') return PathTier.Home;
    if (forcedTier === '-1' || forcedTier === 'local') return PathTier.ProjectLocal;

    // Auto-detect: try highest tier first
    if (hasSovereignDrive()) return PathTier.Sovereign;

    // Check if project-local is explicitly requested
    const useLocal = process.env['POG_USE_LOCAL'] === 'true';
    if (useLocal && _projectRoot) return PathTier.ProjectLocal;

    // Default to Home tier (balanced)
    return PathTier.Home;
}

/**
 * Ensures the Home tier directory exists and returns its path
 */
function ensureHomeRoot(): string {
    if (!existsSync(SOVEREIGN_HOME_ROOT)) {
        mkdirSync(SOVEREIGN_HOME_ROOT, { recursive: true });
    }
    return SOVEREIGN_HOME_ROOT;
}

/**
 * Returns the root directory for the given (or detected) tier
 * True ternary: +1 -> D:\, 0 -> Home, -1 -> Project-local
 */
export function getSovereignRoot(tier?: PathTier): string {
    const resolvedTier = tier ?? detectPathTier();

    // Tier +1: Sovereign D:\ Drive
    if (resolvedTier === PathTier.Sovereign) {
        if (!existsSync(SOVEREIGN_D_ROOT)) {
            mkdirSync(SOVEREIGN_D_ROOT, { recursive: true });
        }
        // Ensure Gutenberg path is also initialized if it doesn't exist
        if (!existsSync(GUTENBERG_D_PATH)) {
            mkdirSync(GUTENBERG_D_PATH, { recursive: true });
        }
        return SOVEREIGN_D_ROOT;
    }

    // Tier -1: Project Local (with fallback to Home if no project root)
    if (resolvedTier === PathTier.ProjectLocal && _projectRoot) {
        const localPath = join(_projectRoot, '.pog');
        if (!existsSync(localPath)) {
            mkdirSync(localPath, { recursive: true });
        }
        return localPath;
    }

    // Tier 0: Home (~/.pog-coder-vibe) - default balanced tier
    return ensureHomeRoot();
}

/**
 * Resolves a subpath within the sovereign root
 * @param subpath - Relative path (e.g., 'snapshots', 'dashboards/session-123')
 * @param tier - Optional tier override
 * @returns Absolute path to the resolved location
 */
export function resolveSovereignPath(subpath: string, tier?: PathTier): string {
    const root = getSovereignRoot(tier);
    const resolved = join(root, subpath);

    // Ensure parent directory exists
    const parentDir = join(resolved, '..');
    if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
    }

    return resolved;
}

/**
 * Gets the Ollama models path (D:\ollama-models or environment override)
 */
export function getOllamaModelsPath(): string {
    const envPath = process.env['OLLAMA_MODELS_PATH'] || process.env['POG_ERROR_TRACKER_PATH'];
    if (envPath && existsSync(envPath)) return envPath;

    if (hasSovereignDrive()) {
        if (!existsSync(OLLAMA_D_PATH)) {
            try {
                mkdirSync(OLLAMA_D_PATH, { recursive: true });
            } catch { /* Fallback */ }
        }
        return OLLAMA_D_PATH;
    }

    // Default to whatever Ollama uses internally
    return '';
}

/**
 * Gets the Gutenberg library path (D:\pog-gutenberg or environment override)
 */
export function getGutenbergPath(): string {
    const envPath = process.env['POG_GUTENBERG_PATH'];
    if (envPath && existsSync(envPath)) return envPath;

    // Priority: Project-local library if it exists (e.g. for Gutenberg domains)
    if (_projectRoot) {
        const projectLocalGutenberg = join(_projectRoot, 'sovereign', 'pog-gutenberg');
        if (existsSync(projectLocalGutenberg)) return projectLocalGutenberg;
    }

    if (hasSovereignDrive()) {
        if (!existsSync(GUTENBERG_D_PATH)) {
            mkdirSync(GUTENBERG_D_PATH, { recursive: true });
        }
        return GUTENBERG_D_PATH;
    }

    // Fallback to path relative to sovereign root
    return resolveSovereignPath('gutenberg');
}

/**
 * Gets path for circuit breaker state persistence
 */
export function getCircuitStatePath(): string {
    return resolveSovereignPath('circuit-states.json');
}

/**
 * Gets path for learning database
 */
export function getLearningDbPath(): string {
    return resolveSovereignPath('vibe-learning.db');
}

/**
 * Gets path for learning database
 */
export function getVectorDbPath(): string {
    return resolveSovereignPath('vibe-learning.db');
}

/**
 * Gets path for performance history
 */
export function getPerformanceDbPath(): string {
    return resolveSovereignPath('free-model-performance.json');
}

/**
 * Gets path for session dashboards
 */
export function getDashboardPath(sessionId: string): string {
    return resolveSovereignPath(`session_dashboards/${sessionId}`);
}

/**
 * Gets path for snapshots
 */
export function getSnapshotPath(snapshotId?: string): string {
    if (snapshotId) {
        return resolveSovereignPath(`snapshots/${snapshotId}`);
    }
    return resolveSovereignPath('snapshots');
}

// Export constants for external use
export const SovereignPaths = {
    D_ROOT: SOVEREIGN_D_ROOT,
    HOME_ROOT: SOVEREIGN_HOME_ROOT,
    OLLAMA: OLLAMA_D_PATH,
    GUTENBERG: GUTENBERG_D_PATH
} as const;
