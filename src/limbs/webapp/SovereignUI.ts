/**
 * SovereignUI.ts - The Aesthetic Substrate
 * Absorbed patterns from Lovable, distilled to deterministic templates.
 * Used for high-fidelity Ghost Limb recovery.
 */

export const SOVEREIGN_TAILWIND_CONFIG = `
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sovereign': {
          50: '#f0f9ff',
          500: '#0ea5e9',  // The "Straight Up" blue
          900: '#0c4a6e',
        },
        'ghost': {
          500: '#8b5cf6',  // The survival purple
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
      }
    }
  },
  plugins: [],
}
`;

export const SOVEREIGN_VIBE_CSS = `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
  }
}

@layer components {
  .sovereign-card {
    @apply bg-white rounded-xl shadow-lg border border-gray-100 p-6 
           hover:shadow-xl transition-shadow duration-300;
  }
  .sovereign-button {
    @apply px-6 py-3 bg-sovereign-500 text-white rounded-lg font-medium
           hover:bg-sovereign-900 transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-sovereign-500 focus:ring-offset-2;
  }
  .ghost-badge {
    @apply inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
           bg-ghost-500 text-white;
  }
}
`;

export const GHOST_LIMB_APP_TSX = (appName: string, features: string[]) => `
// POG-GENERATED: Ghost Limb Stabilization
// Provenance: 4-tier cascade failure, Sovereign UI applied
// Lovable Equivalent: ✅ Pattern matched, locally rendered

import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-sovereign-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Ghost Limb Badge */}
        <div className="mb-6 flex items-center gap-2">
          <span className="ghost-badge">👻 Ghost Limb Active</span>
          <span className="text-sm text-gray-500">Cloud failed, substrate prevailed</span>
        </div>

        {/* Sovereign Header */}
        <div className="sovereign-card mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ${appName}
          </h1>
          <p className="text-lg text-gray-600">
            Generated with Sovereign UI patterns • ${features.join(' • ')}
          </p>
        </div>

        {/* Interactive Demo */}
        <div className="sovereign-card">
          <h2 className="text-2xl font-semibold mb-4">Sovereign Counter</h2>
          <p className="text-gray-600 mb-6">
            This UI was forged when the cloud choked. No spinners. No 429s. Just code.
          </p>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCount(c => c + 1)}
              className="sovereign-button"
            >
              Count: {count}
            </button>
            <span className="text-sm text-gray-500">
              Try the cloud alternative. See the spinner. Come back.
            </span>
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>POG-CODER-VIBE • Ternary Orchestration • Local-First</p>
          <p className="mt-1">If AI failed, the Ghost Limb survived.</p>
        </div>
      </div>
    </div>
  )
}

export default App
`;
