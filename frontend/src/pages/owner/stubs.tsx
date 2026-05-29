import { Dumbbell, Apple, Activity } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';

export function OwnerPlansStub() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">Training Plans</h1>
    </div>
  );
}

export function OwnerNutritionStub() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">Nutrition Templates</h1>
    </div>
  );
}

export function OwnerFoodsStub() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground">Foods</h1>
    </div>
  );
}

export function OwnerMyTrainingStub() {
  return (
    <>
      <PageHeader title="My Training" subtitle="Track your personal training sessions" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="My Training"
          description="Your personal training history will appear here once sessions are logged."
          action={
            <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Dumbbell className="size-6 text-primary-light" />
            </div>
          }
        />
      </div>
    </>
  );
}

export function OwnerMyNutritionStub() {
  return (
    <>
      <PageHeader title="My Nutrition" subtitle="Track your personal nutrition" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="My Nutrition"
          description="Your nutrition plan and daily logs will appear here."
          action={
            <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Apple className="size-6 text-emerald-300" />
            </div>
          }
        />
      </div>
    </>
  );
}

export function OwnerMyBodyTestsStub() {
  return (
    <>
      <PageHeader title="My Body Tests" subtitle="Track your body composition over time" />
      <div className="px-4 sm:px-8 py-6">
        <EmptyState
          heading="My Body Tests"
          description="Your body composition test history will appear here."
          action={
            <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Activity className="size-6 text-amber-300" />
            </div>
          }
        />
      </div>
    </>
  );
}
