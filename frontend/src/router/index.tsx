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
import { TrainerInvitesPage } from '@/pages/trainer/invites';
import { TrainerSettingsPage } from '@/pages/trainer/settings';
import { MemberDashboardPage } from '@/pages/member/dashboard';
import { MemberMyTrainingPage } from '@/pages/member/my-training';

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
              // Stage 2: Plans + Nutrition + Foods (reuse owner page components)
              { path: '/trainer/plans', element: <OwnerPlansPage /> },
              { path: '/trainer/plans/new', element: <OwnerPlanNewPage /> },
              { path: '/trainer/plans/:id', element: <OwnerPlanDetailPage /> },
              { path: '/trainer/plans/:id/edit', element: <OwnerPlanEditPage /> },
              { path: '/trainer/nutrition-templates', element: <OwnerNutritionTemplatesPage /> },
              { path: '/trainer/nutrition-templates/new', element: <OwnerNutritionNewPage /> },
              { path: '/trainer/nutrition-templates/:id/edit', element: <OwnerNutritionEditPage /> },
              { path: '/trainer/foods', element: <OwnerFoodsPage /> },
              { path: '/trainer/foods/new', element: <OwnerFoodNewPage /> },
              { path: '/trainer/foods/:foodId/edit', element: <OwnerFoodEditPage /> },
              // Stage 3: My Training + My Nutrition (reuse owner pages)
              { path: '/trainer/my-training', element: <OwnerMyTrainingPage /> },
              { path: '/trainer/my-training/session/:id', element: <SelfSessionPage basePath="/trainer/my-training" /> },
              { path: '/trainer/my-training/calendar', element: <TrainingCalendarPage basePath="/trainer/my-training" /> },
              { path: '/trainer/my-nutrition', element: <OwnerMyNutritionPage /> },
              { path: '/trainer/my-nutrition/day', element: <NutritionDayPage basePath="/trainer/my-nutrition" /> },
              // Stage 4: Settings + Calendar + Invites + Billing
              { path: '/trainer/settings', element: <TrainerSettingsPage /> },
              { path: '/trainer/calendar', element: <OwnerCalendarPage /> },
              { path: '/trainer/invites', element: <TrainerInvitesPage /> },
              { path: '/trainer/billing', element: <OwnerBillingPage /> },
              { path: '/trainer/*', element: <div>Trainer (placeholder)</div> },
            ],
          },
        ],
      },
      {
        element: <RequireRole roles={['member']} />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              { path: '/member', element: <MemberDashboardPage /> },
              { path: '/member/my-training', element: <MemberMyTrainingPage /> },
              { path: '/member/my-training/session/:id', element: <SelfSessionPage basePath="/member/my-training" /> },
              { path: '/member/my-training/calendar', element: <TrainingCalendarPage basePath="/member/my-training" /> },
              // Stage 3 placeholders
              { path: '/member/check-in', element: <div>Check-In (placeholder)</div> },
              { path: '/member/check-in/new', element: <div>Check-In New (placeholder)</div> },
              { path: '/member/check-in/history', element: <div>Check-In History (placeholder)</div> },
              { path: '/member/check-in/:id', element: <div>Check-In Detail (placeholder)</div> },
              { path: '/member/nutrition', element: <div>Nutrition (placeholder)</div> },
              { path: '/member/nutrition/:date', element: <div>Nutrition Day (placeholder)</div> },
              { path: '/member/body-tests', element: <div>Body Tests (placeholder)</div> },
              // Stage 4 placeholders
              { path: '/member/journey', element: <div>Journey (placeholder)</div> },
              { path: '/member/health', element: <div>Health (placeholder)</div> },
              { path: '/member/schedule', element: <div>Schedule (placeholder)</div> },
              { path: '/member/settings', element: <div>Settings (placeholder)</div> },
              { path: '/member/billing', element: <div>Billing (placeholder)</div> },
              { path: '/member/*', element: <div>Member (placeholder)</div> },
            ],
          },
        ],
      },
    ],
  },

  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
