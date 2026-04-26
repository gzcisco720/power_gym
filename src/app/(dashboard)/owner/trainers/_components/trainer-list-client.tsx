'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
        <p className="text-[13px] text-[#333]">No trainers yet. Invite one to get started.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {trainers.map((trainer) => (
        <div key={trainer._id}>
          <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden hover:border-[#2a2a2a] transition-colors">
            <div className="flex items-center px-5 py-4 gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1e1e1e] bg-[#181818] text-[10px] font-semibold text-[#555]">
                {trainer.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[#ccc]">{trainer.name}</div>
                <div className="text-[10px] text-[#2e2e2e] mt-0.5">{trainer.email}</div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="text-[13px] font-semibold text-[#888]">
                  {`${trainer.memberCount} members`}
                </div>
              </div>
              <div className="text-center min-w-[80px]">
                <div className="text-[13px] font-semibold text-[#888]">
                  {`${trainer.sessionsThisMonth} sessions`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === trainer._id ? null : trainer._id)}
                  className="text-[#333] hover:text-[#888] hover:bg-[#141414] text-xs"
                >
                  Members
                  {expandedId === trainer._id ? (
                    <ChevronUp className="h-3 w-3 ml-1" />
                  ) : (
                    <ChevronDown className="h-3 w-3 ml-1" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={removing === trainer._id}
                  onClick={() => handleRemove(trainer._id)}
                  className="text-[#2a1111] hover:text-red-400 hover:bg-[#141414] text-xs"
                >
                  {removing === trainer._id ? '...' : 'Remove'}
                </Button>
              </div>
            </div>

            {expandedId === trainer._id && (
              <div className="border-t border-[#141414]">
                {trainer.members.length === 0 ? (
                  <div className="px-5 py-4 text-[11px] text-[#2a2a2a]">No members assigned.</div>
                ) : (
                  trainer.members.map((member) => (
                    <div
                      key={member._id}
                      className="flex items-center gap-3 px-5 py-3 border-b border-[#0f0f0f] last:border-0"
                    >
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#141414] text-[9px] font-semibold text-[#444]">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-[12px] font-medium text-[#888]">{member.name}</div>
                        <div className="text-[10px] text-[#2a2a2a]">{member.email}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
}
