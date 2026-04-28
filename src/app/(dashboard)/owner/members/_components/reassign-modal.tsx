'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  memberId: string;
  memberName: string;
  currentTrainerId: string | null;
  trainers: TrainerOption[];
  onClose: () => void;
}

export function ReassignModal({ memberId, memberName, currentTrainerId, trainers, onClose }: Props) {
  const router = useRouter();
  const initialTrainerId =
    trainers.find((t) => t._id !== currentTrainerId)?._id ?? trainers[0]?._id ?? '';
  const [selectedTrainerId, setSelectedTrainerId] = useState(initialTrainerId);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      const res = await fetch(`/api/owner/members/${memberId}/trainer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trainerId: selectedTrainerId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to reassign member');
        return;
      }
      toast.success('Member reassigned');
      onClose();
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <Card className="bg-[#0c0c0c] border-[#1e1e1e] rounded-xl p-6 w-full max-w-sm space-y-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-1">
            Reassign Member
          </div>
          <div className="text-[15px] font-semibold text-white">{memberName}</div>
          <div className="text-[11px] text-[#666] mt-1.5">
            All training history, body tests, and nutrition logs will be preserved.
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-semibold uppercase tracking-[1.5px] text-[#555]">
            Assign to Trainer
          </label>
          <select
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white"
          >
            {trainers
              .filter((t) => t._id !== currentTrainerId)
              .map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleConfirm}
            disabled={saving || !selectedTrainerId}
            className="bg-white text-black hover:bg-white/90 font-semibold text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Confirm Reassign'}
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="border border-[#1a1a1a] text-[#888] hover:border-[#333] hover:text-[#aaa] text-sm"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
}
