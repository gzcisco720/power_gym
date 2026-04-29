import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { OwnerProfileForm } from './_components/owner-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function OwnerSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    gymName: raw?.gymName ?? null,
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your gym and contact info" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <OwnerProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
