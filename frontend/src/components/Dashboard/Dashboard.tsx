import { useEffect, useState } from 'react';
import {
  Server, Package, KeyRound, AlertTriangle,
  TrendingUp, Activity, Clock, CheckCircle2,
  Zap, BarChart3, Shield, Cpu
} from 'lucide-react';
import clsx from 'clsx';
import { equipmentApi } from '../../api/equipment';
import { consumablesApi } from '../../api/consumables';
import { tokensApi } from '../../api/tokens';
import type { NavSection } from '../../types';

// ============================================================
// Dashboard — Cyberpunk HUD-style overview
// ============================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  neonColor: string;
  glowClass?: string;
  onClick?: () => void;
  urgent?: boolean;
  index?: number;
}

function StatCard({ icon, label, value, sub, neonColor, glowClass, onClick, urgent, index = 0 }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx('card-stat text-left w-full group', glowClass, urgent && 'glow-urgent')}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top accent bar */}
      <div
        className="h-[2px] w-full mb-0"
        style={{
          background: `linear-gradient(90deg, ${neonColor}, transparent)`,
          opacity: 0.7,
        }}
      />

      <div className="p-5">
        {/* Icon + urgent indicator */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div
            className="w-10 h-10 flex items-center justify-center shrink-0"
            style={{
              border: `1px solid ${neonColor}44`,
              background: `${neonColor}0d`,
              clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              boxShadow: `0 0 12px ${neonColor}22`,
            }}
          >
            <span style={{ color: neonColor, filter: `drop-shadow(0 0 4px ${neonColor}88)` }}>
              {icon}
            </span>
          </div>

          {urgent && (
            <div className="flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-[#ff2255] animate-pulse" style={{ filter: 'drop-shadow(0 0 4px #ff2255)' }} />
              <span className="text-[9px] uppercase tracking-widest text-[#ff2255] font-mono">Alert</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div
          className="text-4xl font-black tabular-nums mb-1"
          style={{
            fontFamily: 'Orbitron, monospace',
            color: neonColor,
            textShadow: `0 0 20px ${neonColor}66, 0 0 40px ${neonColor}33`,
            letterSpacing: '-0.02em',
          }}
        >
          {value}
        </div>

        {/* Label */}
        <div
          className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1"
          style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
        >
          {label}
        </div>

        {sub && (
          <div className="text-[9px] uppercase tracking-widest" style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}>
            {sub}
          </div>
        )}
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="card-stat p-5">
      <div className="skeleton w-full h-[2px] -mt-5 mb-5" />
      <div className="skeleton w-10 h-10 mb-4" />
      <div className="skeleton h-10 w-20 rounded mb-2" />
      <div className="skeleton h-3 w-32 rounded" />
    </div>
  );
}

interface DashboardProps {
  onNavigate: (s: NavSection) => void;
}

