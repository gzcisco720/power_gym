// src/app/(dashboard)/member/journey/_components/timeline-node.tsx
import Image from 'next/image';
import type { JourneyItem } from '@/lib/types/journey';

interface Props {
  item: JourneyItem;
  isLast: boolean;
}

export default function TimelineNode({ item, isLast }: Props) {
  const { bodyTest } = item;

  const bfDelta = bodyTest.deltaBodyFatPct;
  const isImprovement = bfDelta !== null && bfDelta < 0;

  const date = new Date(bodyTest.date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });

  return (
    <div className="flex items-stretch gap-3">
      {/* Track: dot + connecting line */}
      <div className="flex flex-col items-center w-3.5 shrink-0">
        <div className="mt-2.5 w-2.5 h-2.5 rounded-full bg-primary/40 border border-primary/20 shrink-0 z-10" />
        {!isLast && <div className="flex-1 w-0.5 bg-primary/20 rounded-full mt-1 min-h-2" />}
      </div>

      {/* Card body */}
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-center gap-2.5 bg-card rounded-lg border border-foreground/[0.06] px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-foreground/65 text-[10px] mb-0.5">
              {date} · 第{bodyTest.testNumber}次
            </p>
            <p className="text-foreground/90 text-xs font-semibold">
              体脂 {bodyTest.bodyFatPct}% · {bodyTest.weight} kg
            </p>
            {bfDelta !== null && (
              <p className={`text-[10px] mt-0.5 ${isImprovement ? 'text-emerald-400' : 'text-foreground/65'}`}>
                {isImprovement ? '↓' : '↑'} {Math.abs(bfDelta).toFixed(1)}% · 瘦体质量 {bodyTest.leanMassKg.toFixed(1)} kg
              </p>
            )}
          </div>

          {/* Photo thumbnail */}
          <div className="w-9 h-9 rounded-md overflow-hidden shrink-0">
            {item.checkInPhoto ? (
              <Image
                src={item.checkInPhoto}
                alt="打卡照片"
                width={36}
                height={36}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-foreground/[0.04] flex items-center justify-center border border-dashed border-foreground/10">
                <span className="text-sm">📷</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
