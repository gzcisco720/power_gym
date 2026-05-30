import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole } from './guards';
import { LoginPage } from '@/pages/auth/login';
import { RegisterPage } from '@/pages/auth/register';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { DashboardLayout } from '@/components/shared/dashboard-layout';
import { OwnerDashboardPage } from '@/pages/owner/dashboard';
import { OwnerTrainersPage } from '@/pages/owner/trainers';
import { OwnerTrainerDetailPage } from '@/pages/owner/trainer-detail';
import { OwnerMembersPage } from '@/pages/owner/members';
import { OwnerInvitesPage } from '@/pages/owner/invites';
import { OwnerPlansPage } from '@/pages/owner/plans';
import { OwnerPlanNewPage } from '@/pages/owner/plan-new';
import { OwnerPlanDetailPage } from '@/pages/owner/plan-detail';
import { OwnerPlanEditPage } from '@/pages/owner/plan-edit';
import { OwnerNutritionTemplatesPage } from '@/pages/owner/nutrition';
import { OwnerNutritionNewPage } from '@/pages/owner/nutrition-new';
import { OwnerNutritionEditPage } from '@/pages/owner/nutrition-edit';
import { OwnerFoodsPage } from '@/pages/owner/foods';
import { OwnerFoodNewPage } from '@/pages/owner/food-new';
import { OwnerFoodEditPage } from '@/pages/owner/food-edit';
import { OwnerEquipmentPage } from '@/pages/owner/equipment';
import { OwnerMyTrainingPage } from '@/pages/owner/my-training';
import { SelfSessionPage } from '@/pages/owner/session';
import { TrainingCalendarPage } from '@/pages/owner/training-calendar';
import { OwnerMyNutritionPage } from '@/pages/owner/my-nutrition';
import { NutritionDayPage } from '@/pages/owner/nutrition-day';
import { OwnerMyBodyTestsPage } from '@/pages/owner/my-body-tests';
import { OwnerSettingsPage } from '@/pages/owner/settings';
import { OwnerServicesPage } from '@/pages/owner/services';
import { OwnerBillingPage } from '@/pages/owner/billing';
import { OwnerCalendarPage } from '@/pages/owner/calendar';
import { TrainerMembersPage } from '@/pages/trainer/members';
import { TrainerMemberHubPage } from '@/pages/trainer/member-hub';

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
              { path: '/owner/trainers', element: <OwnerTrainersPage /> },
              { path: '/owner/trainers/:id', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/trainers/:id/members', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/trainers/:id/training-plans', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/trainers/:id/nutrition-plans', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/trainers/:id/calendar', element: <OwnerTrainerDetailPage /> },
              { path: '/owner/members', element: <OwnerMembersPage /> },
              { path: '/owner/invites', element: <OwnerInvitesPage /> },
              { path: '/owner/plans', element: <OwnerPlansPage /> },
              { path: '/owner/plans/new', element: <OwnerPlanNewPage /> },
              { path: '/owner/plans/:id', element: <OwnerPlanDetailPage /> },
              { path: '/owner/plans/:id/edit', element: <OwnerPlanEditPage /> },
              { path: '/owner/nutrition-templates', element: <OwnerNutritionTemplatesPage /> },
              { path: '/owner/nutrition-templates/new', element: <OwnerNutritionNewPage /> },
              { path: '/owner/nutrition-templates/:id/edit', element: <OwnerNutritionEditPage /> },
              { path: '/owner/foods', element: <OwnerFoodsPage /> },
              { path: '/owner/foods/new', element: <OwnerFoodNewPage /> },
              { path: '/owner/foods/:foodId/edit', element: <OwnerFoodEditPage /> },
              { path: '/owner/equipment', element: <OwnerEquipmentPage /> },
              { path: '/owner/my-training', element: <OwnerMyTrainingPage /> },
              { path: '/owner/my-training/session/:id', element: <SelfSessionPage basePath="/owner/my-training" /> },
              { path: '/owner/my-training/calendar', element: <TrainingCalendarPage basePath="/owner/my-training" /> },
              { path: '/owner/my-nutrition', element: <OwnerMyNutritionPage /> },
              { path: '/owner/my-nutrition/day', element: <NutritionDayPage basePath="/owner/my-nutrition" /> },
              { path: '/owner/my-body-tests', element: <OwnerMyBodyTestsPage /> },
              { path: '/owner/settings', element: <OwnerSettingsPage /> },
              { path: '/owner/services', element: <OwnerServicesPage /> },
              { path: '/owner/billing', element: <OwnerBillingPage /> },
              { path: '/owner/calendar', element: <OwnerCalendarPage /> },
              { path: '/owner/*', element: <div>Owner (placeholder)</div> },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['trainer']} />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/trainer', element: <div>Trainer home (placeholder)</div> },
              { path: '/trainer/members', element: <TrainerMembersPage /> },
              { path: '/trainer/members/:id', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/plan', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/nutrition', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/body-tests', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/health', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/check-ins', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/progress', element: <TrainerMemberHubPage /> },
              { path: '/trainer/members/:id/photos', element: <TrainerMemberHubPage /> },
              { path: '/trainer/*', element: <div>Trainer (placeholder)</div> },
            ],
          },
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
