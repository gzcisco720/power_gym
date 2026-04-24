'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { SectionHeader } from '@/components/shared/section-header';

interface PB {
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
  achievedAt: string;
}

export function PBBoard({ pbs }: { pbs: PB[] }) {
  const shouldReduce = useReducedMotion();

  if (pbs.length === 0) {
    return (
      <div>
        <PageHeader title="Personal Bests" />
        <div className="px-8 py-28">
          <EmptyState
            heading="No personal bests yet"
            description="Complete your first session to start tracking your records."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Personal Bests" subtitle={`${pbs.length} exercises tracked`} />
      <div className="px-8 py-7">
        <SectionHeader title="All Records" />
        <Card className="mt-3.5 bg-[#0c0c0c] border-[#141414] rounded-xl overflow-hidden">
          {pbs.map((pb, i) => (
            <motion.div
              key={pb.exerciseName}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: shouldReduce ? 0 : i * 0.03 }}
              className="flex items-center justify-between px-5 py-3.5 border-b border-[#0f0f0f] last:border-b-0"
            >
              <div>
                <div className="text-[13px] font-medium text-[#ccc]">{pb.exerciseName}</div>
                <div className="text-[10px] text-[#2e2e2e] mt-0.5">
                  {pb.bestWeight} kg × {pb.bestReps}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[15px] font-bold text-white">
                  {pb.estimatedOneRM.toFixed(1)}
                  <span className="text-[10px] font-medium text-[#333] ml-1">kg est. 1RM</span>
                </div>
              </div>
            </motion.div>
          ))}
        </Card>
      </div>
    </div>
  );
}
