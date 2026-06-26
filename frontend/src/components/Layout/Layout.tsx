import clsx from 'clsx';
import {
  LayoutDashboard, Server, Package, KeyRound,
  LogOut, UserCircle, Users2, Wifi, Shield,
  ChevronRight, Cpu
} from 'lucide-react';
import type { NavSection } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface LayoutProps {
  active: NavSection;
  onNavigate: (s: NavSection) => void;
  children: React.ReactNode;
}

const navItems: {
  key: NavSection;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}[] = [
  { key: 'dashboard',   label: 'Дашборд',      shortLabel: 'Дашборд',  icon: <LayoutDashboard className="w-5 h-5" /> },
  { key: 'equipment',   label: 'Оборудование', shortLabel: 'Оборуд.',  icon: <Server className="w-5 h-5" /> },
  { key: 'consumables', label: 'Расходники',   shortLabel: 'Расход.', icon: <Package className="w-5 h-5" /> },
  { key: 'tokens',      label: 'Рутокены',     shortLabel: 'Токены',   icon: <KeyRound className="w-5 h-5" /> },
  { key: 'users',       label: 'Пользователи', shortLabel: 'Польз.',   icon: <Users2 className="w-5 h-5" />, adminOnly: true },
];

function SidebarNavItem({
  item, active, onClick,
}: { item: typeof navItems[0]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-4 py-3 mx-2 rounded-xl text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-blue-500/10 text-blue-400'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      )}
      style={{ width: 'calc(100% - 16px)' }}
    >
      <span className={clsx("shrink-0", active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400")}>
        {item.icon}
      </span>
      <span className="flex-1 text-left">{item.label}</span>
      {active && <ChevronRight className="w-4 h-4 opacity-50" />}
    </button>
  );
}

export function Layout({ active, onNavigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const visibleNav = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-950">
      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-slate-900 border-r border-slate-800">
        
        {/* Logo / Brand */}
        <div className="px-6 py-6 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="font-display font-bold text-xl tracking-wide text-slate-100">
                ITAM
              </div>
              <div className="text-[10px] tracking-wider uppercase text-slate-500 font-semibold mt-0.5">
                Asset Control
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Wifi className="w-3 h-3" />
              <span>On-Premise</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto flex flex-col gap-1">
          <div className="px-6 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Меню
          </div>
          {visibleNav.map((item) => (
            <SidebarNavItem
              key={item.key}
              item={item}
              active={active === item.key}
              onClick={() => onNavigate(item.key)}
            />
          ))}
        </nav>

        {/* Footer — User info */}
        <div className="p-4 shrink-0 border-t border-slate-800">
          <div className="p-3 mb-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
              <UserCircle className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">
                {user?.fullName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-3 h-3 text-blue-400" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {user?.role}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Выход</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 shrink-0 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-wide text-slate-100">
              ITAM
            </span>
          </div>

          <span className="text-sm font-bold uppercase text-slate-400">
            {navItems.find((n) => n.key === active)?.label}
          </span>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 px-4 md:px-8 py-6">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Navigation ─────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800 bottom-nav-safe shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around px-2 py-2">
          {visibleNav.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors relative rounded-xl"
                style={{
                  color: isActive ? '#60A5FA' : '#64748B',
                  background: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                }}
              >
                <span className={isActive ? "text-blue-400" : "text-slate-500"}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-bold">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
