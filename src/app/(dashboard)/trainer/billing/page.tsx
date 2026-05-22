import { BillingSummaryClient } from '@/components/billing/billing-summary-client';

export default function TrainerBillingPage() {
  return <BillingSummaryClient role="trainer" memberHubBase="/trainer/members" />;
}
