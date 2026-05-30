import { useState } from 'react';
import { toast } from 'sonner';
import { useMembersStore } from '@/stores/membersStore';

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
  const reassign = useMembersStore((s) => s.reassign);
  const initialTrainerId =
    trainers.find((t) => t._id !== currentTrainerId)?._id ?? trainers[0]?._id ?? '';
  const [selectedTrainerId, setSelectedTrainerId] = useState(initialTrainerId);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await reassign(memberId, selectedTrainerId);
      toast.success('Member reassigned');
      onClose();
    } catch {
      toast.error('Failed to reassign member');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-card ring-1 ring-foreground/10 rounded-xl p-6 w-full max-w-sm space-y-5">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-foreground/35 mb-1">
            Reassign Member
          </div>
          <div className="text-[15px] font-semibold text-foreground">{memberName}</div>
          <div className="text-[11px] text-foreground/65 mt-1.5">
            All training history, body tests, and nutrition logs will be preserved.
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="reassign-trainer"
            className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
          >
            Assign to Trainer
          </label>
          <select
            id="reassign-trainer"
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="w-full h-9 rounded-lg bg-input ring-1 ring-foreground/10 px-3 text-sm text-foreground focus:outline-none focus:ring-foreground/25 transition-all"
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
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving || !selectedTrainerId}
            className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Confirm Reassign'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium text-foreground/65 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
