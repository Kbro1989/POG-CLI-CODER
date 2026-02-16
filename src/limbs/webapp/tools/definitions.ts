import { LimbTool } from '../../../core/ToolingSpine.js';

export const FORGE_TOOLS: LimbTool[] = [
    {
        name: 'scaffold_project',
        description: 'Scaffold a new web project using specified stack template',
        parameters: {
            type: 'object',
            properties: {
                stack: { type: 'string', enum: ['react-vite', 'nextjs', 'vue-vite', 'svelte-kit'] },
                name: { type: 'string', description: 'Project name (kebab-case)' },
                features: { type: 'array', items: { type: 'string' } }
            },
            required: ['stack', 'name']
        },
        handler: async (args: Record<string, unknown>) => {
            // Implementation handled in limb
            return { ok: true, value: `Scaffolded ${args['stack']} project: ${args['name']}` };
        }
    },
    {
        name: 'digest_component',
        description: 'Generate or absorb a UI component into the project',
        isAI: true,
        parameters: {
            type: 'object',
            properties: {
                projectDir: { type: 'string' },
                componentName: { type: 'string' },
                description: { type: 'string' }
            },
            required: ['projectDir', 'componentName']
        },
        handler: async (args: Record<string, unknown>) => {
            // Implementation handled in limb
            return { ok: true, value: `Digested component: ${args['componentName']}` };
        }
    },
    {
        name: 'install_dependencies',
        description: 'Install npm dependencies with specific package manager',
        parameters: {
            type: 'object',
            properties: {
                projectDir: { type: 'string' },
                packages: { type: 'array', items: { type: 'string' } },
                dev: { type: 'boolean', default: false }
            },
            required: ['projectDir']
        },
        handler: async (args: Record<string, unknown>) => {
            try {
                const { execSync } = await import('child_process');
                const packages = (args['packages'] as string[]) || [];
                const dev = args['dev'] as boolean;
                const projectDir = args['projectDir'] as string;
                const cmd = packages.length
                    ? `npm install ${dev ? '--save-dev' : ''} ${packages.join(' ')}`
                    : 'npm install';
                execSync(cmd, { cwd: projectDir, stdio: 'inherit' });
                return { ok: true, value: 'Dependencies installed' };
            } catch (e) {
                return { ok: false, error: e as Error };
            }
        }
    }
];
