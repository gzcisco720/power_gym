import Link from 'next/link';
import { Card } from '@/components/ui/card';

interface TrainerRow {
  _id: string;
  name: string;
  email: string;
  memberCount: number;
  sessionsThisMonth: number;
}

interface Props {
  trainers: TrainerRow[];
}

export function TrainerBreakdownTable({ trainers }: Props) {
  if (trainers.length === 0) {
    return (
      <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl p-8 text-center">
        <p className="text-[13px] text-[#333]">No trainers yet. Invite one to get started.</p>
      </Card>
    );
  }

  return (
    <Card className="bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
      <div className="grid grid-cols-[1fr_100px_120px_80px] border-b border-[#141414] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a]">
        <div>Trainer</div>
        <div>Members</div>
        <div>Sessions / mo</div>
        <div></div>
      </div>
      {trainers.map((trainer) => (
        <div
          key={trainer._id}
          className="grid grid-cols-[1fr_100px_120px_80px] items-center border-b border-[#0f0f0f] px-5 py-3.5 last:border-0 hover:bg-[#0e0e0e] transition-colors"
        >
          <div>
            <div className="text-[13px] font-medium text-[#ccc]">{trainer.name}</div>
            <div className="text-[10px] text-[#2e2e2e] mt-0.5">{trainer.email}</div>
          </div>
          <div className="text-[13px] font-semibold text-[#888]">
            {trainer.memberCount}
            <span className="text-[10px] text-[#2e2e2e] ml-1">members</span>
          </div>
          <div className="text-[13px] font-semibold text-[#888]">
            {trainer.sessionsThisMonth}
          </div>
          <div>
            <Link
              href="/dashboard/owner/trainers"
              className="text-[10px] text-[#333] hover:text-[#666] transition-colors"
            >
              Manage →
            </Link>
          </div>
        </div>
      ))}
    </Card>
  );
}
