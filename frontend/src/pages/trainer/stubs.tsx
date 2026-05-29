import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export function TrainerCalendarStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Calendar" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="Calendar coming soon" description="Session scheduling will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerBillingStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Billing" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="Billing coming soon" description="Billing management will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerInvitesStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Invites" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="Invites coming soon" description="Member invite management will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerSettingsStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Settings" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="Settings coming soon" description="Trainer settings will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerMyTrainingStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="My Training" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="My Training coming soon" description="Personal training tracking will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerMyNutritionStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="My Nutrition" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="My Nutrition coming soon" description="Personal nutrition tracking will be available in a future release." />
      </div>
    </div>
  );
}

export function TrainerMemberCheckInsStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Check-ins" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="No check-ins yet" description="Member check-ins will appear here once they start submitting daily check-ins." />
      </div>
    </div>
  );
}

export function TrainerMemberBillingStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Billing" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="No billing records" description="Billing information for this member will appear here." />
      </div>
    </div>
  );
}

export function TrainerMemberProgressStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Progress" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="No progress data" description="Progress charts and analytics for this member will appear here." />
      </div>
    </div>
  );
}

export function TrainerMemberPhotosStub() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Photos" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState heading="No photos yet" description="Progress photos for this member will appear here." />
      </div>
    </div>
  );
}
