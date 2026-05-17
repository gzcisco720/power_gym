// src/app/(dashboard)/member/journey/_components/milestone-card.tsx
import Image from 'next/image';
import type { JourneyItem, MilestoneTagColor } from '@/lib/types/journey';

interface Props {
  item: JourneyItem;
  isLast: boolean;
}

const TAG_CLASSES: Record<MilestoneTagColor, string> = {
  gold: 'bg-amber-500/10 text-amber-400',
  green: 'bg-emerald-500/10 text-emerald-400',
  indigo: 'bg-primary/[0.18] text-primary-light',
};

export default function MilestoneCard({ item, isLast }: Props) {
  const { bodyTest, milestone } = item;
  if (!milestone) return null;

  const date = new Date(bodyTest.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  const hasLeanMassPB = milestone.tags.some(t => t.label.includes('最高瘦体质量'));

  return (
    <div className="flex items-stretch gap-3">
      {/* Track: large glowing dot + line */}
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-4 w-3.5 h-3.5 rounded-full bg-primary border-2 border-primary/40 shrink-0 z-10 shadow-[0_0_0_4px_rgba(99,102,241,0.15),0_0_12px_rgba(99,102,241,0.3)]" />
        {!isLast && <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />}
      </div>

      {/* Milestone card body */}
      <div className="flex-1 min-w-0 pb-2 -ml-1">
        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/[0.13] to-primary/[0.04] p-3.5 shadow-[0_4px_24px_rgba(99,102,241,0.1)]">
          {/* Header row */}
          <div className="flex items-start gap-2 mb-2.5">
            <span className="text-base shrink-0">{milestone.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-primary-light/70 text-[10px] mb-0.5">{date}</p>
              <p className="text-foreground text-sm font-bold leading-snug">{milestone.title}</p>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {milestone.tags.map((tag, i) => (
              <span
                key={i}
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${TAG_CLASSES[tag.color]}`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex mb-3">
            <div className="flex-1">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">体脂</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.bodyFatPct}%</p>
              {bodyTest.deltaBodyFatPct !== null && (
                <p className={`text-[10px] mt-0.5 ${bodyTest.deltaBodyFatPct < 0 ? 'text-emerald-400' : 'text-foreground/65'}`}>
                  {bodyTest.deltaBodyFatPct < 0 ? '' : '+'}{bodyTest.deltaBodyFatPct.toFixed(1)}% vs 上次
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">体重</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.weight} kg</p>
              {bodyTest.deltaWeight !== null && (
                <p className={`text-[10px] mt-0.5 ${bodyTest.deltaWeight < 0 ? 'text-emerald-400' : 'text-foreground/65'}`}>
                  {bodyTest.deltaWeight > 0 ? '+' : ''}{bodyTest.deltaWeight.toFixed(1)} kg
                </p>
              )}
            </div>
            <div className="flex-1 border-l border-primary/15 pl-2.5 ml-2.5">
              <p className="text-primary-light/50 text-[9px] uppercase tracking-wider mb-0.5">瘦体质量</p>
              <p className="text-foreground text-sm font-bold">{bodyTest.leanMassKg.toFixed(1)} kg</p>
              {hasLeanMassPB && (
                <p className="text-primary-light/50 text-[10px] mt-0.5">历史最高</p>
              )}
            </div>
          </div>

          {/* Photos strip */}
          {milestone.photos.length > 0 && (
            <div className="flex gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex-1 h-14 rounded-lg overflow-hidden">
                  {milestone.photos[i] ? (
                    <Image
                      src={milestone.photos[i]}
                      alt={`里程碑照片 ${i + 1}`}
                      width={100}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/[0.04] border border-dashed border-primary/20 flex items-center justify-center">
                      <span className="text-lg text-foreground/10">📷</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
