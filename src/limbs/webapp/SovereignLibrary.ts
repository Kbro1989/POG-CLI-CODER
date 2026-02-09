// Pre-built components for instant absorption (no AI generation needed)
export const SOVEREIGN_COMPONENTS = {
  DASHBOARD: `import React from 'react';
export const Dashboard = ({ children, title }: { children: React.ReactNode, title: string }) => (
  <div className="min-h-screen bg-sovereign-900">
    <nav className="bg-sovereign-800 border-b border-sovereign-700 px-6 py-4">
      <h1 className="text-xl font-bold text-ghost-glow">{title}</h1>
    </nav>
    <main className="p-6">{children}</main>
  </div>
);
`,
  DATAGRID: `import React from 'react';
export const DataGrid = ({ data, columns }: any) => (
  <div className="overflow-x-auto sovereign-card">
    <table className="w-full text-left">
      <thead className="border-b border-sovereign-700">
        <tr>{columns.map((c: any) => <th key={c.key} className="pb-3 text-sovereign-300 font-medium">{c.title}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-sovereign-700">
        {data.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-sovereign-700/50">{columns.map((c: any) => (
            <td key={c.key} className="py-3 text-sovereign-100">{row[c.key]}</td>
          ))}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
`,
  MODAL: `import React, { useState } from 'react';
export const Modal = ({ trigger, children, title }: any) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">{trigger}</button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="sovereign-card max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-ghost-glow">{title}</h3>
              <button onClick={() => setOpen(false)} className="text-sovereign-300 hover:text-white">✕</button>
            </div>
            {children}
          </div>
        </div>
      )}
    </>
  );
};
`
};
