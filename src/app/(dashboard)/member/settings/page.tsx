import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { SettingsTabs } from '@/components/shared/settings-tabs';
import { SettingsTabPanel } from '@/components/shared/settings-tab-panel';
import { SecurityTab } from '@/components/settings/security-tab';
import { MemberProfileTab } from './_components/profile-tab';

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'security', label: 'Security' },
];

export default async function MemberSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ tab = 'profile' }, session] = await Promise.all([searchParams, auth()]);
  if (!session?.user) return null;

  await connectDB();
  const [raw, user] = await Promise.all([
    new MongoUserProfileRepository().findByUserId(session.user.id),
    new MongoUserRepository().findById(session.user.id),
  ]);

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs tabs={TABS} basePath="/member/settings" activeTab={tab} />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <SettingsTabPanel activeTab={tab}>
          {tab === 'profile' && (
            <MemberProfileTab
              firstName={user?.firstName ?? ''}
              lastName={user?.lastName ?? ''}
              mobile={raw?.mobile ?? null}
              address={raw?.address ?? null}
              dateOfBirth={raw?.dateOfBirth ? raw.dateOfBirth.toISOString() : null}
              avatarUrl={raw?.avatarUrl ?? null}
              sex={raw?.sex ?? null}
              fitnessGoal={raw?.fitnessGoal ?? null}
              fitnessLevel={raw?.fitnessLevel ?? null}
              currentEmail={user?.email ?? ''}
            />
          )}
          {tab === 'security' && <SecurityTab />}
        </SettingsTabPanel>
      </div>
    </div>
  );
}
