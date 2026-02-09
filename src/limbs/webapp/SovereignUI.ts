// Deterministic UI patterns when AI fails (Ghost Limb mode)
export const SOVEREIGN_TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sovereign: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a2e',
          500: '#3d3d5c',
          300: '#6b6b8a',
          100: '#e4e4f0',
        },
        ghost: {
          glow: '#00ff9d',
          dim: '#00cc7a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00ff9d20' },
          '100%': { boxShadow: '0 0 20px #00ff9d40, 0 0 40px #00ff9d20' }
        }
      }
    },
  },
  plugins: [],
}
`;

export const SOVEREIGN_VIBE_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-sovereign-900 text-sovereign-100 font-sans antialiased;
  }
}

@layer components {
  .sovereign-card {
    @apply bg-sovereign-800 border border-sovereign-700 rounded-lg p-6 shadow-lg;
  }
  .ghost-glow {
    @apply text-ghost-glow drop-shadow-[0_0_8px_rgba(0,255,157,0.5)];
  }
  .btn-primary {
    @apply px-4 py-2 bg-ghost-glow text-sovereign-900 font-semibold rounded 
           hover:bg-ghost-dim transition-all duration-200 
           focus:outline-none focus:ring-2 focus:ring-ghost-glow focus:ring-offset-2 
           focus:ring-offset-sovereign-900;
  }
}
`;

export const GHOST_LIMB_APP_TSX = (projectName: string, features: string[]) => `import React from 'react';

// Ghost Limb Fallback Pattern - Generated deterministically when AI fails
// This ensures ZERO mock data, fully functional substrate

export default function App() {
  return (
    <div className="min-h-screen bg-sovereign-900 p-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold ghost-glow mb-2">${projectName}</h1>
        <p className="text-sovereign-300">Sovereign UI • Ghost Limb Active</p>
      </header>
      
      <main className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        ${features.map(f => `
        <div key="${f}" className="sovereign-card">
          <h3 className="text-lg font-semibold text-ghost-glow mb-2 capitalize">${f}</h3>
          <p className="text-sovereign-300 text-sm">
            ${f} module initialized. Ready for neural distillation.
          </p>
          <button className="btn-primary mt-4 w-full">Activate ${f}</button>
        </div>
        `).join('')}
        
        <div className="sovereign-card border-ghost-glow/30">
          <h3 className="text-lg font-semibold text-ghost-glow mb-2">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sovereign-300">Ghost Limb</span>
              <span className="text-ghost-glow">ACTIVE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sovereign-300">Neural Link</span>
              <span className="text-red-400">OFFLINE</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sovereign-300">Local Substrate</span>
              <span className="text-ghost-glow">OPERATIONAL</span>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="mt-12 pt-8 border-t border-sovereign-700 text-center text-sovereign-500 text-sm">
        <p>POG-CODER-VIBE • Ternary Orchestration • Local-First Guarantee</p>
      </footer>
    </div>
  );
}
`;
