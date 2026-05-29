import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/router';
import { useAuthStore } from '@/stores/authStore';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </>
  );
}
