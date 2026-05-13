import type { DefaultSession } from 'next-auth';

export type UserRole = 'owner' | 'trainer' | 'member';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      trainerId: string | null;
    } & DefaultSession['user'];
  }
}

export interface AppJWT {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  trainerId: string | null;
}
