/**
 * SovereignLibrary.ts - The Component Digestive Stash
 * Pre-digested UI patterns absorbed from v0, Lovable, and Shadcn.
 * These are ready for instant injection during Ghost Limb recovery or high-tier generation.
 */

export const SOVEREIGN_COMPONENTS = {
    HERO_MODERN: `
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-32">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto space-y-8">
          <div className="status-badge mx-auto">Sovereign Substrate v1.0</div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
            Build Infrastructure <span className="text-sovereign-500">That Eats Tools</span>
          </h1>
          <p className="text-xl text-slate-400">
            Why use a cloud-only generator when you can have a survival-forged, 
            local-first creative engine? Zero placeholders. Zero spinners.
          </p>
          <div className="flex justify-center gap-4">
            <button className="btn-sovereign text-lg">Initialize Forge</button>
            <button className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors">
              Read the Testimony
            </button>
          </div>
        </div>
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-sovereign -z-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-sovereign-500/20 rounded-full blur-[120px] animate-pulse-slow" />
    </section>
  );
}
`,
    FEATURES_GRID: `
export function Features() {
  const features = [
    { title: 'Ternary Routing', desc: 'Local, Edge, and Cloud orchestration for absolute resilience.', icon: '🌐' },
    { title: 'Ghost Limb Recovery', desc: 'Deterministic stabilization when the cloud chokes.', icon: '👻' },
    { title: 'Neural Distillation', desc: 'Digests high-tier competitive patterns into local code.', icon: '🧠' },
    { title: 'Sovereign Proof', desc: 'Forensic documentation for every line of code generated.', icon: '🛡️' }
  ];

  return (
    <section className="py-24 bg-white/5 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div key={i} className="glass-panel p-6 space-y-4 hover:border-sovereign-500/50 transition-all">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="text-xl font-bold text-white">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`,
    PRICING_SOVEREIGN: `
export function Pricing() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="glass-panel max-w-lg mx-auto p-8 border-sovereign-500/30 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4">
             <span className="status-badge bg-white/10">Sovereign Only</span>
          </div>
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white">Full Substrate</h3>
            <div className="text-5xl font-bold text-white">$0 <span className="text-lg text-slate-500">/ forever</span></div>
            <p className="text-slate-400">Everything you need to digest competitors and build unstealable tools.</p>
            <ul className="space-y-3">
              {['Infinity Context', 'Ternary Failover', 'Local Ghost Limb', 'Zero Telemetry'].map((item, i) => (
                <li key={i} className="flex items-center text-sm text-slate-300">
                  <span className="text-sovereign-500 mr-2">✓</span> {item}
                </li>
              ))}
            </ul>
            <button className="btn-sovereign w-full mt-8">Claim Identity</button>
          </div>
        </div>
      </div>
    </section>
  );
}
`
};
