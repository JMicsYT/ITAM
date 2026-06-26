import clsx from 'clsx';

// ============================================================
// Status badges — Soft UI pills for statuses
// ============================================================

type Variant = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'cyan' | 'purple';

// Soft UI badge colors
const variantStyles: Record<Variant, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:   'bg-blue-50 text-blue-700 border-blue-200',
  amber:  'bg-amber-50 text-amber-700 border-amber-200',
  red:    'bg-red-50 text-red-700 border-red-200',
  slate:  'bg-slate-100 text-slate-700 border-slate-200',
  cyan:   'bg-sky-50 text-sky-700 border-sky-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
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
