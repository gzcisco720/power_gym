'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { FoodPicker, type PickedFood } from '@/components/nutrition/food-picker';
import type { IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';

interface DailyLogPayload {
  memberId: string;
  planId: string;
  date: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

export default function MemberAddFoodPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, status } = useSession();
  const date = params.get('date') ?? new Date().toISOString().slice(0, 10);
  const mealIndex = Number(params.get('mealIndex') ?? '0');

  if (status === 'loading') return <div className="p-6">Loading…</div>;
  if (!session?.user?.id) return null;
  const memberId = session.user.id;

  async function handleSelect(picked: PickedFood): Promise<void> {
    const res = await fetch(`/api/members/${memberId}/nutrition/log/${date}`);
    if (!res.ok) return;
    const log = (await res.json()) as DailyLogPayload;
    const idx =
      Number.isFinite(mealIndex) && mealIndex >= 0 && mealIndex < log.meals.length
        ? mealIndex
        : 0;
    log.meals[idx].items.push({
      foodName: picked.foodName,
      quantityG: picked.quantityG,
      ...picked.macros,
    });
    await fetch(`/api/members/${memberId}/nutrition/log/${date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayTypeName: log.dayTypeName,
        meals: log.meals,
        dayCompleted: log.dayCompleted,
      }),
    });
    router.push('/member/nutrition');
  }

  return (
    <div className="container mx-auto py-4 max-w-3xl space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={() => router.back()}>
          ← Back
        </Button>
        <h1 className="text-lg font-semibold">Add Food</h1>
        <span className="w-16" />
      </div>
      <FoodPicker
        memberId={memberId}
        onSelect={handleSelect}
        onCreateNewHref={`/member/nutrition/add/new?date=${date}&mealIndex=${mealIndex}`}
      />
    </div>
  );
}
