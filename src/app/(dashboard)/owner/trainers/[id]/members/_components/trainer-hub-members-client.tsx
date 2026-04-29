'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
}

interface TrainerOption {
  _id: string;
  name: string;
}

interface Props {
  members: MemberRow[];
  trainers: TrainerOption[];
  currentTrainerId: string;
}

export function TrainerHubMembersClient({ members, trainers, currentTrainerId }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#777]">No members assigned.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
        {members.map((member) => (
          <div
            key={member._id}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-[#0f0f0f] last:border-0"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#1a1a1a] bg-[#141414] text-[9px] font-semibold text-[#888]">
              {member.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-[#ccc]">{member.name}</div>
              <div className="text-[10px] text-[#555]">{member.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/trainer/members/${member._id}`}
                className="text-[11px] text-[#666] hover:text-[#aaa] transition-colors"
              >
                View →
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReassigning(member)}
                className="text-[#777] hover:text-[#aaa] hover:bg-[#141414] text-xs"
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
          currentTrainerId={currentTrainerId}
          trainers={trainers}
          onClose={() => setReassigning(null)}
        />
      )}
    </>
  );
}
