import type { DefaultSession } from 'next-auth';

export type UserRole = 'owner' | 'trainer' | 'member';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      trainerId: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    trainerId: string | null;
  }
}
