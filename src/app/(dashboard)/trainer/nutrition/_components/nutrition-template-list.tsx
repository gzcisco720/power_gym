'use client';

import Link from 'next/link';

interface Template {
  _id: string;
  name: string;
  description: string | null;
  dayTypes: { name: string }[];
}

interface Props {
  templates: Template[];
  onDelete?: (id: string) => Promise<void>;
}

export function NutritionTemplateList({ templates, onDelete }: Props) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>还没有营养计划</p>
        <Link href="/dashboard/trainer/nutrition/new" className="mt-4 inline-block text-primary underline">
          新建营养计划
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">营养计划模板</h1>
        <Link
          href="/dashboard/trainer/nutrition/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          新建营养计划
        </Link>
      </div>
      <ul className="space-y-3">
        {templates.map((t) => (
          <li key={t._id} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Link href={`/dashboard/trainer/nutrition/${t._id}/edit`} className="font-medium hover:underline">
                {t.name}
              </Link>
              {t.description && <p className="text-sm text-muted-foreground mt-1">{t.description}</p>}
              <p className="text-xs text-muted-foreground mt-1">{t.dayTypes.length} 种天类型</p>
            </div>
            {onDelete && (
              <button
                onClick={() => onDelete(t._id)}
                className="text-sm text-destructive hover:underline"
              >
                删除
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
