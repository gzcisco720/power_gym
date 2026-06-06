import { create } from 'zustand';
import { getMySummary, getBillingSummary, getMemberBilling } from '../lib/api/billing.api';
import { BillingPeriod, MyBillingResponse, BillingSummaryResponse } from '../types/billing';

function buildPeriod(year: number, month: number): BillingPeriod {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
  const label = from.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  return { from, to, label };
}

function currentMonthPeriod(): BillingPeriod {
  const now = new Date();
  return buildPeriod(now.getFullYear(), now.getMonth());
}

interface BillingState {
  period: BillingPeriod;
  myData: MyBillingResponse | null;
  myLoading: boolean;
  myError: string | null;
  summaryData: BillingSummaryResponse | null;
  summaryLoading: boolean;
  summaryError: string | null;
  memberData: MyBillingResponse | null;
  memberLoading: boolean;
  memberError: string | null;

  setPeriod(direction: 'prev' | 'next'): void;
  fetchMy(from: string, to: string): Promise<void>;
  fetchSummary(from: string, to: string): Promise<void>;
  fetchMember(memberId: string, from: string, to: string): Promise<void>;
}

export const useBillingStore = create<BillingState>((set, get) => ({
  period: currentMonthPeriod(),
  myData: null,
  myLoading: false,
  myError: null,
  summaryData: null,
  summaryLoading: false,
  summaryError: null,
  memberData: null,
  memberLoading: false,
  memberError: null,

  setPeriod(direction: 'prev' | 'next'): void {
    const { period } = get();
    const year = period.from.getFullYear();
    const month = period.from.getMonth();
    const nextMonth = direction === 'prev' ? month - 1 : month + 1;
    const newPeriod = buildPeriod(year, nextMonth);
    set({ period: newPeriod });
  },

  async fetchMy(from: string, to: string): Promise<void> {
    set({ myLoading: true, myError: null });
    try {
      const myData = await getMySummary(from, to);
      set({ myData, myLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ myLoading: false, myError: message });
    }
  },

  async fetchSummary(from: string, to: string): Promise<void> {
    set({ summaryLoading: true, summaryError: null });
    try {
      const summaryData = await getBillingSummary(from, to);
      set({ summaryData, summaryLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ summaryLoading: false, summaryError: message });
    }
  },

  async fetchMember(memberId: string, from: string, to: string): Promise<void> {
    set({ memberLoading: true, memberError: null });
    try {
      const memberData = await getMemberBilling(memberId, from, to);
      set({ memberData, memberLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ memberLoading: false, memberError: message });
    }
  },
}));
