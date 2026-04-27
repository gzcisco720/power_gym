'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReassignModal } from './reassign-modal';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
  createdAt: string;
}

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  members: MemberRow[];
  trainers: TrainerOption[];
}

export function MemberListClient({ members, trainers }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#333]">No members yet.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {/* Column header — desktop only */}
        <div className="hidden sm:grid grid-cols-[1fr_180px_80px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a]">
          <div>Member</div>
          <div>Trainer</div>
          <div></div>
        </div>

        {members.map((member) => (
          <div
            key={member._id}
            className="flex items-start justify-between gap-3 border-b border-[#0f0f0f] px-5 py-3.5 last:border-0 hover:bg-[#0e0e0e] transition-colors sm:grid sm:grid-cols-[1fr_180px_80px] sm:items-center"
          >
            <div>
              <div className="text-[13px] font-medium text-[#bbb]">{member.name}</div>
              <div className="text-[10px] text-[#2e2e2e] mt-0.5">{member.email}</div>
              {/* Trainer name visible inline on mobile */}
              <div className="text-[10px] text-[#3a3a3a] mt-1 sm:hidden">
                {member.trainerName ?? '—'}
              </div>
            </div>
            {/* Trainer name column — desktop only */}
            <div className="hidden sm:block text-[11px] text-[#3a3a3a]">
              {member.trainerName ?? '—'}
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReassigning(member)}
                className="text-[#333] hover:text-[#888] hover:bg-[#141414] text-xs"
              >
                Reassign
              </Button>
            </div>
          </div>
        ))}
      </Card>

      {reassigning && (
        <ReassignModal
          memberId={reassigning._id}
          memberName={reassigning.name}
          currentTrainerId={reassigning.trainerId}
          trainers={trainers}
          onClose={() => setReassigning(null)}
        />
      )}
    </>
  );
}
