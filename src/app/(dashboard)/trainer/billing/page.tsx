import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function TrainerBillingPage() {
  return <BillingSummaryClient userRole="trainer" memberHubBase="/trainer/members" />;
}
