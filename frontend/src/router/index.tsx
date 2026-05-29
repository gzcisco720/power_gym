import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { Placeholder } from './placeholder';
import { DashboardLayout } from '@/components/shared/dashboard-layout';

// Trainer pages
import { TrainerMembersPage } from '@/pages/trainer/members';
import { TrainerMemberHubPage } from '@/pages/trainer/member-hub';
import { TrainerMemberPlanPage } from '@/pages/trainer/member-plan';
import { TrainerMemberLogNewPage } from '@/pages/trainer/member-log-new';
import { TrainerMemberLogSessionPage } from '@/pages/trainer/member-log-session';
import { TrainerMemberBodyTestsPage } from '@/pages/trainer/member-body-tests';
import { TrainerMemberHealthPage } from '@/pages/trainer/member-health';
import { TrainerMemberNutritionPage } from '@/pages/trainer/member-nutrition';
import { TrainerPlansPage } from '@/pages/trainer/plans';
import { TrainerNutritionPage } from '@/pages/trainer/nutrition';
import { TrainerFoodsPage } from '@/pages/trainer/foods';
import {
  TrainerCalendarStub,
  TrainerBillingStub,
  TrainerInvitesStub,
  TrainerSettingsStub,
  TrainerMyTrainingStub,
  TrainerMyNutritionStub,
  TrainerMemberCheckInsStub,
  TrainerMemberBillingStub,
  TrainerMemberProgressStub,
  TrainerMemberPhotosStub,
  TrainerPlansDetailStub,
} from '@/pages/trainer/stubs';

// Owner pages
import { OwnerDashboardPage } from '@/pages/owner/dashboard';
import { OwnerMembersPage } from '@/pages/owner/members';
import { OwnerInvitesPage } from '@/pages/owner/invites';
import { OwnerServicesPage } from '@/pages/owner/services';
import { OwnerBillingPage } from '@/pages/owner/billing';
import { OwnerCalendarPage } from '@/pages/owner/calendar';
import { OwnerEquipmentPage } from '@/pages/owner/equipment';
import { OwnerTrainersPage } from '@/pages/owner/trainers';
import { OwnerTrainerDetailPage } from '@/pages/owner/trainer-detail';
import { OwnerSettingsPage } from '@/pages/owner/settings';
import {
  OwnerPlansStub,
  OwnerNutritionStub,
  OwnerFoodsStub,
  OwnerMyTrainingStub,
  OwnerMyNutritionStub,
  OwnerMyBodyTestsStub,
} from '@/pages/owner/stubs';

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
          {
            element: <DashboardLayout />,
            children: [
              { path: '/owner', element: <OwnerDashboardPage /> },
              { path: '/owner/members', element: <OwnerMembersPage /> },
              { path: '/owner/invites', element: <OwnerInvitesPage /> },
              { path: '/owner/services', element: <OwnerServicesPage /> },
              { path: '/owner/billing', element: <OwnerBillingPage /> },
              { path: '/owner/calendar', element: <OwnerCalendarPage /> },
              { path: '/owner/equipment', element: <OwnerEquipmentPage /> },
              { path: '/owner/trainers', element: <OwnerTrainersPage /> },
              { path: '/owner/trainers/:id', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/settings', element: <OwnerSettingsPage /> },
              { path: '/owner/plans', element: <OwnerPlansStub /> },
              { path: '/owner/plans/new', element: <OwnerPlansStub /> },
              { path: '/owner/plans/:id', element: <OwnerPlansStub /> },
              { path: '/owner/plans/:id/edit', element: <OwnerPlansStub /> },
              { path: '/owner/nutrition-templates', element: <OwnerNutritionStub /> },
              { path: '/owner/nutrition-templates/new', element: <OwnerNutritionStub /> },
              { path: '/owner/nutrition-templates/:id/edit', element: <OwnerNutritionStub /> },
              { path: '/owner/foods', element: <OwnerFoodsStub /> },
              { path: '/owner/foods/new', element: <OwnerFoodsStub /> },
              { path: '/owner/foods/:foodId/edit', element: <OwnerFoodsStub /> },
              { path: '/owner/my-training', element: <OwnerMyTrainingStub /> },
              { path: '/owner/my-training/*', element: <OwnerMyTrainingStub /> },
              { path: '/owner/my-nutrition', element: <OwnerMyNutritionStub /> },
              { path: '/owner/my-nutrition/*', element: <OwnerMyNutritionStub /> },
              { path: '/owner/my-body-tests', element: <OwnerMyBodyTestsStub /> },
            ],
          },
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
          {
            element: <DashboardLayout />,
            children: [
              { path: '/trainer', element: <Navigate to="/trainer/members" replace /> },
              { path: '/trainer/members', element: <TrainerMembersPage /> },
              { path: '/trainer/members/:id', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/plan', element: <TrainerMemberPlanPage /> },
              { path: '/trainer/members/:id/log/new', element: <TrainerMemberLogNewPage /> },
              { path: '/trainer/members/:id/log/:sessionId', element: <TrainerMemberLogSessionPage /> },
              { path: '/trainer/members/:id/body-tests', element: <TrainerMemberBodyTestsPage /> },
              { path: '/trainer/members/:id/health', element: <TrainerMemberHealthPage /> },
              { path: '/trainer/members/:id/nutrition', element: <TrainerMemberNutritionPage /> },
              { path: '/trainer/members/:id/check-ins', element: <TrainerMemberCheckInsStub /> },
              { path: '/trainer/members/:id/billing', element: <TrainerMemberBillingStub /> },
              { path: '/trainer/members/:id/progress', element: <TrainerMemberProgressStub /> },
              { path: '/trainer/members/:id/photos', element: <TrainerMemberPhotosStub /> },
              { path: '/trainer/members/:id/*', element: <Placeholder title="Member" /> },
              { path: '/trainer/plans', element: <TrainerPlansPage /> },
              { path: '/trainer/plans/new', element: <TrainerPlansDetailStub /> },
              { path: '/trainer/plans/:id', element: <TrainerPlansDetailStub /> },
              { path: '/trainer/plans/:id/edit', element: <TrainerPlansDetailStub /> },
              { path: '/trainer/nutrition', element: <TrainerNutritionPage /> },
              { path: '/trainer/nutrition/*', element: <Placeholder title="Nutrition" /> },
              { path: '/trainer/foods', element: <TrainerFoodsPage /> },
              { path: '/trainer/foods/*', element: <Placeholder title="Foods" /> },
              { path: '/trainer/calendar', element: <TrainerCalendarStub /> },
              { path: '/trainer/billing', element: <TrainerBillingStub /> },
              { path: '/trainer/invites', element: <TrainerInvitesStub /> },
              { path: '/trainer/settings', element: <TrainerSettingsStub /> },
              { path: '/trainer/my-training', element: <TrainerMyTrainingStub /> },
              { path: '/trainer/my-training/*', element: <TrainerMyTrainingStub /> },
              { path: '/trainer/my-nutrition', element: <TrainerMyNutritionStub /> },
              { path: '/trainer/my-nutrition/*', element: <TrainerMyNutritionStub /> },
              { path: '/trainer/*', element: <Placeholder title="Trainer" /> },
            ],
          },
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
          {
            element: <DashboardLayout />,
            children: [
              { path: '/member', element: <Placeholder title="Member Dashboard" /> },
              { path: '/member/*', element: <Placeholder title="Member" /> },
            ],
          },
        ],
      },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
