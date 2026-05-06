import { auth } from '@/lib/auth/auth';
import { OwnerNewNutritionTemplateClient } from './_client';

export default async function OwnerNewNutritionTemplatePage() {
  const session = await auth();
  if (!session?.user) return null;

  return <OwnerNewNutritionTemplateClient />;
}
