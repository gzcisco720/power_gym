function Stub({ title }: { title: string }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
    </div>
  );
}

export function MemberHealthStub() { return <Stub title="Health" />; }
export function MemberScheduleStub() { return <Stub title="Schedule" />; }
export function MemberBillingStub() { return <Stub title="Billing" />; }
export function MemberCalendarStub() { return <Stub title="Training Calendar" />; }
export function MemberCheckInDetailStub() { return <Stub title="Check-In" />; }
