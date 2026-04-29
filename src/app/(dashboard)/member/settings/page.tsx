import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MemberProfileForm } from './_components/member-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function MemberSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    sex: (raw?.sex ?? null) as 'male' | 'female' | null,
    dateOfBirth: raw?.dateOfBirth ? raw.dateOfBirth.toISOString() : null,
    height: raw?.height ?? null,
    fitnessGoal: raw?.fitnessGoal ?? null,
    fitnessLevel: raw?.fitnessLevel ?? null,
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your personal information" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <MemberProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
