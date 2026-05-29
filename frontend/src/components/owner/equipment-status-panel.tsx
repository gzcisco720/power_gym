import type { Equipment } from '@/api/equipment';

interface Props {
  equipment: Equipment[];
}

const STATUS_COLOURS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  maintenance: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  retired: 'bg-foreground/5 text-foreground/40 border-foreground/10',
};

const COUNT_STATUSES = ['active', 'maintenance', 'retired'] as const;
type CountStatus = (typeof COUNT_STATUSES)[number];

const COUNT_LABELS: Record<CountStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  retired: 'Retired',
};

const COUNT_BADGE_COLOURS: Record<CountStatus, string> = {
  active: 'bg-emerald-500/10 text-emerald-300',
  maintenance: 'bg-amber-500/10 text-amber-300',
  retired: 'bg-foreground/5 text-foreground/40',
};

export function EquipmentStatusPanel({ equipment }: Props) {
  if (equipment.length === 0) {
    return <div className="text-sm text-foreground/40 italic">No equipment tracked</div>;
  }

  const counts = COUNT_STATUSES.reduce<Record<CountStatus, number>>(
    (acc, s) => {
      acc[s] = equipment.filter((e) => e.status === s).length;
      return acc;
    },
    { active: 0, maintenance: 0, retired: 0 },
  );

  return (
    <div className="space-y-3">
      {/* Status count badges */}
      <div className="flex flex-wrap gap-2">
        {COUNT_STATUSES.map((status) => (
          <div
            key={status}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${COUNT_BADGE_COLOURS[status]}`}
          >
            <span data-testid={`count-${status}`}>{counts[status]}</span>
            <span>{COUNT_LABELS[status]}</span>
          </div>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-1.5">
        {equipment.slice(0, 5).map((item) => {
          const colourClass = STATUS_COLOURS[item.status] ?? STATUS_COLOURS.active;
          return (
            <div
              key={item._id}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted"
            >
              <span className="text-sm text-foreground/80 truncate">{item.name}</span>
              <span
                data-testid="item-status-badge"
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${colourClass}`}
              >
                {item.status}
              </span>
            </div>
          );
        })}
        {equipment.length > 5 && (
          <div className="text-[11px] text-foreground/40 mt-1">
            +{equipment.length - 5} more items
          </div>
        )}
      </div>
    </div>
  );
}
