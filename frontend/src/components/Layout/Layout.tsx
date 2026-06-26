import clsx from 'clsx';
import {
  LayoutDashboard, Server, Package, KeyRound,
  LogOut, UserCircle, Users2, Wifi, Shield,
  ChevronRight, Cpu
} from 'lucide-react';
import type { NavSection } from '../../types';
import { useAuth } from '../../context/AuthContext';

// ============================================================
// Layout: Cyberpunk Sidebar (desktop) + HUD Bottom Nav (mobile)
// ============================================================

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
  neon: string;
  glowColor: string;
  adminOnly?: boolean;
}[] = [
  {
    key: 'dashboard',
    label: 'Дашборд',
    shortLabel: 'HQ',
    icon: <LayoutDashboard className="w-4 h-4" />,
    neon: 'text-[#00f5ff]',
    glowColor: '#00f5ff',
  },
  {
    key: 'equipment',
    label: 'Оборудование',
    shortLabel: 'EQP',
    icon: <Server className="w-4 h-4" />,
    neon: 'text-[#00ff88]',
    glowColor: '#00ff88',
  },
  {
    key: 'consumables',
    label: 'Расходники',
    shortLabel: 'CNS',
    icon: <Package className="w-4 h-4" />,
    neon: 'text-[#ffaa00]',
    glowColor: '#ffaa00',
  },
  {
    key: 'tokens',
    label: 'Рутокены',
    shortLabel: 'TKN',
    icon: <KeyRound className="w-4 h-4" />,
    neon: 'text-[#b400ff]',
    glowColor: '#b400ff',
  },
  {
    key: 'users',
    label: 'Пользователи',
    shortLabel: 'USR',
    icon: <Users2 className="w-4 h-4" />,
    neon: 'text-[#ff2255]',
    glowColor: '#ff2255',
    adminOnly: true,
  },
];

