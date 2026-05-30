import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { OwnerDashboardPage } from '@/pages/owner/dashboard';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Protected — will be expanded per sprint
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['owner']} />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/owner', element: <OwnerDashboardPage /> },
              { path: '/owner/*', element: <div>Owner (placeholder)</div> },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['trainer']} />,
        children: [
          { path: '/trainer', element: <div>Trainer home (placeholder)</div> },
          { path: '/trainer/*', element: <div>Trainer (placeholder)</div> },
        ],
      },
      {
        element: <RequireRole roles={['member']} />,
        children: [
          { path: '/member', element: <div>Member home (placeholder)</div> },
          { path: '/member/*', element: <div>Member (placeholder)</div> },
        ],
      },
    ],
  },

  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
