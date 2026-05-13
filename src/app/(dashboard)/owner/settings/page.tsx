import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { SettingsTabs } from '@/components/shared/settings-tabs';
import { SecurityTab } from '@/components/settings/security-tab';
import { OwnerProfileTab } from './_components/profile-tab';
import { GymInfoTab } from './_components/gym-info-tab';

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
  { value: 'gym-info', label: 'Gym Info' },
];

export default async function OwnerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'profile' } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const [raw, user] = await Promise.all([
    new MongoUserProfileRepository().findByUserId(session.user.id),
    new MongoUserRepository().findById(session.user.id),
  ]);

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs tabs={TABS} basePath="/owner/settings" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        {tab === 'profile' && (
          <OwnerProfileTab
            firstName={user?.firstName ?? ''}
            lastName={user?.lastName ?? ''}
            currentEmail={user?.email ?? ''}
            mobile={raw?.mobile ?? null}
            address={raw?.address ?? null}
            dateOfBirth={raw?.dateOfBirth ? raw.dateOfBirth.toISOString() : null}
            avatarUrl={raw?.avatarUrl ?? null}
            certifications={raw?.certifications ?? []}
          />
        )}
        {tab === 'security' && <SecurityTab />}
        {tab === 'gym-info' && <GymInfoTab gymInfo={raw?.gymInfo ?? null} />}
      </div>
    </div>
  );
}
