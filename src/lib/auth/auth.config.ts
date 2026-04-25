import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id;
        token.role = u.role;
        token.trainerId = u.trainerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.trainerId = token.trainerId as string | null;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
