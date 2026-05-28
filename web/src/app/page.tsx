import type { Metadata } from 'next';
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Power Gym',
  description: 'Gym management platform for owners, trainers, and members',
};

export default async function RootPage() {
  const session = await auth();
  if (session?.user) redirect('/dashboard');
  redirect('/login');
}