interface EquipmentStats {
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

interface TokenStats {
  byStatus: Record<string, number>;
  expiringSoon: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [equipStats, setEquipStats] = useState<EquipmentStats | null>(null);
  const [consumablesLowStock, setConsumablesLowStock] = useState<number | null>(null);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [eqRes, consRes, tokRes] = await Promise.allSettled([
          equipmentApi.stats(),
          consumablesApi.list({ status: 'in_stock', limit: 1 }),
          tokensApi.stats(),
        ]);
        if (eqRes.status === 'fulfilled') setEquipStats(eqRes.value.data as EquipmentStats);
        if (consRes.status === 'fulfilled') setConsumablesLowStock(consRes.value.pagination?.total ?? consRes.value.data.length);
        if (tokRes.status === 'fulfilled') setTokenStats(tokRes.value.data as TokenStats);
      } catch (e) {
        setError('Не удалось загрузить данные. Проверьте подключение к серверу.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8 space-y-2">
          <div className="skeleton h-7 w-64 rounded" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const totalEquipment = Object.values(equipStats?.byType ?? {}).reduce((a, b) => a + b, 0);
  const inRepair = equipStats?.byStatus?.repair ?? 0;
  const activeTokens = tokenStats?.byStatus?.active ?? 0;
  const expiredTokens = tokenStats?.byStatus?.expired ?? 0;

  const equipTypes = [
    { key: 'pc',      label: 'ПК',        color: '#00f5ff' },
    { key: 'laptop',  label: 'Ноутбуки',  color: '#00ff88' },
    { key: 'printer', label: 'Принтеры',  color: '#ffaa00' },
    { key: 'server',  label: 'Серверы',   color: '#ff2255' },
    { key: 'ups',     label: 'ИБП',       color: '#b400ff' },
    { key: 'monitor', label: 'Мониторы',  color: '#0080ff' },
  ];

  const tokenList = [
    { key: 'active',  label: 'Активных',   color: '#00ff88', count: activeTokens },
    { key: 'in_safe', label: 'В сейфе',    color: '#00f5ff', count: tokenStats?.byStatus?.in_safe ?? 0 },
    { key: 'expired', label: 'Истёкших',   color: '#555577', count: expiredTokens },
    { key: 'revoked', label: 'Отозванных', color: '#ff2255', count: tokenStats?.byStatus?.revoked ?? 0 },
  ];

  const statusItems = [
    { key: 'in_use',         label: 'В эксплуатации', color: '#00ff88' },
    { key: 'storage',        label: 'На складе',       color: '#00f5ff' },
    { key: 'repair',         label: 'В ремонте',       color: '#ffaa00' },
    { key: 'decommissioned', label: 'Списано',         color: '#555577' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto" style={{ animation: 'var(--animate-fade-in)' }}>

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Cpu
            className="w-5 h-5"
            style={{ color: '#00f5ff', filter: 'drop-shadow(0 0 6px #00f5ff)' }}
          />
          <h1
            className="text-xl md:text-2xl font-black uppercase tracking-widest"
            style={{
              fontFamily: 'Orbitron, monospace',
              color: '#e8eaff',
            }}
          >
            ITAM <span style={{ color: '#00f5ff', textShadow: '0 0 12px #00f5ff88' }}>Control</span>
          </h1>
        </div>
        <p
          className="text-xs uppercase tracking-[0.15em]"
          style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
        >
          // Обзор состояния ИТ-инфраструктуры
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 p-4 flex items-center gap-3 text-sm"
          style={{
            background: 'rgba(255,34,85,0.08)',
            border: '1px solid rgba(255,34,85,0.4)',
            color: '#ff2255',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Primary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          index={0}
          icon={<Server className="w-5 h-5" />}
          label="Оборудование"
          value={totalEquipment}
          sub="Всех типов"
          neonColor="#00f5ff"
          glowClass="glow-cyan"
          onClick={() => onNavigate('equipment')}
        />
        <StatCard
          index={1}
          icon={<Activity className="w-5 h-5" />}
          label="В ремонте"
          value={inRepair}
          sub="Требует внимания"
          neonColor="#ff2255"
          glowClass={inRepair > 0 ? 'glow-red' : ''}
          urgent={inRepair > 0}
          onClick={() => onNavigate('equipment')}
        />
        <StatCard
          index={2}
          icon={<Package className="w-5 h-5" />}
          label="Расходники"
          value={consumablesLowStock ?? '—'}
          sub="Статус: На складе"
          neonColor="#ffaa00"
          glowClass="glow-amber"
          onClick={() => onNavigate('consumables')}
        />
        <StatCard
          index={3}
          icon={<KeyRound className="w-5 h-5" />}
          label="ЭЦП истекает"
          value={tokenStats?.expiringSoon ?? '—'}
          sub="В течение 30 дней"
          neonColor="#b400ff"
          glowClass={tokenStats?.expiringSoon ? 'glow-purple' : ''}
          urgent={(tokenStats?.expiringSoon ?? 0) > 0}
          onClick={() => onNavigate('tokens')}
        />
      </div>

      {/* ── Secondary panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-4">

        {/* Equipment breakdown */}
        <div className="card-cyber p-5 md:col-span-2">
          <div className="section-title mb-5">
            <BarChart3 className="w-3.5 h-3.5 shrink-0" />
            <span>Оборудование по типам</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {equipTypes.map(({ key, label, color }) => {
              const count = equipStats?.byType?.[key] ?? 0;
              const pct = totalEquipment ? Math.round((count / totalEquipment) * 100) : 0;
              return (
                <div
                  key={key}
                  className="p-3 relative group"
                  style={{
                    background: `${color}08`,
                    border: `1px solid ${color}22`,
                    clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
                    transition: 'all 0.2s ease-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${color}55`;
                    e.currentTarget.style.background = `${color}12`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${color}22`;
                    e.currentTarget.style.background = `${color}08`;
                  }}
                >
                  {/* Count */}
                  <p
                    className="text-2xl font-black tabular-nums mb-2"
                    style={{
                      fontFamily: 'Orbitron, monospace',
                      color,
                      textShadow: `0 0 10px ${color}66`,
                    }}
                  >
                    {count}
                  </p>

                  {/* Progress bar */}
                  <div
                    className="h-[1px] w-full mb-2"
                    style={{ background: `${color}22` }}
                  >
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        background: color,
                        boxShadow: `0 0 6px ${color}`,
                      }}
                    />
                  </div>

                  {/* Label */}
                  <p
                    className="text-[9px] uppercase tracking-widest"
                    style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {label} · {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token status panel */}
        <div className="card-cyber p-5">
          <div className="section-title mb-5">
            <KeyRound className="w-3.5 h-3.5 shrink-0" style={{ color: '#b400ff' }} />
            <span style={{ color: '#b400ff', textShadow: '0 0 8px #b400ff88' }}>Статус ЭЦП</span>
          </div>

          <div className="space-y-3">
            {tokenList.map(({ key, label, color, count }) => {
              const total = tokenList.reduce((a, b) => a + b.count, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
                      />
                      <span
                        className="text-[10px] uppercase tracking-widest"
                        style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {label}
                      </span>
                    </div>
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{
                        fontFamily: 'Orbitron, monospace',
                        color,
                        textShadow: `0 0 8px ${color}66`,
                      }}
                    >
                      {count}
                    </span>
                  </div>
                  {/* Mini bar */}
                  <div className="h-[1px]" style={{ background: '#1e1e3a' }}>
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: `${Math.max(pct, 2)}%`,
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expiring alert */}
          {(tokenStats?.expiringSoon ?? 0) > 0 && (
            <div
              className="mt-4 p-3 flex items-center gap-2"
              style={{
                background: 'rgba(255,170,0,0.08)',
                border: '1px solid rgba(255,170,0,0.3)',
                clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)',
              }}
            >
              <Clock
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: '#ffaa00', filter: 'drop-shadow(0 0 4px #ffaa00)' }}
              />
              <span
                className="text-[10px] uppercase tracking-wider"
                style={{ color: '#ffaa00', fontFamily: 'JetBrains Mono, monospace' }}
              >
                {tokenStats!.expiringSoon} истекает в 30 дней
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Equipment status overview ── */}
      <div className="card-cyber p-5">
        <div className="section-title mb-5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Статусы оборудования</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statusItems.map(({ key, label, color }) => {
            const count = equipStats?.byStatus?.[key] ?? 0;
            return (
              <div
                key={key}
                className="p-4 text-center"
                style={{
                  background: `${color}06`,
                  border: `1px solid ${color}22`,
                  clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
                  transition: 'all 0.2s ease-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${color}44`;
                  e.currentTarget.style.background = `${color}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${color}22`;
                  e.currentTarget.style.background = `${color}06`;
                }}
              >
                <p
                  className="text-3xl font-black tabular-nums mb-1"
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    color,
                    textShadow: `0 0 16px ${color}66`,
                  }}
                >
                  {count}
                </p>
                <p
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: '#8888aa', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── System status footer ── */}
      <div
        className="mt-4 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(0,245,255,0.03)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88', animation: 'var(--animate-pulse-slow)' }}
          />
          <span
            className="text-[9px] uppercase tracking-[0.2em]"
            style={{ color: '#555577', fontFamily: 'JetBrains Mono, monospace' }}
          >
            Система активна · On-Premise · Защищено
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3" style={{ color: '#00ff88' }} />
          <Zap className="w-3 h-3" style={{ color: '#ffaa00' }} />
          <TrendingUp className="w-3 h-3" style={{ color: '#00f5ff' }} />
        </div>
      </div>
    </div>
  );
}
