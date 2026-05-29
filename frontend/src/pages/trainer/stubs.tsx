function Stub({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
  );
}

export function TrainerCalendarStub() { return <Stub title="Calendar" />; }
export function TrainerBillingStub() { return <Stub title="Billing" />; }
export function TrainerInvitesStub() { return <Stub title="Invites" />; }
export function TrainerSettingsStub() { return <Stub title="Settings" />; }
export function TrainerMyTrainingStub() { return <Stub title="My Training" />; }
export function TrainerMyNutritionStub() { return <Stub title="My Nutrition" />; }
export function TrainerMemberCheckInsStub() { return <Stub title="Member Check-ins" />; }
export function TrainerMemberBillingStub() { return <Stub title="Member Billing" />; }
export function TrainerMemberProgressStub() { return <Stub title="Member Progress" />; }
export function TrainerMemberPhotosStub() { return <Stub title="Member Photos" />; }
export function TrainerPlansDetailStub() { return <Stub title="Plan" />; }
