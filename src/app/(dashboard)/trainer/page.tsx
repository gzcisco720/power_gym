import { redirect } from 'next/navigation';

export default function TrainerRootPage() {
  redirect('/dashboard/trainer/members');
}
