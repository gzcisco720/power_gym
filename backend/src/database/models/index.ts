/**
 * Mongoose Model instances for use in seed scripts and other contexts
 * where models need to be instantiated standalone (outside NestJS DI).
 *
 * NestJS modules register schemas via MongooseModule.forFeature — use those
 * in application code. This file is for seed/migration scripts only.
 */

import mongoose from 'mongoose';

import { USER_MODEL, UserSchema } from './user.model';
import { USER_PROFILE_MODEL, UserProfileSchema } from './user-profile.model';
import { EXERCISE_MODEL, ExerciseSchema } from './exercise.model';
import { EXERCISE_NOTE_MODEL, ExerciseNoteSchema } from './exercise-note.model';
import { EQUIPMENT_MODEL, EquipmentSchema } from './equipment.model';
import {
  CONDITION_REPORT_MODEL,
  ConditionReportSchema,
} from './condition-report.model';
import { PLAN_TEMPLATE_MODEL, PlanTemplateSchema } from './plan-template.model';
import { MEMBER_PLAN_MODEL, MemberPlanSchema } from './member-plan.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from './workout-session.model';
import { PERSONAL_BEST_MODEL, PersonalBestSchema } from './personal-best.model';
import {
  NUTRITION_TEMPLATE_MODEL,
  NutritionTemplateSchema,
} from './nutrition-template.model';
import {
  MEMBER_NUTRITION_PLAN_MODEL,
  MemberNutritionPlanSchema,
} from './member-nutrition-plan.model';
import { BODY_TEST_MODEL, BodyTestSchema } from './body-test.model';
import {
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
} from './scheduled-session.model';
import { MEMBER_INJURY_MODEL, MemberInjurySchema } from './member-injury.model';
import {
  CHECK_IN_CONFIG_MODEL,
  CheckInConfigSchema,
} from './check-in-config.model';
import { CHECK_IN_MODEL, CheckInSchema } from './check-in.model';
import { FOOD_MODEL, FoodSchema } from './food.model';
import {
  NUTRITION_DAILY_LOG_MODEL,
  NutritionDailyLogSchema,
} from './nutrition-daily-log.model';
import { INVITE_TOKEN_MODEL, InviteTokenSchema } from './invite-token.model';
import {
  SELF_WORKOUT_LOG_MODEL,
  SelfWorkoutLogSchema,
} from './self-workout-log.model';
import { SERVICE_TYPE_MODEL, ServiceTypeSchema } from './service-type.model';

const m = (name: string, schema: mongoose.Schema): mongoose.Model<any> =>
  (mongoose.models[name] as mongoose.Model<any> | undefined) ??
  mongoose.model(name, schema);

export const UserModel = m(USER_MODEL, UserSchema);
export const UserProfileModel = m(USER_PROFILE_MODEL, UserProfileSchema);
export const ExerciseModel = m(EXERCISE_MODEL, ExerciseSchema);
export const ExerciseNoteModel = m(EXERCISE_NOTE_MODEL, ExerciseNoteSchema);
export const EquipmentModel = m(EQUIPMENT_MODEL, EquipmentSchema);
export const ConditionReportModel = m(
  CONDITION_REPORT_MODEL,
  ConditionReportSchema,
);
export const PlanTemplateModel = m(PLAN_TEMPLATE_MODEL, PlanTemplateSchema);
export const MemberPlanModel = m(MEMBER_PLAN_MODEL, MemberPlanSchema);
export const WorkoutSessionModel = m(
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
);
export const PersonalBestModel = m(PERSONAL_BEST_MODEL, PersonalBestSchema);
export const NutritionTemplateModel = m(
  NUTRITION_TEMPLATE_MODEL,
  NutritionTemplateSchema,
);
export const MemberNutritionPlanModel = m(
  MEMBER_NUTRITION_PLAN_MODEL,
  MemberNutritionPlanSchema,
);
export const BodyTestModel = m(BODY_TEST_MODEL, BodyTestSchema);
export const ScheduledSessionModel = m(
  SCHEDULED_SESSION_MODEL,
  ScheduledSessionSchema,
);
export const MemberInjuryModel = m(MEMBER_INJURY_MODEL, MemberInjurySchema);
export const CheckInConfigModel = m(CHECK_IN_CONFIG_MODEL, CheckInConfigSchema);
export const CheckInModel = m(CHECK_IN_MODEL, CheckInSchema);
export const FoodModel = m(FOOD_MODEL, FoodSchema);
export const NutritionDailyLogModel = m(
  NUTRITION_DAILY_LOG_MODEL,
  NutritionDailyLogSchema,
);
export const InviteTokenModel = m(INVITE_TOKEN_MODEL, InviteTokenSchema);
export const SelfWorkoutLogModel = m(
  SELF_WORKOUT_LOG_MODEL,
  SelfWorkoutLogSchema,
);
export const ServiceTypeModel = m(SERVICE_TYPE_MODEL, ServiceTypeSchema);
