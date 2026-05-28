export interface SendInviteParams {
  to: string;
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}

export interface SendSessionReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  groupMembers: string[];
}

export interface SendPlanAssignedParams {
  to: string;
  trainerName: string;
  planName: string;
}

export interface SendNutritionPlanAssignedParams {
  to: string;
  trainerName: string;
  planName: string;
}

export interface SendMemberAssignedParams {
  to: string;
  trainerName: string;
  memberNames: string[];
  assignerName: string;
}

export interface SendSessionBookedParams {
  to: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  sessionCount?: number;
}

export interface SendSessionCancelledParams {
  to: string;
  trainerName: string;
  date: string;
  startTime: string;
  endTime: string;
  isSeries: boolean;
}

export interface SendCheckInReminderParams {
  to: string;
  memberName: string;
  trainerName: string;
  checkInUrl: string;
}

export interface SendCheckInReceivedParams {
  to: string;
  trainerName: string;
  memberName: string;
  submittedAt: string;
}

export interface SendPasswordResetParams {
  to: string;
  resetUrl: string;
}

export interface IEmailProvider {
  sendInvite(params: SendInviteParams): Promise<void>;
  sendSessionReminder(params: SendSessionReminderParams): Promise<void>;
  sendPlanAssigned(params: SendPlanAssignedParams): Promise<void>;
  sendNutritionPlanAssigned(
    params: SendNutritionPlanAssignedParams,
  ): Promise<void>;
  sendMemberAssigned(params: SendMemberAssignedParams): Promise<void>;
  sendSessionBooked(params: SendSessionBookedParams): Promise<void>;
  sendSessionCancelled(params: SendSessionCancelledParams): Promise<void>;
  sendCheckInReminder(params: SendCheckInReminderParams): Promise<void>;
  sendCheckInReceived(params: SendCheckInReceivedParams): Promise<void>;
  sendPasswordReset(params: SendPasswordResetParams): Promise<void>;
}
