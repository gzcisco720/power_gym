import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';

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
          { path: '/owner/*', element: <Navigate to="/login" replace /> },
        ],
      },
      {
        element: <RequireRole roles={['trainer']} />,
        children: [
          { path: '/trainer/*', element: <Navigate to="/login" replace /> },
        ],
      },
      {
        element: <RequireRole roles={['member']} />,
        children: [
          { path: '/member/*', element: <Navigate to="/login" replace /> },
        ],
      },
    ],
  },

  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
