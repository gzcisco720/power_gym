import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { cn } from '@/lib/utils';

export async function MemberBodyComposition() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const tests = await new MongoBodyTestRepository().findByMember(session.user.id);

  if (tests.length === 0) {
    return (
      <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
        <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
          Body Composition
        </div>
        <p className="text-[11px] text-foreground/40 text-center py-2">No body tests recorded yet</p>
      </div>
    );
  }

  const latest = tests[0];
  const previous = tests[1] ?? null;

  const rows = [
    {
      label: 'Weight',
      curr: `${latest.weight.toFixed(1)} kg`,
      prev: previous ? `${previous.weight.toFixed(1)} kg` : null,
      delta: previous ? latest.weight - previous.weight : null,
      lowerIsBetter: true,
    },
    {
      label: 'Body Fat',
      curr: `${latest.bodyFatPct.toFixed(1)}%`,
      prev: previous ? `${previous.bodyFatPct.toFixed(1)}%` : null,
      delta: previous ? latest.bodyFatPct - previous.bodyFatPct : null,
      lowerIsBetter: true,
    },
    {
      label: 'Lean Mass',
      curr: `${latest.leanMassKg.toFixed(1)} kg`,
      prev: previous ? `${previous.leanMassKg.toFixed(1)} kg` : null,
      delta: previous ? latest.leanMassKg - previous.leanMassKg : null,
      lowerIsBetter: false,
    },
    {
      label: 'Fat Mass',
      curr: `${latest.fatMassKg.toFixed(1)} kg`,
      prev: previous ? `${previous.fatMassKg.toFixed(1)} kg` : null,
      delta: previous ? latest.fatMassKg - previous.fatMassKg : null,
      lowerIsBetter: true,
    },
  ];

  return (
    <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/30 font-semibold mb-3">
        Body Composition
      </div>
      <div className="space-y-0">
        {rows.map(({ label, curr, prev, delta, lowerIsBetter }) => {
          const improved = delta !== null && (lowerIsBetter ? delta < 0 : delta > 0);
          const deltaTxt =
            delta !== null ? `${delta < 0 ? '↓' : '↑'} ${Math.abs(delta).toFixed(1)}` : null;
          return (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-white/[.04] last:border-0"
            >
              <div className="text-[9px] uppercase tracking-[0.8px] text-foreground/30">{label}</div>
              <div className="flex items-center gap-2">
                {prev && <span className="text-[10px] text-foreground/30">{prev}</span>}
                {prev && <span className="text-[9px] text-foreground/30">→</span>}
                <span className={cn('text-[13px] font-bold', improved ? 'text-emerald-400' : 'text-foreground')}>
                  {curr}
                </span>
                {deltaTxt && (
                  <span
                    className={cn(
                      'text-[9px] font-bold rounded px-1.5 py-0.5',
                      improved
                        ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25'
                        : 'bg-white/[.05] text-foreground/35 ring-1 ring-white/[.08]',
                    )}
                  >
                    {deltaTxt}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {previous && (
        <div className="text-[9px] text-foreground/20 text-right mt-2">
          {new Date(previous.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} →{' '}
          {new Date(latest.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );
}
