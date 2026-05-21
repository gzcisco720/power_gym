'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ReassignModal } from '@/app/(dashboard)/owner/members/_components/reassign-modal';

type MemberStatus = 'active' | 'needs-attn' | 'no-plan';

interface MemberRow {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  streak: number;
  sessionsThisMonth: number;
  status: MemberStatus;
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

const statusConfig: Record<MemberStatus, { label: string; className: string }> = {
  active:       { label: 'Active',      className: 'bg-emerald-500/15 text-emerald-400' },
  'needs-attn': { label: 'Needs Attn',  className: 'bg-amber-400/15 text-amber-400' },
  'no-plan':    { label: 'No Plan',     className: 'bg-destructive/15 text-destructive' },
};

export function TrainerHubMembersClient({ members, trainers, currentTrainerId }: Props) {
  const [reassigning, setReassigning] = useState<MemberRow | null>(null);

  if (members.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
        <p className="text-sm text-foreground/40">No members assigned.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1.5">
        {members.map((member) => {
          const { label, className } = statusConfig[member.status];
          const initials = member.name.slice(0, 2).toUpperCase();
          return (
            <div
              key={member._id}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary-light">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85">{member.name}</div>
                <div className="text-[11px] text-foreground/65 mt-0.5">
                  {member.streak}d streak · {member.sessionsThisMonth} sessions this month
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${className}`}>
                {label}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/owner/members/${member._id}`}
                  className="text-[11px] text-foreground/35 hover:text-foreground/70 transition-colors"
                >
                  View →
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReassigning(member)}
                  className="text-foreground/35 hover:text-foreground/70 hover:bg-white/[.06] text-xs h-7 px-2"
                >
                  Reassign
                </Button>
              </div>
            </div>
          );
        })}
      </div>

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
