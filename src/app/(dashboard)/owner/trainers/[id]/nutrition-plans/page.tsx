import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { HubPagination } from '@/components/shared/hub-pagination';

const PAGE_SIZE = 15;

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default async function TrainerHubNutritionPlansPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;
  const { page: pageParam } = await searchParams;
  const parsed = parseInt(pageParam ?? '1', 10);
  const page = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;

  await connectDB();
  const repo = new MongoNutritionTemplateRepository();
  const { templates, total } = await repo.findByCreatorPaginated(trainerId, page, PAGE_SIZE);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const basePath = `/owner/trainers/${trainerId}/nutrition-plans`;

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
        {total} Nutrition Template{total !== 1 ? 's' : ''}
      </div>

      {templates.length === 0 ? (
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-8 text-center">
          <p className="text-sm text-foreground/40">This trainer hasn&apos;t created any nutrition plans yet.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {templates.map((t) => (
            <Link
              key={t._id.toString()}
              href={`/owner/nutrition-templates/${t._id.toString()}/edit`}
              className="flex items-center gap-3 px-4 py-3 bg-white/[.02] ring-1 ring-white/[.06] rounded-xl hover:ring-white/[.12] transition-all"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/12 text-base">
                🥗
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground/85 truncate">{t.name}</div>
                <div className="text-[11px] text-foreground/35 mt-0.5">
                  {t.dayTypes.length} day type{t.dayTypes.length !== 1 ? 's' : ''} · Created {formatDate(t.createdAt)}
                </div>
              </div>
              <span className="text-foreground/25 text-sm shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      <HubPagination currentPage={page} totalPages={totalPages} basePath={basePath} />
    </div>
  );
}
