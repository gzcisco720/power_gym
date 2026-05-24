import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { PhotosClient } from './_components/photos-client';

export default async function TrainerMemberPhotosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [session, { id: memberId }] = await Promise.all([auth(), params]);
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoCheckInRepository().findPhotosForMember(memberId);

  // Flatten: one PhotoItem per photo URL, preserving check-in metadata
  const photoItems = raw.flatMap((ci) =>
    ci.photos.map((url, idx) => ({
      key: `${ci._id}-${idx}`,
      photoUrl: url,
      submittedAt: ci.submittedAt.toISOString(),
      weight: ci.weight,
    })),
  );

  return <PhotosClient photos={photoItems} />;
}
