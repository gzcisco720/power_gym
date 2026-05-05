'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { initials } from '@/lib/utils';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface TrainerRow {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
  members: MemberRow[];
}

interface Props {
  trainers: TrainerRow[];
  allTrainers: TrainerRow[];
}


export function TrainerListClient({ trainers, allTrainers }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(trainerId: string) {
    const reassignToId = allTrainers.find((t) => t._id !== trainerId)?._id ?? '';
    const memberCount = trainers.find((t) => t._id === trainerId)?.memberCount ?? 0;
    const confirmed = confirm(
      `Remove this trainer? Their ${memberCount} members will be reassigned.`,
    );
    if (!confirmed) return;

    setRemoving(trainerId);
    try {
      const res = await fetch(`/api/owner/trainers/${trainerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignToId }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Failed to remove trainer');
        return;
      }
      toast.success('Trainer removed');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemoving(null);
    }
  }

  if (trainers.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#777]">No trainers yet. Invite one to get started.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {trainers.map((trainer) => (
        <Card
          key={trainer._id}
          className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden hover:border-[#222] transition-colors"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1e1e1e] bg-[#181818] text-[11px] font-semibold text-[#888]">
              {initials(trainer.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">{trainer.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5 truncate">{trainer.email}</div>
            </div>

            <div className="hidden sm:flex items-center gap-6 pr-2">
              <div className="text-center">
                <div className="text-[16px] font-bold text-white leading-none">{trainer.memberCount}</div>
                <div className="text-[9px] uppercase tracking-[1.5px] text-[#444] mt-1">members</div>
              </div>
              <div className="text-center">
                <div className="text-[16px] font-bold text-white leading-none">{trainer.sessionsThisMonth}</div>
                <div className="text-[9px] uppercase tracking-[1.5px] text-[#444] mt-1">sessions</div>
              </div>
            </div>

            <div className="hidden sm:block w-px h-8 bg-[#1e1e1e] shrink-0" />

            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/owner/trainers/${trainer._id}`}
                className="inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-[12px] font-medium text-[#aaa] hover:text-white hover:bg-[#161616] transition-colors"
              >
                View
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === trainer._id ? null : trainer._id)}
                className="h-8 cursor-pointer px-3 text-[12px] text-[#666] hover:text-[#aaa] hover:bg-[#161616]"
              >
                Members
                {expandedId === trainer._id ? (
                  <ChevronUp className="ml-1 h-3 w-3" />
                ) : (
                  <ChevronDown className="ml-1 h-3 w-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={removing === trainer._id}
                onClick={() => handleRemove(trainer._id)}
                className="h-8 cursor-pointer px-3 text-[12px] text-[#883333] hover:text-red-400 hover:bg-[#1a0808]"
              >
                {removing === trainer._id ? '…' : 'Remove'}
              </Button>
            </div>
          </div>

          {expandedId === trainer._id && (
            <div className="border-t border-[#141414]">
              {trainer.members.length === 0 ? (
                <div className="px-5 py-4 text-[12px] text-[#555]">No members assigned.</div>
              ) : (
                trainer.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-[#0f0f0f] last:border-0"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#141414] text-[9px] font-semibold text-[#777]">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-[#ccc]">{member.name}</div>
                      <div className="text-[10px] text-[#555]">{member.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
