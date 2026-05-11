import React from 'react';

export type DashboardSection = 'dashboard' | 'productos' | 'chat';

interface DashboardShellProps {
  activeSection: DashboardSection;
  onNavigate: (section: DashboardSection) => void;
  title: string;
  subtitle: string;
  topActions?: React.ReactNode;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  activeSection,
  onNavigate,
  title,
  subtitle,
  topActions,
  children,
}) => {
  const navItemClass = (section: DashboardSection) =>
    `block w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
      activeSection === section
        ? 'bg-white/6 text-white shadow-inner shadow-black/20'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`;

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-white/10 bg-[#182235] text-slate-200 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-6 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/90 text-white shadow-lg shadow-indigo-500/30">F</div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">FastQuote</p>
              <p className="text-xs text-slate-400">Production</p>
            </div>
          </div>

          <nav className="flex-1 px-4">
            <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Navegación</p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => onNavigate('dashboard')} className={navItemClass('dashboard')}>
                Dashboard
              </button>
              <button type="button" onClick={() => onNavigate('productos')} className={navItemClass('productos')}>
                Productos
              </button>
              <button type="button" onClick={() => onNavigate('chat')} className={navItemClass('chat')}>
                Chat
              </button>
            </div>
          </nav>

          <div className="px-4 pb-6 text-xs text-slate-500">
            <div className="rounded-2xl bg-white/5 px-4 py-4">
              <p className="font-semibold text-slate-300">FastQuote</p>
              <p className="mt-1 leading-5">Inventario, dashboard y predicción en un solo panel.</p>
            </div>
          </div>
        </aside>

        <main className="flex flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 lg:hidden">F</div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">FastQuote</p>
                <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500">{subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">{topActions}</div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
};
