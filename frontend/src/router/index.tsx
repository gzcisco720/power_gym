import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { Placeholder } from './placeholder';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Owner routes
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['owner']} />,
        children: [
          { path: '/owner', element: <Placeholder title="Owner Dashboard" /> },
          { path: '/owner/*', element: <Placeholder title="Owner" /> },
        ],
      },
    ],
  },

  // Trainer routes
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['trainer']} />,
        children: [
          { path: '/trainer', element: <Navigate to="/trainer/members" replace /> },
          { path: '/trainer/*', element: <Placeholder title="Trainer" /> },
        ],
      },
    ],
  },

  // Member routes
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole roles={['member']} />,
        children: [
          { path: '/member', element: <Placeholder title="Member Dashboard" /> },
          { path: '/member/*', element: <Placeholder title="Member" /> },
        ],
      },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
