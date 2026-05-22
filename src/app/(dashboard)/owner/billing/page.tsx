import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function OwnerBillingPage() {
  return <BillingSummaryClient role="owner" memberHubBase="/owner/members" />;
}
