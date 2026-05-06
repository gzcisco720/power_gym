import { auth } from '@/lib/auth/auth';
import { NewNutritionTemplateClient } from './_client';

export default async function NewNutritionTemplatePage() {
  const session = await auth();
  if (!session?.user) return null;

  return <NewNutritionTemplateClient />;
}
