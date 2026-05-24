import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function OwnerBillingPage() {
  return <BillingSummaryClient userRole="owner" memberHubBase="/owner/members" />;
}
