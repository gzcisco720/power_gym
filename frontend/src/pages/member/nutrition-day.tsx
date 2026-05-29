import { useSearchParams } from 'react-router-dom';

export function MemberNutritionDayPage() {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
  const mode = searchParams.get('mode') ?? 'free';

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground">
        {mode === 'plan' ? 'My Plan' : 'Freestyle'}
      </h1>
      <p className="mb-6 text-sm text-foreground/65">{date}</p>

      {mode === 'plan' ? (
        <div>
          <p className="text-sm text-foreground/65">Your assigned plan for this day.</p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-sm text-foreground/65">Log your food for the day.</p>
          <div className="rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
            <p className="text-sm text-foreground/65">No entries yet for {date}.</p>
          </div>
        </div>
      )}
    </div>
  );
}
