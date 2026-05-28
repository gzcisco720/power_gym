export type UserRole = 'owner' | 'trainer' | 'member';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
}
