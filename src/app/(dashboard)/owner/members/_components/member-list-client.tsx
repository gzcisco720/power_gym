'use client';

import { useState } from 'react';
import Link from 'next/link';
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

function initials(name: string) {
  return name.split(' ').map((n) => n[0] ?? '').join('').slice(0, 2).toUpperCase();
}

export function MemberListClient({ members, trainers }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#777]">No members yet.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {members.map((member) => (
          <div
            key={member._id}
            className="flex items-center gap-4 px-5 py-4 border-b border-[#0f0f0f] last:border-0 hover:bg-[#0e0e0e] transition-colors"
          >
            {/* Avatar */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#1e1e1e] bg-[#181818] text-[11px] font-semibold text-[#888]">
              {initials(member.name)}
            </div>

            {/* Name + email */}
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">{member.name}</div>
              <div className="text-[11px] text-[#666] mt-0.5 truncate">{member.email}</div>
            </div>

            {/* Trainer */}
            <div className="hidden sm:block min-w-[160px] shrink-0">
              <div className="text-[12px] text-[#888]">{member.trainerName ?? '—'}</div>
              <div className="text-[9px] uppercase tracking-[1.5px] text-[#444] mt-0.5">trainer</div>
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-8 bg-[#1e1e1e] shrink-0" />

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href={`/trainer/members/${member._id}`}
                className="inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-[12px] font-medium text-[#aaa] hover:text-white hover:bg-[#161616] transition-colors"
              >
                View
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReassigning(member)}
                className="h-8 cursor-pointer px-3 text-[12px] text-[#6688bb] hover:text-[#88aadd] hover:bg-[#0d1520]"
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
