import { auth } from '@/lib/auth/auth';
import { MemberBillingDetail } from '@/components/billing/member-billing-detail';

export default async function MemberBillingPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div>
      <div className="px-4 sm:px-8 pt-7 pb-2">
        <h1 className="text-xl font-bold text-foreground">My Billing</h1>
        <p className="text-xs text-foreground/65 mt-0.5">Sessions completed and amounts due</p>
      </div>
      <MemberBillingDetail memberId={session.user.id} />
    </div>
  );
}
