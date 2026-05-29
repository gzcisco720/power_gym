import { Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { AppShell } from './app-shell';

export function DashboardLayout() {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);

  // RequireAuth guard handles auth checks; if we reach here with no user it's a loading race
  if (status === 'loading' || status === 'idle' || !user) return null;

  return (
    <AppShell userRole={user.role} userName={user.name} userEmail={user.email}>
      <Outlet />
    </AppShell>
  );
}
