import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { TrainerProfileForm } from './_components/trainer-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function TrainerSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    bio: raw?.bio ?? null,
    specializations: raw?.specializations ?? [],
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your trainer profile" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <TrainerProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
