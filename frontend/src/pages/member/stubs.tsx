import { LazyMotion, domAnimation } from 'framer-motion';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export function MemberHealthPage() {
  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Health" subtitle="Injury records and health dashboard" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="Health records coming soon"
          description="Your injury records and health dashboard will appear here."
        />
      </div>
    </LazyMotion>
  );
}

export function MemberSchedulePage() {
  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Schedule" subtitle="Your training schedule" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="Schedule coming soon"
          description="Your upcoming training sessions and appointments will appear here."
        />
      </div>
    </LazyMotion>
  );
}

export function MemberBillingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Billing" subtitle="Membership and payment history" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="Billing coming soon"
          description="Your membership details and payment history will appear here."
        />
      </div>
    </LazyMotion>
  );
}

export function MemberCalendarPage() {
  return (
    <LazyMotion features={domAnimation}>
      <PageHeader title="Training Calendar" subtitle="Your session history and upcoming workouts" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="Calendar coming soon"
          description="Your training calendar will appear here."
        />
      </div>
    </LazyMotion>
  );
}
