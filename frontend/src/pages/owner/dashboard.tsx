import { useEffect } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useUsersStore } from '@/stores/usersStore';
import { useEquipmentStore } from '@/stores/equipmentStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { variants } from '@/lib/animations/variants';
import { EquipmentStatusPanel } from '@/components/owner/equipment-status-panel';

export function OwnerDashboardPage() {
  const { ownerStats, fetchOwnerStats, isLoading } = useUsersStore();
  const { equipment, fetchEquipment } = useEquipmentStore();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    void fetchOwnerStats();
    void fetchEquipment();
  }, [fetchOwnerStats, fetchEquipment]);

  const animProps = shouldReduceMotion
    ? {}
    : { variants: variants.fadeSlideUp, initial: 'hidden', animate: 'visible' };

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader title="Dashboard" subtitle="Gym overview" />
        <div className="px-4 sm:px-8 py-6 space-y-6">
          {/* Stat cards */}
          {isLoading ? (
            <StatCardsSkeleton count={6} className="sm:grid-cols-3" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                label="Total Members"
                value={String(ownerStats?.memberCount ?? 0)}
                accentColor="primary"
              />
              <StatCard
                label="Total Trainers"
                value={String(ownerStats?.trainerCount ?? 0)}
                accentColor="primary"
              />
              <StatCard
                label="Pending Invites"
                value={String(ownerStats?.pendingInviteCount ?? 0)}
              />
              <StatCard
                label="New This Month"
                value={String(ownerStats?.membersByMonth?.[0]?.newCount ?? 0)}
                accentColor="success"
              />
              {/* NOTE: metric not available in v2 store */}
              <StatCard label="Sessions / Month" value="—" accentColor="success" />
              {/* NOTE: active members metric not available in v2 store */}
              <StatCard label="Equipment Items" value={String(equipment.length)} />
            </div>
          )}

          {/* Member Growth section */}
          <m.div
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
            {...animProps}
          >
            <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
              Member Growth: Last 6 Months
            </div>
            {ownerStats?.membersByMonth && ownerStats.membersByMonth.length > 0 ? (
              <div className="flex items-end gap-2 h-20">
                {ownerStats.membersByMonth.map((entry) => (
                  <div key={entry.label} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-t bg-primary/40 min-h-[4px]"
                      style={{ height: `${Math.max(4, (entry.newCount / Math.max(...ownerStats.membersByMonth.map((e) => e.newCount), 1)) * 64)}px` }}
                    />
                    <span className="text-[10px] text-foreground/40">{entry.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center text-foreground/40 text-sm">
                Chart coming soon
              </div>
            )}
          </m.div>

          {/* Trainer performance + Equipment status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <m.div
              className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
              {...animProps}
            >
              <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
                Trainer Performance
              </div>
              {/* NOTE: sessionsThisMonth per trainer not available in v2 store */}
              <div className="text-sm text-foreground/40 italic">
                Detailed trainer stats coming soon
              </div>
            </m.div>

            <m.div
              className="rounded-xl bg-card ring-1 ring-foreground/10 p-4"
              {...animProps}
            >
              <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold mb-3">
                Equipment Status
              </div>
              <EquipmentStatusPanel equipment={equipment} />
            </m.div>
          </div>
        </div>
      </div>
    </LazyMotion>
  );
}
