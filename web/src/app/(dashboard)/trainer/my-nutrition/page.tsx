import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { MyNutritionLanding } from '@/components/self-tracking/my-nutrition-landing';

export default async function TrainerMyNutritionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'trainer') redirect('/login');
  return <MyNutritionLanding basePath="/trainer/my-nutrition" />;
}
