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

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  glowClass?: string;
  iconBgClass?: string;
  iconTextClass?: string;
  onClick?: () => void;
  urgent?: boolean;
  index?: number;
}

function StatCard({ icon, label, value, sub, glowClass, iconBgClass, iconTextClass, onClick, urgent }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={clsx('card-stat text-left w-full p-5', glowClass, urgent && 'border-l-4 border-red-500')}
    >
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className={clsx("w-12 h-12 flex items-center justify-center rounded-xl", iconBgClass, iconTextClass)}>
          {icon}
        </div>
        {urgent && (
          <div className="flex items-center gap-1.5 shrink-0 bg-red-50 px-2 py-1 rounded-md text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Alert</span>
          </div>
        )}
      </div>

      <div className="text-3xl font-display font-bold text-slate-800 mb-1">
        {value}
      </div>

      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>

      {sub && (
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
          {sub}
        </div>
      )}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="card-stat p-5">
      <div className="skeleton w-12 h-12 rounded-xl mb-4" />
      <div className="skeleton h-8 w-20 rounded mb-2" />
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
      <div className="max-w-7xl mx-auto">
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
    { key: 'pc',      label: 'ПК',        colorClass: 'bg-blue-500' },
    { key: 'laptop',  label: 'Ноутбуки',  colorClass: 'bg-emerald-500' },
    { key: 'printer', label: 'Принтеры',  colorClass: 'bg-amber-500' },
    { key: 'server',  label: 'Серверы',   colorClass: 'bg-red-500' },
    { key: 'ups',     label: 'ИБП',       colorClass: 'bg-purple-500' },
    { key: 'monitor', label: 'Мониторы',  colorClass: 'bg-sky-500' },
  ];

  const tokenList = [
    { key: 'active',  label: 'Активных',   colorClass: 'bg-emerald-500', count: activeTokens },
    { key: 'in_safe', label: 'В сейфе',    colorClass: 'bg-sky-500', count: tokenStats?.byStatus?.in_safe ?? 0 },
    { key: 'expired', label: 'Истёкших',   colorClass: 'bg-slate-500', count: expiredTokens },
    { key: 'revoked', label: 'Отозванных', colorClass: 'bg-red-500', count: tokenStats?.byStatus?.revoked ?? 0 },
  ];

  const statusItems = [
    { key: 'in_use',         label: 'В эксплуатации', colorClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
    { key: 'storage',        label: 'На складе',       colorClass: 'bg-sky-50', textClass: 'text-sky-700' },
    { key: 'repair',         label: 'В ремонте',       colorClass: 'bg-amber-50', textClass: 'text-amber-700' },
    { key: 'decommissioned', label: 'Списано',         colorClass: 'bg-slate-100', textClass: 'text-slate-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">

      {/* ── Page header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Cpu className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-display font-bold text-slate-800">
            Обзор системы
          </h1>
        </div>
        <p className="text-sm text-slate-500 font-medium ml-12">
          Состояние инфраструктуры и оборудования
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-3 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Primary stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Server className="w-6 h-6" />}
          label="Оборудование"
          value={totalEquipment}
          sub="Всех типов"
          glowClass="border-l-4 border-blue-500"
          iconBgClass="bg-blue-50"
          iconTextClass="text-blue-600"
          onClick={() => onNavigate('equipment')}
        />
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="В ремонте"
          value={inRepair}
          sub="Требует внимания"
          glowClass={inRepair > 0 ? "border-l-4 border-red-500" : "border-l-4 border-slate-300"}
          iconBgClass={inRepair > 0 ? "bg-red-50" : "bg-slate-100"}
          iconTextClass={inRepair > 0 ? "text-red-600" : "text-slate-500"}
          urgent={inRepair > 0}
          onClick={() => onNavigate('equipment')}
        />
        <StatCard
          icon={<Package className="w-6 h-6" />}
          label="Расходники"
          value={consumablesLowStock ?? '—'}
          sub="Статус: На складе"
          glowClass="border-l-4 border-amber-500"
          iconBgClass="bg-amber-50"
          iconTextClass="text-amber-600"
          onClick={() => onNavigate('consumables')}
        />
        <StatCard
          icon={<KeyRound className="w-6 h-6" />}
          label="ЭЦП истекает"
          value={tokenStats?.expiringSoon ?? '—'}
          sub="В течение 30 дней"
          glowClass={tokenStats?.expiringSoon ? "border-l-4 border-purple-500" : "border-l-4 border-slate-300"}
          iconBgClass={tokenStats?.expiringSoon ? "bg-purple-50" : "bg-slate-100"}
          iconTextClass={tokenStats?.expiringSoon ? "text-purple-600" : "text-slate-500"}
          urgent={(tokenStats?.expiringSoon ?? 0) > 0}
          onClick={() => onNavigate('tokens')}
        />
      </div>

      {/* ── Secondary panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Equipment breakdown */}
        <div className="surface p-6 md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-display font-bold text-slate-700">Оборудование по типам</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {equipTypes.map(({ key, label, colorClass }) => {
              const count = equipStats?.byType?.[key] ?? 0;
              const pct = totalEquipment ? Math.round((count / totalEquipment) * 100) : 0;
              return (
                <div key={key} className="p-4 rounded-xl bg-slate-50 border border-slate-100 transition-colors hover:border-slate-300">
                  <p className="text-2xl font-display font-bold text-slate-800 mb-2">
                    {count}
                  </p>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full mb-3 overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-700", colorClass)}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {label} · {pct}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Token status panel */}
        <div className="surface p-6">
          <div className="flex items-center gap-2 mb-6">
            <KeyRound className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-display font-bold text-slate-700">Статус ЭЦП</h2>
          </div>

          <div className="space-y-4">
            {tokenList.map(({ key, label, colorClass, count }) => {
              const total = tokenList.reduce((a, b) => a + b.count, 0);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={clsx("w-2 h-2 rounded-full", colorClass)} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-800">
                      {count}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-700", colorClass)}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expiring alert */}
          {(tokenStats?.expiringSoon ?? 0) > 0 && (
            <div className="mt-6 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                {tokenStats!.expiringSoon} истекает в 30 дней
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Equipment status overview ── */}
      <div className="surface p-6 mb-6">
        <div className="flex items-center gap-2 mb-6">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-display font-bold text-slate-700">Статусы оборудования</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statusItems.map(({ key, label, colorClass, textClass }) => {
            const count = equipStats?.byStatus?.[key] ?? 0;
            return (
              <div key={key} className={clsx("p-4 rounded-xl text-center border border-slate-100", colorClass)}>
                <p className={clsx("text-3xl font-display font-bold mb-1", textClass)}>
                  {count}
                </p>
                <p className={clsx("text-xs font-bold uppercase tracking-wider", textClass, "opacity-80")}>
                  {label}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── System status footer ── */}
      <div className="px-5 py-4 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Система активна · On-Premise · Защищено
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Shield className="w-4 h-4 text-slate-400" />
          <Zap className="w-4 h-4 text-slate-400" />
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
}
