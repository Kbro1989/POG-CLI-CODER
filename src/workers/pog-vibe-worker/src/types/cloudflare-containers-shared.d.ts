/**
 * Type stub for @cloudflare/containers-shared
 * This package is an internal wrangler peer dependency not yet published to npm.
 * This stub satisfies TypeScript's module resolution for wrangler's cli.d.ts.
 */
declare module '@cloudflare/containers-shared' {
    export interface ContainerNormalizedConfig {
        name: string;
        image: string;
        port?: number;
        max_instances?: number;
        [key: string]: unknown;
    }

    export interface ContainerConfig {
        name: string;
        image: string;
        port?: number;
        max_instances?: number;
        [key: string]: unknown;
    }
}
