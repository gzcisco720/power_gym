import type { Achievements } from '@/lib/check-in-stats';

interface Props {
  achievements: Achievements;
}

export function AchievementCards({ achievements }: Props) {
  const { weightLost, weightFirst, weightLatest, currentStreak, totalCheckIns, dietStreak } =
    achievements;

  const cards = [
    weightLost !== null &&
      weightLost > 0 && {
        icon: '🏆',
        title: `Lost ${weightLost} kg`,
        subtitle: `${weightFirst} → ${weightLatest} kg in ${totalCheckIns} weeks`,
        style: 'bg-primary/[0.08] border-primary/20',
      },
    currentStreak >= 2 && {
      icon: '🔥',
      title: `${currentStreak}-week streak`,
      subtitle: `${totalCheckIns} check-ins, never missed a week`,
      style: 'bg-emerald-400/[0.07] border-emerald-400/[0.18]',
    },
    dietStreak >= 2 && {
      icon: '🥗',
      title: `${dietStreak} on-track in a row`,
      subtitle: 'Best diet consistency streak',
      style: 'bg-amber-400/[0.07] border-amber-400/[0.18]',
    },
  ].filter(Boolean) as Array<{
    icon: string;
    title: string;
    subtitle: string;
    style: string;
  }>;

  if (cards.length === 0) return null;

  const colsClass = ['', 'sm:grid-cols-1', 'sm:grid-cols-2', 'sm:grid-cols-3'][Math.min(cards.length, 3)];

  return (
    <div className={`grid gap-3 mb-5 grid-cols-1 ${colsClass}`}>
      {cards.map((card) => (
        <div
          key={card.title}
          className={`rounded-xl border px-4 py-3.5 flex items-center gap-3.5 ${card.style}`}
        >
          <span className="text-2xl flex-shrink-0">{card.icon}</span>
          <div>
            <div className="text-sm font-bold">{card.title}</div>
            <div className="text-[11px] text-foreground/65 mt-0.5">{card.subtitle}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