function SidebarNavItem({
  item, active, onClick,
}: { item: typeof navItems[0]; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative w-full flex items-center gap-3 px-4 py-3 text-xs font-mono font-medium uppercase tracking-[0.1em]',
        'transition-all duration-200 group border-l-2',
        active
          ? 'border-current bg-white/5 text-current'
          : 'border-transparent text-[#555577] hover:text-[#8888aa] hover:bg-white/[0.02]'
      )}
      style={{
        color: active ? item.glowColor : undefined,
        borderColor: active ? item.glowColor : undefined,
        textShadow: active ? `0 0 8px ${item.glowColor}88` : undefined,
      }}
    >
      {/* Icon */}
      <span
        className="shrink-0 transition-all duration-200"
        style={active ? { filter: `drop-shadow(0 0 4px ${item.glowColor})` } : {}}
      >
        {item.icon}
      </span>

      {/* Label */}
      <span className="flex-1 text-left">{item.label}</span>

      {/* Active indicator */}
      {active && (
        <ChevronRight className="w-3 h-3 opacity-60" />
      )}

      {/* Hover scanline effect */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${item.glowColor}08, transparent)` }}
      />
    </button>
  );
}

export function Layout({ active, onNavigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const visibleNav = navItems.filter((item) => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--color-deep)' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col w-60 shrink-0 relative"
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Vertical neon line decoration */}
        <div
          className="absolute top-0 right-0 w-[1px] h-full pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, #00f5ff44, #b400ff44, transparent)',
          }}
        />

        {/* Logo / Brand */}
        <div
          className="px-5 py-6 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center gap-3">
            {/* HUD logo box */}
            <div
              className="w-10 h-10 flex items-center justify-center relative shrink-0"
              style={{
                border: '1px solid #00f5ff',
                background: 'rgba(0,245,255,0.08)',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                boxShadow: '0 0 12px #00f5ff33, inset 0 0 12px #00f5ff11',
              }}
            >
              <Cpu className="w-5 h-5" style={{ color: '#00f5ff', filter: 'drop-shadow(0 0 4px #00f5ff)' }} />
            </div>

            <div>
              <div
                className="font-display font-black text-base tracking-widest uppercase"
                style={{
                  fontFamily: 'Orbitron, monospace',
                  color: '#00f5ff',
                  textShadow: '0 0 12px #00f5ff88, 0 0 24px #00f5ff44',
                  letterSpacing: '0.2em',
                }}
              >
                ITAM
              </div>
              <div
                className="text-[9px] tracking-[0.2em] uppercase mt-0.5"
                style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
              >
                ASSET CONTROL
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div
              className="flex items-center gap-1.5 text-[9px] tracking-widest uppercase"
              style={{ color: '#00ff88', fontFamily: 'JetBrains Mono, monospace' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" style={{ boxShadow: '0 0 6px #00ff88' }} />
              <Wifi className="w-2.5 h-2.5" />
              <span>On-Premise</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <div
            className="px-4 py-2 text-[8px] tracking-[0.25em] uppercase mb-1"
            style={{ color: '#333355', fontFamily: 'JetBrains Mono, monospace' }}
          >
            // Navigation
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
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {/* User block */}
          <div
            className="p-3 mb-3"
            style={{
              background: 'rgba(0,245,255,0.03)',
              border: '1px solid var(--color-border)',
              clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 flex items-center justify-center shrink-0"
                style={{
                  border: '1px solid #555577',
                  background: 'rgba(85,85,119,0.15)',
                  clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                }}
              >
                <UserCircle className="w-4 h-4" style={{ color: '#8888aa' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[11px] font-semibold truncate"
                  style={{ color: '#e8eaff', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {user?.fullName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="w-2.5 h-2.5" style={{ color: '#00f5ff' }} />
                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{ color: '#00f5ff99', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 text-[10px] uppercase tracking-[0.1em] transition-all duration-200"
            style={{
              color: '#555577',
              border: '1px solid #1e1e3a',
              fontFamily: 'JetBrains Mono, monospace',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff2255';
              e.currentTarget.style.borderColor = '#ff225544';
              e.currentTarget.style.background = 'rgba(255,34,85,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#555577';
              e.currentTarget.style.borderColor = '#1e1e3a';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogOut className="w-3 h-3" />
            <span>Выход</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile topbar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 shrink-0"
          style={{
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{
                border: '1px solid #00f5ff',
                background: 'rgba(0,245,255,0.08)',
                clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
              }}
            >
              <Cpu className="w-4 h-4" style={{ color: '#00f5ff' }} />
            </div>
            <span
              className="font-black text-sm tracking-widest uppercase"
              style={{
                fontFamily: 'Orbitron, monospace',
                color: '#00f5ff',
                textShadow: '0 0 10px #00f5ff88',
              }}
            >
              ITAM
            </span>
          </div>

          {/* Active section name */}
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {navItems.find((n) => n.key === active)?.label}
          </span>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 transition-colors"
            style={{ color: '#555577' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ff2255'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#555577'; }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* ── Mobile HUD Bottom Navigation ─────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bottom-nav-safe"
        style={{
          background: 'rgba(10,10,15,0.97)',
          borderTop: '1px solid var(--color-border)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Top neon line */}
        <div
          className="h-[1px] w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #00f5ff44, #b400ff44, transparent)',
          }}
        />

        <div className="flex items-center justify-around px-1 py-2">
          {visibleNav.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className="flex flex-col items-center gap-1 px-2 py-2 min-h-[52px] min-w-[56px] transition-all duration-200 relative"
                style={{
                  color: isActive ? item.glowColor : '#555577',
                  textShadow: isActive ? `0 0 8px ${item.glowColor}88` : undefined,
                }}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span
                    className="absolute top-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full"
                    style={{
                      background: item.glowColor,
                      boxShadow: `0 0 8px ${item.glowColor}`,
                    }}
                  />
                )}
                <span
                  className="transition-all duration-200"
                  style={{
                    filter: isActive ? `drop-shadow(0 0 4px ${item.glowColor})` : undefined,
                  }}
                >
                  {item.icon}
                </span>
                <span
                  className="text-[9px] uppercase tracking-[0.08em]"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
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
