import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import { StatCardsSkeleton } from '@/components/shared/stat-cards-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { variants } from '@/lib/animations/variants';
import { initials } from '@/lib/utils';

export function OwnerTrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { trainers, members, fetchTrainers, fetchOwnerMembers, isLoading } = useUsersStore();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    void fetchTrainers();
    void fetchOwnerMembers();
  }, [fetchTrainers, fetchOwnerMembers]);

  const trainer = trainers.find((t) => t._id === id);
  const trainerMembers = members.filter((m) => m.trainerId === id);

  const animProps = shouldReduceMotion
    ? {}
    : { variants: variants.staggerItem, initial: 'hidden', animate: 'visible' };

  if (isLoading && !trainer) {
    return (
      <div>
        <PageHeader title="Trainer Hub" />
        <div className="px-4 sm:px-8 py-6">
          <StatCardsSkeleton count={4} />
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div>
        <PageHeader title="Trainer Hub" />
        <div className="px-4 sm:px-8 py-6">
          <Link
            to="/owner/trainers"
            className="text-sm text-foreground/65 hover:text-foreground"
          >
            ← Back to trainers
          </Link>
          <p className="mt-4 text-sm text-foreground/65">Trainer not found.</p>
        </div>
      </div>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div>
        <PageHeader
          title={trainer.name}
          subtitle={trainer.email}
          actions={
            <Link
              to="/owner/trainers"
              className="text-sm text-foreground/65 hover:text-foreground transition-colors"
            >
              ← Back
            </Link>
          }
        />
        <div className="px-4 sm:px-8 py-6 space-y-4">
          {/* Section label */}
          <div className="text-[11px] uppercase tracking-wider text-foreground/65 font-semibold">
            Members ({trainerMembers.length})
          </div>

          {trainerMembers.length === 0 ? (
            <EmptyState
              heading="No members assigned"
              description="This trainer has no members yet. Assign members from the Members page."
            />
          ) : (
            <m.div
              className="space-y-1.5"
              variants={variants.staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {trainerMembers.map((member) => (
                <m.div
                  key={member._id}
                  className="flex items-center gap-3 px-3 py-2 bg-card ring-1 ring-foreground/10 rounded-xl hover:ring-foreground/25 transition-all"
                  {...animProps}
                >
                  {/* Avatar */}
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                    {initials(member.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground/85 truncate">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-foreground/35 mt-0.5 truncate">
                      {member.email}
                    </div>
                  </div>
                </m.div>
              ))}
            </m.div>
          )}
        </div>
      </div>
    </LazyMotion>
  );
}
