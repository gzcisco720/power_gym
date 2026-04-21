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

// JWT augmentation for next-auth v5 (beta.31)
// token.id/role/trainerId are cast explicitly in auth.ts session callback
// because 'next-auth/jwt' module augmentation is unreliable in bundler module resolution
export interface AppJWT {
  id: string;
  role: UserRole;
  trainerId: string | null;
}
