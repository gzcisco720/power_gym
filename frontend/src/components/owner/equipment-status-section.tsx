import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useOwnerDashboardStore } from '@/stores/ownerDashboardStore';
import type { EquipmentStatus } from '@/api/owner-dashboard';

const STATUS_CONFIG: Record<EquipmentStatus, { label: string; pillClass: string }> = {
  active: {
    label: 'Active',
    pillClass: 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25',
  },
  maintenance: {
    label: 'Maintenance',
    pillClass: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25',
  },
  retired: {
    label: 'Retired',
    pillClass: 'bg-red-500/15 text-red-400 ring-1 ring-red-500/25',
  },
};

export function EquipmentStatusSection() {
  const equipmentStatus = useOwnerDashboardStore((s) => s.equipmentStatus);

  if (!equipmentStatus) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 flex flex-col min-h-[180px]">
        <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
          Equipment Status
        </div>
      </div>
    );
  }

  const { active, maintenance, retired, overdue, items } = equipmentStatus;

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4 flex flex-col min-h-[180px]">
      <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
        Equipment Status
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {(['active', 'maintenance', 'retired'] as EquipmentStatus[]).map((s) => (
          <div
            key={s}
            className={cn(
              'rounded-lg p-2 text-center',
              s === 'active'
                ? 'bg-emerald-500/10'
                : s === 'maintenance'
                  ? 'bg-amber-500/10'
                  : 'bg-red-500/10',
            )}
          >
            <div className="text-[16px] font-bold">
              {s === 'active' ? active : s === 'maintenance' ? maintenance : retired}
            </div>
            <div className="text-[8px] uppercase tracking-[1px] mt-0.5 opacity-60">
              {STATUS_CONFIG[s].label}
            </div>
          </div>
        ))}
        <div className="rounded-lg p-2 text-center bg-amber-500/10">
          <div className="text-[16px] font-bold text-amber-400">{overdue}</div>
          <div className="text-[8px] uppercase tracking-[1px] mt-0.5 opacity-60">Overdue</div>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-foreground/40">All equipment active ✓</p>
        </div>
      ) : (
        <div className="space-y-0 flex-1">
          {items.map((item) => (
            <div
              key={item._id}
              className="flex items-center gap-2 py-2 border-b border-white/[.04] last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-foreground truncate">{item.name}</div>
                {item.note && (
                  <div className="text-[9px] text-foreground/35 mt-0.5 truncate">{item.note}</div>
                )}
              </div>
              <span
                className={cn(
                  'text-[9px] font-bold rounded px-2 py-0.5 flex-shrink-0',
                  STATUS_CONFIG[item.status].pillClass,
                )}
              >
                {STATUS_CONFIG[item.status].label}
              </span>
            </div>
          ))}
        </div>
      )}
      <Link
        to="/owner/equipment"
        className="block mt-3 text-[10px] text-foreground/35 hover:text-foreground/60 transition-colors text-center"
      >
        View all equipment →
      </Link>
    </div>
  );
}
