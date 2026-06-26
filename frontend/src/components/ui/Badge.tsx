import clsx from 'clsx';

// ============================================================
// Status badges — Dark Soft UI pills for statuses
// ============================================================

type Variant = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'cyan' | 'purple';

// Dark Soft UI badge colors
const variantStyles: Record<Variant, string> = {
  green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  amber:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
  slate:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cyan:   'bg-sky-500/10 text-sky-400 border-sky-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

// Equipment status mapping
const equipmentStatusMap: Record<string, { label: string; variant: Variant }> = {
  in_use:          { label: 'В работе',  variant: 'green' },
  storage:         { label: 'На складе', variant: 'cyan'  },
  repair:          { label: 'В ремонте', variant: 'amber' },
  decommissioned:  { label: 'Списано',   variant: 'slate' },
};

// Token status mapping
const tokenStatusMap: Record<string, { label: string; variant: Variant }> = {
  active:   { label: 'Активен', variant: 'green'  },
  revoked:  { label: 'Отозван', variant: 'red'    },
  expired:  { label: 'Истёк',   variant: 'slate'  },
  in_safe:  { label: 'В сейфе', variant: 'cyan'   },
};

// Equipment type mapping
const equipmentTypeMap: Record<string, { label: string; variant: Variant }> = {
  ups:     { label: 'ИБП',         variant: 'purple' },
  printer: { label: 'Принтер/МФУ', variant: 'cyan'   },
  pc:      { label: 'ПК',          variant: 'blue'   },
  laptop:  { label: 'Ноутбук',     variant: 'green'  },
  server:  { label: 'Сервер',      variant: 'red'    },
  monitor: { label: 'Монитор',     variant: 'slate'  },
};

const consumableTypeMap: Record<string, { label: string; variant: Variant }> = {
  cartridge: { label: 'Картридж',     variant: 'cyan'   },
  drum_unit:  { label: 'Фотобарабан', variant: 'purple' },
};

interface BadgeProps {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'slate', children, className }: BadgeProps) {
  return (
    <span
      className={clsx('badge border', variantStyles[variant], className)}
    >
      {children}
    </span>
  );
}

// Convenience helpers
export function EquipmentStatusBadge({ status }: { status: string }) {
  const { label, variant } = equipmentStatusMap[status] ?? { label: status, variant: 'slate' as Variant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function EquipmentTypeBadge({ type }: { type: string }) {
  const { label, variant } = equipmentTypeMap[type] ?? { label: type, variant: 'slate' as Variant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function TokenStatusBadge({ status }: { status: string }) {
  const { label, variant } = tokenStatusMap[status] ?? { label: status, variant: 'slate' as Variant };
  return <Badge variant={variant}>{label}</Badge>;
}

export function ConsumableTypeBadge({ type }: { type: string }) {
  const { label, variant } = consumableTypeMap[type] ?? { label: type, variant: 'slate' as Variant };
  return <Badge variant={variant}>{label}</Badge>;
}

export { equipmentTypeMap, equipmentStatusMap, tokenStatusMap };
