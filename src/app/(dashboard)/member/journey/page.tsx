import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import JourneyClient from './_components/journey-client';

export const metadata = { title: '我的旅程' };

export default async function JourneyPage() {
  const session = await auth();
  if (!session || session.user.role !== 'member') redirect('/login');

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <JourneyClient memberId={session.user.id} />
    </div>
  );
}
