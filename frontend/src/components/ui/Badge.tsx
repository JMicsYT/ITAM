import clsx from 'clsx';

// ============================================================
// Status badges — Cyberpunk neon pills for statuses
// ============================================================

type Variant = 'green' | 'blue' | 'amber' | 'red' | 'slate' | 'cyan' | 'purple';

// Cyberpunk neon badge colors
const variantStyles: Record<Variant, { color: string; bg: string; border: string }> = {
  green:  { color: '#00ff88', bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.3)' },
  blue:   { color: '#0080ff', bg: 'rgba(0,128,255,0.08)',  border: 'rgba(0,128,255,0.3)' },
  amber:  { color: '#ffaa00', bg: 'rgba(255,170,0,0.08)',  border: 'rgba(255,170,0,0.3)' },
  red:    { color: '#ff2255', bg: 'rgba(255,34,85,0.08)',  border: 'rgba(255,34,85,0.3)' },
  slate:  { color: '#555577', bg: 'rgba(85,85,119,0.08)',  border: 'rgba(85,85,119,0.3)' },
  cyan:   { color: '#00f5ff', bg: 'rgba(0,245,255,0.08)',  border: 'rgba(0,245,255,0.3)' },
  purple: { color: '#b400ff', bg: 'rgba(180,0,255,0.08)',  border: 'rgba(180,0,255,0.3)' },
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
  const styles = variantStyles[variant];
  return (
    <span
      className={clsx('badge', className)}
      style={{
        color: styles.color,
        background: styles.bg,
        borderColor: styles.border,
        textShadow: `0 0 6px ${styles.color}88`,
        fontFamily: 'JetBrains Mono, monospace',
      }}
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
