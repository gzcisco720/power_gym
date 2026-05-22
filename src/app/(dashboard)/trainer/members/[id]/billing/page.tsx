import { MemberBillingDetail } from '@/components/billing/member-billing-detail';

export default async function MemberHubBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: memberId } = await params;
  return <MemberBillingDetail memberId={memberId} />;
}
